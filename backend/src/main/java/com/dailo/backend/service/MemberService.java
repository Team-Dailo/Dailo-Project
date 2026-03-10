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
    private final S3UploadService s3UploadService;

    public MemberResponseDto getMyProfile(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));

        return createDtoWithPresignedUrl(member);
    }

    @Transactional
    public MemberResponseDto updateProfile(String email, MemberUpdateRequestDto request) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));

        String newNickname = request.getNickname();
        if (newNickname != null && !newNickname.equals(member.getNickname())) {
            if (memberRepository.existsByNickname(newNickname)) {
                throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
            }
        }

        member.updateProfile(newNickname, request.getProfileImageUrl());
        return createDtoWithPresignedUrl(member);
    }

    @Transactional
    public void updateProfileImage(String email, String imageKey) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));

        member.updateProfile(member.getNickname(), imageKey);
    }

    @Transactional
    public void withdraw(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));
        member.withdraw();
    }

    public boolean checkNicknameDuplicate(String nickname) {
        return memberRepository.existsByNickname(nickname);
    }

    @Transactional
    public void ensureMember1Nickname() {
        memberRepository.findById(1L).ifPresent(m -> {
            if (m.getNickname() == null || m.getNickname().isBlank()) {
                m.updateProfile("회원1", null);
            }
        });
    }

    private MemberResponseDto createDtoWithPresignedUrl(Member member) {
        String key = member.getProfileImageUrl();
        String presignedUrl = null;

        if (key != null && !key.isBlank()) {
            presignedUrl = s3UploadService.getPresignedUrl(key);
        }

        return MemberResponseDto.of(member, presignedUrl);
    }
}