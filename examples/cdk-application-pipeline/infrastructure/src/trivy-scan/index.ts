import { BuildSpec } from 'aws-cdk-lib/aws-codebuild';
import { CodeBuildStep, CodePipelineSource } from 'aws-cdk-lib/pipelines';

export interface TrivyScanProps {
  source: CodePipelineSource;
  trivyVersion?: string;
  severity?: string[];
  checks?: string[];
}

export class TrivyScan extends CodeBuildStep {
  constructor(id: string, props: TrivyScanProps) {
    const trivyArgs = [
      'filesystem',
      '--exit-code',
      '1',
      '--no-progress',
      '--ignore-unfixed',
      '--format',
      'cyclonedx',
      '--output',
      'sbom.json',
    ];
    if (props.severity) {
      trivyArgs.push('--severity');
      trivyArgs.push(props.severity.join(','));
    }
    if (props.checks) {
      trivyArgs.push('--security-checks');
      trivyArgs.push(props.checks.join(','));
    }

    const stepProps = {
      input: props.source,
      commands: [],
      partialBuildSpec: BuildSpec.fromObject({
        phases: {
          install: {
            commands: [
              `curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin ${props.trivyVersion || ''}`,
            ],
          },
          build: {
            commands: [
              `trivy ${trivyArgs.join(' ')} .`,
            ],
          },
        },
        version: '0.2',
      }),
      primaryOutputDirectory: '.',
    };
    super(id, stepProps);
  }
}
