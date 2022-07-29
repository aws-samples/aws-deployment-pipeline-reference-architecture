import { CfnOutput } from 'aws-cdk-lib';
import { BuildSpec } from 'aws-cdk-lib/aws-codebuild';
import { CodeBuildStep, CodePipelineSource } from 'aws-cdk-lib/pipelines';

export interface JMeterTestProps {
  source: CodePipelineSource;
  javaRuntime?: string;
  mavenOpts?: string;
  mavenArgs?: string;
  endpoint: CfnOutput;
}

export class JMeterTest extends CodeBuildStep {
  constructor(id: string, props: JMeterTestProps) {
    const stepProps = {
      envFromCfnOutputs: {
        ENDPOINT: props.endpoint,
      },
      input: props.source,
      commands: [],
      partialBuildSpec: BuildSpec.fromObject({
        phases: {
          build: {
            commands: ['echo ${ENDPOINT}'],
          },
        },
        version: '0.2',
      }),
    };
    super(id, stepProps);
  }
}
