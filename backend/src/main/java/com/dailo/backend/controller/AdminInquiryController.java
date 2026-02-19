package com.dailo.backend.controller;

import com.dailo.backend.dto.InquiryResponseDto;
import com.dailo.backend.service.InquiryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/inquiries")
@RequiredArgsConstructor
@Tag(name = "Admin Inquiry API", description = "관리자 문의 목록/상세")
public class AdminInquiryController {

    private final InquiryService inquiryService;

    @Operation(summary = "문의 목록 (최신순)")
    @GetMapping
    public ResponseEntity<Page<InquiryResponseDto>> list(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<InquiryResponseDto> page = inquiryService.findAll(sorted);
        return ResponseEntity.ok(page);
    }

    @Operation(summary = "문의 상세")
    @GetMapping("/{id}")
    public ResponseEntity<InquiryResponseDto> get(@PathVariable Long id) {
        InquiryResponseDto dto = inquiryService.findById(id);
        return ResponseEntity.ok(dto);
    }
}
