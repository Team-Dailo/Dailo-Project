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

@RestController
@RequestMapping("/api/scraps")
@RequiredArgsConstructor
@Tag(name = "Scrap API", description = "관심 행사(찜하기) 저장/취소 및 목록 조회")
public class ScrapController {

    private final ScrapService scrapService;

    /**
     * 1. 스크랩 토글 (저장/취소)
     * [POST] /api/scraps/{eventId}
     */
    @Operation(summary = "스크랩 토글 (저장/취소)", description = "행사를 찜하거나 취소합니다.")
    @PostMapping("/{eventId}")
    public ResponseEntity<String> toggleScrap(
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails, // [NEW] 토큰에서 유저 정보 꺼내기
            @Parameter(description = "행사 ID", required = true) @PathVariable Long eventId
    ) {
        // UserDetails.getUsername()에 우리가 아까 ID(PK)를 넣어뒀으므로, Long으로 변환해서 사용
        Long memberId = Long.parseLong(userDetails.getUsername());

        boolean isScraped = scrapService.toggleScrap(memberId, eventId);

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
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails, // [NEW] 토큰에서 유저 정보 꺼내기
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(scrapService.getMyScraps(memberId, pageable));
    }
}