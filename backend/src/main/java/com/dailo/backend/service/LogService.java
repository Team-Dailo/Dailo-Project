package com.dailo.backend.service;

import com.dailo.backend.dto.ClickLogRequestDto;
import com.dailo.backend.dto.ClickLogResponseDto;
import com.dailo.backend.dto.SearchLogRequestDto;
import com.dailo.backend.dto.SearchLogResponseDto;
import com.dailo.backend.entity.ClickLog;
import com.dailo.backend.entity.SearchLog;
import com.dailo.backend.repository.ClickLogRepository;
import com.dailo.backend.repository.SearchLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LogService {

    private final SearchLogRepository searchLogRepository;
    private final ClickLogRepository clickLogRepository;

    // ==================== Search Log ====================

    @Transactional
    public SearchLogResponseDto logSearch(SearchLogRequestDto requestDto, Long userId) {
        requestDto.validate();
        SearchLog searchLog = requestDto.toEntity(userId);
        SearchLog saved = searchLogRepository.save(searchLog);
        return SearchLogResponseDto.from(saved);
    }

    public Page<SearchLogResponseDto> getSearchLogs(Long userId, Pageable pageable) {
        if (userId != null) {
            return searchLogRepository.findByUserId(userId, pageable)
                    .map(SearchLogResponseDto::from);
        }
        return searchLogRepository.findAll(pageable)
                .map(SearchLogResponseDto::from);
    }

    // 인기 검색어 (최근 7일)
    public List<String> getTopKeywords(int limit) {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        return searchLogRepository.findTopKeywords(since, PageRequest.of(0, limit))
                .stream()
                .map(row -> (String) row[0])
                .collect(Collectors.toList());
    }

    // ==================== Click Log ====================

    @Transactional
    public ClickLogResponseDto logClick(ClickLogRequestDto requestDto, Long userId) {
        requestDto.validate();
        ClickLog clickLog = requestDto.toEntity(userId);
        ClickLog saved = clickLogRepository.save(clickLog);
        return ClickLogResponseDto.from(saved);
    }

    public Page<ClickLogResponseDto> getClickLogs(Long userId, Pageable pageable) {
        if (userId != null) {
            return clickLogRepository.findByUserId(userId, pageable)
                    .map(ClickLogResponseDto::from);
        }
        return clickLogRepository.findAll(pageable)
                .map(ClickLogResponseDto::from);
    }

    // 이벤트별 클릭 수
    public long getClickCount(Long eventId) {
        return clickLogRepository.countByEventId(eventId);
    }

    // 인기 이벤트 (최근 7일)
    public List<Long> getTopClickedEvents(int limit) {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        return clickLogRepository.findTopClickedEvents(since, PageRequest.of(0, limit))
                .stream()
                .map(row -> (Long) row[0])
                .collect(Collectors.toList());
    }
}
