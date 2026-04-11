package com.dailo.backend.controller;

import com.dailo.backend.dto.BannerDto;
import com.dailo.backend.dto.BannerRequestDto;
import com.dailo.backend.service.BannerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/banners")
@RequiredArgsConstructor
@Tag(name = "Admin Banner API", description = "관리자 배너 관리")
public class AdminBannerController {

    private final BannerService bannerService;

    @Operation(summary = "배너 목록 조회")
    @GetMapping
    public ResponseEntity<Page<BannerDto>> getAllBanners(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(bannerService.getAllBanners(pageable));
    }

    @Operation(summary = "배너 상세 조회")
    @GetMapping("/{id}")
    public ResponseEntity<BannerDto> getBanner(@PathVariable Long id) {
        return ResponseEntity.ok(bannerService.getBanner(id));
    }

    @Operation(summary = "배너 생성")
    @PostMapping
    public ResponseEntity<BannerDto> createBanner(@Valid @RequestBody BannerRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bannerService.createBanner(request));
    }

    @Operation(summary = "배너 수정")
    @PutMapping("/{id}")
    public ResponseEntity<BannerDto> updateBanner(@PathVariable Long id, @Valid @RequestBody BannerRequestDto request) {
        return ResponseEntity.ok(bannerService.updateBanner(id, request));
    }

    @Operation(summary = "배너 활성화/비활성화 토글")
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<BannerDto> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(bannerService.toggleActive(id));
    }

    @Operation(summary = "배너 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBanner(@PathVariable Long id) {
        bannerService.deleteBanner(id);
        return ResponseEntity.noContent().build();
    }
}
