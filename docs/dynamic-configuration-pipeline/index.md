# Architecture

Workloads following modern architecture styles (e.g. microservices) typically comprises multiple components. Each
component has configuration that controls how the component behaves, which could be either mechanisms to control which
features are enabled per environment to decouple release from deployment (e.g. Feature Flags) or operational
configuration (e.g. log level, throttling thresholds, connection/request limits, alerts, notifications).

The dynamic configuration pipeline enables teams to manage configuration for an entire workload and all its components in all environments as code so that all configurations are tracked in a code versioning system and can follow the common code review/approval process (e.g. pull/merge requests). The dynamic configuration pipeline can roll out configuration changes in a progressive and safe way to ensure that configuration changes do not break the workload in any environment.

![Dynamic Configuration Pipeline Architecture](architecture.drawio)

## Local Development

Developers need rapid feedback to make them aware of potential issues with their code. Automation should run in their development environment to give them feedback before the deployment pipeline runs.

???+ required "Pre-Commit Hooks"
    Pre-Commit hooks are scripts that are executed on the developer's workstation when they try to create a new commit. These hooks have an opportunity to inspect the state of the code before the commit occurs and abort the commit if tests fail. An example of pre-commit hooks are [Git hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks#_git_hooks).  Examples of tools to configure and store pre-commit hooks as code include but are not limited to [husky](https://github.com/typicode/husky) and [pre-commit](https://pre-commit.com/#install).

