import { Stack, StackProps, Stage, StageProps } from 'aws-cdk-lib';
import { BuildSpec } from 'aws-cdk-lib/aws-codebuild';
import { AssetImage } from 'aws-cdk-lib/aws-ecs';
import { CodePipeline, CodeBuildStep, ManualApprovalStep } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';

import { CodeCommitSource } from './codecommit-source';
import { CodeGuruReviewCheck, CodeGuruReviewFilter } from './codeguru-review-check';
import { constants } from './constants';
import { DeploymentStack } from './deployment';
import { JMeterTest } from './jmeter-test';

import { MavenBuild } from './maven-build';
import { SoapUITest } from './soapui-test';


export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const source = new CodeCommitSource(this, 'Source', { repositoryName: constants.APP_NAME });

    const codeGuruSecurity = new CodeGuruReviewCheck('CodeGuruSecurity', {
      Source: source.codePipelineSource,
      ReviewRequired: false,
      Filter: CodeGuruReviewFilter.defaultCodeSecurityFilter(),
    });
    const codeGuruQuality = new CodeGuruReviewCheck('CodeGuruQuality', {
      Source: source.codePipelineSource,
      ReviewRequired: false,
      Filter: CodeGuruReviewFilter.defaultCodeQualityFilter(),
    });

    const buildAction = new MavenBuild(this, 'Build', {
      source: source.codePipelineSource,
    });

    buildAction.addStepDependency(codeGuruQuality);
    buildAction.addStepDependency(codeGuruSecurity);

    const synthAction = new CodeBuildStep('Synth', {
      input: buildAction,
      partialBuildSpec: BuildSpec.fromObject({
        phases: {
          install: {
            'runtime-versions': {
              nodejs: 14,
            },
          },
          build: {
            commands: ['yarn install --frozen-lockfile', 'npm run build', 'npx cdk synth'],
          },
        },
        version: '0.2',
      }),
      commands: [],
    });

    const pipeline = new CodePipeline(this, constants.APP_NAME, {
      pipelineName: constants.APP_NAME,
      synth: synthAction,
      dockerEnabledForSynth: true,
      crossAccountKeys: true,
    });


    const betaStage = new DeploymentStage(this, 'Beta', {
      env: constants.BETA_ENV,
    });

    pipeline.addStage(betaStage, {
      post: [
        new SoapUITest(this, 'E2E Test', {
          source: source.codePipelineSource,
          endpoint: betaStage.apiUrl,
        }),
        new ManualApprovalStep('PromoteFromBeta'),
      ],
    });

    const gammaStage = new DeploymentStage(this, 'Gamma', {
      env: constants.GAMMA_ENV,
    });

    pipeline.addStage(gammaStage, {
      post: [
        new JMeterTest('Performance Test', {
          source: source.codePipelineSource,
          endpoint: betaStage.apiUrl,
        }),
        new ManualApprovalStep('PromoteFromGamma'),
      ],
    });

    const prodStage = new DeploymentStage(this, 'Prod', {
      env: constants.PROD_ENV,
    });
    pipeline.addStage(prodStage);
  }
}

class DeploymentStage extends Stage {
  private readonly stack: DeploymentStack;
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);
    this.stack = new DeploymentStack(this, constants.APP_NAME, {
      image: new AssetImage('.'),
    });
  }

  get apiUrl() {
    return this.stack.apiUrl;
  }
}
