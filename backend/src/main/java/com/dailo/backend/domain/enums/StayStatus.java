package com.dailo.backend.domain.enums;

public enum StayStatus {
    PENDING,    // 체류 중 (타이머 돌아가는 중)
    COMPLETED,  // 30분 달성 완료 (응모 가능)
    FAILED,     // 시간 부족 / 이탈
    FRAUD       // GPS 조작 등 부정 행위 감지됨
}