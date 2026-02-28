package com.dailo.backend.controller;

import com.dailo.backend.dto.BlockCheckResponseDto;
import com.dailo.backend.dto.BlockRequestDto;
import com.dailo.backend.dto.BlockResponseDto;
import com.dailo.backend.service.BlockService;
import com.dailo.backend.util.SecurityUtil;
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
    public ResponseEntity<List<BlockResponseDto>> getMyBlocks() {
        // 💡 보안을 위해 X-User-Id 헤더 대신 토큰의 이메일을 사용합니다.
        String email = SecurityUtil.getCurrentMemberEmail();
        return ResponseEntity.ok(blockService.getMyBlocksByEmail(email));
    }

    // 2. 차단 추가 (POST)
    @PostMapping
    public ResponseEntity<BlockResponseDto> blockUser(
            @Valid @RequestBody BlockRequestDto requestDto) {

        String email = SecurityUtil.getCurrentMemberEmail();
        BlockResponseDto response = blockService.blockUserByEmail(email, requestDto.getBlockedId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 3. 차단 해제 (DELETE)
    @DeleteMapping("/{blockedId}")
    public ResponseEntity<Void> unblockUser(@PathVariable Long blockedId) {

        String email = SecurityUtil.getCurrentMemberEmail();
        blockService.unblockUserByEmail(email, blockedId);
        return ResponseEntity.ok().build();
    }

    // 4. 차단 여부 확인 (GET)
    @GetMapping("/check/{targetUserId}")
    public ResponseEntity<BlockCheckResponseDto> checkBlock(@PathVariable Long targetUserId) {

        String email = SecurityUtil.getCurrentMemberEmail();
        BlockCheckResponseDto response = blockService.checkBlockDirectionByEmail(email, targetUserId);
        return ResponseEntity.ok(response);
    }
}