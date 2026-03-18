package com.dailo.backend.service;

import com.dailo.backend.dto.auth.MemberProfileResponseDto;
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

    public MemberResponseDto getMyProfile(String principal) {
        log.info("[MemberService.getMyProfile] principal={}", principal);

        Member member = findMemberByPrincipal(principal);

        log.info("[MemberService.getMyProfile] member found id={}, email={}", member.getId(), member.getEmail());

        return createDtoWithResolvedProfileImage(member);
    }

    /**
     * 타 사용자 프로필 조회 (ID 기반)
     */
    public MemberProfileResponseDto getMemberProfile(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 회원입니다. id=" + memberId));

        String resolvedProfileImageUrl = resolveProfileImageUrl(member);
        return MemberProfileResponseDto.of(member, resolvedProfileImageUrl);
    }

    private String resolveProfileImageUrl(Member member) {
        String imageKey = member.getProfileImageKey();
        String externalUrl = member.getProfileImageExternalUrl();

        if (imageKey != null && !imageKey.isBlank()) {
            try {
                return s3UploadService.getPresignedUrl(imageKey);
            } catch (Exception e) {
                log.warn("프로필 이미지 Presigned URL 생성 실패. key={}", imageKey, e);
                return null;
            }
        } else if (externalUrl != null && !externalUrl.isBlank()) {
            return externalUrl;
        }
        return null;
    }

    @Transactional
    public MemberResponseDto updateProfile(String principal, MemberUpdateRequestDto request) {
        Member member = findMemberByPrincipal(principal);

        String newNickname = request.getNickname();
        if (newNickname != null) {
            newNickname = newNickname.trim();
        }

        if (newNickname != null && !newNickname.isBlank() && !newNickname.equals(member.getNickname())) {
            if (memberRepository.existsByNickname(newNickname)) {
                throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
            }
        }

        String requestedProfileImageUrl = request.getProfileImageUrl();

        if (requestedProfileImageUrl != null) {
            if (requestedProfileImageUrl.isBlank()) {
                member.clearProfileImage();
                if (newNickname != null && !newNickname.isBlank()) {
                    member.updateProfile(newNickname, null);
                }
            } else if (requestedProfileImageUrl.startsWith("http://")
                    || requestedProfileImageUrl.startsWith("https://")) {
                member.updateProfile(newNickname, requestedProfileImageUrl);
            } else {
                if (newNickname != null && !newNickname.isBlank()) {
                    member.updateProfile(newNickname, null);
                }
                member.updateProfileImageKey(requestedProfileImageUrl);
            }
        } else {
            member.updateProfile(newNickname, null);
        }

        return createDtoWithResolvedProfileImage(member);
    }

    @Transactional
    public void updateProfileImage(String principal, String imageKey) {
        Member member = findMemberByPrincipal(principal);
        member.updateProfileImageKey(imageKey);
    }

    @Transactional
    public void withdraw(String principal) {
        Member member = findMemberByPrincipal(principal);
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

    private Member findMemberByPrincipal(String principal) {
        if (principal == null || principal.isBlank()) {
            throw new RuntimeException("인증된 사용자 정보가 없습니다.");
        }

        // 카카오 로그인 토큰 subject가 memberId인 경우 대응
        if (principal.matches("\\d+")) {
            Long memberId = Long.valueOf(principal);
            return memberRepository.findById(memberId)
                    .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다. id=" + memberId));
        }

        // 일반 로그인(email subject) 대응
        return memberRepository.findByEmail(principal)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다. email=" + principal));
    }

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