???+ recommended "IDE Plugins"
    Warn developers of potential issues with their source code in their IDE using plugins and extensions including but not limited to [Visual Studio Code - Python Extension](https://code.visualstudio.com/docs/python/linting) and [IntelliJ IDEA - JavaScript linters](https://www.jetbrains.com/help/idea/linters.html).

## Source

The source stage pulls in various types of code from a distributed version control system such as Git.

???+ required "Infrastructure Source Code"
    Code that defines the infrastructure necessary to host the *Dynamic Configuration*. Examples of infrastructure source code include but are not limited to [AWS Cloud Development Kit](https://aws.amazon.com/cdk/), [AWS CloudFormation](https://aws.amazon.com/cloudformation/) and [HashiCorp Terraform](https://www.terraform.io/). All *Infrastructure Source Code* is **required** to be stored in the same repository as the dynamic configuration definitions to allow infrastructure to be created and updated on the same lifecycle as the *Dynamic Configuration*.

???+ required "Feature Flag definitions"
    Workload features often span multiple components and components can have dependencies on each other. Traditionally, features are released by deploying the corresponding code changes. As different components are owned by different teams, releasing features that span multiple components traditionally requires coordination between those teams to ensure that components' interdependencies are satisfied. The more teams' components require changes to implement a workload's feature, the more complex the coordination effort to safely and consistently release the feature becomes. This results in longer lead times, lower deployment frequency, and higher change failure rates.

    Additionally, modern teams who aim to achieve continuous deployment (i.e. deploy to production in full automation without any manual approvals) prefer trunk-based development, which means that a single branch manages the code that is deployed to all environments. While trunk-based development is a great way to achieve continuous deployment, it, by design, does not allow excluding code from being deployed to production, which in turn makes it challenging to coordinate the timing of releasing cross-component features consistently and safely.

    An effective way to solve this problem is to use Feature Flags to separate release from deployment. A Feature Flag is a mechanism that allows teams to enable/disable certain code fragments using a configuration item that is managed outside the codebase it is used in. In its simplest form, a Feature Flag has a name and a boolean value that is used in an if/else statement. For features that span multiple components, the corresponding feature flag can be used in all components. By wrapping code changes for a new feature in a statement that only executes the new code when the feature flag is turned on and continues to execute the old code when the feature flag is turned off, deploying the code does not release the feature, resulting in what is also called a "dark release". Releasing features is done by turning the corresponding feature flag on. This allows multiple teams to deploy changes to their components continuously and independently of each other, while features are released safely using feature flags. In case a feature turns out to be broken, the rollback procedure does not require deploying the previous version of the code but instead, the rollback procedure is as simple as turning the feature flag off.

    Some examples for the use of feature flags are: introducing new functionality to an existing workload, enabling or disabling functionality on a given workload without the need for re-deployments or restarts. For more details see: [Using AWS AppConfig Feature Flags](https://aws.amazon.com/blogs/mt/using-aws-appconfig-feature-flags/). Feature Flags are managed per environment, which allows releasing features for different environments independently. Feature Flags can be stored in any format, including but not limited to YAML, JSON, and XML.

???+ required "Operational Configuration definition"
    Code that defined *Operational Configuration* that is deployed and managed by the *Dynamic Configuration Pipeline*. Operational Configuration is managed per environment, which allows to configure environments independently from each other. As an example, the default log level may be set to `DEBUG` in test environments whereas production environments are set to `ERROR` to only capture errors in the logs. Using the Dynamic Configuration Pipeline, Operational Configuration can be changed on the fly without redeploying the respective workload. Operational Configuration can be stored in any format, including but not limited to YAML, JSON, and XML.

## Build

All actions run in this stage are also run on developer's local environments prior to code commit and peer review. Actions in this stage should all run in less than 10 minutes so that developers can take action on fast feedback before moving on to their next task. If it’s taking more time, consider decoupling the system to reduce dependencies, optimizing the process, using more efficient tooling, or moving some of the actions to latter stages. Each of the actions below are defined and run in code.

???+ required "Build Code"
    Convert code into artifacts that can be promoted through environments. Most builds complete in seconds. While the Dynamic Configuration Pipeline does not house application source code that needs to be built, it may contain Infrastructure Source Code that needs to be built, e.g. CDK Source Code.

???+ required "Unit Tests"
    Run the unit tests to verify that the `infrastructure as code (IaC)` complies with the specification expressed as unit tests to avoid unintended changes to the infrastructure. These tests are fast-running tests with zero dependencies on external systems returning results in seconds. In the case of CDK, unit tests are expressed in commonly used programming language-specific unit test frameworks, including but are not limited to [JUnit](https://junit.org/), [Jest](https://jestjs.io/), and [pytest](https://pytest.org/). Other IaC technologies such as Terraform have other unit test frameworks and mechanisms that can be leveraged to ensure that IaC is in line with the specification. Test results should be published as artifacts such as [AWS CodeBuild Test Reports](https://docs.aws.amazon.com/codebuild/latest/userguide/test-reporting.html).

???+ required "Code Quality"
    Run various automated static analysis tools that generate reports on code quality, coding standards, security, code coverage, and other aspects according to the team and/or organization’s best practices. AWS recommends that teams fail the build when important practices are violated (e.g., a security violation is discovered in the code). These checks usually run in seconds. Examples of tools to measure code quality include but are not limited to [Amazon CodeGuru](https://aws.amazon.com/codeguru/), [SonarQube](https://www.sonarqube.org/), [black](https://github.com/psf/black), and [ESLint](https://eslint.org/).

    ```graphviz dot codequality.png
digraph G {
rankdir=LR

    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        source[label="Application Source Code" color="#d4dada"]
        iac[label="Infrastructure Source Code" color="#d4dada"]
        quality[label="Static Analysis Tools" color="#d4dada" fontcolor="black"]

        quality -> source [label="analyze"]
        quality -> iac [label="analyze"]
    }
}
    ```

???+ required "Secrets Detection"
    Identify secrets such as usernames, passwords, and access keys in code. When discovering secrets, the build should fail immediately. Examples of secret detection tools include but are not limited to [GitGuardian](https://www.gitguardian.com/) and [gitleaks](https://github.com/zricethezav/gitleaks).

    ```graphviz dot secrets.png
digraph G {
rankdir=LR

    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        source[label="Application Source Code" color="#d4dada"]
        iac[label="Application Source Code" color="#d4dada"]
        secrets[label="Secrets Detection" color="#d4dada" fontcolor="black"]

        secrets -> source [label="analyze"]
        secrets -> iac [label="analyze"]
    }
}
    ```

???+ required "Static Application Security Testing (SAST)"
    Analyze code for application security violations such as [XML External Entity Processing](https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing), [SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection), and [Cross Site Scripting](https://owasp.org/www-community/attacks/xss/). Any findings that exceed the configured threshold will immediately fail the build and stop any forward progress in the pipeline. Examples of tools to perform static application security testing include but are not limited to [Amazon CodeGuru](https://aws.amazon.com/codeguru/), [SonarQube](https://www.sonarqube.org/), and [Checkmarx](https://checkmarx.com/).

    ```graphviz dot sast.png
digraph G {
rankdir=LR

    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        source[label="Application Source Code" color="#d4dada"]
        sast[label="SAST" color="#d4dada" fontcolor="black"]

        sast -> source [label="analyze"]
    }
}
    ```

???+ recommended "Software Composition Analysis (SCA)"
    Run software composition analysis (SCA) tools to find vulnerabilities to package repositories related to open source use, licensing, and security vulnerabilities. SCA tools also launch workflows to fix these vulnerabilities. Any findings that exceed the configured threshold will immediately fail the build and stop any forward progress in the pipeline. These tools can run directly against the source code or a software bill of materials (SBOM). Example SCA tools include but are not limited to [Dependabot](https://github.com/dependabot), [Snyk](https://snyk.io/product/open-source-security-management/), and [Blackduck](https://www.blackducksoftware.com/).
    ```graphviz dot sca.png
digraph G {
rankdir=LR

    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        artifact[label="Packaged Artifact" color="#d4dada"]
        sca[label="SCA" color="#d4dada" fontcolor="black"]

        sca -> artifact [label="analyze"]
    }
}
    ```

???+ recommended "Software Bill of Materials (SBOM)"
    Generate a software bill of materials (SBOM) report detailing all the dependencies used. Examples of SBOM formats include [SPDX](https://spdx.dev/wp-content/uploads/sites/41/2020/08/SPDX-specification-2-2.pdf) and [CycloneDX](https://cyclonedx.org/)

## Test (Beta)

Testing is performed in a beta environment to validate that the latest code is functioning as expected. This validation is done by first deploying the code and then running integration and end-to-end tests against the deployment. Beta environments will have dependencies on the applications and services from other teams in their gamma environments. All actions performed in this stage should complete within 30 minutes to provide fast-feedback.

???+ required "Deploy Feature Flags"
    Deploy *Feature Flags* to the beta environment. Software deployments should be performed through *Infrastructure Source Code*. Access to the beta environment should be handled via [cross-account IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html) rather than long lived credentials from IAM users. Examples of tools to define feature flags include but are not limited to: [AWS AppConfig](https://docs.aws.amazon.com/appconfig/), [Split.io](https://www.split.io/) and [LaunchDarkly](https://launchdarkly.com/).

???+ required "Deploy Operational Configuration"
    Deploy *Operational Configurations* to the beta environment. Software deployments should be performed through *Infrastructure Source Code*. Access to the beta environment should be handled via [cross-account IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html) rather than long lived credentials from IAM users. Examples of tools to define operational configurations include but are not limited to: [AWS AppConfig](https://docs.aws.amazon.com/appconfig/), [Split.io](https://www.split.io/) and [LaunchDarkly](https://launchdarkly.com/).

???+ required "Integration Tests"
    Run automated tests that verify if the application satisfies business requirements. These tests require the workload to be running in the beta environment. Integration tests may come in the form of behavior-driven tests, automated acceptance tests, or automated tests linked to requirements and/or stories in a tracking system. Test results should be published somewhere such as [AWS CodeBuild Test Reports](https://docs.aws.amazon.com/codebuild/latest/userguide/test-reporting.html). Examples of tools to define integration tests include but are not limited to [Cucumber](https://cucumber.io), [vRest](https://vrest.io/), and [SoapUI](https://www.soapui.org).
    ```graphviz dot int.png
digraph G {
compound=true
rankdir=LR

    node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
    edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]
    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        test_source[label="Test Source Code" color="#d4dada" fontcolor="black"]
    }
    subgraph cluster_env {
        label=<<b>Environment</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]

        app[label="Application" color="#d4dada" fontcolor="black"]
    }
    test_source -> app [label="test" fontcolor="black" color="black"]
}
    ```

???+ recommended "Acceptance Tests"
    Run automated testing from the users’ perspective in the beta environment. These tests verify the user workflow, including when performed through a UI. These test are the slowest to run and hardest to maintain and therefore it is recommended to only have a few end-to-end tests that cover the most important application workflows. Test results should be published somewhere such as [AWS CodeBuild Test Reports](https://docs.aws.amazon.com/codebuild/latest/userguide/test-reporting.html). Examples of tools to define end-to-end tests include but are not limited to [Cypress](https://cypress.io), [Selenium](https://selenium.dev), and [Telerik Test Studio](https://www.telerik.com/teststudio).
    ```graphviz dot e2e.png
digraph G {
compound=true
rankdir=LR

    node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
    edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]
    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        test_source[label="Test Source Code" color="#d4dada" fontcolor="black"]
    }
    subgraph cluster_env {
        label=<<b>Environment</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]

        app[label="Application" color="#d4dada" fontcolor="black"]
    }
    test_source -> app [label="test" fontcolor="black" color="black"]
}
    ```

## Test (Gamma)

Testing is performed in a gamma environment to validate that the latest code can be safely deployed to production. The environment is as production-like as possible including configuration, monitoring, and traffic. Additionally, the environment should match the same regions that the production environment uses. The gamma environment is used by other team's beta environments and therefore must maintain acceptable service levels to avoid impacting other team productivity. All actions performed in this stage should complete within 30 minutes to provide fast-feedback.

???+ required "Deploy Feature Flags"
    Deploy *Feature Flags* to the gamma environment. Software deployments should be performed through *Infrastructure Source Code*. Access to the gamma environment should be handled via [cross-account IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html) rather than long lived credentials from IAM users.

???+ required "Deploy Operational Configuration"
    Deploy *Operational Configurations* to the gamma environment. Software deployments should be performed through *Infrastructure Source Code*. Access to the gamma environment should be handled via [cross-account IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html) rather than long lived credentials from IAM users.

???+ required "Integration Tests"
    Run automated tests that verify if the application satisfies business requirements. These tests require the workload to be running in the gamma environment. Integration tests may come in the form of behavior-driven tests, automated acceptance tests, or automated tests linked to requirements and/or stories in a tracking system. Test results should be published somewhere such as [AWS CodeBuild Test Reports](https://docs.aws.amazon.com/codebuild/latest/userguide/test-reporting.html). Examples of tools to define integration tests include but are not limited to [Cucumber](https://cucumber.io), [vRest](https://vrest.io/), and [SoapUI](https://www.soapui.org).
    ```graphviz dot int.png
digraph G {
compound=true
rankdir=LR

    node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
    edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]
    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        test_source[label="Test Source Code" color="#d4dada" fontcolor="black"]
    }
    subgraph cluster_env {
        label=<<b>Environment</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]

        app[label="Application" color="#d4dada" fontcolor="black"]
    }
    test_source -> app [label="test" fontcolor="black" color="black"]
}
    ```

???+ required "Acceptance Tests"
    Run automated testing from the users’ perspective in the gamma environment. These tests verify the user workflow, including when performed through a UI. These test are the slowest to run and hardest to maintain and therefore it is recommended to only have a few end-to-end tests that cover the most important application workflows. Test results should be published somewhere such as [AWS CodeBuild Test Reports](https://docs.aws.amazon.com/codebuild/latest/userguide/test-reporting.html). Examples of tools to define end-to-end tests include but are not limited to [Cypress](https://cypress.io), [Selenium](https://selenium.dev), and [Telerik Test Studio](https://www.telerik.com/teststudio).
    ```graphviz dot e2e.png
digraph G {
compound=true
rankdir=LR

    node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
    edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]
    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        test_source[label="Test Source Code" color="#d4dada" fontcolor="black"]
    }
    subgraph cluster_env {
        label=<<b>Environment</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]

        app[label="Application" color="#d4dada" fontcolor="black"]
    }
    test_source -> app [label="test" fontcolor="black" color="black"]
}
    ```

???+ required "Monitoring & Logging"
    Monitor deployments across regions and fail when threshold breached. The thresholds for metric alarms should be defined in the *Infrastructure Source Code* and deployed along with the rest of the infrastructure in an environment. Ideally, deployments should be automatically failed and rolled back when error thresholds are breached. Examples of automated rollback include [AWS CloudFormation monitor & rollback](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-rollback-triggers.html), [AWS CodeDeploy rollback](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html) and [Flagger](https://flagger.app/).
    ```graphviz dot mon.png
digraph G {
compound=true
rankdir=LR

    node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
    edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]
    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        iac[label="Infrastructure Source Code" color="#d4dada" fontcolor="black"]
    }
    subgraph cluster_env {
        label=<<b>Environment</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        app[label="Application" color="#d4dada" fontcolor="black"]
        logs[label="Logs" color="#d4dada" fontcolor="black"]
        metrics[label="Metrics" color="#d4dada" fontcolor="black"]
        app -> logs
        app -> metrics
    }
    logs -> iac [label="monitor" fontcolor="black" color="black"]
    metrics -> iac [label="monitor" fontcolor="black" color="black"]
    iac -> app [label="rollback" fontcolor="black" color="black"]
}
    ```

???+ required "Synthetic Tests"
    Tests that run continuously in the background in a given environment to generate traffic and verify the system is healthy. These tests serve two purposes:

    1. Ensure there is always adequate traffic in the environment to trigger alarms if a deployment is unhealthy 
    2. Test specific workflows and assert that the system is functioning correctly. 

    Examples of tools that can be used for synthetic tests include but are not limited to [Amazon CloudWatch Synthetics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html),[Dynatrace Synthetic Monitoring](https://www.dynatrace.com/monitoring/platform/synthetic-monitoring/), and [Datadog Synthetic Monitoring](https://docs.datadoghq.com/synthetics/).
    ```graphviz dot synthetic.png
digraph G {
compound=true
rankdir=LR

    node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
    edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]
    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        iac[label="Infrastructure Source Code" color="#d4dada" fontcolor="black"]
    }
    subgraph cluster_env {
        label=<<b>Environment</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        app[label="Application" color="#d4dada" fontcolor="black"]
        synthetic[label="Synthetic Tests" color="#d4dada" fontcolor="black"]
        metrics[label="Metrics" color="#d4dada" fontcolor="black"]
        synthetic -> app[label="synthetic tests" color="black" fontcolor="black"]
        app -> metrics
    }
    metrics -> iac [label="monitor" fontcolor="black" color="black"]
    iac -> app [label="rollback" fontcolor="black" color="black"]
}
    ```

???+ recommended "Performance Tests"
    Run longer-running automated capacity tests against environments that simulate production capacity. Measure metrics such as the transaction success rates, response time and throughput. Determine if application meets performance requirements and compare metrics to past performance to look for performance degredation. Examples of tools that can be used for performance tests include but are not limited to [JMeter](https://jmeter.apache.org), [Locust](https://locust.io/), and [Gatling](https://gatling.io).
    ```graphviz dot perf.png
digraph G {
compound=true
rankdir=LR

    node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
    edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]
    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        tests[label="Test Source Code" color="#d4dada" fontcolor="black"]
    }
    subgraph cluster_env {
        label=<<b>Environment</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        app[label="Application" color="#d4dada" fontcolor="black"]
        metrics[label="Metrics" color="#d4dada" fontcolor="black"]
        app -> metrics
    }
    tests -> app [label="execute tests" fontcolor="black" color="black"]
    metrics -> tests [label="monitor" fontcolor="black" color="black"]
}
    ```

???+ recommended "Resilience Tests"
    Inject failures into environments to identify areas of the application that are susceptible to failure. Tests are defined as code and applied to the environment while the system is under load. The success rate, response time and throughput are measured during the periods when the failures are injected and compared to periods without the failures. Any significant deviation should fail the pipeline. Examples of tools that can be used for chaos/resilience testing include but are not limited to [AWS Fault Injection Simulator](https://aws.amazon.com/fis/), [Gremlin](https://www.gremlin.com/), and [ChaosToolkit](https://chaostoolkit.org/).
    ```graphviz dot chaos.png
digraph G {
compound=true
rankdir=LR

    node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
    edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]
    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        tests[label="Test Source Code" color="#d4dada" fontcolor="black"]
    }
    subgraph cluster_env {
        label=<<b>Environment</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        app[label="Application" color="#d4dada" fontcolor="black"]
        metrics[label="Metrics" color="#d4dada" fontcolor="black"]
        app -> metrics
    }
    tests -> app [label="inject faults" fontcolor="black" color="black"]
    metrics -> tests [label="monitor" fontcolor="black" color="black"]
}
    ```

???+ recommended "Dynamic Application Security Testing (DAST)"
    Perform testing of web applications and APIs by running automated scans against it to identify vulnerabilities through techniques such as cross-site scripting (XSS) and SQL injection(SQLi).  Examples of tools that can be used for dynamic application security testing include but are not limited to [OWASP ZAP](https://owasp.org/www-project-zap), [StackHawk](https://www.stackhawk.com/), and [AppScan](https://www.hcltechsw.com/appscan). See [AWS Guidance on Penetration Testing](https://aws.amazon.com/security/penetration-testing/) for info on penetration testing in an AWS environment.

## Prod

???+ recommended "Manual Approval"
    As part of an automated workflow, obtain authorized human approval before deploying to the production environment.

???+ required "Progressively deploy Feature Flags and Operational Configuration"
    Deployments should be made progressively in waves to limit the impact of failures. A common approach is to deploy changes to a subset of AWS regions and allow sufficient bake time to monitor performance and behavior before proceeding with additional waves of AWS regions.

    Software should be deployed using one of progressive deployment involving controlled rollout of a change through techniques such as canary deployments, feature flags, and traffic shifting. Software deployments should be performed through *Infrastructure Source Code*. Access to the production environment should be handled via [cross-account IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html) rather than long lived credentials from IAM users. Examples of tools to deploy software include but are not limited to [AWS CodeDeploy](https://aws.amazon.com/codedeploy/). Ideally, deployments should be automatically failed and rolled back when error thresholds are breached. Examples of automated rollback include [AWS CloudFormation monitor & rollback](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-rollback-triggers.html), [AWS CodeDeploy rollback](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html) and [Flagger](https://flagger.app/).

    ```graphviz dot progdep.png
digraph G {
compound=true
rankdir=LR

    node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
    edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]
    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        iac[label="Infrastructure Source Code" color="#d4dada" fontcolor="black"]
    }
    subgraph cluster_env {
        label=<<b>Environment</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        app[label="Application" color="#d4dada" fontcolor="black"]
        metrics[label="Metrics" color="#d4dada" fontcolor="black"]
        app -> metrics
    }
    metrics -> iac [label="monitor" fontcolor="black" color="black"]
    iac -> app [label="rollback" fontcolor="black" color="black"]
}
    ```

???+ required "Acceptance Tests"
    Run automated testing from the users’ perspective in the beta environment. These tests verify the user workflow, including when performed through a UI. These test are the slowest to run and hardest to maintain and therefore it is recommended to only have a few end-to-end tests that cover the most important application workflows. Test results should be published somewhere such as [AWS CodeBuild Test Reports](https://docs.aws.amazon.com/codebuild/latest/userguide/test-reporting.html). Examples of tools to define end-to-end tests include but are not limited to [Cypress](https://cypress.io), [Selenium](https://selenium.dev), and [Telerik Test Studio](https://www.telerik.com/teststudio).

    ```graphviz dot e2e.png
    digraph G {
    compound=true
    rankdir=LR

        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]
        subgraph cluster_pipeline {
            label=<<b>Pipeline</b>>
            fontname="Helvetica,Arial,sans-serif"
            graph[color="black" style="dashed" fontcolor="black"]
            node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
            edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

            test_source[label="Test Source Code" color="#d4dada" fontcolor="black"]
        }
        subgraph cluster_env {
            label=<<b>Environment</b>>
            fontname="Helvetica,Arial,sans-serif"
            graph[color="black" style="dashed" fontcolor="black"]

            app[label="Application" color="#d4dada" fontcolor="black"]
        }
        test_source -> app [label="test" fontcolor="black" color="black"]
    }
        ```

???+ recommended "Synthetic Tests"
    Tests that run continuously in the background in a given environment to generate traffic and verify the system is healthy. These tests serve two purposes:

    1. Ensure there is always adequate traffic in the environment to trigger alarms if a deployment is unhealthy
    2. Test specific workflows and assert that the system is functioning correctly.
    
    Examples of tools that can be used for synthetic tests include but are not limited to [Amazon CloudWatch Synthetics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html),[Dynatrace Synthetic Monitoring](https://www.dynatrace.com/monitoring/platform/synthetic-monitoring/), and [Datadog Synthetic Monitoring](https://docs.datadoghq.com/synthetics/).

    ```graphviz dot synthetic.png
digraph G {
compound=true
rankdir=LR

    node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
    edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]
    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        iac[label="Infrastructure Source Code" color="#d4dada" fontcolor="black"]
    }
    subgraph cluster_env {
        label=<<b>Environment</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        app[label="Application" color="#d4dada" fontcolor="black"]
        synthetic[label="Synthetic Tests" color="#d4dada" fontcolor="black"]
        metrics[label="Metrics" color="#d4dada" fontcolor="black"]
        synthetic -> app[label="synthetic tests" color="black" fontcolor="black"]
        app -> metrics
    }
    metrics -> iac [label="monitor" fontcolor="black" color="black"]
    iac -> app [label="rollback" fontcolor="black" color="black"]
}
    ```

???+ required "Monitoring & Logging"
    Monitor deployments across regions and fail when threshold breached. The thresholds for metric alarms should be defined in the *Infrastructure Source Code* and deployed along with the rest of the infrastructure in an environment. Ideally, deployments should be automatically failed and rolled back when error thresholds are breached. Examples of automated rollback include [AWS CloudFormation monitor & rollback](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-rollback-triggers.html), [AWS CodeDeploy rollback](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html) and [Flagger](https://flagger.app/).
    ```graphviz dot mon.png
digraph G {
compound=true
rankdir=LR

    node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
    edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]
    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        iac[label="Infrastructure Source Code" color="#d4dada" fontcolor="black"]
    }
    subgraph cluster_env {
        label=<<b>Environment</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        app[label="Application" color="#d4dada" fontcolor="black"]
        logs[label="Logs" color="#d4dada" fontcolor="black"]
        metrics[label="Metrics" color="#d4dada" fontcolor="black"]
        app -> logs
        app -> metrics
    }
    logs -> iac [label="monitor" fontcolor="black" color="black"]
    metrics -> iac [label="monitor" fontcolor="black" color="black"]
    iac -> app [label="rollback" fontcolor="black" color="black"]
}
    ```

???+ required "Synthetic Tests"
    Tests that run continuously in the background in a given environment to generate traffic and verify the system is healthy. These tests serve two purposes:

    1. Ensure there is always adequate traffic in the environment to trigger alarms if a deployment is unhealthy 
    2. Test specific workflows and assert that the system is functioning correctly. 
    
    Examples of tools that can be used for synthetic tests include but are not limited to [Amazon CloudWatch Synthetics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html),[Dynatrace Synthetic Monitoring](https://www.dynatrace.com/monitoring/platform/synthetic-monitoring/), and [Datadog Synthetic Monitoring](https://docs.datadoghq.com/synthetics/).
    ```graphviz dot synthetic.png
digraph G {
compound=true
rankdir=LR

    node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
    edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]
    subgraph cluster_pipeline {
        label=<<b>Pipeline</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        node [fontname="Helvetica,Arial,sans-serif" shape=box style=filled fontcolor="black" width=2]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        iac[label="Infrastructure Source Code" color="#d4dada" fontcolor="black"]
    }
    subgraph cluster_env {
        label=<<b>Environment</b>>
        fontname="Helvetica,Arial,sans-serif"
        graph[color="black" style="dashed" fontcolor="black"]
        edge [fontname="Helvetica,Arial,sans-serif" color="black" fontcolor="black"]

        app[label="Application" color="#d4dada" fontcolor="black"]
        synthetic[label="Synthetic Tests" color="#d4dada" fontcolor="black"]
        metrics[label="Metrics" color="#d4dada" fontcolor="black"]
        synthetic -> app[label="synthetic tests" color="black" fontcolor="black"]
        app -> metrics
    }
    metrics -> iac [label="monitor" fontcolor="black" color="black"]
    iac -> app [label="rollback" fontcolor="black" color="black"]
}
    ```
