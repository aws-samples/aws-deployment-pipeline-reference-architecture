import { App, Tags } from 'aws-cdk-lib';
import { DeploymentStack } from './deployment';
import { PipelineStack, accounts } from './pipeline';


const appName = 'fruit-api';
const app = new App({ context: { appName } });

if (app.node.tryGetContext('deployMode') == 'local') {
  new DeploymentStack(app, `Dev-${appName}`, {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  });
} else {
  new PipelineStack(app, `${appName}-pipeline`, {
    env: {
      account: accounts.toolchain!.accountId,
      region: process.env.CDK_DEFAULT_REGION,
    },
  });
}

Tags.of(app).add('Application', appName);

app.synth();