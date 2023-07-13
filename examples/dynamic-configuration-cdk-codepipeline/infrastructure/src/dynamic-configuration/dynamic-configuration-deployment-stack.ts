import { Stack, StackProps } from 'aws-cdk-lib';
import { CfnDeployment } from 'aws-cdk-lib/aws-appconfig';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Config, WorkloadEnvironment } from '../config';

export class DynamicConfigurationDeploymentStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    workloadName: string,
    workloadEnvironment: WorkloadEnvironment,
    props?: StackProps,
  ) {
    super(scope, id, props);
    const applicationRef = StringParameter.fromStringParameterName(
      this,
      'application',
      Config.generateName('application', workloadName),
    ).stringValue;
    const deploymentStrategyRef = StringParameter.fromStringParameterName(
      this,
      'deploymentStrategy',
      Config.generateName('deploymentStrategy', workloadName),
    ).stringValue;
    const environmentRef = StringParameter.fromStringParameterName(
      this,
      Config.generateName('environment', workloadName, workloadEnvironment.name),
      Config.generateName('environment', workloadName, workloadEnvironment.name),
    ).stringValue;

    const operationsProfileRef = StringParameter.fromStringParameterName(
      this,
      Config.generateName('operations-profile', workloadName, workloadEnvironment.name),
      Config.generateName('operations-profile', workloadName, workloadEnvironment.name),
    ).stringValue;
    const operationsVersionRef = StringParameter.fromStringParameterName(
      this,
      Config.generateName('operations-config-version', workloadName, workloadEnvironment.name),
      Config.generateName('operations-config-version', workloadName, workloadEnvironment.name),
    ).stringValue;

    const featuresProfileRef = StringParameter.fromStringParameterName(
      this,
      Config.generateName('features-profile', workloadName),
      Config.generateName('features-profile', workloadName),
    ).stringValue;
    const featuresVersionRef = StringParameter.fromStringParameterName(
      this,
      Config.generateName('features-config-version', workloadName),
      Config.generateName('features-config-version', workloadName),
    ).stringValue;

    const featuresDeployment = new CfnDeployment(
      this,
      Config.generateName('Deployment-features', workloadName),
      {
        applicationId: applicationRef,
        configurationProfileId: featuresProfileRef,
        configurationVersion: featuresVersionRef,
        deploymentStrategyId: deploymentStrategyRef,
        environmentId: environmentRef,
      },
    );

    const opsDeployment = new CfnDeployment(
      this,
      Config.generateName('Deployment-operations', workloadName, workloadEnvironment.name),
      {
        applicationId: applicationRef,
        configurationProfileId: operationsProfileRef,
        configurationVersion: operationsVersionRef,
        deploymentStrategyId: deploymentStrategyRef,
        environmentId: environmentRef,
      },
    );

    opsDeployment.addDependency(featuresDeployment);
  }
}
