package com.amazonaws.dpri.fruits;

/**
 * DTO for Fruits.
 */
public class FruitDTO {
  /**
   * ID of the fruit.
   */
  private Long id;

  /**
   * Name of the fruit.
   */
  private String name;

  /**
   * Classification of the fruit.
   */
  private FruitClassification classification;

  /**
   * Get the current id.
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
   * Get the current classification.
   * @return classification
   */
  public FruitClassification getClassification() {
    return this.classification;
  }

  /**
   * Set id to new value.
   * @param newId
   */
  public void setId(final Long newId) {
    this.id = newId;
  }

  /**
   * Set name to new value.
   * @param newName
   */
  public void setName(final String newName) {
    this.name = newName;
  }

  /**
   * Set classification to new value.
   * @param newClassification
   */
  public void setClassification(final FruitClassification newClassification) {
    this.classification = newClassification;
  }
}
