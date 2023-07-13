import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Config } from '../src/config';
import { DynamicConfigurationCoreStack } from '../src/dynamic-configuration/dynamic-configuration-core-stack';

const context = {
  workloadName: 'food',
  dynamicConfigAccount: '123456789012',
  workloadEnvironments: [
    {
      name: 'alpha',
      workloadOrganizationPath: 'o-abc123/r-cde456/ou-efg789/ou-sg8d-xiaxfcr0',
      waves: [
        {
          name: 'alpha',
          regions: ['us-west-2'],
        },
      ],
    },
    {
      name: 'beta',
      workloadOrganizationPath: 'o-abc123/r-cde456/ou-efg789/ou-sg8d-xiaxfcr0',
      waves: [
        {
          name: 'beta',
          regions: ['us-west-2'],
        },
      ],
    },
    {
      name: 'gamma',
      workloadOrganizationPath: 'o-abc123/r-cde456/ou-efg789/ou-sg8d-4cqhcezd',
      waves: [
        {
          name: 'gamma',
          regions: ['us-east-1', 'eu-central-1'],
        },
      ],
    },
    {
      name: 'prod',
      workloadOrganizationPath: 'o-abc123/r-cde456/ou-efg789/ou-sg8d-kbps96iq',
      waves: [
        {
          name: 'Prod-Americas',
          regions: ['us-east-1', 'us-west-2'],
        },
        {
          name: 'Prod-Europe',
          regions: ['eu-central-1', 'eu-west-1'],
        },
      ],
    },
  ],
};

test('One AppCoinfig application is generated', () => {
  const app = new cdk.App({ context: context });
  const config = Config.load(app.node);
  const stack = new DynamicConfigurationCoreStack(
    app,
    'Core',
    config.workloadName,
    config.workloadEnvironments,
    {
      env: { account: '123456789012', region: 'us-east-1' },
    },
  );
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::AppConfig::Application', 1);
  template.hasResourceProperties('AWS::AppConfig::Application', { Name: 'food' });
});

test('SSM parameters are generated on us-east-1', () => {
  const app = new cdk.App({ context: context });
  const config = Config.load(app.node);
  const stack = new DynamicConfigurationCoreStack(
    app,
    'Core',
    config.workloadName,
    config.workloadEnvironments,
    {
      env: { account: '123456789012', region: 'us-east-1' },
    },
  );
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::SSM::Parameter', 10);
  template.hasResourceProperties('AWS::SSM::Parameter', {
    Name: 'application-food',
    Value: { Ref: 'Application' },
  });
  template.hasResourceProperties('AWS::SSM::Parameter', {
    Name: 'deploymentStrategy-food',
    Value: { Ref: 'DeploymentStrategy' },
  });
});

test('Environments are generated on us-east-1', () => {
  const app = new cdk.App({ context: context });
  const config = Config.load(app.node);
  const stack = new DynamicConfigurationCoreStack(
    app,
    'Core',
    config.workloadName,
    config.workloadEnvironments,
    {
      env: { account: '123456789012', region: 'us-east-1' },
    },
  );
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::AppConfig::Environment', 2);
  template.hasResourceProperties('AWS::AppConfig::Environment', { Name: 'gamma' });
  template.hasResourceProperties('AWS::AppConfig::Environment', { Name: 'prod' });
});
// codeIncludeReference {
test('Environments are generated on us-west-2', () => {
  const app = new cdk.App({ context: context });
  const config = Config.load(app.node);
  const stack = new DynamicConfigurationCoreStack(
    app,
    'Core',
    config.workloadName,
    config.workloadEnvironments,
    {
      env: { account: '123456789012', region: 'us-west-2' },
    },
  );
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::AppConfig::Environment', 3);
  template.hasResourceProperties('AWS::AppConfig::Environment', { Name: 'alpha' });
  template.hasResourceProperties('AWS::AppConfig::Environment', { Name: 'beta' });
  template.hasResourceProperties('AWS::AppConfig::Environment', { Name: 'prod' });
});
// }
test('Configuration profiles are generated on us-east-1', () => {
  const app = new cdk.App({ context: context });
  const config = Config.load(app.node);
  const stack = new DynamicConfigurationCoreStack(
    app,
    'Core',
    config.workloadName,
    config.workloadEnvironments,
    {
      env: { account: '123456789012', region: 'us-east-1' },
    },
  );
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::AppConfig::ConfigurationProfile', 3);
  template.hasResourceProperties('AWS::AppConfig::ConfigurationProfile', {
    Name: 'features',
    Type: 'AWS.AppConfig.FeatureFlags',
  });
  template.hasResourceProperties('AWS::AppConfig::ConfigurationProfile', {
    Name: 'operations-gamma',
    Type: 'AWS.Freeform',
  });
  template.hasResourceProperties('AWS::AppConfig::ConfigurationProfile', {
    Name: 'operations-prod',
    Type: 'AWS.Freeform',
  });
});

