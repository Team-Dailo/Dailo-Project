package com.dailo.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CommentStatsDto {
    private long total;
    private long visible;
    private long hidden;
    private long todayComments;
}
