package com.dailo.backend.service;

import com.dailo.backend.dto.InquiryRequestDto;
import com.dailo.backend.dto.InquiryResponseDto;
import com.dailo.backend.entity.Inquiry;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.InquiryRepository;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final MemberRepository memberRepository; // 💡 회원 조회를 위해 추가

    /**
     * 문의 제출 (비로그인 가능).
     * 💡 파라미터를 Long memberId -> String email로 변경했습니다.
     */
    public InquiryResponseDto create(InquiryRequestDto dto, String email) {
        Long memberId = null;

        // 💡 로그인 상태(email 존재)라면 DB에서 회원 ID를 찾아옵니다.
        if (email != null && !email.isBlank()) {
            memberId = memberRepository.findByEmail(email)
                    .map(Member::getId)
                    .orElse(null); // 회원을 못 찾아도 문의는 남길 수 있게 null 처리
        }

        Inquiry entity = Inquiry.builder()
                .memberId(memberId)
                .email(dto.getEmail() != null ? dto.getEmail().trim() : null)
                .title(dto.getTitle() != null ? dto.getTitle().trim() : null)
                .content(dto.getContent() != null ? dto.getContent().trim() : null)
                .build();

        entity = inquiryRepository.save(entity);
        return InquiryResponseDto.from(entity);
    }

    @Transactional(readOnly = true)
    public Page<InquiryResponseDto> findAll(Pageable pageable) {
        return inquiryRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(InquiryResponseDto::from);
    }

    @Transactional(readOnly = true)
    public InquiryResponseDto findById(Long id) {
        return inquiryRepository.findById(id)
                .map(InquiryResponseDto::from)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다. id=" + id));
    }
}