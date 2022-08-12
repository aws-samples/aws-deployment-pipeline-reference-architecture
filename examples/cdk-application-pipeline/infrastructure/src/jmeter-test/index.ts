import { CfnOutput } from 'aws-cdk-lib';
import { BuildSpec, Cache } from 'aws-cdk-lib/aws-codebuild';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { CodeBuildStep, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';

export interface JMeterTestProps {
  source: CodePipelineSource;
  javaRuntime?: string;
  mavenOpts?: string;
  mavenArgs?: string;
  endpoint: CfnOutput;
  threads: number;
  duration: number;
  throughput: number;
}

export class JMeterTest extends CodeBuildStep {
  constructor(scope: Construct, id: string, props: JMeterTestProps) {
    const cacheBucket = new Bucket(scope, `${id}CacheBucket`, {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });
    const stepProps = {
      envFromCfnOutputs: {
        ENDPOINT: props.endpoint,
      },
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
            commands: [`mvn \${MAVEN_ARGS} compile jmeter:jmeter jmeter:results -Djmeter.endpoint=\${ENDPOINT} -Djmeter.threads=${props.threads} -Djmeter.duration=${props.duration} -Djmeter.throughput=${props.throughput}`],          },
        },
        cache: {
          paths: ['/root/.m2/**/*'],
        },
        reports: {
          e2e: {
            'files': ['target/soapui-reports/*.xml'],
            'file-format': 'JUNITXML',
          },
        },
        version: '0.2',
      }),
      cache: Cache.bucket(cacheBucket),
    };
    super(id, stepProps);
  }
}
