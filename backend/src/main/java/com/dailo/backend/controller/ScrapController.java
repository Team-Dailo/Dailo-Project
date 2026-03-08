package com.dailo.backend.controller;

import com.dailo.backend.dto.event.EventListResponse;
import com.dailo.backend.service.ScrapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/scraps")
@RequiredArgsConstructor
@Tag(name = "Scrap API", description = "관심 행사(찜하기) 저장/취소 및 목록 조회")
public class ScrapController {

    private final ScrapService scrapService;

    /**
     * 1. 스크랩 토글 (저장/취소)
     */
    @Operation(summary = "스크랩 토글 (저장/취소)", description = "행사를 찜하거나 취소합니다.")
    @PostMapping("/{eventId}")
    public ResponseEntity<Map<String, Object>> toggleScrap(
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "행사 ID", required = true) @PathVariable Long eventId
    ) {
        String email = userDetails.getUsername();

        boolean isScraped = scrapService.toggleScrap(email, eventId);

        Map<String, Object> response = new HashMap<>();
        response.put("isScraped", isScraped);
        response.put("message", isScraped ? "스크랩 완료" : "스크랩 취소");

        return ResponseEntity.ok(response);
    }

    /**
     * 2. 내 스크랩 목록 조회
     */
    @Operation(summary = "내 스크랩 목록 조회", description = "내가 찜한 행사 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<Page<EventListResponse>> getMyScraps(
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        String email = userDetails.getUsername();
        return ResponseEntity.ok(scrapService.getMyScraps(email, pageable));
    }
}