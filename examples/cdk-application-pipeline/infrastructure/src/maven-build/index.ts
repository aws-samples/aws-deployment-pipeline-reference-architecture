import { BuildSpec, Cache, LinuxBuildImage } from 'aws-cdk-lib/aws-codebuild';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CodeBuildStep, CodePipelineSource } from 'aws-cdk-lib/pipelines';

export interface MavenBuildProps {
  source: CodePipelineSource;
  javaRuntime?: string;
  mavenOpts?: string;
  mavenArgs?: string;
  mavenGoal?: string;
  cacheBucket?: Bucket;
}
export class MavenBuild extends CodeBuildStep {
  constructor(id: string, props: MavenBuildProps) {
    const stepProps = {
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
            commands: [`mvn \${MAVEN_ARGS} clean ${props.mavenGoal || 'verify'}`],
          },
        },
        cache: props.cacheBucket ? {
          paths: ['/root/.m2/**/*'],
        } : undefined,
        reports: {
          unit: {
            'files': ['target/surefire-reports/*.xml'],
            'file-format': 'JUNITXML',
          },
          integration: {
            'files': ['target/soapui-reports/*.xml'],
            'file-format': 'JUNITXML',
          },
        },
        version: '0.2',
      }),
      cache: props.cacheBucket ? Cache.bucket(props.cacheBucket) : undefined,
      primaryOutputDirectory: '.',
    };
    super(id, stepProps);
  }
}
