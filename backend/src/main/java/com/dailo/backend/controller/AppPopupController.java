package com.dailo.backend.controller;

import com.dailo.backend.dto.AppPopupDto;
import com.dailo.backend.service.AppPopupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/popups")
@RequiredArgsConstructor
@Tag(name = "Popup API", description = "앱 시작 팝업 조회 (공개)")
public class AppPopupController {

    private final AppPopupService appPopupService;

    @Operation(summary = "활성 팝업 목록 조회")
    @GetMapping
    public ResponseEntity<List<AppPopupDto>> getActivePopups() {
        return ResponseEntity.ok(appPopupService.getActivePopups());
    }
}
