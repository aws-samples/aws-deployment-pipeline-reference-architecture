import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { FlowLog, FlowLogResourceType, Port } from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Secret } from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Credentials, DatabaseClusterEngine, DatabaseSecret, ServerlessCluster } from 'aws-cdk-lib/aws-rds';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class DeploymentProps {
  readonly image!: ecs.ContainerImage;
}

export class DeploymentStack extends Stack {
  public readonly apiUrl: CfnOutput;

  constructor(scope: Construct, id: string, props: DeploymentProps, stackProps?: StackProps) {
    super(scope, id, stackProps);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 3,
    });
    new FlowLog(this, 'VpcFlowLog', { resourceType: FlowLogResourceType.fromVpc(vpc) });

    const dbName = 'fruits';
    const dbSecret = new DatabaseSecret(this, 'AuroraSecret', { username: 'fruitapi' });
    const db = new ServerlessCluster(this, 'AuroraCluster', {
      engine: DatabaseClusterEngine.AURORA_MYSQL,
      vpc,
      credentials: Credentials.fromSecret(dbSecret),
      defaultDatabaseName: dbName,
      deletionProtection: true,
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      containerInsights: true,
    });
    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'FargateService', {
      cluster,
      desiredCount: 3,
      cpu: 512,
      memoryLimitMiB: 1024,
      taskImageOptions: {
        image: props.image,
        containerPort: 8080,
        secrets: {
          SPRING_DATASOURCE_USERNAME: Secret.fromSecretsManager( dbSecret, 'username' ),
          SPRING_DATASOURCE_PASSWORD: Secret.fromSecretsManager( dbSecret, 'password' ),
        },
        environment: {
          SPRING_DATASOURCE_URL: `jdbc:mysql://${db.clusterEndpoint.hostname}:${db.clusterEndpoint.port}/${dbName}`,
        },
      },
    });

    service.service.connections.allowTo(db, Port.tcp(db.clusterEndpoint.port));

    const accessLogBucket = new Bucket(this, 'AccessLogBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });
    service.loadBalancer.logAccessLogs(accessLogBucket);

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

