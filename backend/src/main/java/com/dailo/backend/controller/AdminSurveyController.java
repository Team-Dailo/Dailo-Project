package com.dailo.backend.controller;

import com.dailo.backend.dto.SurveyDto;
import com.dailo.backend.service.SurveyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/surveys")
@RequiredArgsConstructor
@Tag(name = "Admin Survey API", description = "관리자 설문 응답 조회")
public class AdminSurveyController {

    private final SurveyService surveyService;

    @Operation(summary = "전체 설문 응답 목록")
    @GetMapping
    public ResponseEntity<Page<SurveyDto>> getAllSurveys(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(surveyService.getAllSurveys(pageable));
    }

    @Operation(summary = "행사별 설문 응답 목록")
    @GetMapping("/event/{eventId}")
    public ResponseEntity<Page<SurveyDto>> getSurveysByEvent(
            @PathVariable Long eventId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(surveyService.getSurveysByEvent(eventId, pageable));
    }
}
