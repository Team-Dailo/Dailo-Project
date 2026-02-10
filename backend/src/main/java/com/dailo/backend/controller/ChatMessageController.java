package com.dailo.backend.controller;

import com.dailo.backend.dto.ChatMessageRequestDto;
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

    // 메시지 전송 (REST) - STOMP 대신 또는 보조용
    @PostMapping("/{roomId}/messages")
    public ResponseEntity<ChatMessageResponseDto> sendMessage(
            @PathVariable Long roomId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody ChatMessageRequestDto requestDto) {

        ChatMessageResponseDto response = chatMessageService.sendMessage(
                roomId,
                userId,
                requestDto.getContent() != null ? requestDto.getContent() : "",
                requestDto.getMessageType()
        );
        return ResponseEntity.ok(response);
    }
}
