package com.dailo.backend.controller;

import com.dailo.backend.dto.AppPopupDto;
import com.dailo.backend.dto.AppPopupRequestDto;
import com.dailo.backend.service.AppPopupService;
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
@RequestMapping("/api/admin/popups")
@RequiredArgsConstructor
@Tag(name = "Admin Popup API", description = "관리자 팝업 관리")
public class AdminAppPopupController {

    private final AppPopupService appPopupService;

    @Operation(summary = "팝업 목록 조회")
    @GetMapping
    public ResponseEntity<Page<AppPopupDto>> getAllPopups(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(appPopupService.getAllPopups(pageable));
    }

    @Operation(summary = "팝업 상세 조회")
    @GetMapping("/{id}")
    public ResponseEntity<AppPopupDto> getPopup(@PathVariable Long id) {
        return ResponseEntity.ok(appPopupService.getPopup(id));
    }

    @Operation(summary = "팝업 생성")
    @PostMapping
    public ResponseEntity<AppPopupDto> createPopup(@Valid @RequestBody AppPopupRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(appPopupService.createPopup(request));
    }

    @Operation(summary = "팝업 수정")
    @PutMapping("/{id}")
    public ResponseEntity<AppPopupDto> updatePopup(@PathVariable Long id, @Valid @RequestBody AppPopupRequestDto request) {
        return ResponseEntity.ok(appPopupService.updatePopup(id, request));
    }

    @Operation(summary = "팝업 활성화/비활성화 토글")
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<AppPopupDto> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(appPopupService.toggleActive(id));
    }

    @Operation(summary = "팝업 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePopup(@PathVariable Long id) {
        appPopupService.deletePopup(id);
        return ResponseEntity.noContent().build();
    }
}
