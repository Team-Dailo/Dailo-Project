package com.dailo.backend.dto;

import com.dailo.backend.entity.Inquiry;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InquiryResponseDto {

    private Long id;
    private Long memberId;
    private String email;
    private String title;
    private String content;
    private LocalDateTime createdAt;

    public static InquiryResponseDto from(Inquiry entity) {
        return InquiryResponseDto.builder()
                .id(entity.getId())
                .memberId(entity.getMemberId())
                .email(entity.getEmail())
                .title(entity.getTitle())
                .content(entity.getContent())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
