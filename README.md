# Overview

This repository contains the source for the [DPRA site](https://devops.pages.aws.dev/dpra/).

# Local Development
The easiest approach is to use the preconfigured [development container](https://code.visualstudio.com/docs/remote/containers) within VS Code. 

Alternatively, you can install these required dependencies manually:

```bash
brew install graphviz
pip install -r requirements.txt
```

Start server with:

```bash
mkdocs serve
```