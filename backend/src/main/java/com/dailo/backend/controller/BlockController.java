package com.dailo.backend.controller;

import com.dailo.backend.dto.BlockCheckResponseDto;
import com.dailo.backend.dto.BlockRequestDto;
import com.dailo.backend.dto.BlockResponseDto;
import com.dailo.backend.service.BlockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/blocks")
@RequiredArgsConstructor
public class BlockController {

    private final BlockService blockService;

    // 1. 내 차단 목록 조회
    @GetMapping("/me")
    public ResponseEntity<List<BlockResponseDto>> getMyBlocks(
            @RequestHeader("X-User-Id") Long userId) {

        return ResponseEntity.ok(blockService.getMyBlocks(userId));
    }

    // 2. 차단 추가
    @PostMapping
    public ResponseEntity<BlockResponseDto> blockUser(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody BlockRequestDto requestDto) {

        BlockResponseDto response = blockService.blockUser(userId, requestDto.getBlockedId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 3. 차단 해제
    @DeleteMapping("/{blockedId}")
    public ResponseEntity<Void> unblockUser(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long blockedId) {

        blockService.unblockUser(userId, blockedId);
        return ResponseEntity.ok().build();
    }

    // 4. 차단 여부 확인
    @GetMapping("/check/{targetUserId}")
    public ResponseEntity<BlockCheckResponseDto> checkBlock(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long targetUserId) {

        BlockCheckResponseDto response = blockService.checkBlockDirection(userId, targetUserId);
        return ResponseEntity.ok(response);
    }
}
