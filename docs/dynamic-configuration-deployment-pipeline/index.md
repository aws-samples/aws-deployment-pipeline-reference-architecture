# Dynamic Configuration Deployment Pipeline

Perform rapid deployments by only making configuration changes to affect system behavior. With dynamic configuration, you decouple configuration from code. The configuration source of record resides in a separate configuration system. The type of configuration that is dynamic is typically operational or feature controls. Operational configuration might include changing values for throttling, limits, connection limits, or logging verbosity. With feature configuration, using configuration to turn certain features on/off allowing you to separate deployments from releases.

All configuration is source code that is committed to a source code repository. A deployment pipeline discovers code changes and applies the changes to the  independent configuration system. The code that obtains the configuration values is configured to poll the independent configuration system to get any updated values. The configuration system builds in syntax checks, performs a gradual deployment while checking for system alarms, rollbacks changes if necessary, and completes the deployment.

```mermaid

flowchart
    todo
```

## Alpha Stage

* Pre-Validation Checks
* Apply Changes to Configuration System
  * Bake Time
  * Monitoring
  * Gradual Deployment
  * Rollback
* Synthetic Tests
