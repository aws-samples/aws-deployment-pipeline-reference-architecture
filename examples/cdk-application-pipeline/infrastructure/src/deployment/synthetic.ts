import path from 'path';
import { Canary, Schedule, Test, Code, Runtime } from '@aws-cdk/aws-synthetics-alpha';
import { Duration } from 'aws-cdk-lib';
import { Alarm, ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export class SyntheticTestProps {
  readonly url!: string;
  readonly appName!: string;
  readonly threadCount!: number;
  readonly schedule!: Duration;
}

export class SyntheticTest extends Construct {
  successAlarm: Alarm;
  durationAlarm: Alarm;
  constructor(scope: Construct, id: string, props: SyntheticTestProps) {
    super(scope, id);

    const canary = new Canary(this, 'SyntheticTest', {
      canaryName: props.appName,
      schedule: Schedule.rate(props.schedule),
      test: Test.custom({
        code: Code.fromAsset(path.join(__dirname, 'canary')),
        handler: 'index.handler',
      }),
      runtime: Runtime.SYNTHETICS_NODEJS_PUPPETEER_3_5,
      environmentVariables: {
        url: props.url,
        threadCount: props.threadCount.toString(),
      },
    });

    this.successAlarm = new Alarm(this, 'CanarySuccessAlarm', {
      alarmName: `${props.appName}-CanarySuccessRate`,
      metric: canary.metricSuccessPercent({ period: props.schedule }),
      evaluationPeriods: 2,
      threshold: 100,
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
    });

    this.durationAlarm = new Alarm(this, 'CanaryDurationAlarm', {
      alarmName: `${props.appName}-CanaryDuration`,
      metric: canary.metricDuration({ period: props.schedule }),
      evaluationPeriods: 2,
      threshold: 5000,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
  }
}