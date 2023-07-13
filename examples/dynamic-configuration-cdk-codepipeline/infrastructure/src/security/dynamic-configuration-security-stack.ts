import { Stack, StackProps } from 'aws-cdk-lib';
import { ManagedPolicy, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { OrgPathsPrincipal } from './org-paths-principal';
import { Config, WorkloadEnvironment } from '../config';

export class DynamicConfigurationGlobalStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    workloadName: string,
    workloadEnvironments: WorkloadEnvironment[],
    props?: StackProps,
  ) {
    super(scope, id, props);
    workloadEnvironments.forEach((workloadEnvironment) => {
      const role = new Role(
        this,
        Config.generateName(workloadName, 'DynamicConfigRole', workloadEnvironment.name),
        {
          roleName: Config.generateName(
            workloadName,
            'DynamicConfigRole',
            workloadEnvironment.name,
          ),
          assumedBy: new OrgPathsPrincipal([
            // This is set to '*' all accounts in the workload organization path are expected to need access to the Dynamic Config
            [workloadEnvironment.workloadOrganizationPath, '*'].join('/'),
          ]),
        },
      );

      workloadEnvironment.getUniqueRegions().forEach((region) => {
        const policy = ManagedPolicy.fromManagedPolicyName(
          this,
          Config.generateName(
            'DynamicConfigPolicy',
            workloadName,
            workloadEnvironment.name,
            region,
          ),
          Config.generateName('DynamicConfigPolicy', workloadName, workloadEnvironment.name, region),
        );
        role.addManagedPolicy(policy);
      });
    });
  }
}
