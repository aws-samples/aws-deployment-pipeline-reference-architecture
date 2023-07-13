# Overview

Reference implementation of application pipeline from DPRA that includes a CI/CD pipeline to build an application and deploy via AWS CloudFormation across different accounts for each environment.

TODO: ADD Pipeline Diagram


This reference implementation contains the following significant components:

* [infrastructure/](infrastructure) - [Amazon CDK](https://aws.amazon.com/cdk/) code necessary to provision the pipeline (see [pipeline.ts](infrastructure/src/pipeline-stack.ts)). This directory also contains [tests](infrastructure/test/) for the infrastructure code, including SAST (static application security testing) with [cdk-nag](https://github.com/cdklabs/cdk-nag).

> **Warning**
> This reference implementation has intentionally not followed the following [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/) best practices to make it accessible by a wider range of customers. Be sure to address these before using this code for any workloads in your own environment.


## Prerequisites

Before beginning this walk through, you should have the following prerequisites:
TODO: Review prereqs below: number of accounts, Node.js version
* 5 AWS accounts (https://portal.aws.amazon.com/billing/signup) toolchain, dynamic configuration, beta, gamma and production configured through [AWS Organizations](https://aws.amazon.com/organizations/).
* AWS Command Line Interface (AWS CLI) (https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed
* AWS CDK (https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) installed.
* Node.js (https://nodejs.org/)(>= 10.13.0, except for versions 13.0.0 - 13.6.0) installed.
* Basic understanding of continuous integration/continuous development (CI/CD) Pipelines.

## Initial setup

1. Clone the repository from GitHub (https://github.com/aws-samples/aws-deployment-pipeline-reference-architecture):

```bash
git clone https://github.com/aws-samples/aws-deployment-pipeline-reference-architecture.git
cd aws-deployment-pipeline-reference-architecture/examples/dynamic-configuration-cdk-codepipeline
```

This reference implementation contains the following significant component:

* [infrastructure/](https://github.com/aws-samples/aws-deployment-pipeline-reference-architecture/blob/main/examples/cdk-application-pipeline/infrastructure) - Amazon CDK code necessary to provision the pipeline.
* [bootstrap.ts/](https://github.com/aws-samples/aws-deployment-pipeline-reference-architecture/blob/main/examples/cdk-application-pipeline/scripts/bootstrap.ts) - bootstrap script to configure your development environment.

2. To install dependencies run:

```bash
npm install
```

3. To bootstrap your AWS accounts for AWS CDK, run:

```bash
npx ts-node scripts/bootstrap.ts
```
<img alt="BootStrap-1 Diagram" src="docs/01-edit-current-config.png" height="40%" width="40%"></img>

Confirm that you want to edit the current cdk.json file configuration. Press `y` or `n`.

<img alt="BootStrap-2 Diagram" src="docs/02-dynamic-config-account-number.png" height="40%" width="40%"></img>

Enter the account number where ([AWS AppConfig](https://docs.aws.amazon.com/appconfig/) will be used to store dynamic configurations.

<img alt="BootStrap-3 Diagram" src="docs/03-workload-env-names.png" height="40%" width="40%"></img>

Enter the names of the workload [environments](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-environment.html).

The following questions will be asked for each [environment](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-environment.html) from the previous step:

<img alt="BootStrap-4 Diagram" src="docs/04-org-path-alpha.png" height="40%" width="40%"></img>

TODO: Explain org paths.

<img alt="BootStrap-5 Diagram" src="docs/05-number-of-waves.png" height="40%" width="40%"></img>

Enter number of deployment waves that will be used for this environment.

<img alt="BootStrap-6 Diagram" src="docs/06-alpha-wave-name.png" height="40%" width="40%"></img>

Enter the name for the wave.

<img alt="BootStrap-7 Diagram" src="docs/07-select-regions.png" height="40%" width="40%"></img>

Select the regions where the wave will be deployed.

<img alt="BootStrap-8 Diagram" src="docs/08-view-updated-config.png" height="40%" width="40%"></img>

Confirm if you want to view the updated subection of cdk.json pertaining to this configuration.

<img alt="BootStrap-9 Diagram" src="docs/09-save-changes.png" height="40%" width="40%"></img>

Confirm you would like to save the changes made.

<img alt="BootStrap-10 Diagram" src="docs/10-generate-bootstrap-commands.png" height="40%" width="40%"></img>

Select if you would like to generate the bootstrap commands.

<img alt="BootStrap-11 Diagram" src="docs/11-select-toolchain-env.png" height="40%" width="40%"></img>

Select the toolchain profile to be used for the bootstrap commands.

TODO: Once bootstrap.ts script is fixed update the steps below:

4. Run the following commands to bootstrap toolchain environment, account id `111111111111`:

```bash
npx cdk bootstrap --profile toolchain aws://111111111111/us-east-1
```

![BootStrap-3 Diagram](docs/bootstrap-3.png)

5. Run the following commands to bootstrap beta environment, account id `222222222222`:

```bash
npx cdk bootstrap --profile beta --trust 111111111111 --cloudformation-execution-policies 'arn:aws:iam::aws:policy/AdministratorAccess' aws://222222222222/us-west-2
```

6. Run the following commands to bootstrap gamma environment, account id `333333333333`:

```bash
npx cdk bootstrap --profile gamma --trust 111111111111 --cloudformation-execution-policies \
 arn:aws:iam::aws:policy/AdministratorAccess aws://333333333333/us-west-2 aws://333333333333/us-east-1
```

7. Run the following commands to bootstrap production environment, account id `444444444444`:

```bash
npx cdk bootstrap --profile production --trust 111111111111 --cloudformation-execution-policies \
 arn:aws:iam::aws:policy/AdministratorAccess aws://444444444444/us-west-2 aws://444444444444/us-east-1 aws://444444444444/eu-central-1 aws://444444444444/eu-west-1 aws://444444444444/ap-south-1 aws://444444444444/ap-southeast-2
```

To learn more about the CDK boostrapping process, see: https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html

## Pipeline Deploy

To deploy the pipeline to the toolchain AWS account run:

```bash
npx cdk deploy --profile toolchain --all --require-approval never
```

![Pipeline-1 Diagram](docs/pipeline-1.png)

Using AWS management console, login to `toolchain` account and click [AWS CodePipeline](https://us-east-1.console.aws.amazon.com/codesuite/codepipeline/home?region=us-east-1) to check the different stages of the pipeline.

![Fruit API Diagram](docs/fruit-api.png)

Here is the deployment to `Beta` environment.

![Beta-0 Diagram](docs/beta-0.png)

Here is the deployment to `Gamma` environment.

![Gamma-0 Diagram](docs/gamma-0.png)

Click the Review button to manually approve the *PromoteToProd.*

![Prod-0 Diagram](docs/prod-0.png)

Here is the deployment to `Prod-1` environment.

![Prod-1 Diagram](docs/prod-1.png)

Here is the deployment to `Prod-2` environment.

![Prod-2 Diagram](docs/prod-2.png)

Here is the application running in production in us-east-1 region.

![App Diagram](docs/app-1.png)

(OPTIONAL) If you'd like to make changes and deploy with the pipeline, you'll need to [setup Git for AWS CodeCommit](https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up.html) and then clone the new CodeCommit repository:

```bash
git clone https://git-codecommit.us-west-2.amazonaws.com/v1/repos/fruit-api
```

To fix failed Trivy scans, see: https://www.mojohaus.org/versions/versions-maven-plugin/index.html or https://docs.npmjs.com/packages-and-modules

## Pipeline Teardown

The cleanup task will take these actions:

1. Destroy the CDK app using: `npx cdk --profile dpra-toolchain destroy --all`
2. Empty and remove the CDKToolkit S3 staging buckets in all environments
2. Empty and remove the CDKToolkit ECR repository in all environments
3. Delete the CDKToolkit stacks in all environments

```bash
./infrastructure/src/cleanup.ts
```

NOTE: account removal is left to the account owner.