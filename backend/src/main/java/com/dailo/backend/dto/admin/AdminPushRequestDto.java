package com.dailo.backend.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AdminPushRequestDto {

    @NotBlank(message = "알림 제목을 입력해주세요.")
    @Size(max = 100, message = "제목은 100자 이내로 입력해주세요.")
    private String title;

    @NotBlank(message = "알림 내용을 입력해주세요.")
    @Size(max = 500, message = "내용은 500자 이내로 입력해주세요.")
    private String body;

    private List<Long> memberIds;
}
