package com.dailo.backend.controller;

import com.dailo.backend.dto.FaqDto;
import com.dailo.backend.service.FaqService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/faq")
@RequiredArgsConstructor
@Tag(name = "FAQ API", description = "FAQ 조회 (사용자용)")
public class FaqController {

    private final FaqService faqService;

    @Operation(summary = "FAQ 전체 조회 (활성화된 것만)")
    @GetMapping
    public ResponseEntity<List<FaqDto>> getFaqs() {
        return ResponseEntity.ok(faqService.getActiveFaqs());
    }

    @Operation(summary = "카테고리별 FAQ 조회")
    @GetMapping("/category/{category}")
    public ResponseEntity<List<FaqDto>> getFaqsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(faqService.getFaqsByCategory(category));
    }

    @Operation(summary = "FAQ 카테고리 목록 조회")
    @GetMapping("/categories")
    public ResponseEntity<List<String>> getCategories() {
        return ResponseEntity.ok(faqService.getCategories());
    }
}
