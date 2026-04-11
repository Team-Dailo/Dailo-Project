package com.dailo.backend.service;

import com.dailo.backend.dto.AppVersionDto;
import com.dailo.backend.dto.AppVersionRequestDto;
import com.dailo.backend.dto.VersionCheckResponseDto;
import com.dailo.backend.entity.AppVersion;
import com.dailo.backend.repository.AppVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AppVersionService {

    private final AppVersionRepository appVersionRepository;

    /**
     * 모든 플랫폼 버전 정보 조회
     */
    public List<AppVersionDto> getAllVersions() {
        return appVersionRepository.findAll().stream()
                .map(AppVersionDto::from)
                .collect(Collectors.toList());
    }

    /**
     * 특정 플랫폼 버전 정보 조회
     */
    public AppVersionDto getVersion(String platform) {
        AppVersion version = appVersionRepository.findByPlatform(platform.toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("버전 정보를 찾을 수 없습니다. platform=" + platform));
        return AppVersionDto.from(version);
    }

    /**
     * 버전 정보 저장/수정
     */
    @Transactional
    public AppVersionDto saveOrUpdate(AppVersionRequestDto request) {
        String platform = request.getPlatform().toUpperCase();

        AppVersion version = appVersionRepository.findByPlatform(platform)
                .orElse(AppVersion.builder()
                        .platform(platform)
                        .minimumVersion(request.getMinimumVersion())
                        .latestVersion(request.getLatestVersion())
                        .forceUpdate(request.getForceUpdate() != null ? request.getForceUpdate() : false)
                        .updateMessage(request.getUpdateMessage())
                        .storeUrl(request.getStoreUrl())
                        .build());

        if (version.getId() != null) {
            version.update(
                    request.getMinimumVersion(),
                    request.getLatestVersion(),
                    request.getForceUpdate() != null ? request.getForceUpdate() : false,
                    request.getUpdateMessage(),
                    request.getStoreUrl()
            );
        }

        return AppVersionDto.from(appVersionRepository.save(version));
    }

    /**
     * 버전 체크 (사용자용)
     */
    public VersionCheckResponseDto checkVersion(String platform, String currentVersion) {
        AppVersion version = appVersionRepository.findByPlatform(platform.toUpperCase())
                .orElse(null);

        if (version == null) {
            return VersionCheckResponseDto.builder()
                    .updateRequired(false)
                    .forceUpdate(false)
                    .build();
        }

        boolean needsUpdate = compareVersions(currentVersion, version.getLatestVersion()) < 0;
        boolean forceUpdate = needsUpdate &&
                (version.getForceUpdate() || compareVersions(currentVersion, version.getMinimumVersion()) < 0);

        return VersionCheckResponseDto.builder()
                .updateRequired(needsUpdate)
                .forceUpdate(forceUpdate)
                .latestVersion(version.getLatestVersion())
                .updateMessage(version.getUpdateMessage())
                .storeUrl(version.getStoreUrl())
                .build();
    }

    /**
     * 버전 비교 (v1 < v2: -1, v1 == v2: 0, v1 > v2: 1)
     */
    private int compareVersions(String v1, String v2) {
        String[] parts1 = v1.replaceAll("[^0-9.]", "").split("\\.");
        String[] parts2 = v2.replaceAll("[^0-9.]", "").split("\\.");

        int length = Math.max(parts1.length, parts2.length);
        for (int i = 0; i < length; i++) {
            int num1 = i < parts1.length ? Integer.parseInt(parts1[i]) : 0;
            int num2 = i < parts2.length ? Integer.parseInt(parts2[i]) : 0;
            if (num1 < num2) return -1;
            if (num1 > num2) return 1;
        }
        return 0;
    }
}
