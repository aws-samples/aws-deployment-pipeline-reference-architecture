#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { Node } from 'constructs';

class Named {
  constructor(public name: string) {}
}
export class Wave extends Named {
  constructor(name: string, public regions: string[]) {
    super(name);
  }
}

export class WorkloadEnvironment extends Named {
  constructor(name: string, public workloadOrganizationPath: string, public waves: Wave[]) {
    super(name);
  }

  getUniqueRegions() {
    return Array.from(new Set(this.waves.flatMap((wave) => wave.regions)));
  }
}

const filePath = path.join(__dirname, '..', '..', 'cdk.json');
const readFile = () => JSON.parse(fs.readFileSync(filePath).toString());

export class Config {
  static load(node: Node | undefined = undefined): Config {
    const getContext = this.getContextGetter(node);

    const workloadEnvironments = getContext('workloadEnvironments', []).map(
      (workloadEnv: any) =>
        new WorkloadEnvironment(
          workloadEnv.name,
          workloadEnv.workloadOrganizationPath,
          workloadEnv.waves.map((wave: any) => new Wave(wave.name, wave.regions)),
        ),
    );
    return new Config(
      getContext('solutionCode'),
      getContext('workloadName'),
      getContext('dynamicConfigAccount'),
      workloadEnvironments,
    );
  }

  static generateName(name: string, token?: string, env?: string, region?: string): string {
    return [name, token, env, region]
      .filter(function (element) {
        return element !== undefined;
      })
      .join('-');
  }

  private static getContextGetter(node: Node | undefined = undefined) {
    if (node) {
      return (key: string, defaultValue: any | undefined = undefined) => {
        const result = node.tryGetContext(key);
        return result || defaultValue;
      };
    }
    const context = readFile().context;
    return (key: string, defaultValue: any | undefined = undefined) => {
      return context[key] || defaultValue;
    };
  }

  private constructor(
    public solutionCode: string,
    public workloadName: string,
    public dynamicConfigAccount: string,
    public readonly workloadEnvironments: WorkloadEnvironment[],
  ) {}

  public getWorkloadEnvironment(name: string) {
    return this.workloadEnvironments.filter(
      (workloadEnvironment) => workloadEnvironment.name == name,
    )[0];
  }

  public updateWorkflowEnvironment(workloadEnvironment: WorkloadEnvironment) {
    this.workloadEnvironments.forEach((item, index) => {
      if (item.name === workloadEnvironment.name) this.workloadEnvironments.splice(index, 1);
    });

    this.workloadEnvironments.push(workloadEnvironment);
  }

  public logWorkloadEnvironmentData() {
    console.log(
      JSON.stringify(
        {
          dynamicConfigAccount: this.dynamicConfigAccount,
          workloadEnvironments: this.workloadEnvironments,
        },
        null,
        2,
      ),
    );
  }

  public saveChanges() {
    const config = readFile();
    config.context.dynamicConfigAccount = this.dynamicConfigAccount;
    config.context.workloadEnvironments = this.workloadEnvironments;
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  }

  public getUniqueRegions(): string[] {
    var allRegions = this.workloadEnvironments.flatMap((workloadEnvironment: WorkloadEnvironment) =>
      workloadEnvironment.getUniqueRegions(),
    );
    return Array.from(new Set(allRegions));
  }
}
