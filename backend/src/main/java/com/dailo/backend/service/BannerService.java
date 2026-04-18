package com.dailo.backend.service;

import com.dailo.backend.dto.BannerDto;
import com.dailo.backend.dto.BannerRequestDto;
import com.dailo.backend.entity.Banner;
import com.dailo.backend.repository.BannerRepository;
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
public class BannerService {

    private final BannerRepository bannerRepository;

    /**
     * 사용자용: 현재 활성화된 배너 조회
     */
    public List<BannerDto> getActiveBanners() {
        return bannerRepository.findActiveBanners(LocalDateTime.now())
                .stream()
                .map(BannerDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 관리자용: 전체 배너 조회
     */
    public Page<BannerDto> getAllBanners(Pageable pageable) {
        return bannerRepository.findAllByOrderByDisplayOrderAscCreatedAtDesc(pageable)
                .map(BannerDto::from);
    }

    /**
     * 배너 상세 조회
     */
    public BannerDto getBanner(Long id) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("배너를 찾을 수 없습니다. id=" + id));
        return BannerDto.from(banner);
    }

    /**
     * 배너 생성
     */
    @Transactional
    public BannerDto createBanner(BannerRequestDto request) {
        Banner banner = Banner.builder()
                .title(request.getTitle())
                .imageUrl(request.getImageUrl())
                .linkUrl(request.getLinkUrl())
                .linkType(request.getLinkType() != null ? request.getLinkType() : "EXTERNAL")
                .linkId(request.getLinkId())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .startAt(request.getStartAt())
                .endAt(request.getEndAt())
                .build();

        return BannerDto.from(bannerRepository.save(banner));
    }

    /**
     * 배너 수정
     */
    @Transactional
    public BannerDto updateBanner(Long id, BannerRequestDto request) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("배너를 찾을 수 없습니다. id=" + id));

        banner.update(
                request.getTitle(),
                request.getImageUrl(),
                request.getLinkUrl(),
                request.getLinkType() != null ? request.getLinkType() : banner.getLinkType(),
                request.getLinkId(),
                request.getDisplayOrder() != null ? request.getDisplayOrder() : banner.getDisplayOrder(),
                request.getStartAt(),
                request.getEndAt()
        );

        return BannerDto.from(banner);
    }

    /**
     * 배너 활성화/비활성화 토글
     */
    @Transactional
    public BannerDto toggleActive(Long id) {
        Banner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("배너를 찾을 수 없습니다. id=" + id));

        if (banner.getIsActive()) {
            banner.deactivate();
        } else {
            banner.activate();
        }

        return BannerDto.from(banner);
    }

    /**
     * 배너 삭제
     */
    @Transactional
    public void deleteBanner(Long id) {
        if (!bannerRepository.existsById(id)) {
            throw new IllegalArgumentException("배너를 찾을 수 없습니다. id=" + id);
        }
        bannerRepository.deleteById(id);
    }
}
