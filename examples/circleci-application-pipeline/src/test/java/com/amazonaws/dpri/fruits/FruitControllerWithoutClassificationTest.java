package com.amazonaws.dpri.fruits;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;
import java.util.Optional;

@WebMvcTest
@ComponentScan
@ActiveProfiles("without-classification")
public class FruitControllerWithoutClassificationTest {

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private FruitRepository repository;

  @Test
  public void shouldReturnList() throws Exception {
    when(repository.findAll()).thenReturn(Arrays.asList(new Fruit("Mango", FruitClassification.pome), new Fruit("Dragonfruit", FruitClassification.berry)));

    this.mockMvc.perform(get("/api/fruits")).andDo(print()).andExpect(status().isOk())
        .andExpect(content().json("[{\"name\": \"Mango\"}, {\"name\": \"Dragonfruit\"}]"));
  }

  @Test
  public void shouldReturnOne() throws Exception {
    when(repository.findById(99l)).thenReturn(Optional.of(new Fruit("Mango", FruitClassification.pome)));

    this.mockMvc.perform(get("/api/fruits/99")).andDo(print()).andExpect(status().isOk())
        .andExpect(content().json("{\"name\": \"Mango\"}"));
  }

  @Test
  public void shouldReturn404() throws Exception {
    when(repository.findById(99l)).thenReturn(Optional.empty());

    this.mockMvc.perform(get("/api/fruits/99")).andDo(print()).andExpect(status().isNotFound());
  }
}
