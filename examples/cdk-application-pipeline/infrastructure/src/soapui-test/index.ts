import { CfnOutput } from 'aws-cdk-lib';
import { BuildSpec, Cache, LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CodeBuildStep, CodePipelineSource } from 'aws-cdk-lib/pipelines';

export interface SoapUITestProps {
  source: CodePipelineSource;
  javaRuntime?: string;
  mavenOpts?: string;
  mavenArgs?: string;
  endpoint: CfnOutput;
  cacheBucket?: Bucket;
}

export class SoapUITest extends CodeBuildStep {
  constructor(id: string, props: SoapUITestProps) {
    const stepProps = {
      envFromCfnOutputs: {
        ENDPOINT: props.endpoint,
      },
      input: props.source,
      commands: [],
      buildEnvironment: {
        buildImage: LinuxBuildImage.STANDARD_6_0,
      },
      partialBuildSpec: BuildSpec.fromObject({
        env: {
          variables: {
            MAVEN_OPTS: props.mavenOpts || '-XX:+TieredCompilation -XX:TieredStopAtLevel=1',
            MAVEN_ARGS: props.mavenArgs || '--batch-mode --no-transfer-progress',
          },
        },
        phases: {
          install: {
            'runtime-versions': {
              java: (props.javaRuntime || 'corretto17'),
            },
          },
          build: {
            commands: ['mvn ${MAVEN_ARGS} soapui:test -Dsoapui.endpoint=${ENDPOINT}'],
          },
        },
        cache: props.cacheBucket ? {
          paths: ['/root/.m2/**/*'],
        } : undefined,
        reports: {
          e2e: {
            'files': ['target/soapui-reports/*.xml'],
            'file-format': 'JUNITXML',
          },
        },
        version: '0.2',
      }),
      cache: props.cacheBucket ? Cache.bucket(props.cacheBucket) : undefined,
    };
    super(id, stepProps);
  }
}
