import { Stack, StackProps } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Config, WorkloadEnvironment } from '../config';

export class ServiceDiscoveryStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    workloadName: string,
    dynamicConfigAccountNumber: string,
    workloadEnvironments: WorkloadEnvironment[],
    props?: StackProps,
  ) {
    super(scope, id, props);
    workloadEnvironments.forEach((workloadEnvironment) => {
      const roleArn = Stack.of(this).formatArn({
        region: '',
        service: 'iam',
        account: dynamicConfigAccountNumber,
        resource: 'role',
        resourceName: Config.generateName(
          workloadName,
          'DynamicConfigRole',
          workloadEnvironment.name,
        ),
      });

      new StringParameter(
        this,
        Config.generateName(workloadName, 'DynamicConfigRoleParameter', workloadEnvironment.name),
        {
          parameterName: `/${workloadName}/dynamic_config_role-${workloadEnvironment.name}`,
          stringValue: roleArn,
        },
      );
    });
  }
}
