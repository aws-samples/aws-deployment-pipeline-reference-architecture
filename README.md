# Overview

This repository contains the source for the [DPRA site](https://devops.pages.aws.dev/dpra/).

# Local Development
The easiest approach is to use the preconfigured [development container](https://code.visualstudio.com/docs/remote/containers) within VS Code. 

Alternatively, you can install these required dependencies manually:

```bash
brew install graphviz
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