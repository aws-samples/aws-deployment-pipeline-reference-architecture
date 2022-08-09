import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PipelineStack } from '../src/pipeline';

test('Snapshot', () => {
  const app = new App();
  const stack = new PipelineStack(app, 'test', {
    env: {
      account: 'dummy',
      region: 'dummy',
    },
  });

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});