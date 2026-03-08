package com.dailo.backend.config;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Component
public class StompChannelInterceptor implements ChannelInterceptor {

    // 💡 이제 이메일을 헤더로 받거나, 나중에는 Authorization(토큰) 헤더를 검증해야 합니다.
    private static final String USER_EMAIL_HEADER = "X-User-Email";

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            // CONNECT 시 X-User-Email 헤더에서 이메일 추출
            String email = accessor.getFirstNativeHeader(USER_EMAIL_HEADER);

            if (email != null) {
                accessor.setUser(new StompPrincipal(email));
            }
        }

        return message;
    }

    /**
     * 💡 이메일 기반의 Principal 구현체로 변경
     */
    public static class StompPrincipal implements Principal {
        private final String email;

        public StompPrincipal(String email) {
            this.email = email;
        }

        @Override
        public String getName() {
            return email;
        }

        public String getEmail() {
            return email;
        }

        // 💡 기존 ChatController 등에서 userId를 찾던 로직과의 호환을 위해 유지하거나 제거 가능
        // 하지만 이제는 getName()으로 이메일을 가져와서 서비스에서 ID를 찾는 것이 정석입니다.
    }
}