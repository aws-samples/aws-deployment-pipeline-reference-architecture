import * as fs from 'fs';
import * as path from 'path';
import {
  CfnApplication,
  CfnConfigurationProfile,
  CfnConfigurationProfileProps,
  CfnHostedConfigurationVersion,
} from 'aws-cdk-lib/aws-appconfig';
import { Construct } from 'constructs';
import * as YAML from 'yaml';
import { Config } from '../config';

enum ConfigType {
  FEATURE_FLAGS = 'AWS.AppConfig.FeatureFlags',
  FREEFORM = 'AWS.Freeform',
}

abstract class DynamicConfig extends Construct {
  public readonly profile: CfnConfigurationProfile;
  public readonly version: CfnHostedConfigurationVersion;
  constructor(
    scope: Construct,
    public readonly name: string,
    public readonly region: string,
    application: CfnApplication,
    public readonly type: ConfigType,
    public readonly environmentName: string | undefined = undefined,
  ) {
    super(scope, Config.generateName('config', name, environmentName, region));

    const profileProps: CfnConfigurationProfileProps = {
      applicationId: application.ref,
      locationUri: 'hosted',
      name: this.getConfigProfileName(),
      type: this.type,
      validators: this.getValidators(),
    };

    this.profile = new CfnConfigurationProfile(
      this,
      Config.generateName('profile', name, environmentName, region),
      profileProps,
    );
    this.version = new CfnHostedConfigurationVersion(
      this,
      Config.generateName('version', name, environmentName, region),
      {
        applicationId: application.ref,
        configurationProfileId: this.profile.ref,
        content: JSON.stringify(this.getConfigVersionContent()),
        contentType: 'application/json',
      },
    );
  }

  protected loadConfigYamlData(fileName: string) {
    const filePath = path.join('config', this.name, fileName);
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      return YAML.parse(fileData, { prettyErrors: true });
    }
    return {};
  }

  abstract getValidators(): Array<CfnConfigurationProfile.ValidatorsProperty>;
  abstract getConfigVersionContent(): object;
  abstract getConfigProfileName(): string;
}

export class FeatureFlagDynamicConfig extends DynamicConfig {
  constructor(
    scope: Construct,
    public readonly name: string,
    public readonly region: string,
    application: CfnApplication,
  ) {
    super(scope, name, region, application, ConfigType.FEATURE_FLAGS);
  }

  getValidators(): Array<CfnConfigurationProfile.ValidatorsProperty> {
    return [];
  }

  getConfigVersionContent(): object {
    const flagDefinitions = Object.fromEntries(
      Object.entries(this.loadConfigYamlData('definitions.yaml')).map(
        ([flagName, flagAttributes]) => {
          const flagDef: any = { name: flagName };
          if (typeof flagAttributes == 'object') {
            flagDef.attributes = flagAttributes;
          }
          return [flagName, flagDef];
        },
      ),
    );
    const flagValues = this.loadConfigYamlData('values.yaml');

    const configValues = Object.fromEntries(
      Object.entries(flagValues).map(([flagName, flagValue]) => {
        const value: any = {
          enabled: false,
        };

        if (flagValue != null) {
          if (typeof flagValue === 'boolean') {
            value.enabled = flagValue;
          }
          if (typeof flagValue === 'object') {
            value.enabled = true;
            Object.entries(flagValue).forEach(([flagAttributeKey, flagAttributeValue]) => {
              value[flagAttributeKey] = flagAttributeValue;
            });
          }
        }
        return [flagName, value];
      }),
    );

    Object.keys(flagDefinitions).forEach((key) => {
      if (!configValues.hasOwnProperty(key)) {
        configValues[key] = { enabled: false };
      }
    });

    return {
      flags: flagDefinitions,
      values: configValues,
      version: '1',
    };
  }

  getConfigProfileName(): string {
    return this.name;
  }
}

export class OperationsDynamicConfig extends DynamicConfig {
  constructor(
    scope: Construct,
    public readonly name: string,
    public readonly region: string,
    application: CfnApplication,
    public readonly environmentName: string,
  ) {
    super(scope, name, region, application, ConfigType.FREEFORM, environmentName);
  }

  getValidators(): Array<CfnConfigurationProfile.ValidatorsProperty> {
    return [
      {
        content: this.getConfigSchema(),
        type: 'JSON_SCHEMA',
      },
    ];
  }

  getConfigVersionContent(): object {
    const result = this.loadConfigYamlData(`${this.environmentName.toLowerCase()}.yaml`);
    result.environment = this.environmentName;
    return result;
  }

  getConfigProfileName(): string {
    return `${this.name}-${this.environmentName}`;
  }

  getConfigSchema() {
    return fs.readFileSync(path.join('config', this.name, 'schema.json'), 'utf-8');
  }
}
