import { App, Tags } from 'aws-cdk-lib';
import { Accounts } from './accounts';
import { PipelineStack } from './pipeline';

export const accounts = Accounts.load();

const appName = 'fruit-api';
const app = new App({ context: { appName } });
const solutionCode = app.node.tryGetContext('solutionCode');
new PipelineStack(app, `${appName}-pipeline`, {
  description: `${appName} pipeline (${solutionCode})`,
  env: {
    account: accounts.toolchain!.accountId,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

Tags.of(app).add('Application', appName);

app.synth();