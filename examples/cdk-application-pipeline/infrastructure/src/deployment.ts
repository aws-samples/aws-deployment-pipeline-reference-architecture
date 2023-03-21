import { ApplicationLoadBalancedCodeDeployedFargateService } from '@cdklabs/cdk-ecs-codedeploy';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { EcsDeploymentConfig, IEcsDeploymentConfig } from 'aws-cdk-lib/aws-codedeploy';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { FlowLog, FlowLogResourceType, Port } from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { AssetImage, AwsLogDriver, Secret } from 'aws-cdk-lib/aws-ecs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Credentials, DatabaseClusterEngine, DatabaseSecret, ServerlessCluster } from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export interface DeploymentProps extends StackProps {
  deploymentConfigName?: string;
  natGateways?: number;
  appConfigRoleArn?: string;
}

export class DeploymentStack extends Stack {
  public readonly apiUrl: CfnOutput;

  constructor(scope: Construct, id: string, props?: DeploymentProps) {
    super(scope, id, props);

    const image = new AssetImage('.', { target: 'build' });

    const appName = Stack.of(this).stackName.toLowerCase().replace(`-${Stack.of(this).region}-`, '-');
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 3,
      natGateways: props?.natGateways,
    });
    new FlowLog(this, 'VpcFlowLog', { resourceType: FlowLogResourceType.fromVpc(vpc) });

    const dbName = 'fruits';
    const dbSecret = new DatabaseSecret(this, 'AuroraSecret', {
      username: 'fruitapi',
      secretName: `${appName}-DB`,
    });
    const db = new ServerlessCluster(this, 'AuroraCluster', {
      engine: DatabaseClusterEngine.AURORA_MYSQL,
      vpc,
      credentials: Credentials.fromSecret(dbSecret),
      defaultDatabaseName: dbName,
      deletionProtection: false,
      clusterIdentifier: appName,
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      containerInsights: true,
      clusterName: appName,
    });
    const appLogGroup = new LogGroup(this, 'AppLogGroup', {
      retention: RetentionDays.ONE_WEEK,
      logGroupName: `/aws/ecs/service/${appName}`,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    let deploymentConfig: IEcsDeploymentConfig | undefined = undefined;
    if (props?.deploymentConfigName) {
      deploymentConfig = EcsDeploymentConfig.fromEcsDeploymentConfigName(this, 'DeploymentConfig', props.deploymentConfigName);
    }
    const appConfigEnabled = props?.appConfigRoleArn !== undefined && props.appConfigRoleArn.length > 0;
    const service = new ApplicationLoadBalancedCodeDeployedFargateService(this, 'Api', {
      cluster,
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 1,
        },
      ],
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      desiredCount: 3,
      cpu: 512,
      memoryLimitMiB: 1024,
      taskImageOptions: {
        image,
        containerName: 'api',
        containerPort: 8080,
        family: appName,
        logDriver: AwsLogDriver.awsLogs({
          logGroup: appLogGroup,
          streamPrefix: 'service',
        }),
        secrets: {
          SPRING_DATASOURCE_USERNAME: Secret.fromSecretsManager( dbSecret, 'username' ),
          SPRING_DATASOURCE_PASSWORD: Secret.fromSecretsManager( dbSecret, 'password' ),
        },
        environment: {
          SPRING_DATASOURCE_URL: `jdbc:mysql://${db.clusterEndpoint.hostname}:${db.clusterEndpoint.port}/${dbName}`,
          APPCONFIG_AGENT_APPLICATION: this.node.tryGetContext('workloadName'),
          APPCONFIG_AGENT_ENVIRONMENT: this.node.tryGetContext('environmentName'),
          APPCONFIG_AGENT_ENABLED: appConfigEnabled.toString(),
        },
      },
      deregistrationDelay: Duration.seconds(5),
      responseTimeAlarmThreshold: Duration.seconds(3),
      healthCheck: {
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
        interval: Duration.seconds(60),
        path: '/actuator/health',
      },
      deploymentConfig,
      terminationWaitTime: Duration.minutes(5),
      apiCanaryTimeout: Duration.seconds(5),
      apiTestSteps: [{
        name: 'getAll',
        path: '/api/fruits',
        jmesPath: 'length(@)',
        expectedValue: 5,
      }],
    });

    if (appConfigEnabled) {
      service.taskDefinition.addContainer('appconfig-agent', {
        image: ecs.ContainerImage.fromRegistry('public.ecr.aws/aws-appconfig/aws-appconfig-agent:2.x'),
        essential: false,
        logging: AwsLogDriver.awsLogs({
          logGroup: appLogGroup,
          streamPrefix: 'service',
        }),
        environment: {
          SERVICE_REGION: this.region,
          ROLE_ARN: props!.appConfigRoleArn!,
          ROLE_SESSION_NAME: appName,
          LOG_LEVEL: 'info',
        },
        portMappings: [{ containerPort: 2772 }],
      });

      service.taskDefinition.addToTaskRolePolicy(new PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [props!.appConfigRoleArn!],
      }));
    }

    service.service.connections.allowTo(db, Port.tcp(db.clusterEndpoint.port));

    this.apiUrl = new CfnOutput(this, 'endpointUrl', {
      value: `http://${service.listener.loadBalancer.loadBalancerDnsName}`,
    });
  }
}
