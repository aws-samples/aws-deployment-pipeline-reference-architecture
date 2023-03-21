import { App, Aspects } from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { SynthesisMessage } from 'aws-cdk-lib/cx-api';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { DeploymentStack } from '../src/deployment';


function synthesisMessageToString(sm: SynthesisMessage): string {
  return `${sm.entry.data} [${sm.id}]`;
}
expect.addSnapshotSerializer({
  test: (val) => typeof val === 'string' && val.match(/^dummy.dkr.ecr.us-east.1/) !== null,
  serialize: () => '"dummy-ecr-image"',
});
expect.addSnapshotSerializer({
  test: (val) => typeof val === 'string' && val.match(/^[a-f0-9]+\.zip$/) !== null,
  serialize: () => '"code.zip"',
});

describe('cdk-nag', () => {
  let stack: DeploymentStack;
  let app: App;

  beforeAll(() => {
    const appName = 'fruit-api';
    const workloadName = 'food';
    const environmentName = 'unit-test';
    app = new App({ context: { appName, environmentName, workloadName } });
    stack = new DeploymentStack(app, 'TestStack', {
      env: {
        account: 'dummy',
        region: 'us-east-1',
      },
    });
    Aspects.of(stack).add(new AwsSolutionsChecks());

    // Suppress CDK-NAG for TaskDefinition role and ecr:GetAuthorizationToken permission
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      `/${stack.stackName}/Api/TaskDef/ExecutionRole/DefaultPolicy/Resource`,
      [{ id: 'AwsSolutions-IAM5', reason: 'Allow ecr:GetAuthorizationToken', appliesTo: ['Resource::*'] }],
    );

    // Suppress CDK-NAG for secret rotation
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      `/${stack.stackName}/AuroraSecret/Resource`,
      [{ id: 'AwsSolutions-SMG4', reason: 'Dont require secret rotation' }],
    );

    // Suppress CDK-NAG for RDS Serverless
    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      `/${stack.stackName}/AuroraCluster/Resource`,
      [
        { id: 'AwsSolutions-RDS6', reason: 'IAM authentication not supported on Serverless v1' },
        { id: 'AwsSolutions-RDS10', reason: 'Disable delete protection to simplify cleanup of Reference Implementation' },
        { id: 'AwsSolutions-RDS11', reason: 'Custom port not supported on Serverless v1' },
        { id: 'AwsSolutions-RDS14', reason: 'Backtrack not supported on Serverless v1' },
        { id: 'AwsSolutions-RDS16', reason: 'CloudWatch Log Export not supported on Serverless v1' },
      ],
    );

    NagSuppressions.addResourceSuppressionsByPath(stack, [
      `/${stack.stackName}/Api/DeploymentGroup/Deployment/DeploymentProvider/framework-onEvent`,
      `/${stack.stackName}/Api/DeploymentGroup/Deployment/DeploymentProvider/framework-isComplete`,
      `/${stack.stackName}/Api/DeploymentGroup/Deployment/DeploymentProvider/framework-onTimeout`,
      `/${stack.stackName}/Api/DeploymentGroup/Deployment/DeploymentProvider/waiter-state-machine`,
    ], [
      { id: 'AwsSolutions-IAM5', reason: 'Unrelated to construct under test' },
      { id: 'AwsSolutions-L1', reason: 'Unrelated to construct under test' },
    ], true);

    // Ignore findings from access log bucket
    NagSuppressions.addResourceSuppressionsByPath(stack, [
      `/${stack.stackName}/Api/AccessLogBucket`,
    ], [
      { id: 'AwsSolutions-S1', reason: 'Dont need access logs for access log bucket' },
      { id: 'AwsSolutions-IAM5', reason: 'Allow resource:*', appliesTo: ['Resource::*'] },
    ]);

    NagSuppressions.addResourceSuppressionsByPath(stack, [
      `/${stack.stackName}/Api/Canary/ServiceRole`,
    ], [{ id: 'AwsSolutions-IAM5', reason: 'Allow resource:*' }]);

    NagSuppressions.addResourceSuppressionsByPath(stack, [
      `/${stack.stackName}/Api/CanaryArtifactsBucket`,
    ], [{ id: 'AwsSolutions-S1', reason: 'Dont need access logs for canary bucket' }]);

    NagSuppressions.addResourceSuppressionsByPath(stack, [
      `/${stack.stackName}/Api/DeploymentGroup/ServiceRole`,
    ], [
      { id: 'AwsSolutions-IAM4', reason: 'Allow AWSCodeDeployRoleForECS policy', appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/AWSCodeDeployRoleForECS'] },
    ]);

    NagSuppressions.addResourceSuppressionsByPath(stack, [
      `/${stack.stackName}/Api/DeploymentGroup/Deployment`,
    ], [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'Allow AWSLambdaBasicExecutionRole policy',
        appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
      },
    ], true);

    NagSuppressions.addResourceSuppressionsByPath(stack, [
      `/${stack.stackName}/Api/TaskDef`,
    ], [
      {
        id: 'AwsSolutions-ECS2',
        reason: 'Allow environment variables for configuration of values that are not confidential',
      },
    ]);

    NagSuppressions.addResourceSuppressionsByPath(stack, [
      `/${stack.stackName}/Api/LB/SecurityGroup`,
    ], [
      {
        id: 'AwsSolutions-EC23',
        reason: 'Allow public inbound access on ELB',
      },
    ]);
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

describe('Deployment without AppConfig', () => {
  let stack: DeploymentStack;
  let app: App;

  beforeAll(() => {
    const appName = 'fruit-api';
    const environmentName = 'unit-test';
    app = new App({ context: { appName, environmentName } });
    stack = new DeploymentStack(app, 'TestStack', {
      env: {
        account: 'dummy',
        region: 'us-east-1',
      },
    });
  });

  test('Snapshot', () => {
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
  test('taskdef', () => {
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: [
        {
          Environment: [{
            Name: 'SPRING_DATASOURCE_URL',
          }, {
            Name: 'APPCONFIG_AGENT_APPLICATION',
          }, {
            Name: 'APPCONFIG_AGENT_ENVIRONMENT',
            Value: 'unit-test',
          }, {
            Name: 'APPCONFIG_AGENT_ENABLED',
            Value: 'false',
          }],
        },
      ],
    });
  });
});

describe('Deployment with AppConfig', () => {
  let stack: DeploymentStack;
  let app: App;

  beforeAll(() => {
    const appName = 'fruit-api';
    const workloadName = 'food';
    const environmentName = 'unit-test';
    app = new App({ context: { appName, environmentName, workloadName } });
    stack = new DeploymentStack(app, 'TestStack', {
      appConfigRoleArn: 'dummy-role-arn',
      env: {
        account: 'dummy',
        region: 'us-east-1',
      },
    });
  });

  test('Snapshot', () => {
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
  test('taskdef', () => {
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: [
        {
          Environment: [{
            Name: 'SPRING_DATASOURCE_URL',
          }, {
            Name: 'APPCONFIG_AGENT_APPLICATION',
            Value: 'food',
          }, {
            Name: 'APPCONFIG_AGENT_ENVIRONMENT',
            Value: 'unit-test',
          }, {
            Name: 'APPCONFIG_AGENT_ENABLED',
            Value: 'true',
          }],
        },
        {
          Environment: [{
            Name: 'SERVICE_REGION',
            Value: 'us-east-1',
          }, {
            Name: 'ROLE_ARN',
            Value: 'dummy-role-arn',
          }, {
            Name: 'ROLE_SESSION_NAME',
          }, {
            Name: 'LOG_LEVEL',
            Value: 'info',
          }],
        },
      ],
    });
  });
});