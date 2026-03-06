package com.dailo.backend.controller;

import com.dailo.backend.dto.location.LocationRequest;
import com.dailo.backend.dto.location.StaySessionResponseDto;
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

    @Operation(summary = "체류 인증 시작 (타이머 START)", description = "행사장 반경 200m 내에 진입 시 호출.")
    @PostMapping("/start")
    public ResponseEntity<String> startStay(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody LocationRequest request
    ) {
        // principal 이름(이메일 또는 회원 ID 문자열)
        String principal = userDetails.getUsername();

        locationService.startStay(principal, request);

        return ResponseEntity.ok("체류 인증이 시작되었습니다. 구역을 벗어나면 자동으로 참여 기록이 저장됩니다.");
    }

    @PostMapping("/complete")
    public ResponseEntity<String> completeStay(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody LocationRequest request
    ) {
        String principal = userDetails.getUsername();
        locationService.completeStay(principal, request);
        return ResponseEntity.ok("인증 완료!");
    }

    /** 완료된 체류 세션 목록 */
    @GetMapping("/stay-sessions/completed")
    public ResponseEntity<List<StaySessionResponseDto>> getCompletedStaySessions(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String principal = userDetails.getUsername();
        return ResponseEntity.ok(locationService.getCompletedSessions(principal));
    }

    /** 체류 미션 기록 */
    @GetMapping("/stay-sessions/stay-mission")
    public ResponseEntity<List<StaySessionResponseDto>> getStayMissionSessions(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String principal = userDetails.getUsername();
        return ResponseEntity.ok(locationService.getStayMissionSessions(principal));
    }
}