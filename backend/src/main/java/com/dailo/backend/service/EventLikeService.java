package com.dailo.backend.service;

import com.dailo.backend.entity.Event;
import com.dailo.backend.entity.EventLike;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.EventLikeRepository;
import com.dailo.backend.repository.EventRepository;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EventLikeService {

    private final EventLikeRepository eventLikeRepository;
    private final EventRepository eventRepository;
    private final MemberRepository memberRepository; // 이미 있어서 다행입니다!

    /**
     * 좋아요 토글. 이미 누른 경우 해제, 아니면 추가.
     * @return true = 좋아요 추가됨, false = 좋아요 해제됨
     */
    @Transactional
    public boolean toggleLike(String email, Long eventId) { //
        Member member = memberRepository.findByEmail(email) //
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 행사입니다."));

        // member.getId()를 사용해 기존 레포지토리 로직 그대로 활용
        Optional<EventLike> existing = eventLikeRepository.findByMemberIdAndEventId(member.getId(), eventId);
        if (existing.isPresent()) {
            eventLikeRepository.delete(existing.get());
            return false;
        }
        eventLikeRepository.save(EventLike.builder().member(member).event(event).build());
        return true;
    }

    public boolean isLiked(String email, Long eventId) { //
        if (email == null) return false;

        Member member = memberRepository.findByEmail(email).orElse(null);
        if (member == null) return false;

        return eventLikeRepository.existsByMemberIdAndEventId(member.getId(), eventId);
    }

    /** 해당 행사 전체 좋아요 수 */
    public long getLikeCount(Long eventId) {
        return eventLikeRepository.countByEvent_Id(eventId);
    }
}