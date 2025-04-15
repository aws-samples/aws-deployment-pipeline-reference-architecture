import * as fs from 'fs';

export interface Account {
  accountId: string;
  profile: string;
}

export enum AccountType {
  Toolchain = 'toolchain',
  Beta = 'beta',
  Gamma = 'gamma',
  Production = 'production',
}
export class Accounts {
  static readonly PATH = '.accounts.json';

  static load(): Accounts {
    try {
      const accounts = new Accounts();
      const jsonData = JSON.parse(fs.readFileSync(Accounts.PATH).toString());
      
      // Explicitly assign only known properties with type checking
      // if (jsonData.toolchain) accounts.setAccount('toolchain', jsonData.toolchain);
      // if (jsonData.beta) accounts.setAccount('beta', jsonData.beta);
      // if (jsonData.gamma) accounts.setAccount('gamma', jsonData.gamma);
      // if (jsonData.production) accounts.setAccount('production', jsonData.production);

      if (jsonData.toolchain) accounts.setAccount(AccountType.Toolchain, jsonData.toolchain);
      if (jsonData.beta) accounts.setAccount(AccountType.Beta, jsonData.beta);
      if (jsonData.gamma) accounts.setAccount(AccountType.Gamma, jsonData.gamma);
      if (jsonData.production) accounts.setAccount(AccountType.Production, jsonData.production);

      return accounts;
    } catch (e) {
      return new Accounts();
    }
  }

  _toolchain?: Account;
  _beta?: Account;
  _gamma?: Account;
  _production?: Account;
  

  get toolchain(): Account | undefined {
    return this._toolchain;
  }
  get beta(): Account | undefined {
    return this._beta;
  }
  get gamma(): Account | undefined {
    return this._toolchain;
  }
  get production(): Account | undefined {
    return this._production;
  }
  // Added setters
  set toolchain(value: Account | undefined) {
    this._toolchain = value;
  }

  set beta(value: Account | undefined) {
    this._beta = value;
  }

  set gamma(value: Account | undefined) {
    this._gamma = value;
  }

  set production(value: Account | undefined) {
    this._production = value;
  }
  // Setter method with validation
  private setAccount(type: AccountType, account: unknown): void {
    if (!this.isValidAccount(account)) {
      throw new Error(`Invalid account data for ${type}`);
    }
    
    switch (type) {
      case AccountType.Toolchain:
        this.toolchain=account;
        break;
      case AccountType.Beta:
        this.beta=account;
        break;
      case AccountType.Gamma:
        this.gamma=account;
        break;
      case AccountType.Production:
        this.production=account;
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
