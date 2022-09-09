package com.amazonaws.dpri.fruits;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SuppressWarnings("checkstyle:hideutilityclassconstructor")
@SpringBootApplication
public class FruitApplication {
  /**
   * Main entrypoint.
   * @param args Command line arguments
   */
  public static void main(final String[] args) {
    new FruitApplication().run(args);
  }

  /**
   * Run the API.
   * @param args Command line arguments
   */
  private void run(final String[] args) {
    SpringApplication.run(FruitApplication.class, args);
  }
}
