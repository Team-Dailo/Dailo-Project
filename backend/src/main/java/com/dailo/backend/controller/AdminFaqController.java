package com.dailo.backend.controller;

import com.dailo.backend.dto.FaqDto;
import com.dailo.backend.dto.FaqRequestDto;
import com.dailo.backend.service.FaqService;
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
@RequestMapping("/api/admin/faq")
@RequiredArgsConstructor
@Tag(name = "Admin FAQ API", description = "관리자 FAQ 관리")
public class AdminFaqController {

    private final FaqService faqService;

    @Operation(summary = "FAQ 목록 조회 (비활성 포함)")
    @GetMapping
    public ResponseEntity<Page<FaqDto>> getAllFaqs(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(faqService.getAllFaqs(pageable));
    }

    @Operation(summary = "FAQ 상세 조회")
    @GetMapping("/{id}")
    public ResponseEntity<FaqDto> getFaq(@PathVariable Long id) {
        return ResponseEntity.ok(faqService.getFaq(id));
    }

    @Operation(summary = "FAQ 생성")
    @PostMapping
    public ResponseEntity<FaqDto> createFaq(@Valid @RequestBody FaqRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(faqService.createFaq(request));
    }

    @Operation(summary = "FAQ 수정")
    @PutMapping("/{id}")
    public ResponseEntity<FaqDto> updateFaq(@PathVariable Long id, @Valid @RequestBody FaqRequestDto request) {
        return ResponseEntity.ok(faqService.updateFaq(id, request));
    }

    @Operation(summary = "FAQ 활성화/비활성화 토글")
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<FaqDto> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(faqService.toggleActive(id));
    }

    @Operation(summary = "FAQ 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFaq(@PathVariable Long id) {
        faqService.deleteFaq(id);
        return ResponseEntity.noContent().build();
    }
}
