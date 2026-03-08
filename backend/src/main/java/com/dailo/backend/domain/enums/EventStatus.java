package com.dailo.backend.domain.enums;

public enum EventStatus {
    DRAFT,      // 초안 (관리자가 작성 중, 앱에 노출 안 됨)
    ACTIVE,     // 진행 중 (공개, 앱에 정상 노출됨)
    ENDED,      // 종료됨 (기간이 끝남) - 새로 추가
    INACTIVE    // 비활성화 (관리자가 강제로 숨김)
}
