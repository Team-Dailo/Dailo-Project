package com.dailo.backend.dto.auth;

import com.dailo.backend.entity.Member;
import com.dailo.backend.domain.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class MemberResponseDto {
    private Long id;
    private String email;
    private String nickname;
    /** USER, ADMIN 등 - 마이페이지에서 관리자 메뉴 노출 여부에 사용 */
    private String role;

    public static MemberResponseDto of(Member member) {
        Role r = member.getRole();
        return new MemberResponseDto(
                member.getId(),
                member.getEmail(),
                member.getNickname(),
                r != null ? r.name() : "USER"
        );
    }
}