package com.dailo.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 관리자 정지 적용 요청: 2W, 1M, 1Y, PERMANENT, NONE(정지해제) */
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class SuspendRequestDto {
    private String type; // "2W" | "1M" | "1Y" | "PERMANENT" | "NONE"
}
