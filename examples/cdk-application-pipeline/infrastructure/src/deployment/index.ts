import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Construct } from 'constructs';

export class DeploymentProps {
  readonly image!: ecs.ContainerImage;
}

export class DeploymentStack extends Stack {
  public readonly apiUrl: CfnOutput;

  constructor(scope: Construct, id: string, props: DeploymentProps, stackProps?: StackProps) {
    super(scope, id, stackProps);

    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 3 });
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });
    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'FargateService', {
      cluster,
      desiredCount: 3,
      cpu: 512,
      memoryLimitMiB: 1024,
      taskImageOptions: {
        image: props.image,
        containerPort: 8080,
      },
    });

    service.targetGroup.configureHealthCheck({
      path: '/actuator/health',
      interval: Duration.seconds(60),
      unhealthyThresholdCount: 2,
      healthyThresholdCount: 2,
    });

    this.apiUrl = new CfnOutput(this, 'ApiUrl', {
      value: `http://${service.listener.loadBalancer.loadBalancerDnsName}`,
    });
  }
}

