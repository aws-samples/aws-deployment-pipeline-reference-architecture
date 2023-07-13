#!/usr/bin/env ts-node
import { exec } from "child_process";

import { DescribeRegionsCommand, EC2Client } from "@aws-sdk/client-ec2";
import { loadSharedConfigFiles } from "@aws-sdk/shared-ini-file-loader";

import _ from "lodash";
import { prompts } from "prompts";
import { Config, Wave, WorkloadEnvironment } from "../infrastructure/src/config";

async function main() {
  let config = Config.load();
  const allRegions = await getAllRegions();
  const prompt = new Prompt(allRegions);

  let editConfig = true;
  if (config.dynamicConfigAccount && config.workloadEnvironments?.length > 0) {
    editConfig = await prompt.confirm("Would you like to edit the current configuration?");
  }

  if (editConfig) {
    config.dynamicConfigAccount = await prompt.account(
      config.dynamicConfigAccount,
      "dynamic_configuration"
    );

    const workloadEnvironmentNames = await prompt.workloadEnvironmentNames(
      config.workloadEnvironments.map((workloadEnvironment) => workloadEnvironment.name)
    );

    for (const workloadEnvironmentName of workloadEnvironmentNames) {
      const workloadEnvironment = config.getWorkloadEnvironment(workloadEnvironmentName) || {
        name: workloadEnvironmentName,
        waves: [],
      };
      config.updateWorkflowEnvironment(await prompt.workloadEnvironment(workloadEnvironment));
    }

    console.log();
    const shouldDisplay = await prompt.confirm("Would you like to see the updated config?");
    if (shouldDisplay) {
      config.logWorkloadEnvironmentData();
    }

    const shouldSave = await prompt.confirm("Save updates?");
    if (shouldSave) {
      config.saveChanges();
    } else {
      config = Config.load();
      console.log("Updates have been discarded");
    }
  }

  const generateBootstrapCommands = await prompt.confirm(
    "Would you like to generate the bootstrap commands?",
    false
  );

  if (generateBootstrapCommands) {
    const commands: string[] = [];

    const adminPolicyArn = "arn:aws:iam::aws:policy/AdministratorAccess";
    const policyArn = await prompt.text(
      "Managed Policy ARN for CloudFormation Excecution",
      adminPolicyArn
    );

    // get profiles
    const toolchainProfile = await prompt.profile("toolchain");
    const dynamicConfigProfile = await prompt.profile("dynamic_config");

    // bootstrap toolchain
    const toolchainAccount = (
      await execute(
        `aws sts get-caller-identity --profile=${toolchainProfile} --query="Account" --output text`
      )
    ).trim();
    const toolchainRegion = (
      await execute(`aws configure get region --profile ${toolchainProfile}`)
    ).trim();
    commands.push(
      `npx cdk bootstrap --profile ${toolchainProfile} aws://${toolchainAccount}/${toolchainRegion}`
    );

    // bootstrap dynamic_config

    const dynamicConfigAccountRegions = config
      .getUniqueRegions()
      .map((region) => `aws://${config.dynamicConfigAccount}/${region}`)
      .join(" ");
    commands.push(
      `npx cdk bootstrap --profile ${dynamicConfigProfile} --trust ${toolchainAccount} --cloudformation-execution-policies ${policyArn} ${dynamicConfigAccountRegions}`
    );
    console.log(commands.join("\n"));
    console.log();

    const executeBootstrapCommands = await prompt.confirm(
      "Would you like to execute the bootstrap commands?",
      false
    );
    if (executeBootstrapCommands) {
      commands.forEach(execute);
    }
  }
}

class Prompt {
  constructor(public readonly allRegions: string[]) {}

  async account(currentAccount: string, accountName: string): Promise<string> {
    return await this.text(`${accountName} account number:`, currentAccount ?? "");
  }

  async workloadEnvironmentNames(currentWorkloadAccountNames: string[]): Promise<string[]> {
    const result = await prompts.list({
      type: "list",
      name: "value",
      message: "Workload environment names (comma-separated list):",
      initial: currentWorkloadAccountNames ? currentWorkloadAccountNames.join(",") : "",
      separator: ",",
    });
    if (_.size(result) == 1 && result[0] == "") {
      return [];
    }
    return result;
  }

