package com.dailo.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PostLikeResponseDto {
    private boolean liked;
    private int likeCount;
}
