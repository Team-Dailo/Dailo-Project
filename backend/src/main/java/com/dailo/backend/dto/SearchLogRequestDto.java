package com.dailo.backend.dto;

import com.dailo.backend.entity.SearchLog;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SearchLogRequestDto {

    private String keyword;
    private String filters;      // JSON 형태 필터 조건
    private Integer resultCount;
    private String requestId;    // 프론트에서 생성한 요청 ID

    public void validate() {
        if (keyword == null || keyword.trim().isEmpty()) {
            throw new IllegalArgumentException("Keyword cannot be empty");
        }
        if (keyword.trim().length() > 100) {
            throw new IllegalArgumentException("Keyword is too long (max 100 characters)");
        }
        if (requestId != null && requestId.length() > 100) {
            throw new IllegalArgumentException("Request ID is too long (max 100 characters)");
        }
        if (filters != null && filters.length() > 2000) {
            throw new IllegalArgumentException("Filters data is too large (max 2000 characters)");
        }
    }

    public SearchLog toEntity(Long userId) {
        return SearchLog.builder()
                .userId(userId)
                .keyword(this.keyword.trim())
                .filters(this.filters)
                .resultCount(this.resultCount != null ? this.resultCount : 0)
                .requestId(this.requestId)
                .build();
    }
}
