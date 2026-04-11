package com.dailo.backend.service;

import com.dailo.backend.dto.FaqDto;
import com.dailo.backend.dto.FaqRequestDto;
import com.dailo.backend.entity.Faq;
import com.dailo.backend.repository.FaqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FaqService {

    private final FaqRepository faqRepository;

    /**
     * 사용자용: 활성화된 FAQ 전체 조회
     */
    public List<FaqDto> getActiveFaqs() {
        return faqRepository.findByIsActiveTrueOrderByDisplayOrderAscCreatedAtDesc()
                .stream()
                .map(FaqDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 사용자용: 카테고리별 FAQ 조회
     */
    public List<FaqDto> getFaqsByCategory(String category) {
        return faqRepository.findByCategoryAndIsActiveTrueOrderByDisplayOrderAsc(category)
                .stream()
                .map(FaqDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 카테고리 목록 조회
     */
    public List<String> getCategories() {
        return faqRepository.findDistinctCategoryByIsActiveTrue();
    }

    /**
     * 관리자용: 전체 FAQ 조회 (비활성 포함)
     */
    public Page<FaqDto> getAllFaqs(Pageable pageable) {
        return faqRepository.findAllByOrderByDisplayOrderAscCreatedAtDesc(pageable)
                .map(FaqDto::from);
    }

    /**
     * FAQ 상세 조회
     */
    public FaqDto getFaq(Long id) {
        Faq faq = faqRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("FAQ를 찾을 수 없습니다. id=" + id));
        return FaqDto.from(faq);
    }

    /**
     * FAQ 생성
     */
    @Transactional
    public FaqDto createFaq(FaqRequestDto request) {
        Faq faq = Faq.builder()
                .category(request.getCategory())
                .question(request.getQuestion())
                .answer(request.getAnswer())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();

        return FaqDto.from(faqRepository.save(faq));
    }

    /**
     * FAQ 수정
     */
    @Transactional
    public FaqDto updateFaq(Long id, FaqRequestDto request) {
        Faq faq = faqRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("FAQ를 찾을 수 없습니다. id=" + id));

        faq.update(
                request.getCategory(),
                request.getQuestion(),
                request.getAnswer(),
                request.getDisplayOrder() != null ? request.getDisplayOrder() : faq.getDisplayOrder()
        );

        return FaqDto.from(faq);
    }

    /**
     * FAQ 활성화/비활성화
     */
    @Transactional
    public FaqDto toggleActive(Long id) {
        Faq faq = faqRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("FAQ를 찾을 수 없습니다. id=" + id));

        if (faq.getIsActive()) {
            faq.deactivate();
        } else {
            faq.activate();
        }

        return FaqDto.from(faq);
    }

    /**
     * FAQ 삭제
     */
    @Transactional
    public void deleteFaq(Long id) {
        if (!faqRepository.existsById(id)) {
            throw new IllegalArgumentException("FAQ를 찾을 수 없습니다. id=" + id);
        }
        faqRepository.deleteById(id);
    }
}
