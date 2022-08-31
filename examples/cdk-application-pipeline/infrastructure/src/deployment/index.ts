import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Alarm, AlarmRule, ComparisonOperator, CompositeAlarm } from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { FlowLog, FlowLogResourceType, Port } from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { AssetImage, AwsLogDriver, Secret } from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Credentials, DatabaseClusterEngine, DatabaseSecret, ServerlessCluster } from 'aws-cdk-lib/aws-rds';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BlueGreenEcsSupport, BlueGreenEcsSupportProps } from '../blue-green-deploy';
import { SyntheticTest } from './synthetic';

export class DeploymentStack extends Stack {
  public readonly apiUrl: CfnOutput;

  constructor(scope: Construct, id: string, stackProps?: StackProps) {
    super(scope, id, stackProps);

    const image = new AssetImage('.', { target: 'build' });

    const appName = Stack.of(this).stackName.toLowerCase().replace(`-${Stack.of(this).region}-`, '-');
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 3,
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
    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'Api', {
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
        },
      },
    });

    service.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '5');
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

    const elbResponseTime = new Alarm(this, 'ElbResponseTimeAlarm', {
      alarmName: `${appName}-ElbResponseTime`,
      metric: service.loadBalancer.metricTargetResponseTime({
        period: Duration.minutes(1),
        statistic: 'p95',
      }),
      evaluationPeriods: 2,
      threshold: 3, // seconds
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    const syntheticTest = new SyntheticTest(this, 'SyntheticTest', {
      appName,
      url: `http://${service.listener.loadBalancer.loadBalancerDnsName}`,
      threadCount: 20,
      schedule: Duration.minutes(5),
    });
    syntheticTest.node.addDependency(service.service);
    const healthAlarm = new CompositeAlarm(this, 'HealthAlarm', {
      compositeAlarmName: `${appName}-Health`,
      alarmRule: AlarmRule.anyOf(
        elbResponseTime,
        syntheticTest.successAlarm,
        syntheticTest.durationAlarm,
      ),
    });

    new BlueGreenEcsSupport(this, 'BlueGreenSupport',
      BlueGreenEcsSupportProps.from(service, { healthAlarms: [healthAlarm] }),
    );

    this.apiUrl = new CfnOutput(this, 'ApiUrl', {
      value: `http://${service.listener.loadBalancer.loadBalancerDnsName}`,
    });
  }
}
