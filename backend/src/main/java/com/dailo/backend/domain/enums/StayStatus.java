package com.dailo.backend.domain.enums;

public enum StayStatus {
    PENDING,    // 체류 중 (타이머 돌아가는 중)
    COMPLETED,  // 체류 완료 (참여한 축제는 5분 이상, 체류 미션은 30분 이상)
    FAILED,     // 시간 부족 / 이탈
    FRAUD       // GPS 조작 등 부정 행위 감지됨
}