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

/**
 * API controller for fruits.
 */
@RestController
public final class FruitController {
    /**
     * JPA repository for fruits.
     */
    private final FruitRepository repository;

    FruitController(final FruitRepository r) {
        this.repository = r;
    }

    @GetMapping("/api/fruits")
    List<FruitDTO> all() {
        return repository.findAll()
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @PostMapping("/api/fruits")
    FruitDTO newFruit(@RequestBody final FruitDTO fruit) {
        return convertToDto(repository.save(convertToEntity(fruit)));
    }

    @GetMapping("/api/fruits/{id}")
    FruitDTO one(@PathVariable final Long id) {
        return repository.findById(id)
                .map(this::convertToDto)
                .orElseThrow(() -> new FruitNotFoundException(id));
    }

    @PutMapping("/api/fruits/{id}")
    FruitDTO replaceFruit(
            @RequestBody final FruitDTO newFruit,
            @PathVariable final Long id) {
        Fruit entity = repository.findById(id)
                .map(fruit -> {
                    fruit.setName(newFruit.getName());
                    return repository.save(fruit);
                })
                .orElseGet(() -> {
                    newFruit.setId(id);
                    return repository.save(convertToEntity(newFruit));
                });
        return convertToDto(entity);
    }

    @DeleteMapping("/api/fruits/{id}")
    void deleteFruit(@PathVariable final Long id) {
        repository.deleteById(id);
    }

    FruitDTO convertToDto(final Fruit fruit) {
        FruitDTO dto = new FruitDTO();
        dto.setId(fruit.getId());
        dto.setName(fruit.getName());
        return dto;
    }

    Fruit convertToEntity(final FruitDTO fruit) {
        Fruit entity = new Fruit();
        entity.setId(fruit.getId());
        entity.setName(fruit.getName());
        return entity;
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
