import { App, Aspects } from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { AssetImage } from 'aws-cdk-lib/aws-ecs';
import { SynthesisMessage } from 'aws-cdk-lib/cx-api';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { DeploymentStack } from '../src/deployment';


function synthesisMessageToString(sm: SynthesisMessage): string {
  return `${sm.entry.data} [${sm.id}]`;
}

describe('Deployment', () => {
  let stack: DeploymentStack;
  let app: App;

  beforeEach(() => {
    app = new App();
    stack = new DeploymentStack(app, 'TestStack', {
      image: new AssetImage('.'),
    }, {
      env: {
        account: 'dummy',
        region: 'us-east-1',
      },
    });
    Aspects.of(stack).add(new AwsSolutionsChecks());

    // Suppress CDK-NAG for public ELB
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/FargateService/LB/SecurityGroup/Resource',
      [{ id: 'AwsSolutions-EC23', reason: 'Public ELB' }],
    );

    // Suppress CDK-NAG for TaskDefinition role and ecr:GetAuthorizationToken permission
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/FargateService/TaskDef/ExecutionRole/DefaultPolicy/Resource',
      [{ id: 'AwsSolutions-IAM5', reason: 'Allow ecr:GetAuthorizationToken', appliesTo: ['Resource::*'] }],
    );

    // Suppress CDK-NAG for S3 AccessLog Bucket
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/AccessLogBucket/Resource',
      [{ id: 'AwsSolutions-S1', reason: 'Dont need access logs for a bucket that is for access logs' }],
    );
  });

  test('Snapshot', () => {
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('cdk-nag AwsSolutions Pack errors', () => {
    const errors = Annotations.fromStack(stack).findError(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*'),
    ).map(synthesisMessageToString);
    expect(errors).toHaveLength(0);
  });

  test('cdk-nag AwsSolutions Pack warnings', () => {
    const warnings = Annotations.fromStack(stack).findWarning(
      '*',
      Match.stringLikeRegexp('AwsSolutions-.*'),
    ).map(synthesisMessageToString);
    expect(warnings).toHaveLength(0);
  });
});
