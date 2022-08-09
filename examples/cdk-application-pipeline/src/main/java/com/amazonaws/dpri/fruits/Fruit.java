package com.amazonaws.dpri.fruits;

import java.util.Objects;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;

@Entity
public class Fruit {
    private @Id @GeneratedValue Long id;
    private String name;    

    Fruit() {}

    Fruit(String name) {
        this.name = name;
    }

    public Long getId() {
        return this.id;
      }
    
      public String getName() {
        return this.name;
      }
    
      public void setId(Long id) {
        this.id = id;
      }
    
      public void setName(String name) {
        this.name = name;
      }

      @Override
      public boolean equals(Object o) {
    
        if (this == o)
          return true;
        if (!(o instanceof Fruit))
          return false;
        Fruit fruit = (Fruit) o;
        return Objects.equals(this.id, fruit.id) && Objects.equals(this.name, fruit.name);
      }

      @Override
      public int hashCode() {
        return Objects.hash(this.id, this.name);
      }
}
