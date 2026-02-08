package com.dailo.backend.controller;

import com.dailo.backend.config.StompChannelInterceptor.StompPrincipal;
import com.dailo.backend.dto.ChatMessageRequestDto;
import com.dailo.backend.dto.ChatMessageResponseDto;
import com.dailo.backend.service.ChatMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;

    // STOMP 메시지 수신 → 저장 → 브로드캐스트
    @MessageMapping("/chat/{roomId}")
    public void sendMessage(
            @DestinationVariable Long roomId,
            @Payload ChatMessageRequestDto requestDto,
            Principal principal) {

        // 서버에서 senderId 결정 (클라이언트 payload의 senderId는 무시)
        Long senderId = getSenderIdFromPrincipal(principal);

        // 메시지 저장
        ChatMessageResponseDto response = chatMessageService.sendMessage(
                roomId,
                senderId,
                requestDto.getContent(),
                requestDto.getMessageType()
        );

        // 해당 채팅방 구독자들에게 브로드캐스트
        messagingTemplate.convertAndSend("/topic/chat/" + roomId, response);
    }

    private Long getSenderIdFromPrincipal(Principal principal) {
        if (principal == null) {
            throw new RuntimeException("Not authenticated");
        }

        if (principal instanceof StompPrincipal) {
            return ((StompPrincipal) principal).getUserId();
        }

        return Long.parseLong(principal.getName());
    }
}
