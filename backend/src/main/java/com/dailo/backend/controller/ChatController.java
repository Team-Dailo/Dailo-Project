package com.dailo.backend.controller;

import com.dailo.backend.config.StompChannelInterceptor.StompPrincipal;
import com.dailo.backend.dto.ChatMessageRequestDto;
import com.dailo.backend.dto.ChatMessageResponseDto;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
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
    private final MemberRepository memberRepository;

    @MessageMapping("/chat/{roomId}")
    public void sendMessage(
            @DestinationVariable Long roomId,
            @Payload ChatMessageRequestDto requestDto,
            Principal principal) {

        String email = principal.getName();

        ChatMessageResponseDto response = chatMessageService.sendMessage(
                roomId,
                email,
                requestDto.getContent(),
                requestDto.getMessageType()
        );

        messagingTemplate.convertAndSend("/topic/chat/" + roomId, response);
    }

    private Long getSenderIdFromPrincipal(Principal principal) {
        if (principal == null) {
            throw new RuntimeException("Not authenticated");
        }


        String email = principal.getName();

        // 이메일로 DB에서 실제 Member의 Long ID를 찾아옵니다.
        return memberRepository.findByEmail(email)
                .map(Member::getId)
                .orElseThrow(() -> new RuntimeException("회원 정보를 찾을 수 없습니다. email: " + email));
    }
}