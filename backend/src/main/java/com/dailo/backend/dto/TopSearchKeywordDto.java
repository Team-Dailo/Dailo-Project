package com.dailo.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 인기 검색어 (키워드 + 검색 수) - 검색 페이지 순위/검색수 표시용
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopSearchKeywordDto {
    private String keyword;
    private long count;
}
