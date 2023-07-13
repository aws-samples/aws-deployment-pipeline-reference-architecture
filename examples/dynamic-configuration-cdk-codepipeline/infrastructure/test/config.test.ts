import * as cdk from 'aws-cdk-lib';
import { Config } from '../src/config';

const context = {
  workloadName: 'food',
  dynamicConfigAccount: '123456789012',
  workloadEnvironments: [
    {
      name: 'alpha',
      workloadOrganizationPath: 'o-wtyjfv84ln/r-sg8d/ou-sg8d-ejjbxgod/ou-sg8d-xiaxfcr0',
      waves: [
        {
          name: 'alpha',
          regions: ['us-west-2'],
        },
      ],
    },
    {
      name: 'gamma',
      workloadOrganizationPath: 'o-wtyjfv84ln/r-sg8d/ou-sg8d-ejjbxgod/ou-sg8d-4cqhcezd',
      waves: [
        {
          name: 'gamma-east',
          regions: ['us-east-1'],
        },
        {
          name: 'gamma-west',
          regions: ['us-west-2'],
        },
      ],
    },
    {
      name: 'prod',
      workloadOrganizationPath: 'o-wtyjfv84ln/r-sg8d/ou-sg8d-ejjbxgod/ou-sg8d-kbps96iq',
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

const app = new cdk.App({ context: context });
const config = Config.load(app.node);

test('getWorkloadEnvironment returns alpha', () => {
  const workloadEnv = config.getWorkloadEnvironment('alpha');
  expect(workloadEnv.name).toBe('alpha');
  expect(workloadEnv.workloadOrganizationPath).toBe(
    'o-wtyjfv84ln/r-sg8d/ou-sg8d-ejjbxgod/ou-sg8d-xiaxfcr0',
  );
  expect(workloadEnv.waves.length).toBe(1);
});

test('getWorkloadEnvironment returns gamma', () => {
  const workloadEnv = config.getWorkloadEnvironment('gamma');
  expect(workloadEnv.name).toBe('gamma');
  expect(workloadEnv.workloadOrganizationPath).toBe(
    'o-wtyjfv84ln/r-sg8d/ou-sg8d-ejjbxgod/ou-sg8d-4cqhcezd',
  );
  expect(workloadEnv.waves.length).toBe(2);
});

test('getWorkloadEnvironment returns prod', () => {
  const workloadEnv = config.getWorkloadEnvironment('gamma');
  expect(workloadEnv.name).toBe('gamma');
  expect(workloadEnv.workloadOrganizationPath).toBe(
    'o-wtyjfv84ln/r-sg8d/ou-sg8d-ejjbxgod/ou-sg8d-4cqhcezd',
  );
  expect(workloadEnv.waves.length).toBe(2);
});

test('getWorkloadEnvironment does not find badname environment', () => {
  const workloadEnv = config.getWorkloadEnvironment('badname');
  expect(workloadEnv).toBe(undefined);
});

test('updateWorkflowEnvironment for existing environment', () => {
  let envName = 'alpha',
    orgPath = 'abc123/def456/ghi789';
  const alphaEnv = config.getWorkloadEnvironment(envName);
  alphaEnv.workloadOrganizationPath = orgPath;
  config.updateWorkflowEnvironment(alphaEnv);
  expect(alphaEnv.name).toBe(envName);
  expect(alphaEnv.workloadOrganizationPath).toBe(orgPath);
});

test('updateWorkflowEnvironment for missing environment', () => {
  let betaName = 'beta';
  let betaOrgPath = 'radonmstring/from/orgpath/adfadf';
  let betaEnv = config.getWorkloadEnvironment(betaName);
  expect(betaEnv).toBe(undefined);

  const alphaEnv = config.getWorkloadEnvironment('alpha');
  alphaEnv.name = betaName;
  alphaEnv.workloadOrganizationPath = betaOrgPath;
  config.updateWorkflowEnvironment(alphaEnv);

  betaEnv = config.getWorkloadEnvironment(betaName);
  expect(betaEnv.name).toBe(betaName);
  expect(betaEnv.workloadOrganizationPath).toBe(betaOrgPath);
});

test('logWorkloadEnvironmentData does not find badname environment', () => {
  const workloadEnv = config.getWorkloadEnvironment('badname');
  expect(workloadEnv).toBe(undefined);
});

test('logWorkloadEnvironmentData does not find badname environment', () => {
  const localConfig = Config.load(app.node);
  let expectedString = JSON.stringify(
    {
      dynamicConfigAccount: context.dynamicConfigAccount,
      workloadEnvironments: context.workloadEnvironments,
    },
    null,
    2,
  );
  const logSpy = jest.spyOn(global.console, 'log');
  localConfig.logWorkloadEnvironmentData();
  expect(logSpy).toHaveBeenCalled();
  expect(logSpy).toHaveBeenCalledTimes(1);
  expect(logSpy).toHaveBeenCalledWith(expectedString);
});
