# Overview

This project includes a workflow based upon the [AWS Deployment Pipeline Reference Architecture](https://aws-samples.github.io/aws-deployment-pipeline-reference-architecture)(DRPA). The workflow builds an application and deploys via AWS CDK across 3 different environment accounts. The application is a Java Spring Boot API that runs as an Amazon ECS Service with an Amazon Aurora database. The deployment pipeline deploys the application across three Amazon CodeCatalyst environments.

![deployment](https://d3b0zi1lejdhye.cloudfront.net/application-deployment-pipeline/deployment.png)

The CDK application deploys the following resources:

* **Amazon VPC -** provides the network requirements of the application including subnets, access control lists (ACLs), network address translation (NAT) gateways, internet gateways, and route tables.
* **ECS cluster -** runs the application as an ECS service.
* **ECS service -** manages the run and scaling of ECS tasks for the Java Spring Boot API.
* **Application load balancer -** provides public access to and load balancing of the Java Spring Boot API running in the ECS service.
* **Serverless RDS Aurora Cluster -** persistently stores data that is used by the Java Spring Boot API.
* **CloudWatch Synthetics Canary -** monitors the application through synthetic transactions and initiates CloudWatch alarms upon failure.

![pipeline](https://d3b0zi1lejdhye.cloudfront.net/application-deployment-pipeline/pipeline.png)

The Amazon CodeCatalyst workflow contains the following actions:

* **Software Composition Analysis (SCA)** - SCA uses [Trivy](https://github.com/aquasecurity/trivy-action) to review the dependencies in the application and to identify known security vulnerabilities.
* **Package** - Package uses [Maven](https://maven.apache.org/) to compile source code, run unit tests, and package an artifact to be run as an ECS service.
* **Synth** - Synth uses CDK to synthesize the infrastructure code as a CloudFormation template and perform Static Analysis Security Testing (SAST) of the infrastructure with [cdk-nag](https://github.com/cdklabs/cdk-nag).
* **Beta deploy** - Beta deploy performs a CDK deployment of the application to the beta environment. The deployment uses [AWS CodeDeploy](https://aws.amazon.com/codedeploy/) to manage a blue/green deployment with traffic shifting and automated rollback based on the canary alarms.
* **Beta testing** - Beta testing uses [SoapUI](https://www.soapui.org/) to run automated acceptance tests and uses [JMeter](https://jmeter.apache.org/) to run automated performance tests against the application that is deployed in the beta environment. Test reports are published to Amazon CodeCatalyst.
* **Gamma deploy** - Gamma deploy performs a CDK deployment of the application to the gamma environment. The deployment uses [AWS CodeDeploy](https://aws.amazon.com/codedeploy/) to manage a blue/green deployment with traffic shifting and automated rollback based on the canary alarms. Deployments are made to multiple regions in parallel groups called waves. The size of the save is configured by the blueprint.
* **Gamma Testing** use [SoapUI](https://www.soapui.org/) to run automated acceptance tests and [JMeter](https://jmeter.apache.org/) to run automated performance tests against the application deployed in the Gamma environment. Test reports are published to Amazon CodeCatalyst.
* **Production Deploy** performs a CDK deployment of the application to the Production environment. The deployment uses [AWS CodeDeploy](https://aws.amazon.com/codedeploy/) to manage a blue/green deployment with traffic shifting and automated rollback based on the canary alarms. Deployments are made to multiple regions in parallel groups called waves. The size of the wave is configured by the blueprint.

## Project Structure

There are two main folders: `src` and `infrastructure`.  The `src` folder contains a sample Java [Spring Boot](https://spring.io/projects/spring-boot)
Application called `fruit-api`.  The `infrastructure` folder contains a CDK application.  For more details visit
the [reference implementation](https://github.com/aws-samples/aws-deployment-pipeline-reference-architecture/tree/main/examples/cdk-application-pipeline)
of the DPRA.

## Spring Boot Sample Application

[Spring Boot](https://spring.io/projects/spring-boot) makes it easy to create stand-alone, production-grade Spring based 
Applications that you can "just run".  Spring Boot is written in java, and is provided as a sample web application.  

The Spring Boot Application is built using [Maven](https://maven.apache.org/what-is-maven.html). While some IDEs come
with maven pre-installed, you can install Maven via [Installing Apache Maven](https://maven.apache.org/install.html) on the
maven site. Spring Boot Applications are Java applications.  AWS maintains a production ready distribution of OpenJDK
called Amazon Corretto.  For more information and to download Corretto visit https://aws.amazon.com/corretto/.

Many IDEs support Spring Boot.  Here are some examples:

* [Cloud9](https://aws.amazon.com/cloud9/)
* [Jetbrains IntelliJ](https://www.jetbrains.com/idea/)
* [VS Code](https://code.visualstudio.com/)
* [Eclipse](https://www.eclipse.org/)
* [Netbeans](https://netbeans.apache.org/)

To build the Spring Boot Application, you can run the following command

```console
# mvn package
```

To test the Spring Boot Application you can run the following command:

```console
# mvn test
```

The Spring Boot Application uses MySQL as the Backend store of data.  For more information on MySQL visit 
https://www.mysql.com/.  Once the Spring Boot Application has been built, run the following command to run the app locally.

```console
# mvn spring-boot:run
```

### Important Files

Below is a description of important source code files.  

| File                                                          | Brief Description                                                                                                                                                                                                        |
|---------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| src/main/java/com/amazonaws/dpri/fruits/Fruit.java            | This file defines the POJO for a Fruit. Spring uses this file as part of objection relational mapping                                                                                                                    |
| src/main/java/com/amazonaws/dpri/fruits/FruitRepository.java  | This file defines the data access object (DAO).  It is implemented automatically by Spring                                                                                                                               |
| src/main/java/com/amazonaws/dpri/fruits/FruitController.java  | This file defines the REST API for the application                                                                                                                                                                       |
| src/main/java/com/amazonaws/dpri/fruits/FruitApplication.java | This file is the main method for the application                                                                                                                                                                         |
| src/main/resources/db/changelog/db.changelog-master.yaml      | The file describes the relational database structure for the application.  It relies on Liquibase. Visit [Liquibase Documentation](https://docs.liquibase.com/tools-integrations/springboot/springboot.html) for details |
| pom.xml                                                       | Maven dependencies file                                                                                                                                                                                                  |

Below is a description of important testing files.

| File                                                              | Brief Description                      |
|-------------------------------------------------------------------|----------------------------------------|
| src/test/java/com/amazonaws/dpri/fruits/FruitApplicationTest.java | Unit test that tests Spring autowiring |
| src/test/java/com/amazonaws/dpri/fruits/FruitControllerTest.java  | Unit tests for the DAO and Controller  |
| src/test/jmeter/fruit-api-jmeter.jmx                              | JMeter Load Test                       |

## CDK Application

The [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/) allows you to accelerate cloud development using common programming languages to model your applications.  It is an example of infrastructure as code (IaC).  While CDK support several languages, this CDK application is written in [TypeScript](https://www.typescriptlang.org/).  For more information on CDK and TypeScript visit https://cdkworkshop.com/. The CDK Application is built using [npm](https://www.npmjs.com/). There are several ways to install NPM and Node.js, which NPM relies upon. Visit https://docs.npmjs.com/downloading-and-installing-node-js-and-npm for details.

To build the cdk application, you can run the following command

```console
npm install
cdk synth
```

While Amazon CodeCatalyst has been set up to automatically deploy the application, if you wish to deploy it without using the CI/CD 
pipeline, you can run the following command

```console
cdk deploy --all
```

To execute unit tests for this application, you can do so using the following command.

```console
npm test
```

### Important Files

Below is a description of important source code files.

| File Name                                                | Brief Description                                                                                                             |
|----------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| infrastructure/src/main.ts                               | Main file for the CDK Application                                                                                             |
| infrastructure/src/deployment/index.ts                   | CDK Stack for Pipeline and Application Infrastructure                                                                         |
| infrastructure/src/deployment/synthetic.ts               | Custom Construct for AWS CloudWatch Synthetic Testing                                                                         |
| infrastructure/src/blue-green-deploy/index.ts            | Custom Construct for AWS ECS Blue Green Deployment                                                                            |
| infrastructure/src/blue-green-deploy/lambda/index.ts     | Lambda function to facilitate ECS Blue Green Deployment                                                                       |
| infrastructure/src/blue-green-deploy/lambda/package.json | Dependencies for Lambda function to facilitate ECS Blue Green Deployment.  CDK convert these dependencies into a Lambda Layer |

Below is a description of important testing files.

| File Name                                                 | Brief Description                         |
|-----------------------------------------------------------|-------------------------------------------|
| infrastructure/test/__snapshots__/deployment.test.ts.snap | Snapshot data to support Snapshot testing |
| infrastructure/test/deployment.test.ts                    | Unit Test Code                            |
