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
    private static final Long GUEST_USER_ID = 0L; // ✅ 없으면 게스트로 처리

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String userIdHeader = accessor.getFirstNativeHeader(USER_ID_HEADER);

            Long userId = GUEST_USER_ID;
            if (userIdHeader != null && !userIdHeader.isBlank()) {
                try {
                    userId = Long.parseLong(userIdHeader.trim());
                } catch (NumberFormatException ignored) {
                    userId = GUEST_USER_ID;
                }
            }

            // ✅ 무조건 Principal 세팅 (null 방지)
            accessor.setUser(new StompPrincipal(userId));
        }

        return message;
    }

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
