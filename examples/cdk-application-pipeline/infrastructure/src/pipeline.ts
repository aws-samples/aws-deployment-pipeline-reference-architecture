import { CfnOutput, Environment, Stack, StackProps, Stage, Tags } from 'aws-cdk-lib';
import { BuildSpec } from 'aws-cdk-lib/aws-codebuild';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { CodePipeline, CodeBuildStep, ManualApprovalStep, StageDeployment, Wave } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';

import { Account, Accounts } from './accounts';
import { CodeCommitSource } from './codecommit-source';
import { CodeGuruReviewCheck, CodeGuruReviewFilter } from './codeguru-review-check';
import { DeploymentStack } from './deployment';
import { JMeterTest } from './jmeter-test';

import { MavenBuild } from './maven-build';
import { SoapUITest } from './soapui-test';
import { TrivyScan } from './trivy-scan';


export const accounts = Accounts.load();

// BETA environment is 1 wave with 1 region
export const Beta: EnvironmentConfig = {
  name: 'Beta',
  account: accounts.beta,
  waves: [
    ['us-west-2'],
  ],
};

// GAMMA environment is 1 wave with 2 regions
export const Gamma: EnvironmentConfig = {
  name: 'Gamma',
  account: accounts.gamma,
  waves: [
    ['us-west-2', 'us-east-1'],
  ],
};

// PROD environment is 3 wave with 2 regions each wave
export const Prod: EnvironmentConfig = {
  name: 'Prod',
  account: accounts.production,
  waves: [
    ['us-west-2', 'us-east-1'],
    ['eu-central-1', 'eu-west-1'],
    ['ap-south-1', 'ap-southeast-2'],
  ],
};


export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const appName = this.node.tryGetContext('appName');
    const source = new CodeCommitSource(this, 'Source', { repositoryName: appName });

    const cacheBucket = new Bucket(this, 'CacheBucket', {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    const codeGuruSecurity = new CodeGuruReviewCheck('CodeGuruSecurity', {
      source: source.codePipelineSource,
      reviewRequired: false,
      filter: CodeGuruReviewFilter.defaultCodeSecurityFilter(),
    });
    const codeGuruQuality = new CodeGuruReviewCheck('CodeGuruQuality', {
      source: source.codePipelineSource,
      reviewRequired: false,
      filter: CodeGuruReviewFilter.defaultCodeQualityFilter(),
    });
    const trivyScan = new TrivyScan('TrivyScan', {
      source: source.codePipelineSource,
      severity: ['CRITICAL', 'HIGH'],
      checks: ['vuln', 'config', 'secret'],
    });

    const buildAction = new MavenBuild('Build', {
      source: source.codePipelineSource,
      cacheBucket,
    });

    buildAction.addStepDependency(codeGuruQuality);
    buildAction.addStepDependency(codeGuruSecurity);
    buildAction.addStepDependency(trivyScan);

    const synthAction = new CodeBuildStep('Synth', {
      input: buildAction,
      partialBuildSpec: BuildSpec.fromObject({
        phases: {
          install: {
            'runtime-versions': {
              nodejs: 16,
            },
          },
          build: {
            commands: ['yarn install --frozen-lockfile', 'npm test', 'npm run build'],
          },
        },
        version: '0.2',
      }),
      commands: [],
    });

    const pipeline = new CodePipeline(this, appName, {
      pipelineName: appName,
      synth: synthAction,
      dockerEnabledForSynth: true,
      crossAccountKeys: true,
      publishAssetsInParallel: false,
    });


    new PipelineEnvironment(pipeline, Beta, (deployment, stage) => {
      stage.addPost(
        new SoapUITest('E2E Test', {
          source: source.codePipelineSource,
          endpoint: deployment.apiUrl,
          cacheBucket,
        }),
      );
    });

    new PipelineEnvironment(pipeline, Gamma, (deployment, stage) => {
      stage.addPost(
        new JMeterTest('Performance Test', {
          source: source.codePipelineSource,
          endpoint: deployment.apiUrl,
          threads: 300,
          duration: 300,
          throughput: 6000,
          cacheBucket,
        }),
      );
    }, wave => {
      wave.addPost(
        new ManualApprovalStep('PromoteToProd'),
      );
    });

    new PipelineEnvironment(pipeline, Prod);
  }
}

type PipelineEnvironmentStageProcessor = (deployment: Deployment, stage: StageDeployment) => void;
type PipelineEnvironmentWaveProcessor = (wave: Wave) => void;

class PipelineEnvironment {
  constructor(
    pipeline: CodePipeline,
    environment: EnvironmentConfig,
    stagePostProcessor?: PipelineEnvironmentStageProcessor,
    wavePostProcessor?: PipelineEnvironmentWaveProcessor) {
    if (!environment.account?.accountId) {
      throw new Error(`Missing accountId for environment '${environment.name}'. Do you need to update '.accounts.env'?`);
    }
    for (const [i, regions] of environment.waves.entries()) {
      const wave = pipeline.addWave(`${environment.name}-${i}`);
      for (const region of regions) {
        const deployment = new Deployment(pipeline, environment.name, {
          account: environment.account!.accountId!,
          region,
        });
        const stage = wave.addStage(deployment);
        if (stagePostProcessor) {
          stagePostProcessor(deployment, stage);
        }
      }
      if (wavePostProcessor) {
        wavePostProcessor(wave);
      }
    }
  }
}

class Deployment extends Stage {
  readonly apiUrl: CfnOutput;

  constructor(scope: Construct, environmentName: string, env?: Environment) {
    super(scope, `${environmentName}-${env!.region!}`, { env });
    const appName = this.node.tryGetContext('appName');
    const solutionCode = this.node.tryGetContext('solutionCode');
    const workloadName = this.node.tryGetContext('workloadName');
    var appConfigRoleArn;
    if(workloadName) {
      appConfigRoleArn = StringParameter.valueFromLookup(scope, `/${workloadName}/dynamic_config_role-${environmentName.toLowerCase()}`)
    }
    const stack = new DeploymentStack(this, appName, {
      appConfigRoleArn,
      deploymentConfigName: this.node.tryGetContext('deploymentConfigurationName'),
      natGateways: this.node.tryGetContext('natGateways'),
      description: `${appName} ${environmentName} deployment (${solutionCode})`,
    });
    this.apiUrl = stack.apiUrl;

    Tags.of(this).add('Environment', environmentName);
    Tags.of(this).add('Application', appName);
  }
}

type Region = string;
type WaveRegions = Region[]
interface EnvironmentConfig {
  name: string;
  account?: Account;
  waves: WaveRegions[];
}