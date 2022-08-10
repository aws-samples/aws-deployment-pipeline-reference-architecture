# Overview

Reference implementation of application pipeline from DPRA.

## Setup

Install dependencies and build:

```bash
npm install yarn
yarn install
```

Create a new file [infrastructure/src/constants.ts](infrastructure/src/constants.ts) from [infrastructure/src/constants.example.ts](infrastructure/src/constants.example.ts] and update with your own AWS Account IDs:

```typescript
export const constants = {
  APP_NAME: 'fruit-api',
  TOOLCHAIN_ENV: { account: '00000000', region: 'us-west-2' },
  BETA_ENV: { account: '111111111', region: 'us-west-2' },
  GAMMA_ENV: { account: '222222222', region: 'us-west-2' },
  PROD_ENV: { account: '333333333', region: 'us-west-2' },
} as const;
```

## Tests

```bash
npm run build
```

## AWS Deployment

You need 4 AWS accounts: Toolchain, Beta, Gamma, Prod. First, bootstrap the toolchain account:

```bash
cdk bootstrap aws://<TOOLCHAIN_ACCOUNT_ID>
```

Next, bootstrap each environment account:

```bash
cdk bootstrap --trust <TOOLCHAIN_ACCOUNT_ID> aws://<BETA_ACCOUNT_ID>
cdk bootstrap --trust <TOOLCHAIN_ACCOUNT_ID> aws://<GAMMA_ACCOUNT_ID>
cdk bootstrap --trust <TOOLCHAIN_ACCOUNT_ID> aws://<PROD_ACCOUNT_ID>
```

Deploy:

```bash
npx cdk deploy
```
