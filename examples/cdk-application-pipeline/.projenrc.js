const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.36.0',
  defaultReleaseBranch: 'main',
  name: 'dpri',
  srcdir: 'infrastructure/src',
  testdir: 'infrastructure/test',
  githubOptions: {
    mergify: false,
    workflows: false,
  },
  pullRequestTemplate: false,
  gitignore: ['target/', '.vscode/'],
  context: {
    deployMode: 'pipeline',
  },

  scripts: {
    bootstrap: 'npx ts-node -P tsconfig.json --prefer-ts-exts  infrastructure/src/bootstrap.ts',
  },

  /* Runtime dependencies of this module. */
  deps: [
    '@types/aws-lambda',
    '@types/prompts',
    '@aws-sdk/client-codeguru-reviewer',
    '@aws-sdk/client-codepipeline',
    '@aws-sdk/client-codedeploy',
    '@aws-sdk/client-sts',
    '@aws-sdk/shared-ini-file-loader',
    '@aws-cdk/aws-synthetics-alpha',
    '@aws-sdk/credential-providers',
    'prompts',
    'yaml',
  ],

  jestOptions: {
    jestVersion: '^27.0',
  },

  /* Build dependencies for this module. */
  devDeps: [
    'cdk-nag',
  ],

  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.eslint.addRules({
  'padding-line-between-statements': [
    'error',
    { blankLine: 'always', prev: '*', next: 'return' },
  ],
});
project.synth();