import path from 'path';
import { Canary, Schedule, Test, Code, Runtime } from '@aws-cdk/aws-synthetics-alpha';
import { Duration } from 'aws-cdk-lib';
import { Alarm, ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export class SyntheticTestProps {
  readonly url!: string;
  readonly appName!: string;
}

export class SyntheticTest extends Construct {
  successAlarm: Alarm;
  durationAlarm: Alarm;
  constructor(scope: Construct, id: string, props: SyntheticTestProps) {
    super(scope, id);

    const canary = new Canary(this, 'SyntheticTest', {
      canaryName: props.appName,
      schedule: Schedule.rate(Duration.minutes(5)),
      test: Test.custom({
        code: Code.fromAsset(path.join(__dirname, 'canary')),
        handler: 'index.handler',
      }),
      runtime: Runtime.SYNTHETICS_NODEJS_PUPPETEER_3_5,
      environmentVariables: {
        url: props.url,
      },
    });

    this.successAlarm = new Alarm(this, 'CanarySuccessAlarm', {
      alarmName: `${props.appName}-CanarySuccessRate`,
      metric: canary.metricSuccessPercent(),
      evaluationPeriods: 1,
      threshold: 100,
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
    });

    this.durationAlarm = new Alarm(this, 'CanaryDurationAlarm', {
      alarmName: `${props.appName}-CanaryDuration`,
      metric: canary.metricDuration(),
      evaluationPeriods: 1,
      threshold: 1000,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
  }
}