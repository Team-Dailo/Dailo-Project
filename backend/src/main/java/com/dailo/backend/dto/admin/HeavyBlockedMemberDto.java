package com.dailo.backend.dto.admin;

import com.dailo.backend.entity.Member;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class HeavyBlockedMemberDto {
    private Long memberId;
    private String email;
    private String nickname;
    private int blockCount;
    /** 정지 해제 예정일 (null = 미정지, 표시용) */
    private LocalDateTime suspendedUntil;

    public static HeavyBlockedMemberDto of(Member member, int blockCount) {
        return HeavyBlockedMemberDto.builder()
                .memberId(member.getId())
                .email(member.getEmail())
                .nickname(member.getNickname())
                .blockCount(blockCount)
                .suspendedUntil(member.getSuspendedUntil())
                .build();
    }
}
