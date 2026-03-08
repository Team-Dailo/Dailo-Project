package com.dailo.backend.domain.enums;

/**
 * 달력 필터용 행사 구분 (충주시/대학교/총학생회/단과대/동아리)
 * 행사 등록 시 지정하면 달력에서 해당 칩 선택 시 노출됨.
 */
public enum EventFilterGroup {
    CHUNGJU_CITY,    // 충주시
    UNIVERSITY,      // 대학교
    STUDENT_COUNCIL, // 총학생회
    COLLEGE,         // 단과대
    CLUB             // 동아리
}
