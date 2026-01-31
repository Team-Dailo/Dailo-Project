package com.dailo.backend.dto;

import com.dailo.backend.entity.Block;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlockResponseDto {

    private Long id;
    private Long blockerId;
    private Long blockedId;
    private LocalDateTime createdAt;

    public static BlockResponseDto from(Block block) {
        return BlockResponseDto.builder()
                .id(block.getId())
                .blockerId(block.getBlockerId())
                .blockedId(block.getBlockedId())
                .createdAt(block.getCreatedAt())
                .build();
    }
}
