package com.dailo.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class FaqRequestDto {

    @NotBlank(message = "카테고리를 입력해주세요.")
    @Size(max = 100)
    private String category;

    @NotBlank(message = "질문을 입력해주세요.")
    @Size(max = 500)
    private String question;

    @NotBlank(message = "답변을 입력해주세요.")
    private String answer;

    private Integer displayOrder;
}
