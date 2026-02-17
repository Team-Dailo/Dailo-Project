package com.dailo.backend.dto;

import com.dailo.backend.entity.SearchLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchLogResponseDto {

    private Long id;
    private Long userId;
    private String keyword;
    private String filters;
    private Integer resultCount;
    private String requestId;
    private LocalDateTime createdAt;

    public static SearchLogResponseDto from(SearchLog searchLog) {
        return SearchLogResponseDto.builder()
                .id(searchLog.getId())
                .userId(searchLog.getUserId())
                .keyword(searchLog.getKeyword())
                .filters(searchLog.getFilters())
                .resultCount(searchLog.getResultCount())
                .requestId(searchLog.getRequestId())
                .createdAt(searchLog.getCreatedAt())
                .build();
    }
}
