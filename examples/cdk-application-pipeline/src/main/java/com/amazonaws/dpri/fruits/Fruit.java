package com.amazonaws.dpri.fruits;

import java.util.Objects;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;

@Entity
public final class Fruit {
  /**
   * Id for fruit.
   */
  private @Id @GeneratedValue Long id;
  /**
   * Name for fruit.
   */
  private String name;

  Fruit() {
  }

  Fruit(final String newName) {
    this.name = newName;
  }

  /**
   * Get the fruit id.
   *
   * @return fruit id
   */
  public Long getId() {
    return this.id;
  }

  /**
   * Get the fruit name.
   *
   * @return fruit name
   */
  public String getName() {
    return this.name;
  }

  /**
   * Set the fruit id.
   *
   * @param newId to set
   */
  public void setId(final Long newId) {
    this.id = newId;
  }

  /**
   * Set the fruit name.
   *
   * @param newName to set
   */
  public void setName(final String newName) {
    this.name = newName;
  }

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
        && Objects.equals(this.name, fruit.name);
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.id, this.name);
  }
}
