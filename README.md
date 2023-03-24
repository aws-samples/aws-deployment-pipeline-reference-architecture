# Overview

The **Deployment Pipeline Reference Architecture (DPRA)** describes best practices for building deployment pipelines. A deployment pipeline automates the building, testing and deploying of software into AWS environments. With DPRA, developers can increase the speed, stability, and security of software systems through the use of deployment pipelines.

Each type of deployment pipeline also includes one or more reference implementations with source code that defines a functional pipeline based on the reference architecture.

To learn more, visit [https://aws-samples.github.io/aws-deployment-pipeline-reference-architecture](https://aws-samples.github.io/aws-deployment-pipeline-reference-architecture)

## Local Development

The easiest approach is to use the preconfigured [development container](https://code.visualstudio.com/docs/remote/containers) within VS Code.

Alternatively, you can install these required dependencies manually:

```bash
brew install graphviz drawio
pip install -r requirements.txt
```

Setup [pre-commit](https://pre-commit.com) hooks:

```bash
pre-commit install
```

Start server with:

```bash
mkdocs serve
```

## License Summary

The documentation is made available under the Creative Commons Attribution-ShareAlike 4.0 International License. See the LICENSE file.

The sample code within this documentation is made available under the MIT-0 license. See the LICENSE-SAMPLECODE file.
