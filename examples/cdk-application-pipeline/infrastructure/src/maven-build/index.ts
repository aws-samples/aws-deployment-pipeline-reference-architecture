import { BuildSpec, Cache } from 'aws-cdk-lib/aws-codebuild';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { CodeBuildStep, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';

export interface MavenBuildProps {
  source: CodePipelineSource;
  javaRuntime?: string;
  mavenOpts?: string;
  mavenArgs?: string;
  mavenGoal?: string;
}
export class MavenBuild extends CodeBuildStep {
  constructor(scope: Construct, id: string, props: MavenBuildProps) {
    const cacheBucket = new Bucket(scope, `${id}CacheBucket`);
    const stepProps = {
      input: props.source,
      commands: [],
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
              java: (props.javaRuntime || 'corretto11'),
            },
          },
          build: {
            commands: [`mvn \${MAVEN_ARGS} clean ${props.mavenGoal || 'verify'}`],
          },
        },
        cache: {
          paths: ['/root/.m2/**/*'],
        },
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
      cache: Cache.bucket(cacheBucket),
      primaryOutputDirectory: '.',
    };
    super(id, stepProps);
  }
}
