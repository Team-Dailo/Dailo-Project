package com.dailo.backend.controller;

import com.dailo.backend.dto.location.LocationRequest;
import com.dailo.backend.dto.location.StaySessionResponseDto;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.service.LocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/location")
@RequiredArgsConstructor
@Tag(name = "Location Auth API", description = "위치 기반 체류 인증 API")
public class LocationController {

    private final LocationService locationService;
    private final MemberRepository memberRepository; // [추가] DB 조회를 위해 필요

    @Operation(summary = "체류 인증 시작 (타이머 START)", description = "행사장 반경 50m 내에 진입 시 호출.")
    @PostMapping("/start")
    public ResponseEntity<String> startStay(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody LocationRequest request
    ) {
        Long memberId = Long.parseLong(userDetails.getUsername());

        System.out.println("====== [DEBUG] 추출한 ID: " + memberId); // 확인용

        locationService.startStay(memberId, request);

        return ResponseEntity.ok("체류 인증이 시작되었습니다. 구역을 벗어나면 자동으로 참여 기록이 저장됩니다.");
    }

    @PostMapping("/complete")
    public ResponseEntity<String> completeStay(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody LocationRequest request
    ) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        locationService.completeStay(memberId, request);
        return ResponseEntity.ok("인증 완료!");
    }

    /** 완료된 체류 세션 목록 (참여한 축제: 1초라도 있었으면, 같은 날 같은 행사 1건) */
    @GetMapping("/stay-sessions/completed")
    public ResponseEntity<List<StaySessionResponseDto>> getCompletedStaySessions(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(locationService.getCompletedSessions(memberId));
    }

    /** 체류 미션 기록: 30분 이상 체류한 세션만 (진입·퇴장 시간) */
    @GetMapping("/stay-sessions/stay-mission")
    public ResponseEntity<List<StaySessionResponseDto>> getStayMissionSessions(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(locationService.getStayMissionSessions(memberId));
    }
}