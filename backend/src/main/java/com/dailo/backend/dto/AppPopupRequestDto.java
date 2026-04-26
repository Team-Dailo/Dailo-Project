package com.dailo.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AppPopupRequestDto {

    @NotBlank(message = "팝업 제목을 입력해주세요.")
    private String title;

    @NotBlank(message = "이미지 URL을 입력해주세요.")
    private String imageUrl;

    private String linkUrl;
    private Integer displayOrder;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
}
