import { Stack, StackProps } from 'aws-cdk-lib';
import { CfnApplication, CfnDeploymentStrategy, CfnEnvironment } from 'aws-cdk-lib/aws-appconfig';
import { Effect, ManagedPolicy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { FeatureFlagDynamicConfig, OperationsDynamicConfig } from './dynamic-config';
import { Config, WorkloadEnvironment } from '../config';

export class DynamicConfigurationCoreStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    workloadName: string,
    workloadEnvironments: WorkloadEnvironment[],
    props?: StackProps,
  ) {
    super(scope, id, props);
    const application = new CfnApplication(this, 'Application', {
      name: workloadName,
    });
    new StringParameter(this, Config.generateName('application', workloadName, this.region), {
      parameterName: Config.generateName('application', workloadName),
      stringValue: application.ref,
    });

    const deploymentStrategy = new CfnDeploymentStrategy(this, 'DeploymentStrategy', {
      deploymentDurationInMinutes: 0,
      growthFactor: 100,
      growthType: 'LINEAR',
      name: Config.generateName('dynamic_config-deployment_strategy', workloadName),
      replicateTo: 'NONE',
    });
    new StringParameter(
      this,
      Config.generateName('deploymentStrategy', workloadName, this.region),
      {
        parameterName: Config.generateName('deploymentStrategy', workloadName),
        stringValue: deploymentStrategy.ref,
      },
    );

    const featuresDynamicConfig = new FeatureFlagDynamicConfig(
      this,
      'features',
      this.region,
      application,
    );
    new StringParameter(this, 'features-config-version', {
      parameterName: Config.generateName('features-config-version', workloadName),
      stringValue: featuresDynamicConfig.version.ref,
    });
    new StringParameter(this, 'features-profile', {
      parameterName: Config.generateName('features-profile', workloadName),
      stringValue: featuresDynamicConfig.profile.ref,
    });

    for (let workloadEnvironment of workloadEnvironments) {
      if (workloadEnvironment.getUniqueRegions().includes(this.region)) {
        const environmentName = `${workloadEnvironment.name}`;
        const environment = new CfnEnvironment(this, `Environment-${environmentName}`, {
          name: environmentName,
          applicationId: application.ref,
        });
        environment.addDependency(application);
        new StringParameter(
          this,
          Config.generateName('environment', workloadName, workloadEnvironment.name),
          {
            parameterName: Config.generateName(
              'environment',
              workloadName,
              workloadEnvironment.name,
            ),
            stringValue: environment.ref,
          },
        );

        const operationsDynamicConfig = new OperationsDynamicConfig(
          this,
          'operations',
          this.region,
          application,
          environmentName,
        );
        operationsDynamicConfig.node.addDependency(application);
        new StringParameter(
          this,
          Config.generateName('operations-profile', workloadName, workloadEnvironment.name),
          {
            parameterName: Config.generateName(
              'operations-profile',
              workloadName,
              workloadEnvironment.name,
            ),
            stringValue: operationsDynamicConfig.profile.ref,
          },
        );

        new StringParameter(
          this,
          Config.generateName('operations-config-version', workloadName, workloadEnvironment.name),
          {
            parameterName: Config.generateName(
              'operations-config-version',
              workloadName,
              workloadEnvironment.name,
            ),
            stringValue: operationsDynamicConfig.version.ref,
          },
        );

        const sidRegion = this.region.replace(/-/g, '');
        const getAppPolicy = new PolicyStatement({
          sid: `appconfigGetApplication${sidRegion}`,
          effect: Effect.ALLOW,
          resources: [
            `arn:aws:appconfig:${this.region}:${this.account}:application/${application.ref}`,
          ],
          actions: ['appconfig:GetApplication'],
        });

        const getEnvPolicy = new PolicyStatement({
          sid: `appconfigGetEnvironment${sidRegion}`,
          effect: Effect.ALLOW,
          resources: [
            `arn:aws:appconfig:${this.region}:${this.account}:application/${application.ref}/environment/${environment.ref}`,
          ],
          actions: ['appconfig:GetEnvironment'],
        });

        const appConfigProfilePolicy = new PolicyStatement({
          sid: `appConfigAppProfile${sidRegion}`,
          effect: Effect.ALLOW,
          resources: [
            `arn:aws:appconfig:${this.region}:${this.account}:application/${application.ref}/environment/${environment.ref}/configuration/${operationsDynamicConfig.profile.ref}`,
            `arn:aws:appconfig:${this.region}:${this.account}:application/${application.ref}/environment/${environment.ref}/configuration/${featuresDynamicConfig.profile.ref}`,
          ],
          actions: [
            'appconfig:GetLatestConfiguration',
            'appconfig:StartConfigurationSession',
            'appconfig:GetConfigurationProfile',
            'appconfig:GetConfiguration',
          ],
        });

        new ManagedPolicy(
          this,
          Config.generateName(
            'DynamicConfigPolicy',
            workloadName,
            workloadEnvironment.name,
            this.region,
          ),
          {
            managedPolicyName: Config.generateName(
              'DynamicConfigPolicy',
              workloadName,
              workloadEnvironment.name,
              this.region,
            ),
            description: 'Grants access to AppConfig',
            statements: [getAppPolicy, getEnvPolicy, appConfigProfilePolicy],
          },
        );
      }
    }
  }
}
