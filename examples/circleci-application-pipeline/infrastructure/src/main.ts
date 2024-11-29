import { App, Tags } from 'aws-cdk-lib';
import { DeploymentStack } from './deployment';

const appName = 'fruit-api';
const app = new App({ context: { appName } });
const environmentName = app.node.tryGetContext('environmentName');
const solutionCode = app.node.tryGetContext('solutionCode');
const stackName = environmentName ? `${environmentName}-${appName}` : appName;

new DeploymentStack(app, stackName, {
  deploymentConfigName: app.node.tryGetContext('deploymentConfigurationName'),
  natGateways: app.node.tryGetContext('natGateways'),
  description: `${appName} ${environmentName} deployment (${solutionCode})`,
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
  },
});

Tags.of(app).add('Application', appName);
if (environmentName) {
  Tags.of(app).add('Environment', environmentName);
}

app.synth();