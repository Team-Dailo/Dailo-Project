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

    // 내 정보 조회
    public MemberResponseDto getMyProfile(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));

        return createDtoWithPresignedUrl(member);
    }

    // 프로필 수정
    @Transactional
    public MemberResponseDto updateProfile(Long memberId, MemberUpdateRequestDto request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));

        // 닉네임 중복 방어
        String newNickname = request.getNickname();
        if (newNickname != null && !newNickname.equals(member.getNickname())) {
            if (memberRepository.existsByNickname(newNickname)) {
                throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
            }
        }

        //엔티티 값 변경
        member.updateProfile(newNickname, request.getProfileImageUrl());

        return createDtoWithPresignedUrl(member);
    }

    // 이미지 전용 업데이트
    @Transactional
    public MemberResponseDto updateProfileImage(Long memberId, String imageKey) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));

        member.updateProfile(member.getNickname(), imageKey);

        return createDtoWithPresignedUrl(member);
    }

    // 회원 탈퇴
    @Transactional
    public void withdraw(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));
        member.withdraw();
    }

    // 닉네임 중복 체크
    public boolean checkNicknameDuplicate(String nickname) {
        return memberRepository.existsByNickname(nickname);
    }

    /** id=1 회원 닉네임이 비어 있으면 "회원1"로 설정 */
    @Transactional
    public void ensureMember1Nickname() {
        memberRepository.findById(1L).ifPresent(m -> {
            if (m.getNickname() == null || m.getNickname().isBlank()) {
                m.updateProfile("회원1", null);
            }
        });
    }


    private MemberResponseDto createDtoWithPresignedUrl(Member member) {
        String key = member.getProfileImageUrl(); // DB에는 "profile/uuid.jpg" 형태로 저장됨
        String presignedUrl = null;

        if (key != null && !key.isBlank()) {
            presignedUrl = s3UploadService.getPresignedUrl(key);
        }

        return MemberResponseDto.of(member, presignedUrl);
    }
}