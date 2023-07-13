import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DynamicConfigurationGlobalStack } from './dynamic-configuration-security-stack';
import { WorkloadEnvironment } from '../config';

export class DynamicConfigurationGlobalStage extends Stage {
  constructor(
    scope: Construct,
    id: string,
    workloadName: string,
    workloadEnvironments: WorkloadEnvironment[],
    solutionCode: string,
    props?: StageProps,
  ) {
    super(scope, id, props);
    new DynamicConfigurationGlobalStack(
      this,
      'DynamicConfiguration',
      workloadName,
      workloadEnvironments,
      {
        description: `${workloadName} DynamicConfigurationGlobal (${solutionCode})`,
        env: props?.env,
      },
    );
  }
}
