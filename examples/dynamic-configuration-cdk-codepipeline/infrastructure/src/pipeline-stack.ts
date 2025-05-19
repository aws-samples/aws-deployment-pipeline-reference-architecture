import * as cdk from 'aws-cdk-lib';
import { BuildSpec, LinuxBuildImage, ReportGroup } from 'aws-cdk-lib/aws-codebuild';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CodeBuildStep, CodePipeline } from 'aws-cdk-lib/pipelines';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { TrivyScan } from './code-analysis/trivy-scan';
import { CodeCommitSource } from './codecommit-source';
import { Config } from './config';
import { DynamicConfigurationCoreStage } from './dynamic-configuration/dynamic-configuration-core-stage';
import { DynamicConfigurationDeploymentStage } from './dynamic-configuration/dynamic-configuration-deployment-stage';
import { DynamicConfigurationGlobalStage } from './security/dynamic-configuration-security-stage';
import { ServiceDiscoveryStage } from './service-discovery/service-discovery-stage';

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const source = new CodeCommitSource(this, 'Source', {
      repositoryName: 'dynamic-configuration-cdk-codepipeline',
      trunkBranchName: 'main',
    });

    const trivyScan = new TrivyScan('TrivyScan', {
      source: source.codePipelineSource,
      severity: ['CRITICAL', 'HIGH'],
      checks: ['vuln', 'config', 'secret'],
    });

    const config = Config.load(this.node);

    const infrastructureTestReports = new ReportGroup(
      this,
      `${config.workloadName}-InfrastructureTestReports`,
      {
        reportGroupName: `${config.workloadName}-InfrastructureTestReports`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    const eslint = new CodeBuildStep('Eslint', {
      input: source.codePipelineSource,
      commands: ['npm install', 'npm run lint-pipeline'],
    });

    // codeIncludeReferenceGitLeaks {
    const gitleaks = new CodeBuildStep('GitLeaks', {
      input: source.codePipelineSource,
      buildEnvironment: {
        buildImage: LinuxBuildImage.AMAZON_LINUX_2_2,
      },
      installCommands: [
        `VERSION=$(curl https://api.github.com/repositories/119190187/releases/latest | jq .tag_name -r | sed 's/v//')`,
        `if [ \${VERSION} == null ]; then VERSION=8.16.3; fi`,
        `FILENAME=gitleaks_\${VERSION}_linux_x64.tar.gz`,
        `wget https://github.com/gitleaks/gitleaks/releases/download/v$VERSION/$FILENAME`,
        `tar -zxvf $FILENAME gitleaks`,
        `chmod +x gitleaks`,
      ],
      commands: [
        `./gitleaks detect --source . --no-git --redact -v -r gitleaks.log`, // # no-git because the remote branch won't have a .git folder.
      ],
    });
    //}
    const synthStep = new CodeBuildStep('Synth', {
      input: source.codePipelineSource,
      commands: ['npm ci', 'npm run build', 'npm run test', 'npx cdk synth'],
      partialBuildSpec: BuildSpec.fromObject({
        reports: {
          [infrastructureTestReports.reportGroupArn]: {
            files: ['**/junit.xml'],
          },
        },
      }),
      rolePolicyStatements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'codebuild:CreateReportGroup',
            'codebuild:CreateReport',
            'codebuild:UpdateReport',
            'codebuild:BatchPutTestCases',
            'codebuild:BatchPutCodeCoverages',
          ],
          resources: [infrastructureTestReports.reportGroupArn],
        }),
        new PolicyStatement({
          actions: ['sts:AssumeRole'],
          //checkov:skip=CKV_AWS_111:This is set to '*' because the actual filtering happens on the bootstrap role
          resources: ['*'],
          conditions: { StringEquals: { 'iam:ResourceTag/aws-cdk:bootstrap-role': 'lookup' } },
        }),
      ],
    });

    synthStep.addStepDependency(trivyScan);
    synthStep.addStepDependency(eslint);
    synthStep.addStepDependency(gitleaks);

    const pipeline = new CodePipeline(this, 'DynamicConfigurationPipeline', {
      pipelineName: `dynamic-configuration-${config.workloadName}`,
      selfMutation: true,
      crossAccountKeys: true,
      dockerEnabledForSynth: true,
      synth: synthStep,
      enableKeyRotation: true,
    });

    const allRegions = config.getUniqueRegions();
    const coreDynamicConfigurationWave = pipeline.addWave('Core');
    allRegions.forEach((region) => {
      const coreStage = new DynamicConfigurationCoreStage(
        this,
        `${config.workloadName}-Core-${region}`,
        config.workloadName,
        config.workloadEnvironments,
        config.solutionCode,
        {
          env: { account: config.dynamicConfigAccount, region: region },
        },
      );
      coreDynamicConfigurationWave.addStage(coreStage);
    });

    pipeline.addStage(
      new DynamicConfigurationGlobalStage(
        this,
        `${config.workloadName}-Global`,
        config.workloadName,
        config.workloadEnvironments,
        config.solutionCode,
        {
          env: { account: config.dynamicConfigAccount, region: this.region },
        },
      ),
    );

    pipeline.addStage(
      new ServiceDiscoveryStage(
        this,
        `${config.workloadName}-ServiceDiscovery`,
        config.workloadName,
        config.dynamicConfigAccount,
        config.workloadEnvironments,
        config.solutionCode,
        props,
      ),
    );

    config.workloadEnvironments.forEach((workloadEnvironment) => {
      workloadEnvironment.waves.forEach((wave) => {
        const deploymentWave = pipeline.addWave(wave.name);
        wave.regions.forEach((region) => {
          deploymentWave.addStage(
            new DynamicConfigurationDeploymentStage(
              this,
              `${config.workloadName}-${workloadEnvironment.name}-${region}`,
              config.workloadName,
              workloadEnvironment,
              config.solutionCode,
              {
                env: { account: config.dynamicConfigAccount, region: region },
              },
            ),
          );
        });
      });
    });

    pipeline.buildPipeline();

    NagSuppressions.addResourceSuppressions(
      pipeline,
      [{ id: 'AwsSolutions-IAM5', reason: 'Default CodePipeline IAM role' }],
      true,
    );
  }
}
