package com.amazonaws.dpri.fruits;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;

import com.amazonaws.appconfigagent.AppConfigAgentInitializer;

/**
 * Spring boot application for fruit API.
 */
@SpringBootApplication
public class FruitApplication {

  /**
   * Start the fruit API application.
   * @param args
   */
  @SuppressWarnings({"PMD", "checkstyle:hideutilityclassconstructor"})
  public static void main(final String[] args) {
    new SpringApplicationBuilder(FruitApplication.class)
        .initializers(new AppConfigAgentInitializer())
        .run(args);
  }
}
