package com.dailo.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class InquiryRequestDto {

    @NotBlank(message = "이메일을 입력해 주세요.")
    @Email
    @Size(max = 255)
    private String email;

    @NotBlank(message = "제목을 입력해 주세요.")
    @Size(max = 500)
    private String title;

    @NotBlank(message = "내용을 입력해 주세요.")
    @Size(max = 5000)
    private String content;
}
