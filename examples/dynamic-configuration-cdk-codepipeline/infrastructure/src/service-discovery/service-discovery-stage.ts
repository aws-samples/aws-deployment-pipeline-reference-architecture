import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ServiceDiscoveryStack } from './service-discovery-stack';
import { WorkloadEnvironment } from '../config';

export class ServiceDiscoveryStage extends Stage {
  constructor(
    scope: Construct,
    id: string,
    workloadName: string,
    dynamicConfigAccountNumber: string,
    workloadEnvironments: WorkloadEnvironment[],
    solutionCode: string,
    props?: StageProps,
  ) {
    super(scope, id, props);

    new ServiceDiscoveryStack(
      this,
      'DynamicConfiguration',
      workloadName,
      dynamicConfigAccountNumber,
      workloadEnvironments,
      {
        description: `${workloadName} ServiceDiscovery (${solutionCode})`,
        env: props?.env,
      },
    );
  }
}
