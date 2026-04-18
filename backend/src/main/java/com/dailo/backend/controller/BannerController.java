package com.dailo.backend.controller;

import com.dailo.backend.dto.BannerDto;
import com.dailo.backend.service.BannerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/banners")
@RequiredArgsConstructor
@Tag(name = "Banner API", description = "배너 조회 (사용자용)")
public class BannerController {

    private final BannerService bannerService;

    @Operation(summary = "활성 배너 목록 조회")
    @GetMapping
    public ResponseEntity<List<BannerDto>> getActiveBanners() {
        return ResponseEntity.ok(bannerService.getActiveBanners());
    }
}
