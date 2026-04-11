package com.dailo.backend.service;

import com.dailo.backend.dto.admin.AdminPushResponseDto;
import com.dailo.backend.entity.Member;
import com.dailo.backend.entity.NotificationLog;
import com.dailo.backend.entity.PushToken;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.repository.NotificationLogRepository;
import com.dailo.backend.repository.PushTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AdminNotificationService {

    private final FcmService fcmService;
    private final PushTokenRepository pushTokenRepository;
    private final MemberRepository memberRepository;
    private final NotificationLogRepository notificationLogRepository;

    /**
     * 전체 사용자에게 푸시 알림 발송
     */
    public AdminPushResponseDto sendToAll(String title, String body) {
        List<PushToken> allTokens = pushTokenRepository.findAll();
        return sendToTokens(allTokens, title, body);
    }

    /**
     * 특정 사용자들에게 푸시 알림 발송
     */
    public AdminPushResponseDto sendToMembers(String title, String body, List<Long> memberIds) {
        List<PushToken> tokens = pushTokenRepository.findAllByMemberIdIn(memberIds);
        return sendToTokens(tokens, title, body);
    }

    private AdminPushResponseDto sendToTokens(List<PushToken> tokens, String title, String body) {
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        // 중복 회원 제거를 위해 발송한 회원 ID 추적
        tokens.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        token -> token.getMember().getId()
                ))
                .forEach((memberId, memberTokens) -> {
                    Member member = memberTokens.get(0).getMember();
                    boolean sent = false;

                    // 해당 회원의 모든 토큰에 발송 시도
                    for (PushToken token : memberTokens) {
                        try {
                            fcmService.sendMessage(token.getToken(), title, body);
                            if (!sent) {
                                successCount.incrementAndGet();
                                sent = true;
                            }
                        } catch (Exception e) {
                            log.error("푸시 발송 실패 - memberId: {}, token: {}", memberId, token.getToken(), e);
                        }
                    }

                    if (!sent) {
                        failCount.incrementAndGet();
                    }

                    // 알림 로그 저장 (회원당 1개)
                    saveNotificationLog(member, title, body);
                });

        log.info("관리자 푸시 발송 완료 - 성공: {}, 실패: {}", successCount.get(), failCount.get());

        return AdminPushResponseDto.builder()
                .totalTargets(successCount.get() + failCount.get())
                .successCount(successCount.get())
                .failCount(failCount.get())
                .sentAt(LocalDateTime.now())
                .build();
    }

    private void saveNotificationLog(Member member, String title, String body) {
        NotificationLog log = NotificationLog.builder()
                .member(member)
                .title(title)
                .body(body)
                .build();
        notificationLogRepository.save(log);
    }
}
