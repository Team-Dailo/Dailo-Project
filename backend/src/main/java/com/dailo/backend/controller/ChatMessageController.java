package com.dailo.backend.controller;

import com.dailo.backend.dto.ChatMessageResponseDto;
import com.dailo.backend.service.ChatMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat/rooms")
@RequiredArgsConstructor
public class ChatMessageController {

    private final ChatMessageService chatMessageService;

    // 메시지 히스토리 조회
    @GetMapping("/{roomId}/messages")
    public ResponseEntity<Page<ChatMessageResponseDto>> getMessages(
            @PathVariable Long roomId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(chatMessageService.getMessages(roomId, userId, pageable));
    }
}
