import { App, Aspects } from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
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
    const appName = 'fruit-api';
    app = new App({ context: { appName } });
    stack = new DeploymentStack(app, 'TestStack', {
      env: {
        account: 'dummy',
        region: 'us-east-1',
      },
    });
    Aspects.of(stack).add(new AwsSolutionsChecks());

    // Suppress CDK-NAG for public ELB
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/Api/LB/SecurityGroup/Resource',
      [{ id: 'AwsSolutions-EC23', reason: 'Public ELB' }],
    );

    // Suppress CDK-NAG for TaskDefinition role and ecr:GetAuthorizationToken permission
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/Api/TaskDef/ExecutionRole/DefaultPolicy/Resource',
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
      '/TestStack/Api/TaskDef/Resource',
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
        { id: 'AwsSolutions-RDS10', reason: 'Disable delete protection to simplify cleanup of Reference Implementation' },
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
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/BlueGreenSupport',
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'Allow AWS managed policies',
          appliesTo: [
            'Policy::arn:<AWS::Partition>:iam::aws:policy/AWSCodeDeployRoleForECS',
            'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
          ],
        },
      ],
      true,
    );
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      '/TestStack/BlueGreenSupport/DeploymentWait/CodeDeploymentProvider',
      [
        { id: 'AwsSolutions-IAM5', reason: 'Allow AWS wildcard on sub-resources' },
        { id: 'AwsSolutions-L1', reason: 'Allow provider framework older runtime version' },
      ],
      true,
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
