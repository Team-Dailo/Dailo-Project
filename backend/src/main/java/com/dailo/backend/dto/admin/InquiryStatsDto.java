package com.dailo.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class InquiryStatsDto {
    private long total;
    private long pending;   // 미답변
    private long answered;  // 답변완료
}
