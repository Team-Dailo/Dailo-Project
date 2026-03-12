package com.dailo.backend.service;

import com.dailo.backend.dto.auth.MemberResponseDto;
import com.dailo.backend.dto.auth.MemberUpdateRequestDto;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;
    private final S3UploadService s3UploadService;

    public MemberResponseDto getMyProfile(String email) {
        log.info("[MemberService.getMyProfile] email={}", email);

        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다. email=" + email));

        log.info("[MemberService.getMyProfile] member found id={}", member.getId());

        return createDtoWithResolvedProfileImage(member);
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

        //외부 URL만 여기서 처리
        String requestedProfileImageUrl = request.getProfileImageUrl();
        if (requestedProfileImageUrl != null) {
            if (requestedProfileImageUrl.isBlank()) {
                member.clearProfileImage(); // [NEW]
            } else if (requestedProfileImageUrl.startsWith("http://")
                    || requestedProfileImageUrl.startsWith("https://")) {
                member.updateProfile(newNickname, requestedProfileImageUrl);
            } else {
                //  혹시 key가 넘어오면 내부 이미지 key로 취급
                if (newNickname != null && !newNickname.isBlank()) {
                    member.updateProfile(newNickname, null);
                }
                member.updateProfileImageKey(requestedProfileImageUrl);
            }
        } else {
            //  이미지 변경 없이 닉네임만 변경
            member.updateProfile(newNickname, null);
            if (newNickname == null || newNickname.isBlank()) {
                // 아무 변경 없으면 nickname도 유지됨
            }
        }

        return createDtoWithResolvedProfileImage(member);
    }

    @Transactional
    public void updateProfileImage(String email, String imageKey) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));

        // S3 key 전용 메서드 사용
        member.updateProfileImageKey(imageKey);
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

    // profileImageKey / profileImageExternalUrl 분리 반영
    private MemberResponseDto createDtoWithResolvedProfileImage(Member member) {
        String resolvedProfileImageUrl = null;

        String imageKey = member.getProfileImageKey();
        String externalUrl = member.getProfileImageExternalUrl();

        if (imageKey != null && !imageKey.isBlank()) {
            try {
                resolvedProfileImageUrl = s3UploadService.getPresignedUrl(imageKey);
            } catch (Exception e) {
                log.warn("프로필 이미지 Presigned URL 생성 실패. key={}", imageKey, e);
                resolvedProfileImageUrl = null;
            }
        } else if (externalUrl != null && !externalUrl.isBlank()) {
            resolvedProfileImageUrl = externalUrl;
        }

        return MemberResponseDto.of(member, resolvedProfileImageUrl);
    }
}