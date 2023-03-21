package com.amazonaws.dpri.fruits;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

@RequestScope
@Component
public class FruitMapper {
    /**
     * Feature for enabling fruit classifications
     */
    @Value("${appconfig.features.classification:false}")
    boolean classification;

    public FruitDTO toDto(final Fruit entity) {
        FruitDTO dto = new FruitDTO();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        if(classification) {
          dto.setClassification(entity.getClassification());
        }
        return dto;
    }

    public Fruit toEntity(final FruitDTO dto) {
        Fruit entity = new Fruit();
        entity.setId(dto.getId());
        entity.setName(dto.getName());
        if(classification) {
          entity.setClassification(dto.getClassification());
        }
        return entity;
    }
}
