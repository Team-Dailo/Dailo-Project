package com.dailo.backend.service;

import com.dailo.backend.dto.AppPopupDto;
import com.dailo.backend.dto.AppPopupRequestDto;
import com.dailo.backend.entity.AppPopup;
import com.dailo.backend.repository.AppPopupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AppPopupService {

    private final AppPopupRepository appPopupRepository;

    public List<AppPopupDto> getActivePopups() {
        return appPopupRepository.findActivePopups(LocalDateTime.now())
                .stream()
                .map(AppPopupDto::from)
                .collect(Collectors.toList());
    }

    public Page<AppPopupDto> getAllPopups(Pageable pageable) {
        return appPopupRepository.findAllByOrderByDisplayOrderAscCreatedAtDesc(pageable)
                .map(AppPopupDto::from);
    }

    public AppPopupDto getPopup(Long id) {
        AppPopup popup = appPopupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("팝업을 찾을 수 없습니다. id=" + id));
        return AppPopupDto.from(popup);
    }

    @Transactional
    public AppPopupDto createPopup(AppPopupRequestDto request) {
        AppPopup popup = AppPopup.builder()
                .title(request.getTitle())
                .imageUrl(request.getImageUrl())
                .linkUrl(request.getLinkUrl())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .startAt(request.getStartAt())
                .endAt(request.getEndAt())
                .build();
        return AppPopupDto.from(appPopupRepository.save(popup));
    }

    @Transactional
    public AppPopupDto updatePopup(Long id, AppPopupRequestDto request) {
        AppPopup popup = appPopupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("팝업을 찾을 수 없습니다. id=" + id));
        popup.update(
                request.getTitle(),
                request.getImageUrl(),
                request.getLinkUrl(),
                request.getDisplayOrder() != null ? request.getDisplayOrder() : popup.getDisplayOrder(),
                request.getStartAt(),
                request.getEndAt()
        );
        return AppPopupDto.from(popup);
    }

    @Transactional
    public AppPopupDto toggleActive(Long id) {
        AppPopup popup = appPopupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("팝업을 찾을 수 없습니다. id=" + id));
        if (popup.getIsActive()) {
            popup.deactivate();
        } else {
            popup.activate();
        }
        return AppPopupDto.from(popup);
    }

    @Transactional
    public void deletePopup(Long id) {
        if (!appPopupRepository.existsById(id)) {
            throw new IllegalArgumentException("팝업을 찾을 수 없습니다. id=" + id);
        }
        appPopupRepository.deleteById(id);
    }
}
