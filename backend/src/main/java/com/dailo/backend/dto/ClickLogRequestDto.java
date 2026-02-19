package com.dailo.backend.dto;

import com.dailo.backend.entity.ClickLog;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ClickLogRequestDto {

    private Long eventId;
    private String source;       // search, list, recommendation 등
    private String requestId;    // 검색 로그와 연결용

    public void validate() {
        if (eventId == null) {
            throw new IllegalArgumentException("eventId is required");
        }
        if (source == null || source.trim().isEmpty()) {
            this.source = "unknown";
        } else if (source.trim().length() > 50) {
            throw new IllegalArgumentException("Source is too long (max 50 characters)");
        } else {
            this.source = this.source.trim();
        }
        if (requestId != null && requestId.length() > 100) {
            throw new IllegalArgumentException("Request ID is too long (max 100 characters)");
        }
    }

    public ClickLog toEntity(Long userId) {
        validate();
        return ClickLog.builder()
                .userId(userId)
                .eventId(this.eventId)
                .source(this.source)
                .requestId(this.requestId)
                .build();
    }
}
