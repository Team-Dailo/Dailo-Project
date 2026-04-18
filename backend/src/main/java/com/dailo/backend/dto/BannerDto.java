package com.dailo.backend.dto;

import com.dailo.backend.entity.Banner;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BannerDto {
    private Long id;
    private String title;
    private String imageUrl;
    private String linkUrl;
    private String linkType;
    private Long linkId;
    private Integer displayOrder;
    private Boolean isActive;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private LocalDateTime createdAt;

    public static BannerDto from(Banner entity) {
        return BannerDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .imageUrl(entity.getImageUrl())
                .linkUrl(entity.getLinkUrl())
                .linkType(entity.getLinkType())
                .linkId(entity.getLinkId())
                .displayOrder(entity.getDisplayOrder())
                .isActive(entity.getIsActive())
                .startAt(entity.getStartAt())
                .endAt(entity.getEndAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
