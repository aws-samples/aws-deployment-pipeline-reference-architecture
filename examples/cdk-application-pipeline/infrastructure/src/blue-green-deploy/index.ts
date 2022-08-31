import path from 'path';
import { Arn, ArnFormat, CfnOutput, CustomResource, Duration, Stack } from 'aws-cdk-lib';
import { IAlarm } from 'aws-cdk-lib/aws-cloudwatch';
import { CfnDeploymentGroup, EcsApplication, EcsDeploymentConfig } from 'aws-cdk-lib/aws-codedeploy';
import { BaseService, CfnService, DeploymentControllerType, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { ApplicationListener, ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup, TargetType } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';


export class BlueGreenEcsSupportProps {
  public static from(service: ApplicationLoadBalancedFargateService, props?: BlueGreenEcsSupportProps): BlueGreenEcsSupportProps {
    return {
      ...props,
      service: service.service,
      blueListener: service.listener,
      blueLoadBalancer: service.loadBalancer,
      blueTargetGroup: service.targetGroup,
    };
  }

  service?: BaseService;
  blueLoadBalancer?: ApplicationLoadBalancer;
  blueListener?: ApplicationListener;
  blueTargetGroup?: ApplicationTargetGroup;
  healthAlarms?: IAlarm[];
  greenListenerPort?: number;
  terminationWaitTimeInMinutes?: number;
  deregistrationDelay?: Duration;
  appName?: string;
  deploymentGroupName?: string;
  deploymentConfigName?: string;
}

export class BlueGreenEcsSupport extends Construct {
  constructor(scope: Construct, id: string, props: BlueGreenEcsSupportProps) {
    super(scope, id);

    // defaults
    props.appName ||= props.service!.taskDefinition.family;
    props.greenListenerPort ||= Number.parseInt(props.blueListener!.connections.defaultPort!.toString()) + 1;
    props.terminationWaitTimeInMinutes ||= 5;
    props.deregistrationDelay ||= Duration.seconds(5);
    props.deploymentGroupName ||= props.appName;
    props.deploymentConfigName ||= 'CodeDeployDefault.ECSLinear10PercentEvery1Minutes';

    const service = props.service!;

    // Change ECS Service deployment controller to codedeploy
    const cfnService = service.node.defaultChild as CfnService;
    cfnService.deploymentController = { type: DeploymentControllerType.CODE_DEPLOY };

    // Remove revision from ECS Service task definition to allow Blue/Green deploys to work
    cfnService.taskDefinition = service.taskDefinition.family;
    service.node.addDependency(service.taskDefinition);

    const greenTargetGroup = new ApplicationTargetGroup(this, 'GreenTargetGroup', {
      deregistrationDelay: props.deregistrationDelay,
      healthCheck: props.blueTargetGroup!.healthCheck,
      port: props.greenListenerPort,
      protocol: ApplicationProtocol.HTTP,
      targetType: TargetType.IP,
      vpc: service.cluster.vpc,
    });
    const greenListener = props.blueLoadBalancer!.addListener('GreenListener', {
      port: props.greenListenerPort,
      protocol: ApplicationProtocol.HTTP,
      defaultTargetGroups: [greenTargetGroup],
    });
    const app = new EcsApplication(this, 'Application', {
      applicationName: props.appName,
    });
    const codeDeployRole = new Role(this, 'CodeDeployRole', {
      assumedBy: new ServicePrincipal('codedeploy'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AWSCodeDeployRoleForECS')],
    });
    const ecsDeploymentConfig = EcsDeploymentConfig.fromEcsDeploymentConfigName(this, 'EcsDeploymentConfig', props.deploymentConfigName!);
    const deploymentGroup = new CfnDeploymentGroup(this, 'DeploymentGroup', {
      applicationName: app.applicationName,
      autoRollbackConfiguration: {
        enabled: true,
        events: ['DEPLOYMENT_FAILURE', 'DEPLOYMENT_STOP_ON_ALARM'],
      },
      alarmConfiguration: {
        alarms: props.healthAlarms?.map(a => {return { name: a.alarmName };}),
        enabled: (props.healthAlarms && props.healthAlarms!.length > 0),
      },
      serviceRoleArn: codeDeployRole.roleArn,
      blueGreenDeploymentConfiguration: {
        deploymentReadyOption: {
          actionOnTimeout: 'CONTINUE_DEPLOYMENT',
          waitTimeInMinutes: 0,
        },
        terminateBlueInstancesOnDeploymentSuccess: {
          action: 'TERMINATE',
          terminationWaitTimeInMinutes: props.terminationWaitTimeInMinutes,
        },
      },
      deploymentConfigName: ecsDeploymentConfig.deploymentConfigName,
      deploymentGroupName: props.deploymentGroupName,
      deploymentStyle: {
        deploymentOption: 'WITH_TRAFFIC_CONTROL',
        deploymentType: 'BLUE_GREEN',
      },
      ecsServices: [{
        clusterName: service.cluster.clusterName,
        serviceName: service.serviceName,
      }],
      loadBalancerInfo: {
        targetGroupPairInfoList: [{
          targetGroups: [{
            name: props.blueTargetGroup!.targetGroupName,
          }, {
            name: greenTargetGroup.targetGroupName,
          }],
          prodTrafficRoute: {
            listenerArns: [props.blueListener!.listenerArn],
          },
          testTrafficRoute: {
            listenerArns: [greenListener.listenerArn],
          },
        }],
      },
    });


    const deployment = new BlueGreenEcsDeployment(this, 'DeploymentWait', {
      deploymentGroup: deploymentGroup,
      taskDefinition: service.taskDefinition,
      timeout: Duration.minutes(60),
    });

    new CfnOutput(this, 'DeploymentId', {
      value: deployment.deploymentId,
    }).overrideLogicalId('DeploymentId');
  }
}

class BlueGreenEcsDeploymentProps {
  deploymentGroup!: CfnDeploymentGroup;
  taskDefinition!: TaskDefinition;
  timeout?: Duration;
}
class BlueGreenEcsDeployment extends Construct {
  deploymentId: string;
  constructor(scope: Construct, id: string, props: BlueGreenEcsDeploymentProps) {
    super(scope, id);

    props.timeout ||= Duration.minutes(30);

    const applicationName = props.deploymentGroup.applicationName;
    const deploymentGroupName = props.deploymentGroup.ref;
    const deploymentConfigName = props.deploymentGroup.deploymentConfigName;


    const eventLambda = new NodejsFunction(this, `${id}CodeDeployEventLambda`, {
      functionName: `${Stack.of(this).stackName}-bluegreen-onEvent`,
      timeout: Duration.seconds(60),
      runtime: Runtime.NODEJS_16_X,
      handler: 'onEvent',
      entry: path.join(__dirname, 'lambda/index.ts'),
    });
    eventLambda.addToRolePolicy(new PolicyStatement({
      actions: [
        'codedeploy:GetApplicationRevision',
        'codedeploy:RegisterApplicationRevision',
      ],
      resources: [
        Arn.format({
          service: 'codedeploy',
          resource: 'application',
          resourceName: applicationName,
          arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        }, Stack.of(this)),
      ],
    }));
    eventLambda.addToRolePolicy(new PolicyStatement({
      actions: [
        'codedeploy:CreateDeployment',
        'codedeploy:StopDeployment',
        'codedeploy:GetDeployment',
      ],
      resources: [
        Arn.format({
          service: 'codedeploy',
          resource: 'deploymentgroup',
          resourceName: `${applicationName}/${deploymentGroupName}`,
          arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        }, Stack.of(this)),
      ],
    }));
    eventLambda.addToRolePolicy(new PolicyStatement({
      actions: [
        'codedeploy:GetDeploymentConfig',
      ],
      resources: [
        Arn.format({
          service: 'codedeploy',
          resource: 'deploymentconfig',
          resourceName: deploymentConfigName,
          arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        }, Stack.of(this)),
      ],
    }));
    const completeLambda = new NodejsFunction(this, `${id}CodeDeployCompleteLambda`, {
      functionName: `${Stack.of(this).stackName}-bluegreen-isComplete`,
      timeout: Duration.seconds(60),
      runtime: Runtime.NODEJS_16_X,
      handler: 'isComplete',
      entry: path.join(__dirname, 'lambda/index.ts'),
    });
    completeLambda.addToRolePolicy(new PolicyStatement({
      actions: [
        'codedeploy:GetDeployment',
      ],
      resources: [
        Arn.format({
          service: 'codedeploy',
          resource: 'deploymentgroup',
          resourceName: `${applicationName}/${deploymentGroupName}`,
          arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        }, Stack.of(this)),
      ],
    }));
    const codeDeploymentProvider = new Provider(this, 'CodeDeploymentProvider', {
      providerFunctionName: `${Stack.of(this).stackName}-bluegreen-provider`,
      onEventHandler: eventLambda,
      isCompleteHandler: completeLambda,
      queryInterval: Duration.seconds(15),
      totalTimeout: props.timeout,
    });
    const deployment = new CustomResource(this, 'Deployment', {
      serviceToken: codeDeploymentProvider.serviceToken,
      resourceType: 'Custom::BlueGreenEcsDeployment',
      properties: {
        applicationName,
        deploymentConfigName,
        deploymentGroupName,
        taskDefinitionArn: props.taskDefinition.taskDefinitionArn,
        containerName: props.taskDefinition.defaultContainer?.containerName,
        containerPort: props.taskDefinition.defaultContainer?.containerPort,
      },
    });
    this.deploymentId = deployment.getAttString('deploymentId');
  }

}