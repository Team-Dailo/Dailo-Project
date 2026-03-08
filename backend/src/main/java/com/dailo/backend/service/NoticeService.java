package com.dailo.backend.service;

import com.dailo.backend.dto.NoticeCreateRequest;
import com.dailo.backend.dto.NoticeResponseDto;
import com.dailo.backend.entity.Notice;
import com.dailo.backend.repository.NoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;

    @Transactional(readOnly = true)
    public Page<NoticeResponseDto> getNotices(Pageable pageable) {
        return noticeRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(NoticeResponseDto::from);
    }

    @Transactional(readOnly = true)
    public NoticeResponseDto getNoticeById(Long id) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notice not found: id=" + id));
        return NoticeResponseDto.from(notice);
    }

    @Transactional
    public Long createNotice(NoticeCreateRequest request) {
        Notice notice = Notice.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .build();
        return noticeRepository.save(notice).getId();
    }

    @Transactional
    public Long updateNotice(Long id, NoticeCreateRequest request) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Notice not found: id=" + id));
        notice.update(request.getTitle(), request.getContent());
        return notice.getId();
    }

    @Transactional
    public void deleteNotice(Long id) {
        if (!noticeRepository.existsById(id)) {
            throw new IllegalArgumentException("Notice not found: id=" + id);
        }
        noticeRepository.deleteById(id);
    }
}
