package com.dailo.backend.controller;

import com.dailo.backend.dto.VersionCheckResponseDto;
import com.dailo.backend.service.AppVersionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/app-version")
@RequiredArgsConstructor
@Tag(name = "App Version API", description = "앱 버전 체크")
public class AppVersionController {

    private final AppVersionService appVersionService;

    @Operation(summary = "버전 체크 (업데이트 필요 여부 확인)")
    @GetMapping("/check")
    public ResponseEntity<VersionCheckResponseDto> checkVersion(
            @RequestParam String platform,
            @RequestParam String version
    ) {
        return ResponseEntity.ok(appVersionService.checkVersion(platform, version));
    }
}
