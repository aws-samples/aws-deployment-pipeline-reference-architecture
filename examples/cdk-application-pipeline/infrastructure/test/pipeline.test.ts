import { App, Aspects } from 'aws-cdk-lib';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { SynthesisMessage } from 'aws-cdk-lib/cx-api';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { PipelineStack } from '../src/pipeline';

function synthesisMessageToString(sm: SynthesisMessage): string {
  return `${sm.entry.data} [${sm.id}]`;
}

describe('Pipeline', () => {
  let stack: PipelineStack;
  let app: App;

  beforeEach(() => {
    const appName = 'fruit-api';
    app = new App({ context: { appName } });
    stack = new PipelineStack(app, 'TestStack', {
      env: {
        account: 'dummy',
        region: 'us-east-1',
      },
    });
    Aspects.of(stack).add(new AwsSolutionsChecks());

    NagSuppressions.addStackSuppressions(
      stack,
      [
        { id: 'AwsSolutions-IAM4', reason: 'Allow CDK Pipeline' },
        { id: 'AwsSolutions-IAM5', reason: 'Allow CDK Pipeline' },
        { id: 'AwsSolutions-S1', reason: 'Allow CDK Pipeline' },
        { id: 'AwsSolutions-KMS5', reason: 'Allow CDK Pipeline' },
        { id: 'AwsSolutions-CB3', reason: 'Allow CDK Pipeline' },
      ],
    );
  });

  expect.addSnapshotSerializer({
    test: (val) => typeof val === 'string' && val.match(/^[a-f0-9]+\.zip$/) !== null,
    serialize: () => '"code.zip"',
  });

  expect.addSnapshotSerializer({
    test: (val) => typeof val === 'string' && val.match(/:iam::[0-9]{12}:role\//) !== null,
    serialize: (val) => '"'+val.replace(/[0-9]{12}/g, '000000000000')+'"',
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
