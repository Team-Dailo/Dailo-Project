package com.dailo.backend.service;

import com.dailo.backend.dto.InquiryRequestDto;
import com.dailo.backend.dto.InquiryResponseDto;
import com.dailo.backend.entity.Inquiry;
import com.dailo.backend.repository.InquiryRepository;
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

    /**
     * 문의 제출 (비로그인 가능). 로그인 시 memberId 저장.
     */
    public InquiryResponseDto create(InquiryRequestDto dto, Long memberId) {
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
