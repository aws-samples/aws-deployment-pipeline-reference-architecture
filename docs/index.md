# Overview

A deployment pipeline is the key architectural construct for performing [Continuous Delivery](https://aws.amazon.com/devops/continuous-integration/) and Continuous Deployment. It consists of a series of stages - source, build, test, and production (prod). Each stage consists of a collection of actions that automate tasks in the software delivery lifecycle. There are different types of deployment pipelines for different use cases.  

The Deployment Pipeline Reference Architecture (DPRA) for AWS workloads describes the stages and actions for different types of deployment pipelines that typically exist in modern enterprise systems. The DPRA also describes the practices teams can employ to increase the speed, stability, security, and quality of software systems through the use of deployment pipelines.

For a higher-level perspective, see Clare Liguori’s article in the Amazon Builder’s Library titled [Automating safe, hands-off deployments](https://aws.amazon.com/builders-library/automating-safe-hands-off-deployments).

Customers and 3rd party vendors can use the DPRA to create implementations - reference or otherwise - using their own set of services and tools. We have included a reference implementations that uses AWS and third-party tools. When an AWS service/tool is available, we list it; when there are no AWS services/tools, we list third-party tools. There are many third-party tools that can run on AWS so the ones we chose should only be seen as examples for illustrative purposes. Choose the best tool that meets the needs of your enterprise. 

Well-architected deployment pipelines possess the following attributes:

* **Defined as Code** - Everything necessary to deploy and run an appliction should be defined as code - code for pipelines, accounts, networking, infrastructure, applications/services, configuration, data, security, compliance, governance, auditing, and documentation – any aspect inside and outside software systems.

* **AWS Native** - Use fully-managed services to reduce complexity and undifferentiated infrastructure work.

* **Consistent** - The source code should only be built and packaged once. The packaged artifact should then be staged for deployment to all environments. Source code should never change or be rebuilt after the initial build. 

* **Small Batch** - The pipeline should be constructed in such a way as to encourage the delivery of software early and often. Likewise, the pipeline should discourage the use of long-lived branches and encourage trunk-based development.

* **Orchestrates** - As part of a deployment pipeline, every code change runs a fully-automated build, test, deploy, and release processes across all environments with required approvals. After success, each stage automatically transitions to the next stage of the pipeline. It stops on failures. A single pipeline should orchestrate the deployment to all environments rather than creating pipelines for each environment.

* **Fast Feedback** - Automatically notify engineers of build, test, quality, and security errors from deployment pipelines through the most effective means such as chat or email.

* **Always Deployable** - When a deployment pipeline error occurs, it becomes the top priority to commit the fix back to the source code repository’s mainline in less than 30 minutes so that it is always in a healthy state.

* **Measured** - Provide real-time metrics for code quality, speed (deployment frequency and deployment lead time), security (security control automation %, mean time to resolve security errors, and reliability (change failures and time to restore service). View metrics through a real-time dashboard. When instrumentation is not yet possible, create a [Likert](https://en.wikipedia.org/wiki/Likert_scale)-based questionnaire to determine these metrics across teams.

The DPRA covers the following deployment pipelines in detail:

<div class="cardwrapper">
    <div align="center" class="card">
        <h3>Application</h3>
        <p>
            Build, test, and deploy an application.
        </p>
        <a href="application-pipeline">Learn more ></a>
    </div>
    <div align="center" class="card">
        <h3>Compute Image</h3>
        <p>
            Build and publish machine or container images.
        </p>
        <a href="container-image-pipeline">Learn more ></a>
    </div>
    <div align="center" class="card">
        <h3>Account Fleet Management</h3>
        <p>
            Manage a fleet of AWS accounts through a pipeline.
        </p>
        <a href="account-fleet-management-pipeline">Learn more ></a>
    </div>
</div>
<div class="cardwrapper">
    <div align="center" class="card">
        <h3>Machine Learning</h3>
        <p>
            Train, test and deploy machine learning models.
        </p>
        <a href="machine-learning-pipeline">Learn more ></a>
    </div>
    <div align="center" class="card">
        <h3>Dynamic Configuration</h3>
        <p>
            Push application configuration changes. 
        </p>
        <a href="dynamic-configuration-deployment-pipeline">Learn more ></a>
    </div>
</div>
