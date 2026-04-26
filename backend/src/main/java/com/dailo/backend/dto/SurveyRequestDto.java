package com.dailo.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SurveyRequestDto {

    @NotNull(message = "행사 ID를 입력해주세요.")
    private Long eventId;

    private String eventTitle;

    @NotBlank(message = "이름을 입력해주세요.")
    private String name;

    @NotBlank(message = "전화번호를 입력해주세요.")
    private String phone;

    private String feedback;
}
