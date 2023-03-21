package com.amazonaws.dpri.fruits;

import java.util.Objects;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

/**
 * Entity for persisting fruits.
 */
@Entity
public class Fruit {
  /**
   * Unique ID for this fruit.
   */
  private @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

  /**
   * Name for this fruit.
   */
  private String name;

  /**
   * Classification of the fruit
   */
  @Enumerated(EnumType.STRING)
  private FruitClassification classification;

  Fruit() {
  }

  Fruit(final String n, final FruitClassification c) {
    this.name = n;
    this.classification = c;
  }

  /**
   * Get the current ID.
   * @return id
   */
  public Long getId() {
    return this.id;
  }

  /**
   * Get the current name.
   * @return name
   */
  public String getName() {
    return this.name;
  }

  /**
   * Set a new id.
   * @param newId
   */
  public void setId(final Long newId) {
    this.id = newId;
  }

  /**
   * Set a new name.
   * @param newName
   */
  public void setName(final String newName) {
    this.name = newName;
  }

  /**
   * Get the current classification.
   * @return classification
   */
  public FruitClassification getClassification() {
    return this.classification;
  }


  /**
   * Set classification to new value.
   * @param newClassification
   */
  public void setClassification(final FruitClassification newClassification) {
    this.classification = newClassification;
  }

  /**
   * Fruits are equal if they have the same id and name.
   */
  @Override
  public boolean equals(final Object o) {

    if (this == o) {
      return true;
    }
    if (!(o instanceof Fruit)) {
      return false;
    }
    Fruit fruit = (Fruit) o;
    return Objects.equals(this.id, fruit.id)
        && Objects.equals(this.name, fruit.name)
        && Objects.equals(this.classification, fruit.classification);
  }

  /**
   * Hash based on current id and name.
   */
  @Override
  public int hashCode() {
    return Objects.hash(this.id, this.name, this.classification);
  }
}
