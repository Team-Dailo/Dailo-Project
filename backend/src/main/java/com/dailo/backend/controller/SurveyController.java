package com.dailo.backend.controller;

import com.dailo.backend.dto.SurveyDto;
import com.dailo.backend.dto.SurveyRequestDto;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.service.SurveyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/surveys")
@RequiredArgsConstructor
@Tag(name = "Survey API", description = "축제 참여 설문")
public class SurveyController {

    private final SurveyService surveyService;
    private final MemberRepository memberRepository;

    @Operation(summary = "설문 제출")
    @PostMapping
    public ResponseEntity<SurveyDto> submit(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SurveyRequestDto request) {
        Long memberId = getMemberId(userDetails);
        return ResponseEntity.status(HttpStatus.CREATED).body(surveyService.submit(memberId, request));
    }

    @Operation(summary = "설문 제출 여부 확인")
    @GetMapping("/check")
    public ResponseEntity<Map<String, Boolean>> check(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long eventId) {
        Long memberId = getMemberId(userDetails);
        boolean submitted = surveyService.hasSubmitted(memberId, eventId);
        return ResponseEntity.ok(Map.of("submitted", submitted));
    }

    private Long getMemberId(UserDetails userDetails) {
        return memberRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."))
                .getId();
    }
}
