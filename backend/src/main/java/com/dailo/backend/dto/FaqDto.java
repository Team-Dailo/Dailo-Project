package com.dailo.backend.dto;

import com.dailo.backend.entity.Faq;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FaqDto {
    private Long id;
    private String category;
    private String question;
    private String answer;
    private Integer displayOrder;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FaqDto from(Faq entity) {
        return FaqDto.builder()
                .id(entity.getId())
                .category(entity.getCategory())
                .question(entity.getQuestion())
                .answer(entity.getAnswer())
                .displayOrder(entity.getDisplayOrder())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
