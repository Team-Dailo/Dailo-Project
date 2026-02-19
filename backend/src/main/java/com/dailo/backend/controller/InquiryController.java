package com.dailo.backend.controller;

import com.dailo.backend.dto.InquiryRequestDto;
import com.dailo.backend.dto.InquiryResponseDto;
import com.dailo.backend.service.InquiryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
@Tag(name = "Inquiry API", description = "문의하기 API")
public class InquiryController {

    private final InquiryService inquiryService;

    @Operation(summary = "문의 제출", description = "비로그인도 가능. 로그인 시 회원 ID가 함께 저장됩니다.")
    @PostMapping
    public ResponseEntity<InquiryResponseDto> create(
            @Valid @RequestBody InquiryRequestDto dto,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long memberId = null;
        if (userDetails != null && userDetails.getUsername() != null && !userDetails.getUsername().isEmpty()) {
            try {
                memberId = Long.parseLong(userDetails.getUsername());
            } catch (NumberFormatException ignored) {
            }
        }
        InquiryResponseDto created = inquiryService.create(dto, memberId);
        return ResponseEntity.ok(created);
    }
}
