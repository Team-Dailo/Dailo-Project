package com.dailo.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportedPostSummaryDto {
    private Long postId;
    private Long reportCount;
    private String title;
    private Long authorId;
    private String authorNickname;
}
