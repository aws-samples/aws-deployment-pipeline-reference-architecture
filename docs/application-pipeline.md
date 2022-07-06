# Application Pipeline

Applications and Services are the most common use case for a deployment pipeline. In this pipeline type, it will get application source code files, tests, static analysis, database deployment, configuration, and other code to perform build, test, deploy, and release processes. The pipeline launches an environment from the compute image artifacts generated in the compute image pipeline. Acceptance and other automated tests are run on the environment(s) as part of the deployment pipeline.

```graphviz dot pipeline.png
digraph G {
    rankdir=LR
    compound=true

    fontname="Helvetica,Arial,sans-serif"
    node [fontname="Helvetica,Arial,sans-serif"]
    edge [fontname="Helvetica,Arial,sans-serif"]

    subgraph cluster_build_service {
        label=<<b>Build Service</b>>
        node [shape=box style=filled fontcolor="white" width=2]

        rankdir="LR"
        build_code[label="Build Code"]
        code_quality[label="Code Quality"]
        appsec[label="AppSec"]
        unit_tests[label="Unit Tests"]
        secrets_detection[label="Secrets Detection"]
        code_review[label="Code Review"]

        edge [style=invis]
        build_code -> code_quality -> appsec
        unit_tests -> secrets_detection -> code_review
    }
    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        penwidth=4
        color="gold"
        node [shape=box style=filled color="forestgreen" fontcolor="white" width=2]
        edge [color="forestgreen"]

        subgraph cluster_source {
            label=<<b>Source</b>>
            graph[style=dashed penwidth=2 color="forestgreen"]

            app_src[label="Application Source"]
            test_src[label="Test Source"]
            db_src[label="Database Source"]
            static_assets[label="Static Assets"]
            libs[label="Dependency Libraries"]
            config[label="Configuration"]
        }
        subgraph cluster_build {
            label=<<b>Build Stage</b>>
            graph[style=dashed penwidth=2 color="forestgreen"]
            node [shape=box style=filled fontcolor="white" width=2]

            call_build_service[label="Build Service"] 
            package_artifacts[label="Package Artifacts"]
            sca[label="SCA"]
        }

        subgraph cluster_beta {
            label=<<b>Test (Beta) Stage</b>>
            graph[style=dashed penwidth=2 color="forestgreen"]
            node [shape=box style=filled fontcolor="white" width=2]

            launch_beta[label="Launch Env"] 
            db_deploy_beta[label="DB Deploy"]
            software_deploy_beta[label="Deploy Software"]
            acpt_test_beta[label="Acceptance Tests"]
            e2e_test_beta[label="E2E Tests"]
        }

        subgraph cluster_gamma {
            label=<<b>Test (Gamma) Stage</b>>
            graph[style=dashed penwidth=2 color="forestgreen"]
            node [shape=box style=filled fontcolor="white" width=3]

            launch_gamma[label="Launch Env"] 
            db_deploy_gamma[label="DB Deploy"]
            software_deploy_gamma[label="Deploy Software"]
            app_monitor_gamma[label="Application Monitoring & Logging"]
            int_test_gamma[label="Integration Tests"]
            cap_test_gamma[label="Capacity Tests"]
            metrics_gamma[label="Metrics Monitoring"]
            chaos_gamma[label="Chaos/Resiliency Tests"]
            canary_gamma[label="Canary Tests"]
            sbom_gamma[label="SBOM"]
        }

        subgraph cluster_prod {
            label=<<b>Prod Stage</b>>
            graph[style=dashed penwidth=2 color="forestgreen"]
            node [shape=box style=filled fontcolor="white" width=3]

            approval[label="Approval"]
            blue_green_deployment[label="Blue/Green Deployment"]
            synth_tests[label="Synthetic Tests"]
        }

        app_src -> call_build_service [ltail=cluster_source,lhead=cluster_build,penwidth=3,weight=10]
        call_build_service -> launch_beta [ltail=cluster_build,lhead=cluster_beta,penwidth=3,weight=10]
        launch_beta -> launch_gamma [ltail=cluster_beta,lhead=cluster_gamma,penwidth=3,weight=10]
        launch_gamma -> approval [ltail=cluster_gamma,lhead=cluster_prod,penwidth=3,weight=10]
    }

    call_build_service -> code_quality [lhead=cluster_build_service]
    build_code -> approval [lhead=cluster_pipeline,ltail=cluster_build_service,style=invis]
    ide[shape=box label="IDE" labelloc="t" image="docs/assets/person-icon.png"]
    ide -> build_code [lhead=cluster_build_service,weight=10]
    ide -> app_src [lhead=cluster_source]
}
```

