import { App } from 'aws-cdk-lib';
import { AssetImage } from 'aws-cdk-lib/aws-ecs';
import { constants } from './constants';
import { DeploymentStack } from './deployment';
import { PipelineStack } from './pipeline';

const app = new App();

if (app.node.tryGetContext('deployMode') == 'local') {
  new DeploymentStack(app, `Dev-${constants.APP_NAME}`, {
    image: new AssetImage('.'),
  }, {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  });
} else {
  new PipelineStack(app, `${constants.APP_NAME}-pipeline`, {
    env: constants.TOOLCHAIN_ENV,
  });
}

app.synth();