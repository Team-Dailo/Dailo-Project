package com.dailo.backend.controller;

import com.dailo.backend.dto.ChatMessageRequestDto;
import com.dailo.backend.dto.ChatMessageResponseDto;
import com.dailo.backend.service.ChatMessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat/rooms")
@RequiredArgsConstructor
public class ChatMessageController {

    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;

    // 메시지 히스토리 조회
    @GetMapping("/{roomId}/messages")
    public ResponseEntity<Page<ChatMessageResponseDto>> getMessages(
            @PathVariable Long roomId,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        Long userId = Long.parseLong(userDetails.getUsername());
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(chatMessageService.getMessages(roomId, userId, pageable));
    }

    // 메시지 전송 (REST API)
    @PostMapping("/{roomId}/messages")
    public ResponseEntity<ChatMessageResponseDto> sendMessage(
            @PathVariable Long roomId,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ChatMessageRequestDto requestDto) {

        Long userId = Long.parseLong(userDetails.getUsername());
        ChatMessageResponseDto response = chatMessageService.sendMessage(
                roomId,
                userId,
                requestDto.getContent(),
                requestDto.getMessageType()
        );

        // WebSocket 구독자들에게도 브로드캐스트
        messagingTemplate.convertAndSend("/topic/chat/" + roomId, response);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
