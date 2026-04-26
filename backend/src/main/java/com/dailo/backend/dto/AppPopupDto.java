package com.dailo.backend.dto;

import com.dailo.backend.entity.AppPopup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppPopupDto {
    private Long id;
    private String title;
    private String imageUrl;
    private String linkUrl;
    private Integer displayOrder;
    private Boolean isActive;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private LocalDateTime createdAt;

    public static AppPopupDto from(AppPopup entity) {
        return AppPopupDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .imageUrl(entity.getImageUrl())
                .linkUrl(entity.getLinkUrl())
                .displayOrder(entity.getDisplayOrder())
                .isActive(entity.getIsActive())
                .startAt(entity.getStartAt())
                .endAt(entity.getEndAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
