import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DynamicConfigurationCoreStack } from './dynamic-configuration-core-stack';
import { WorkloadEnvironment } from '../config';

export class DynamicConfigurationCoreStage extends Stage {
  constructor(
    scope: Construct,
    id: string,
    workloadName: string,
    workloadEnvironments: WorkloadEnvironment[],
    solutionCode: string,
    props?: StageProps,
  ) {
    super(scope, id, props);
    new DynamicConfigurationCoreStack(
      this,
      'DynamicConfiguration',
      workloadName,
      workloadEnvironments,
      {
        description: `${workloadName} DynamicConfigurationCore (${solutionCode})`,
        env: props?.env,
      },
    );
  }
}