test('Configuration profiles are generated on us-west-2', () => {
  const app = new cdk.App({ context: context });
  const config = Config.load(app.node);
  const stack = new DynamicConfigurationCoreStack(
    app,
    'Core',
    config.workloadName,
    config.workloadEnvironments,
    {
      env: { account: '123456789012', region: 'us-west-2' },
    },
  );
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::AppConfig::ConfigurationProfile', 4);
  template.hasResourceProperties('AWS::AppConfig::ConfigurationProfile', {
    Name: 'features',
    Type: 'AWS.AppConfig.FeatureFlags',
  });
  template.hasResourceProperties('AWS::AppConfig::ConfigurationProfile', {
    Name: 'operations-alpha',
    Type: 'AWS.Freeform',
  });
  template.hasResourceProperties('AWS::AppConfig::ConfigurationProfile', {
    Name: 'operations-beta',
    Type: 'AWS.Freeform',
  });
  template.hasResourceProperties('AWS::AppConfig::ConfigurationProfile', {
    Name: 'operations-prod',
    Type: 'AWS.Freeform',
  });
});

test('HostedConfigurationVersions are generated on us-east-1', () => {
  const app = new cdk.App({ context: context });
  const config = Config.load(app.node);
  const stack = new DynamicConfigurationCoreStack(
    app,
    'Core',
    config.workloadName,
    config.workloadEnvironments,
    {
      env: { account: '123456789012', region: 'us-east-1' },
    },
  );
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::AppConfig::HostedConfigurationVersion', 3);
  template.hasResourceProperties('AWS::AppConfig::HostedConfigurationVersion', {
    Content:
      '{"flags":{"classification":{"name":"classification"}},"values":{"classification":{"enabled":true}},"version":"1"}',
  });
  template.hasResourceProperties('AWS::AppConfig::HostedConfigurationVersion', {
    Content: '{"logLevel":"WARN","environment":"gamma"}',
  });
  template.hasResourceProperties('AWS::AppConfig::HostedConfigurationVersion', {
    Content: '{"logLevel":"ERROR","environment":"prod"}',
  });
});

test('HostedConfigurationVersions are generated on us-west-2', () => {
  const app = new cdk.App({ context: context });
  const config = Config.load(app.node);
  const stack = new DynamicConfigurationCoreStack(
    app,
    'Core',
    config.workloadName,
    config.workloadEnvironments,
    {
      env: { account: '123456789012', region: 'us-west-2' },
    },
  );
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::AppConfig::HostedConfigurationVersion', 4);
  template.hasResourceProperties('AWS::AppConfig::HostedConfigurationVersion', {
    Content:
      '{"flags":{"classification":{"name":"classification"}},"values":{"classification":{"enabled":true}},"version":"1"}',
  });
  template.hasResourceProperties('AWS::AppConfig::HostedConfigurationVersion', {
    Content: '{"logLevel":"DEBUG","environment":"alpha"}',
  });
  template.hasResourceProperties('AWS::AppConfig::HostedConfigurationVersion', {
    Content: '{"logLevel":"DEBUG","environment":"beta"}',
  });
  template.hasResourceProperties('AWS::AppConfig::HostedConfigurationVersion', {
    Content: '{"logLevel":"ERROR","environment":"prod"}',
  });
});

test('HostedConfigurationVersions are generated on us-east-1', () => {
  const app = new cdk.App({ context: context });
  const config = Config.load(app.node);
  const stack = new DynamicConfigurationCoreStack(
    app,
    'Core',
    config.workloadName,
    config.workloadEnvironments,
    {
      env: { account: '123456789012', region: 'us-east-1' },
    },
  );
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::IAM::ManagedPolicy', 2);
  template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
    ManagedPolicyName: `DynamicConfigPolicy-${context.workloadName}-gamma-us-east-1`,
    Description: 'Grants access to AppConfig',
  });
  template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
    ManagedPolicyName: `DynamicConfigPolicy-${context.workloadName}-prod-us-east-1`,
    Description: 'Grants access to AppConfig',
  });
});

test('HostedConfigurationVersions are generated on us-west-2', () => {
  const app = new cdk.App({ context: context });
  const config = Config.load(app.node);
  const stack = new DynamicConfigurationCoreStack(
    app,
    'Core',
    config.workloadName,
    config.workloadEnvironments,
    {
      env: { account: '123456789012', region: 'us-west-2' },
    },
  );
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::IAM::ManagedPolicy', 3);
  template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
    ManagedPolicyName: `DynamicConfigPolicy-${context.workloadName}-alpha-us-west-2`,
    Description: 'Grants access to AppConfig',
  });
  template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
    ManagedPolicyName: `DynamicConfigPolicy-${context.workloadName}-beta-us-west-2`,
    Description: 'Grants access to AppConfig',
  });
  template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
    ManagedPolicyName: `DynamicConfigPolicy-${context.workloadName}-prod-us-west-2`,
    Description: 'Grants access to AppConfig',
  });
});
