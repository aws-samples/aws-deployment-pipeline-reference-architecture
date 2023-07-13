import * as process from 'process';
import * as cdk from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { Config } from './config';
import { PipelineStack } from './pipeline-stack';

const app = new cdk.App();
const config = Config.load();

const props = {
  description: `${config.workloadName} pipeline (${config.solutionCode})`,
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
  },
};

new PipelineStack(app, 'DynamicConfigurationPipeline', props);

Aspects.of(app).add(new AwsSolutionsChecks());

NagSuppressions.addResourceSuppressions(
  app,
  [
    { id: 'AwsSolutions-KMS5', reason: 'Default CodePipeline KMS key' },
    { id: 'AwsSolutions-S1', reason: 'Default CodePipeline S3 bucket' },
  ],
  true,
);
