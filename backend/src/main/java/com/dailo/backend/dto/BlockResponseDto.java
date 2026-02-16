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
    /** 차단한 사용자 닉네임 (목록 표시용) */
    private String blockedNickname;
    private LocalDateTime createdAt;

    public static BlockResponseDto from(Block block) {
        return BlockResponseDto.builder()
                .id(block.getId())
                .blockerId(block.getBlockerId())
                .blockedId(block.getBlockedId())
                .blockedNickname(null)
                .createdAt(block.getCreatedAt())
                .build();
    }

    public static BlockResponseDto from(Block block, String blockedNickname) {
        return BlockResponseDto.builder()
                .id(block.getId())
                .blockerId(block.getBlockerId())
                .blockedId(block.getBlockedId())
                .blockedNickname(blockedNickname != null ? blockedNickname : "알 수 없음")
                .createdAt(block.getCreatedAt())
                .build();
    }
}
