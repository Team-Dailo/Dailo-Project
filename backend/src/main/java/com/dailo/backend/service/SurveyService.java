package com.dailo.backend.service;

import com.dailo.backend.dto.SurveyDto;
import com.dailo.backend.dto.SurveyRequestDto;
import com.dailo.backend.entity.Survey;
import com.dailo.backend.repository.SurveyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SurveyService {

    private final SurveyRepository surveyRepository;

    public boolean hasSubmitted(Long memberId, Long eventId) {
        return surveyRepository.existsByMemberIdAndEventId(memberId, eventId);
    }

    @Transactional
    public SurveyDto submit(Long memberId, SurveyRequestDto request) {
        if (surveyRepository.existsByMemberIdAndEventId(memberId, request.getEventId())) {
            throw new IllegalStateException("이미 설문을 제출하셨습니다.");
        }
        Survey survey = Survey.builder()
                .memberId(memberId)
                .eventId(request.getEventId())
                .eventTitle(request.getEventTitle())
                .name(request.getName())
                .phone(request.getPhone())
                .feedback(request.getFeedback())
                .build();
        return SurveyDto.from(surveyRepository.save(survey));
    }

    public Page<SurveyDto> getAllSurveys(Pageable pageable) {
        return surveyRepository.findAllByOrderByCreatedAtDesc(pageable).map(SurveyDto::from);
    }

    public Page<SurveyDto> getSurveysByEvent(Long eventId, Pageable pageable) {
        return surveyRepository.findByEventIdOrderByCreatedAtDesc(eventId, pageable).map(SurveyDto::from);
    }
}
