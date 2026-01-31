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

    private static final String USER_ID_HEADER = "X-User-Id";

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            // CONNECT 시 X-User-Id 헤더에서 userId 추출
            String userIdHeader = accessor.getFirstNativeHeader(USER_ID_HEADER);

            if (userIdHeader != null) {
                Long userId = Long.parseLong(userIdHeader);
                // Principal로 설정하여 이후 메시지에서 사용
                accessor.setUser(new StompPrincipal(userId));
            }
        }

        return message;
    }

    // 간단한 Principal 구현
    public static class StompPrincipal implements Principal {
        private final Long userId;

        public StompPrincipal(Long userId) {
            this.userId = userId;
        }

        @Override
        public String getName() {
            return userId.toString();
        }

        public Long getUserId() {
            return userId;
        }
    }
}
