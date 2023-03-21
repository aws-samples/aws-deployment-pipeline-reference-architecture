package com.amazonaws.appconfigagent;

import java.io.IOException;
import java.net.URL;
import java.util.Map;
import java.util.Optional;

import org.springframework.core.env.PropertySource;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

public class AppConfigAgentPropertySource extends PropertySource<String> {

  public AppConfigAgentPropertySource(String prefix, String host, int port, String application, String environment) {
    super(
      prefix, 
      String.format("http://%s:%d/applications/%s/environments/%s",
        host, port, application, environment
      )
    );
    logger.info(String.format("Initialized AppConfig agent at '%s'", this.source));
  }

	public Map<String, Object> getConfig(String configurationName, Optional<String> flagName) throws IOException {
    URL configUrl = new URL(String.format("%s/configurations/%s", this.getSource(), configurationName));
    if(flagName.isPresent()) {
      configUrl = new URL(String.format("%s?flag=%s", configUrl, flagName.get()));
    }
    logger.debug(String.format("Fetching AppConfig flag from '%s'", configUrl.toString()));
    ObjectMapper mapper = new ObjectMapper();
    Map<String, Object> config = mapper.readValue(configUrl, new TypeReference<Map<String, Object>>() {});

    if(logger.isDebugEnabled()) {
      logger.debug(String.format("Got flag: %s", mapper.writeValueAsString(config)));
    }

    return config;
  }

	public Object getProperty(String name) {
    String[] nameWithDefault = name.split(":", 2);
    String[] parts = nameWithDefault[0].split("\\.", 4);
    if(parts.length < 3) {
      return null;
    }
    if(!parts[0].equals(this.getName())) {
      return null;
    }
    try {
      Map<String, Object> flag = getConfig(parts[1], Optional.of(parts[2]));

      // if property name is the name of the flag, return the value of 'enabled' attribute, or default to false
      // else, property name is an attribute in the flag, return the value of that attribute, or default to null
      String key = parts.length==3?"enabled":parts[3];

      logger.debug(String.format("Accessing key: %s", key));

      if(flag.containsKey(key)) {
        return flag.get(key);
      }
    } catch(IOException ex) {
      logger.warn(String.format("Unable to retrieve property %s from AppConfig agent: %s", nameWithDefault[0], ex.getMessage()));
    }

    if(nameWithDefault.length == 2) {
      if(parts.length==3) {
        return Boolean.valueOf(nameWithDefault[1]);
      } else {
        return nameWithDefault[1];
      }
    } else {
      if(parts.length==3) {
        return false;
      } else {
        return null;
      }
    }
  }
}