```mermaid

flowchart
  ide[fa:fa-person IDE]

  subgraph pipeline
    direction LR
    subgraph source [Source Stage]
        direction LR
        app_src(Application Source)
        test_src(Test Source)
        db_src(Database Source)
        static_assets(Static Assets)
        libs(Dependency Libraries)
        config(Configuration)
    end
    ide -->|push| source

    subgraph build_service [Build Service]
        direction LR
        build_code(Build Code)
        code_quality(Code Quality)
        appsec(AppSec)
        unit_tests(Unit Tests)
        secrets_detection(Secrets Detection)
        code_review(Code Review)
    end
    style build_service stroke-width:2px,stroke-dasharray: 5 5
    ide -->|run| build_service

    subgraph build [Build Stage]
        call_build_service[[Build Service]] 
        package_artifacts(Package Artifacts)
        sca(SCA)
    end
    source --> build
    call_build_service -.-> |run| build_service
    package_artifacts -.-> |store| bin_repo[(Binary Repo)]

    beta_db[(2% Database)]
    image_repo[(Image Repo)]
    subgraph beta ["Test (Beta) Stage"]
        direction LR
        launch_beta[Launch Env] 
        db_deploy_beta[DB Deploy]
        software_deploy_beta[Deploy Software]
        acpt_test_beta[Acceptance Tests]
        e2e_test_beta[E2E Tests]
    end
    db_deploy_beta -.-> beta_db
    launch_beta -.-> |get| image_repo

    build --> beta

    prod_like_env[Prod-Like Environment]
    subgraph gamma ["Test (Gamma) Stage"]
        direction LR
        launch_gamma[Launch Env] 
        db_deploy_gamma[DB Deploy]
        software_deploy_gamma[Deploy Software]
        app_monitor_gamma[Application Monitoring & Logging]
        int_test_gamma[Integration Tests]
        cap_test_gamma[Capacity Tests]
        metrics_gamma[Metrics Monitoring]
        chaos_gamma[Chaos/Resiliency Tests]
        canary_gamma[Canary Tests]
        sbom_gamma[SBOM]
    end
    gamma -.-> prod_like_env

    beta --> gamma

    subgraph prod ["Prod Stage"]
        direction LR
        approval[Approval]
        blue_green_deployment[Blue/Green Deployment]
        synth_tests[Synthetic Tests]
    end
    prod -.-> prod_like_env

    gamma --> prod
  end
```

## Source

* Application Source Code
* Test Source Code
* Database Source Code
* Static Assets
* Dependency Libraries
* Configuration

All the above source code are versioned and securely accessed with role based access control with source code repositories such as AWS CodeCommit, GitHub, GitLab, Bitbucket, and others.

## Pre-Commit hooks

* *Secrets Detection* - Identify secrets such as usernames, passwords, and access keys in code and other files before they are published to a repository by using pre-commit hooks. When discovering secrets, the code push should fail immediately.
* *IDE Plugins* - Warn developers in their IDE using plugins and extensions such as. Examples could include markdown linters, yaml/json validators, and flake8/PEP8 code quality analyzers.

## Build

All actions run In this stage are also run on developers’ local environments prior to code commit and peer review. Actions in this stage should all run in less than 10 minutes so that developers can take action on quick feedback before moving on to their next task. If it’s taking more time, consider using more efficient tooling or moving some of the actions to latter stages. Each of the actions below are defined and run in code.

