package com.amazonaws.dpri.fruits;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public final class FruitController {
    /**
     * Repository to use for persistence.
     */
    private final FruitRepository repository;

    FruitController(final FruitRepository newRepository) {
        this.repository = newRepository;
    }

    @GetMapping("/api/fruits")
    List<Fruit> all() {
        return repository.findAll();
    }

    @PostMapping("/api/fruits")
    Fruit newFruit(@RequestBody final Fruit fruit) {
        return repository.save(fruit);
    }

    @GetMapping("/api/fruits/{id}")
    Fruit one(@PathVariable final Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new FruitNotFoundException(id));
    }

    @PutMapping("/api/fruits/{id}")
    Fruit replaceFruit(
        @RequestBody final Fruit newFruit,
        @PathVariable final Long id) {
        return repository.findById(id)
                .map(fruit -> {
                    fruit.setName(newFruit.getName());
                    return repository.save(fruit);
                })
                .orElseGet(() -> {
                    newFruit.setId(id);
                    return repository.save(newFruit);
                });
    }

    @DeleteMapping("/api/fruits/{id}")
    void deleteFruit(@PathVariable final Long id) {
        repository.deleteById(id);
    }

}

@ControllerAdvice
class FruitNotFoundAdvice {

    @ResponseBody
    @ExceptionHandler(FruitNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    String fruitNotFoundHandler(final FruitNotFoundException ex) {
        return ex.getMessage();
    }

}

class FruitNotFoundException extends RuntimeException {
    FruitNotFoundException(final Long id) {
        super("Unable to find fruit " + id);
    }
}
