package com.dailo.backend.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 행사 상세 좋아요 상태 (현재 사용자 좋아요 여부 + 전체 좋아요 수)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventLikeStatusDto {
    /** 현재 로그인한 사용자가 이 행사를 좋아요 했는지 */
    private boolean liked;
    /** 해당 행사 전체 좋아요 수 */
    private long likeCount;
}
