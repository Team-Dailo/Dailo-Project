package com.dailo.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PostStatsDto {
    private long total;
    private long published;
    private long hidden;
    private long todayPosts;
}
