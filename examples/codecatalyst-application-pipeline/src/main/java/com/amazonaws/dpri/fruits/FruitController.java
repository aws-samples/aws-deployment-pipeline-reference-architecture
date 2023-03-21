package com.amazonaws.dpri.fruits;

import java.util.List;
import java.util.stream.Collectors;

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
import org.springframework.web.context.annotation.RequestScope;

/**
 * API controller for fruits.
 */
@RestController
@RequestScope
public class FruitController {
    /**
     * JPA repository for fruits.
     */
    private final FruitRepository repository;

    /**
     * Logic to map between entities and DTOs
     */
    private final FruitMapper mapper;

    FruitController(final FruitRepository r, final FruitMapper m) {
        this.repository = r;
        this.mapper = m;
    }

    @GetMapping("/api/fruits")
    List<FruitDTO> all() {
        return repository.findAll()
                .stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }

    @PostMapping("/api/fruits")
    FruitDTO newFruit(@RequestBody final FruitDTO fruit) {
        return mapper.toDto(repository.save(mapper.toEntity(fruit)));
    }

    @GetMapping("/api/fruits/{id}")
    FruitDTO one(@PathVariable final Long id) {
        return repository.findById(id)
                .map(mapper::toDto)
                .orElseThrow(() -> new FruitNotFoundException(id));
    }

    @PutMapping("/api/fruits/{id}")
    FruitDTO replaceFruit(
            @RequestBody final FruitDTO newFruit,
            @PathVariable final Long id) {
        newFruit.setId(id);
        return mapper.toDto(repository.save(mapper.toEntity(newFruit)));
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
