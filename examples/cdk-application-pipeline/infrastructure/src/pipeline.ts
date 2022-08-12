import { Stack, StackProps, Stage, StageProps, Tags } from 'aws-cdk-lib';
import { BuildSpec } from 'aws-cdk-lib/aws-codebuild';
import { AssetImage } from 'aws-cdk-lib/aws-ecs';
import { CodePipeline, CodeBuildStep, ManualApprovalStep } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';

import { CodeCommitSource } from './codecommit-source';
import { CodeGuruReviewCheck, CodeGuruReviewFilter } from './codeguru-review-check';
import { TrivyScan } from './trivy-scan';
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
      severity: ['CRITICAL','HIGH'],
      checks: ['vuln','config','secret'],
    })

    const buildAction = new MavenBuild(this, 'Build', {
      source: source.codePipelineSource,
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
    Tags.of(betaStage).add('Environment', 'Beta');
    Tags.of(betaStage).add('Application', constants.APP_NAME);

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
    Tags.of(gammaStage).add('Environment', 'Gamma');
    Tags.of(gammaStage).add('Application', constants.APP_NAME);

    pipeline.addStage(gammaStage, {
      post: [
        new JMeterTest(this, 'Performance Test', {
          source: source.codePipelineSource,
          endpoint: gammaStage.apiUrl,
          threads: 300,
          duration: 300,
          throughput: 100000,
        }),
        new ManualApprovalStep('PromoteFromGamma'),
      ],
    });

    const prodStage = new DeploymentStage(this, 'Prod', {
      env: constants.PROD_ENV,
    });
    Tags.of(prodStage).add('Environment', 'Prod')
    Tags.of(prodStage).add('Application', constants.APP_NAME);
    pipeline.addStage(prodStage);
  }
}

class DeploymentStage extends Stage {
  private readonly stack: DeploymentStack;
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);
    this.stack = new DeploymentStack(this, constants.APP_NAME, {
      image: new AssetImage('.', {
        target: 'build'
      }),
    });
  }

  get apiUrl() {
    return this.stack.apiUrl;
  }
}
