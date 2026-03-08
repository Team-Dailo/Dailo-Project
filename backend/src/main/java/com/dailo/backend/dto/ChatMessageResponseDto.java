package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.MessageType;
import com.dailo.backend.entity.ChatMessage;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ChatMessageResponseDto {

    private Long id;
    private Long roomId;
    private Long senderId;
    private String content;
    private MessageType messageType;
    private LocalDateTime createdAt;

    public static ChatMessageResponseDto from(ChatMessage message) {
        return ChatMessageResponseDto.builder()
                .id(message.getId())
                .roomId(message.getRoom().getId())
                .senderId(message.getSenderId())
                .content(message.getContent())
                .messageType(message.getMessageType())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
