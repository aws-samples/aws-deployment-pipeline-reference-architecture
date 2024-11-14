package com.amazonaws.appconfigagent;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;

public class AppConfigAgentInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
  public void initialize(ConfigurableApplicationContext configurableApplicationContext) {
    ConfigurableEnvironment environment = configurableApplicationContext.getEnvironment();
    boolean enabled = Boolean.parseBoolean(environment.getProperty("appconfig-agent.enabled", "true"));
    if(!enabled) {
      return;
    }

    String host = environment.getProperty("appconfig-agent.host", "localhost");
    int port = Integer.parseInt(environment.getProperty("appconfig-agent.port", "2772"));
    String applicationName = environment.getProperty("appconfig-agent.application", environment.getProperty("spring.application.name", "defaultapp"));
    String environmentName = environment.getProperty("appconfig-agent.environment");
    String prefix = environment.getProperty("appconfig-agent.prefix", "appconfig");
    AppConfigAgentPropertySource appConfigPropertySource = new AppConfigAgentPropertySource(prefix, host, port, applicationName, environmentName);

    String logLevelConfiguration = environment.getProperty("appconfig-agent.log-level-from.configuration");
    if(logLevelConfiguration != null) {
      String attribute = environment.getProperty("appconfig-agent.log-level-from.attribute", "logLevel");
      try {
        String logLevel = (String)appConfigPropertySource.getConfig(logLevelConfiguration, Optional.empty()).get(attribute);
        if(logLevel != null) {
          Logger root = LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
          if(root instanceof ch.qos.logback.classic.Logger) {
            ((ch.qos.logback.classic.Logger)root).setLevel(ch.qos.logback.classic.Level.toLevel(logLevel));
          }
        }
      } catch (Exception ex) {
        ex.printStackTrace();
      }
    }

    environment.getPropertySources().addLast(appConfigPropertySource);
  }  
}