* *Build Code* - Convert code into artifacts that can be deployed to an environment. Most builds complete in seconds.
* *Code Quality* - Run various automated static analysis tools that generate reports on code quality, coding standards, security, code coverage, and other aspects according to the team and/or organization’s best practices. AWS recommends that teams alert other and fail the build when important practices are violated (e.g., a security violation is discovered in the code). These checks usually run in seconds. (e.g., SonarQube, Checkmarx)
* *Application Security* - Analyze code for application security violations such as XXE, SQLi, and XSS. Assess best practices for use of KMS, EC2 APIs and common crypto and TLS/SSL libraries (e.g., Amazon CodeGuru, Checkmarx, SonarQube)
* *Secrets Detection & Repo Cleansing* - Identify secrets such as usernames, passwords, and access keys in code and other files. When discovering secrets, the build fails and purges all secrets in the source code repo history. (e.g., Amazon CodeGuru, git-secrets, Checkov)
* *Unit Tests* - Run automated test code verify application code is performing according to expectations at the unit level. These are fast-running tests usually not taking more than a minute to run against a code base. These tests typically use assertion-based frameworks in defining the tests. (e.g., XUnit - JUnit, PyTest, jest, etc.)
* *Code Review* - Apply machine learning to evaluate common violations to industry best practices. When discovered, AWS recommends the build fails so that developers can fix the errors. (e.g., Amazon CodeGuru)
* *Software Composition Analysis* - Run software composition analysis (SCA) tools to find vulnerabilities to package repositories related to open source use, licensing, and security vulnerabilities. SCA tools also launch workflows to fix these vulnerabilities. (e.g., Snyk, Black Duck)
* *Package and Store Artifact(s)* - While the Build Code action should package most of the relevant artifacts, there may be additional steps to automate for packaged the code artifacts. Once packaged, automation is run in this action to store the artifacts in a binary repository. (e.g., AWS CodeArtifact)

## Test (Beta)

* *Launch Environment* - Consume the compute image from an image repository (e.g., AMI or a container repo) and launch an environment from the image (e.g., AWS CLI, AWS CDK/AWS CloudFormation, AWS CodePipeline, AWS CodeBuild)
* *Deploy Software* - Deploy software to the test environment.
* *Database deployment* - Apply changes to the database as code - i.e., the database structure and/or data (e.g., Liquibase, flywaydb)
* *Acceptance Tests* - Run automated tests that are linked to requirements on a non-production environment . They may come in the form of behavior-driven tests, automated acceptance tests, or automated tests linked to requirements and/or stories in a tracking system.

## Test (Gamma)

* *Launch Environment* - Consume the compute image from an image repository (e.g., AMI or a container repo) and launch an environment from the image (e.g., AWS CLI, AWS CDK/AWS CloudFormation, AWS CodePipeline, AWS CodeBuild)
* *Deploy Software* - Deploy software to a prod-like environment.
* *Integration Tests* - Run integration tests with other services.
* *End-to-End Functional (E2E) Tests* - Run automated functional tests from the users’ perspective on a non-production environment.
* *Capacity Tests* - Run longer-running automated capacity tests against environments that simulate production capacity. (e.g., BlazeMeter, JMeter, locust)
* *Chaos/Resiliency Experiments* - Inject failures into environments to identify improvements.
* *Metrics Monitoring* - Monitor deployments across regions and fail when threshold breached.
* *Rollback* - 1/ Ensure backwards compatible rollback is possible before deploying. a/ serializable writes and de-serializable reads b/ protocol changes c/ health checks and timeouts 2/ two-phase deployments a/prepare phase b/ activate phase.
* *Software Bill of Materials (SBOM)* - Generate a software bill of materials of all changes in code commit to support manual approvals and governance. (e.g. BlackDuck)

## Prod

* *Approval* - (Optional) As part of a automated workflow, obtain authorized human approval before completing deployment.
* *Deploy Software* - Deploy software into production environment using one of several deployment models: Blue/Green, Canary, Rolling Changes, or All At Once. Running the single command or clicking the button for the deployment may or may not be performed by a human.
* *Database deployment* - (Optional) Apply changes to the database as code to the production database.
* *Synthetic Tests* - Run automated tests that simulate end user workflow actions to discover issues before customers do.
