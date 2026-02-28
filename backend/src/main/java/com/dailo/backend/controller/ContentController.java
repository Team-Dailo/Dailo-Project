package com.dailo.backend.controller;

import com.dailo.backend.dto.BlockRequestDto;
import com.dailo.backend.dto.BlockResponseDto;
import com.dailo.backend.service.AppContentService;
import com.dailo.backend.service.BlockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/blocks")
@RequiredArgsConstructor
public class BlockController {

    private final BlockService blockService;

    // 1. 내 차단 목록 조회
    @GetMapping("/me")
    public ResponseEntity<List<BlockResponseDto>> getMyBlocks() {
        // 💡 헤더 대신 현재 로그인된 사용자의 이메일을 가져옵니다.
        String email = com.dailo.backend.util.SecurityUtil.getCurrentMemberEmail();
        // 서비스 레이어에서도 email을 통해 유저를 찾도록 수정이 필요할 수 있습니다.
        return ResponseEntity.ok(blockService.getMyBlocksByEmail(email));
    }

    // 2. 차단 추가
    @PostMapping
    public ResponseEntity<BlockResponseDto> blockUser(
            @Valid @RequestBody BlockRequestDto requestDto) {

        String email = com.dailo.backend.util.SecurityUtil.getCurrentMemberEmail();
        BlockResponseDto response = blockService.blockUserByEmail(email, requestDto.getBlockedId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 3. 차단 해제
    @DeleteMapping("/{blockedId}")
    public ResponseEntity<Void> unblockUser(@PathVariable Long blockedId) {

        String email = com.dailo.backend.util.SecurityUtil.getCurrentMemberEmail();
        blockService.unblockUserByEmail(email, blockedId);
        return ResponseEntity.ok().build();
    }
}