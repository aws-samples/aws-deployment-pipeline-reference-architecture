package com.amazonaws.dpri.fruits;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class FruitApplicationTest {
  @Autowired
  private FruitController controller;

  @Test
  public void contextLoads() {
    assertThat(controller).isNotNull();
  }
}
