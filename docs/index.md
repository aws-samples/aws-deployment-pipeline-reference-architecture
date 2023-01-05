# Overview

A deployment pipeline is the key architectural construct for performing [Continuous Integration](https://aws.amazon.com/devops/continuous-integration/), [Delivery, and Deployment](https://aws.amazon.com/devops/continuous-delivery/). Pipelines consist of a series of stages like source, build, test, or deploy. Stages consist of automated tasks in the software delivery lifecycle. There are different types of deployment pipelines for different use cases.

The Deployment Pipeline Reference Architecture (DPRA) for AWS [workloads](#workload) describes the stages and actions for different types of pipelines that exist in modern systems. The DPRA also describes the practices teams employ to increase the velocity, stability, and security of software systems through the use of deployment pipelines. For a higher-level perspective, see Clare Liguori’s article in the Amazon Builder’s Library titled [Automating safe, hands-off deployments](https://aws.amazon.com/builders-library/automating-safe-hands-off-deployments).

Customers and third-party vendors can use the DPRA to create implementations - reference or otherwise - using their own set of services and tools. We have included reference implementations that use AWS and third-party tools. When an AWS service/tool is available, we list it; when there are no AWS services/tools, we list third-party tools. There are many third-party tools that can run on AWS so the ones we chose should only be seen as examples for illustrative purposes. Choose the best tool that meets the needs of your organization.

The DPRA covers the following deployment pipelines in detail:

<div class="cardwrapper">
    <a href="application-pipeline/index.html" class="card">
        <h3>Application</h3>
        <p>
            Build, test, and deploy an application.
        </p>
    </a>
    <a href="compute-image-pipeline" class="card disabled">
        <h3>Compute Image</h3>
        <p>
            Build and publish machine or container images.
        </p>
    </a>
    <a href="account-fleet-management-pipeline" class="card disabled">
        <h3>Account Fleet Management</h3>
        <p>
            Manage a fleet of AWS accounts through a pipeline.
        </p>
    </a>
    <a href="dynamic-configuration-pipeline/motivation.html" class="card disabled">
        <h3>Dynamic Configuration</h3>
        <p>
            Manage dynamic configuration for a workload.
        </p>
    </a>
</div>

## Architecture

A typical solution uses multiple or all of the pipelines in combination as follows:
![Architecture](architecture.drawio)

## Business Outcomes

Modern deployment pipelines create the following business outcomes:

* **Automation** - Everything necessary to build, test, deploy, and run an application should be defined as code - code for pipelines, accounts, networking, infrastructure, applications/services, configuration, data, security, compliance, governance, auditing, and documentation – any aspect inside and outside software systems.

* **Consistency** - The source code should only be built and packaged once. The packaged artifact should then be staged in a registry with appropriate metadata and ready for deployment to any [environment](#environment). Build artifacts only once and then promote them through the pipeline. The output of the pipeline should be versioned and able to be traced back to the source it was built from and from the business requirements that defined it.

* **Small Batches** - The pipeline should be constructed in such a way as to encourage the delivery of software early and often. This is accomplished by removing toil from the software delivery process through automation and fast feedback. Likewise, the pipeline should discourage the use of long-lived branches and encourage trunk-based development. Developers should be able to merge their changes to the trunk and deploy through the pipeline daily.

* **Orchestration** - As part of a deployment pipeline, every merged code change has a fully-automated build, test, publish, deploy, and release process run across all [environments](#environment). Each stage automatically transitions to the next stage of the pipeline upon success, or stops on failure. In some circumstances human approvals are necessary while organizations mature their automation practices. These approvals most often show up when automation is unable to assess the risk or specific context for approval. If used, human approvals should be used before production deployments only and should be reduced to a button-click interface that triggers an automated pipeline process to continue. A single pipeline should orchestrate the deployment to all [environments](#environment) rather than creating pipelines for each [environment](#environment).

* **Fast Feedback** - Automatically notify engineers as soon as possible of build, test, quality, and security errors from deployment pipelines through the most effective means such as chat or email.

* **Always Deployable** - When an error occurs in the mainline of a deployment pipeline, the top priority is to fix the build and ensure deployment obtains and remains in a healthy state before introducing any further changes. The pipeline should be the authoritative source for deciding if and when changes are ready to be released into production.

* **Measured** - Provide real-time metrics for code quality, speed (deployment frequency and deployment lead time), security (security control automation %, mean time to resolve security errors), and reliability (change failures and time to restore service). View metrics through a real-time dashboard. When instrumentation is not yet possible, create a [Likert](https://en.wikipedia.org/wiki/Likert_scale)-based questionnaire to determine these metrics across teams.

## Definitions

### Workload

A **workload** is a set of components that together deliver business value. A workload is usually the level of detail that business and technology leaders communicate about. Examples of workloads are marketing websites, e-commerce websites, the back-ends for a mobile app, analytic platforms, etc. Workloads vary in levels of architectural complexity, from static websites to architectures with multiple data stores and many components.

(source: [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html))

### Environment

An **environment** is an isolated target for deploying and testing a [workload](#workload) and its dependencies. Environments can be created for validating changes, achieving data compliance, or for improving resiliency. Example environments include creating separate AWS accounts for each developer, creating separate AWS accounts for staging and production, and using multiple regions for production traffic. Best practice is for each environment to run in a separate AWS account.
