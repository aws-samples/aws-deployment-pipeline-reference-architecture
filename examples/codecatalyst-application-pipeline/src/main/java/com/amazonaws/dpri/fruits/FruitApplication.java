package com.amazonaws.dpri.fruits;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

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
    SpringApplication.run(FruitApplication.class, args);
  }
}