  async wave(workloadEnvironment: WorkloadEnvironment, waveIndex: number): Promise<Wave | null> {
    const wave: Wave = workloadEnvironment.waves[waveIndex] || {};
    wave.name = await this.text(
      `Wave ${waveIndex + 1} name:`,
      wave?.name || `${workloadEnvironment.name}-${waveIndex}`
    );
    wave.regions = await this.regions(workloadEnvironment.name, wave);
    if (wave.regions.length == 0) {
      return null;
    }

    return wave;
  }

  async waves(workloadEnvironment: WorkloadEnvironment): Promise<Wave[]> {
    let waves: Wave[] = [];
    let numberOfWaves = workloadEnvironment?.waves?.length;
    numberOfWaves = (await prompts.number({
      type: "number",
      name: "numberOfWaves",
      message: "Number of waves:",
      initial: numberOfWaves,
    })) as unknown as number;

    if (numberOfWaves < 1) {
      numberOfWaves = 1;
    }

    for (let i = 0; i < numberOfWaves; i++) {
      const wave = await this.wave(workloadEnvironment, i);
      if (wave) {
        waves.push(wave);
      }
    }

    return waves;
  }

  async regions(accountName: string, wave: Wave): Promise<string[]> {
    const choices = this.allRegions.map((region) => ({
      title: region,
      value: region,
      selected: wave.regions?.includes(region) || false,
    }));
    // @ts-ignore
    return prompts.autocompleteMultiselect({
      type: "autocompleteMultiselect",
      name: "value",
      optionsPerPage: 20,
      message: `Select AWS regions for wave '${accountName}:${wave.name}'`,
      choices,
    });
  }

  async profile(environmentName: string): Promise<string> {
    const sharedConfig = await loadSharedConfigFiles();
    const profiles = Object.keys(sharedConfig.configFile).sort();
    return prompts.autocomplete({
      type: "autocomplete",
      name: "value",
      message: `Please select a profile for the '${environmentName}' environment`,
      choices: profiles.map((k) => ({ title: k, value: k })),
    });
  }

  async workloadEnvironment(
    workloadEnvironment: WorkloadEnvironment
  ): Promise<WorkloadEnvironment> {
    console.log();

    console.log(`Provide details for the '${workloadEnvironment.name}' workload environment:`);
    workloadEnvironment.workloadOrganizationPath = await this.text(
      "Organization Path:",
      workloadEnvironment.workloadOrganizationPath
    );

    if (workloadEnvironment.workloadOrganizationPath.startsWith("/")) {
      workloadEnvironment.workloadOrganizationPath =
        workloadEnvironment.workloadOrganizationPath.substring(1);
    }
    if (workloadEnvironment.workloadOrganizationPath.endsWith("/")) {
      workloadEnvironment.workloadOrganizationPath =
        workloadEnvironment.workloadOrganizationPath.substring(
          0,
          workloadEnvironment.workloadOrganizationPath.length - 1
        );
    }

    workloadEnvironment.waves = await this.waves(workloadEnvironment);

    return workloadEnvironment;
  }

  async confirm(message: string, initial: boolean = true): Promise<boolean> {
    return (await prompts.confirm({
      type: "confirm",
      name: "value",
      message,
      initial,
    })) as unknown as boolean;
  }

  async text(message: string, initial: string = ""): Promise<string> {
    return (await prompts.text({
      type: "text",
      name: "value",
      message,
      initial,
    })) as unknown as string;
  }
}

function execute(command: string): Promise<string> {
  /**
   * @param {Function} resolve A function that resolves the promise
   * @param {Function} reject A function that fails the promise
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
   */
  return new Promise(function (resolve, reject) {
    /**
     * @param {Error} error An error triggered during the execution of the childProcess.exec command
     * @param {string|Buffer} standardOutput The result of the shell command execution
     * @param {string|Buffer} standardError The error resulting of the shell command execution
     * @see https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
     */
    exec(command, function (error: any, standardOutput: any, standardError: any) {
      if (error) {
        console.log('Error: Does the selected profile have the proper access rights to run the command?');
        reject(error);
        return;
      }
      if (standardError) {
        reject(standardError);
        return;
      }
      resolve(standardOutput);
    });
  });
}

const getAllRegions = async (): Promise<string[]> => {
  const client = new EC2Client({});
  const regions = await client.send(new DescribeRegionsCommand({}));
  const regionNames = regions.Regions?.map((region) => region.RegionName) as string[];
  return regionNames.sort();
};

main().catch(console.error);
