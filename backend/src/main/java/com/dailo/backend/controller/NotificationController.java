package com.dailo.backend.controller;

import com.dailo.backend.dto.PushTokenRequest;
import com.dailo.backend.entity.Member;
import com.dailo.backend.entity.NotificationSetting;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notification")
@RequiredArgsConstructor
@Tag(name = "Notification API", description = "푸시 알림 및 토큰 관리 API")
public class NotificationController {

    private final NotificationService notificationService;
    private final MemberRepository memberRepository;

    @Operation(summary = "푸시 토큰 등록/갱신", description = "로그인 시 또는 토큰 변경 시 서버에 FCM 토큰을 저장합니다.")
    @PostMapping("/token")
    public ResponseEntity<String> registerToken(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody PushTokenRequest request
    ) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        notificationService.registerToken(memberId, request.getToken(), request.getDeviceType());
        return ResponseEntity.ok("푸시 토큰이 정상적으로 등록되었습니다.");
    }

    @Operation(summary = "알림 설정 조회", description = "사용자의 현재 알림 구독 상태를 가져옵니다.")
    @GetMapping("/settings")
    public ResponseEntity<NotificationSetting> getSettings(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(notificationService.getOrInitSetting(memberId));
    }

    @PostMapping("/test-send")
    public ResponseEntity<String> testSend(@RequestParam Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        notificationService.sendPushNotification(member, "테스트 알림", "성공?");

        return ResponseEntity.ok("발송 요청 완료! 서버 로그를 확인하세요.");
    }
}