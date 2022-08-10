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

    // Suppress CDK-NAG for ECS Task environment variables for database host/port
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/FargateService/TaskDef/Resource',
      [{ id: 'AwsSolutions-ECS2', reason: 'Allow environment variables' }],
    );

    // Suppress CDK-NAG for secret rotation
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/AuroraSecret/Resource',
      [{ id: 'AwsSolutions-SMG4', reason: 'Dont require secret rotation' }],
    );

    // Suppress CDK-NAG for RDS Serverless
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/AuroraCluster/Resource',
      [
        { id: 'AwsSolutions-RDS6', reason: 'IAM authentication not supported on Serverless v1' },
        { id: 'AwsSolutions-RDS11', reason: 'Custom port not supported on Serverless v1' },
        { id: 'AwsSolutions-RDS14', reason: 'Backtrack not supported on Serverless v1' },
        { id: 'AwsSolutions-RDS16', reason: 'CloudWatch Log Export not supported on Serverless v1' },
      ],
    );

    // Suppress CDK-NAG for Canary
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/SyntheticTest/SyntheticTest/ArtifactsBucket/Resource',
      [
        { id: 'AwsSolutions-S1', reason: 'Dont need access logs for canary bucket' },
        { id: 'AwsSolutions-S2', reason: 'Dont require public access block for canary bucket' },
        { id: 'AwsSolutions-IAM5', reason: 'Allow resource:*', appliesTo: ['Resource::*'] },
      ],
    );
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/SyntheticTest/SyntheticTest/ServiceRole/Resource',
      [{ id: 'AwsSolutions-IAM5', reason: 'Allow resource:*' }],
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
