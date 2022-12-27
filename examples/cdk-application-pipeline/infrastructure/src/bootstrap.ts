#!/usr/bin/env ts-node 

import * as child from 'child_process';
import { STS } from '@aws-sdk/client-sts';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { loadSharedConfigFiles } from '@aws-sdk/shared-ini-file-loader';
import { prompts } from 'prompts';
import { Account } from './accounts';
import { accounts, Beta, Gamma, Prod } from './pipeline';


async function main() {
  // make sure all accounts are setup
  for (const accountName of ['toolchain', 'beta', 'gamma', 'production'] as const) {
    const account = accounts[accountName];
    accounts[accountName] = await promptAccount(`Select AWS profile for '${accountName}' account`, account?.profile);
  }
  Beta.account = accounts.beta;
  Gamma.account = accounts.gamma;
  Prod.account = accounts.production;
  accounts.store();

  const commands: string[] = [];

  // bootstrap toolchain
  const toolchainRegion = await getRegion(accounts.toolchain!.profile);
  const toolchainAccountId = accounts.toolchain!.accountId;
  commands.push(`npx cdk bootstrap --profile ${accounts.toolchain!.profile} aws://${toolchainAccountId}/${toolchainRegion}`);

  const policyArn = await prompts.text({
    type: 'text',
    name: 'policyArn',
    message: 'Managed Policy ARN for CloudFormation Excecution',
    initial: 'arn:aws:iam::aws:policy/AdministratorAccess',
  }) as unknown as string;
  'arn:aws:iam::aws:policy/AdministratorAccess';
  for (let account of [Beta, Gamma, Prod]) {
    const accountRegions = account.waves.flatMap(w => w.map(r => `aws://${account.account?.accountId}/${r}`)).join(' ');
    commands.push(`npx cdk bootstrap --profile ${account.account!.profile} --trust ${toolchainAccountId} --cloudformation-execution-policies ${policyArn} ${accountRegions}`);
  }


  if (process.env.npm_config_exec) {
    if (policyArn === 'arn:aws:iam::aws:policy/AdministratorAccess') {
      const confirmed = await prompts.confirm({
        type: 'confirm',
        name: 'confirm',
        message: 'You chose the `AdministratorAccess` policy which allows the trusted account full access to this account. Are you sure you want to do this?',
        initial: false,
      }) as unknown as boolean;
      if (!confirmed) {
        throw new Error();
      }
    }
    for (let command of commands) {
      console.log(command);
      const commandParts = command.split(/\s+/);
      const resp = child.spawnSync(commandParts[0], commandParts.slice(1), { stdio: 'inherit' });
      if (resp.status !== 0) {
        throw new Error(`${resp.status} - Error`);
      }
    }
  } else {
    console.log('\nRun the following commands to bootstrap your environments:\n');
    for (let command of commands) {
      console.log(command);
    }
  }
}

async function promptAccount(message: string, initialProfile?: string): Promise<Account> {
  const profile = await promptProfile(message, initialProfile);
  const accountId = await getAccountId(profile);

  return {
    profile,
    accountId,
  };
}

async function promptProfile(message: string, initialProfile?: string): Promise<string> {
  const config = await loadSharedConfigFiles();
  const profiles = Object.keys(config.configFile).sort();
  let initial = initialProfile?profiles.indexOf(initialProfile):undefined;
  if (initial === -1) { initial = undefined; }
  const profile = await prompts.select({
    type: 'select',
    name: 'profile',
    message,
    initial,
    choices: profiles.map(k => ({ title: k, value: k })),
  }) as unknown as string;

  return profile;
}

async function getAccountId(profile: string): Promise<string> {
  const client = new STS({
    credentials: fromNodeProviderChain({ profile }),
  });

  return (await client.getCallerIdentity({})).Account!;
}

async function getRegion(profile: string): Promise<string> {
  const client = new STS({
    credentials: fromNodeProviderChain({ profile }),
  });

  return client.config.region();
}

main().catch(console.error);
