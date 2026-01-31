package com.dailo.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChatRoomRequestDto {

    @NotNull(message = "targetUserId is required")
    private Long targetUserId;  // 1:1 채팅 상대
}
