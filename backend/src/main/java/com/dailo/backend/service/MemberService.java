package com.dailo.backend.service;

import com.dailo.backend.dto.auth.MemberResponseDto;
import com.dailo.backend.dto.auth.MemberUpdateRequestDto;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;

    // 내 정보 조회
    public MemberResponseDto getMyProfile(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));
        return MemberResponseDto.of(member);
    }

    // 프로필 수정
    @Transactional
    public MemberResponseDto updateProfile(Long memberId, MemberUpdateRequestDto request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));

        // 닉네임 중복 체크 로직 (필요시 추가)

        member.updateProfile(request.getNickname(), request.getProfileImageUrl());
        return MemberResponseDto.of(member);
    }

    // 회원 탈퇴
    @Transactional
    public void withdraw(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));
        member.withdraw();
    }

    /** id=1 회원 닉네임이 비어 있으면 "회원1"로 설정 (댓글 등 기존 데이터 표시용) */
    @Transactional
    public void ensureMember1Nickname() {
        memberRepository.findById(1L).ifPresent(m -> {
            if (m.getNickname() == null || m.getNickname().isBlank()) {
                m.updateProfile("회원1", null);
                memberRepository.save(m);
            }
        });
    }
}