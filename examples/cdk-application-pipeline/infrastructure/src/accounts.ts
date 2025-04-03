import * as fs from 'fs';

export interface Account {
  accountId: string;
  profile: string;
}

export class Accounts {
  static readonly PATH = '.accounts.json';

  static load(): Accounts {
    try {
      const accounts = new Accounts();
      const jsonData = JSON.parse(fs.readFileSync(Accounts.PATH).toString());
      
      // Explicitly assign only known properties with type checking
      if (jsonData.toolchain) accounts.setAccount('toolchain', jsonData.toolchain);
      if (jsonData.beta) accounts.setAccount('beta', jsonData.beta);
      if (jsonData.gamma) accounts.setAccount('gamma', jsonData.gamma);
      if (jsonData.production) accounts.setAccount('production', jsonData.production);

      return accounts;
    } catch (e) {
      return new Accounts();
    }
  }

  toolchain?: Account;
  beta?: Account;
  gamma?: Account;
  production?: Account;

  // Getter methods for controlled access
  getToolchain(): Account | undefined { return this.toolchain; }
  getBeta(): Account | undefined { return this.beta; }
  getGamma(): Account | undefined { return this.gamma; }
  getProduction(): Account | undefined { return this.production; }

  // Setter method with validation
  private setAccount(type: 'toolchain' | 'beta' | 'gamma' | 'production', account: unknown): void {
    if (!this.isValidAccount(account)) {
      throw new Error(`Invalid account data for ${type}`);
    }
    
    switch (type) {
      case 'toolchain':
        this.toolchain = account;
        break;
      case 'beta':
        this.beta = account;
        break;
      case 'gamma':
        this.gamma = account;
        break;
      case 'production':
        this.production = account;
        break;
    }
  }

  // Type guard to validate account structure
  private isValidAccount(account: unknown): account is Account {
    return (
      typeof account === 'object' &&
      account !== null &&
      'accountId' in account &&
      'profile' in account &&
      typeof (account as Account).accountId === 'string' &&
      typeof (account as Account).profile === 'string'
    );
  }

  store() {
    const safeObject = {
      toolchain: this.toolchain,
      beta: this.beta,
      gamma: this.gamma,
      production: this.production
    };
    fs.writeFileSync(Accounts.PATH, JSON.stringify(safeObject, null, 2));
  }
}
