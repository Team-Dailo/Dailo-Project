package com.dailo.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class InquiryAnswerRequestDto {

    @NotBlank(message = "답변 내용을 입력해주세요.")
    @Size(max = 5000, message = "답변은 5000자 이내로 입력해주세요.")
    private String answer;
}
