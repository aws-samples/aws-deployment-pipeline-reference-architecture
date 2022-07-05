# Overview

A deployment pipeline is the key architectural construct for performing [Continuous Delivery](https://aws.amazon.com/devops/continuous-integration/) and Continuous Deployment. It consists of a series of stages - source, build, test, and production (prod). Each stage consists of a collection of actions that automate tasks in the software delivery lifecycle. There are different types of deployment pipelines for different use cases.  

The Deployment Pipeline Reference Architecture (DPRA) for AWS workloads describes the stages and actions for different types of deployment pipelines that typically exist in modern enterprise systems. The DPRA also describes the practices teams can employ to increase the speed, stability, security, and quality of software systems through the use of deployment pipelines.

For a higher-level perspective, see Clare Liguori’s article in the Amazon Builder’s Library titled [Automating safe, hands-off deployments](https://aws.amazon.com/builders-library/automating-safe-hands-off-deployments).

Customers and 3rd party vendors can use the DPRA to create implementations - reference or otherwise - using their own set of services and tools. We have included a reference implementations that uses AWS and third-party tools. When an AWS service/tool is available, we list it; when there are no AWS services/tools, we list third-party tools. There are many third-party tools that can run on AWS so the ones we chose should only be seen as examples for illustrative purposes. Choose the best tool that meets the needs of your enterprise. 

Engineers define everything as code - code for pipelines, accounts, networking, infrastructure, applications/services, configuration, data, security, compliance, governance, auditing, and documentation – any aspect inside and outside software systems.

Use fully-managed services to reduce complexity and undifferentiated infrastructure work.

Automatically notify engineers of build, test, quality, and security errors from deployment pipelines through the most effective means such as chat or email.

When a deployment pipeline error occurs, it becomes the top priority to commit the fix back to the source code repository’s mainline in less than 30 minutes so that it is always in a healthy state.

Provide real-time metrics for code quality, speed (deployment frequency and deployment lead time), security (security control automation %, mean time to resolve security errors, and reliability (change failures and time to restore service). View metrics through a real-time dashboard. When instrumentation is not yet possible, create a [Likert](https://en.wikipedia.org/wiki/Likert_scale)-based questionnaire to determine these metrics across teams.

As part of a deployment pipeline, every code change runs fully-automated build, test, deploy, and release processes with required approvals. After success, each stage automatically transitions to the next stage of the pipeline. It stops on failures.

There are three common types of deployment pipelines: account fleet management, compute image, and app/service. Below, we describe each of these pipeline types and the actions that you might typically perform in these pipelines.