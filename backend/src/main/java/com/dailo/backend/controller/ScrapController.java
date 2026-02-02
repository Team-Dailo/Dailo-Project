package com.dailo.backend.controller;

import com.dailo.backend.dto.EventListResponse;
import com.dailo.backend.service.ScrapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/scraps")
@RequiredArgsConstructor
@Tag(name = "Scrap API", description = "관심 행사(찜하기) 저장/취소 및 목록 조회")
public class ScrapController {

    private final ScrapService scrapService;

    // [임시] 로그인 기능 구현 전까지 사용할 테스트 유저 ID
    private static final Long TEST_USER_ID = 1L;

    /**
     * 1. 스크랩 토글 (저장/취소)
     * [POST] /api/scraps/{eventId}
     */
    @Operation(summary = "스크랩 토글 (저장/취소)", description = "행사를 찜하거나 취소합니다. (이미 찜했으면 삭제, 없으면 저장)")
    @PostMapping("/{eventId}")
    public ResponseEntity<String> toggleScrap(
            @Parameter(description = "행사 ID", required = true) @PathVariable Long eventId
    ) {
        boolean isScraped = scrapService.toggleScrap(TEST_USER_ID, eventId);

        if (isScraped) {
            return ResponseEntity.ok("스크랩 완료 (저장됨)");
        } else {
            return ResponseEntity.ok("스크랩 취소 (삭제됨)");
        }
    }

    /**
     * 2. 내 스크랩 목록 조회
     * [GET] /api/scraps
     */
    @Operation(summary = "내 스크랩 목록 조회", description = "내가 찜한 행사 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<Page<EventListResponse>> getMyScraps(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(scrapService.getMyScraps(TEST_USER_ID, pageable));
    }
}