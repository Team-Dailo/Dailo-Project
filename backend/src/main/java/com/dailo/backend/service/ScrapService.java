package com.dailo.backend.service;

import com.dailo.backend.dto.event.EventListResponse;
import com.dailo.backend.entity.Event;
import com.dailo.backend.entity.Member;
import com.dailo.backend.entity.Scrap;
import com.dailo.backend.repository.EventRepository;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.repository.ScrapRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScrapService {

    private final ScrapRepository scrapRepository;
    private final MemberRepository memberRepository;
    private final EventRepository eventRepository;

    /**
     * 스크랩 토글 (Toggle)
     * - 이미 스크랩 했으면 -> 취소(삭제) & return false
     * - 안 했으면 -> 저장 & return true
     */
    @Transactional
    public boolean toggleScrap(Long memberId, Long eventId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 행사입니다."));

        // 이미 스크랩 되어 있는지 확인
        Optional<Scrap> scrapOptional = scrapRepository.findByMemberIdAndEventId(memberId, eventId);

        if (scrapOptional.isPresent()) {
            // 이미 존재하면 삭제
            scrapRepository.delete(scrapOptional.get());
            return false; // 결과: 취소됨
        } else {
            // 없으면 저장
            Scrap scrap = Scrap.builder()
                    .member(member)
                    .event(event)
                    .build();
            scrapRepository.save(scrap);
            return true;
        }
    }

    /**
     * 내 스크랩 목록 조회
     * - Scrap 엔티티를 조회해서 Event 정보를 꺼낸 뒤 DTO로 변환
     */
    public Page<EventListResponse> getMyScraps(Long memberId, Pageable pageable) {
        Page<Scrap> scraps = scrapRepository.findAllByMemberId(memberId, pageable);

        return scraps.map(scrap -> {
            Event event = scrap.getEvent();
            return new EventListResponse(
                    event.getId(),
                    event.getTitle(),
                    event.getThumbnailUrl(),
                    event.getStartAt(),
                    event.getEndAt(),
                    event.getPlaceName(),
                    event.getCategories() != null ? event.getCategories() : List.of(),
                    event.getRegionName()
            );
        });
    }
}