package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.MessageType;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChatMessageRequestDto {

    private String content;
    private MessageType messageType = MessageType.TEXT;
    private Long senderId;  // STOMP에서 사용
}
