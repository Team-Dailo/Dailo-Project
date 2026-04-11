package com.dailo.backend.controller;

import com.dailo.backend.dto.AppVersionDto;
import com.dailo.backend.dto.AppVersionRequestDto;
import com.dailo.backend.service.AppVersionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/app-versions")
@RequiredArgsConstructor
@Tag(name = "Admin App Version API", description = "관리자 앱 버전 관리")
public class AdminAppVersionController {

    private final AppVersionService appVersionService;

    @Operation(summary = "모든 플랫폼 버전 정보 조회")
    @GetMapping
    public ResponseEntity<List<AppVersionDto>> getAllVersions() {
        return ResponseEntity.ok(appVersionService.getAllVersions());
    }

    @Operation(summary = "특정 플랫폼 버전 정보 조회")
    @GetMapping("/{platform}")
    public ResponseEntity<AppVersionDto> getVersion(@PathVariable String platform) {
        return ResponseEntity.ok(appVersionService.getVersion(platform));
    }

    @Operation(summary = "버전 정보 저장/수정")
    @PutMapping
    public ResponseEntity<AppVersionDto> saveOrUpdate(@Valid @RequestBody AppVersionRequestDto request) {
        return ResponseEntity.ok(appVersionService.saveOrUpdate(request));
    }
}
