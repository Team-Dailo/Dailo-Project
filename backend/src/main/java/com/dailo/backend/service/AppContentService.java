package com.dailo.backend.service;

import com.dailo.backend.entity.AppContent;
import com.dailo.backend.repository.AppContentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AppContentService {

    public static final String KEY_USAGE_GUIDE = "usage_guide";

    private final AppContentRepository appContentRepository;

    @Transactional(readOnly = true)
    public String getUsageGuide() {
        return appContentRepository.findByContentKey(KEY_USAGE_GUIDE)
                .map(AppContent::getContentValue)
                .orElse(getDefaultUsageGuide());
    }

    @Transactional
    public String updateUsageGuide(String content) {
        String value = content != null ? content : "";
        AppContent entity = appContentRepository.findByContentKey(KEY_USAGE_GUIDE)
                .orElse(null);
        if (entity == null) {
            entity = appContentRepository.save(AppContent.builder()
                    .contentKey(KEY_USAGE_GUIDE)
                    .contentValue(value)
                    .updatedAt(java.time.LocalDateTime.now())
                    .build());
            return entity.getContentValue();
        }
        entity.updateValue(value);
        appContentRepository.save(entity);
        return entity.getContentValue();
    }

    private static String getDefaultUsageGuide() {
        return "## Dailo 이용 안내\n\n"
                + "### 지도\n"
                + "- 지도에서 축제·행사 마커를 탭하면 행사 정보를 볼 수 있습니다.\n"
                + "- 날짜: 달력에서 이어서 최대 10일까지 구간을 선택할 수 있습니다.\n"
                + "- 거리: 300m, 500m, 1km, 2km, 5km 중 선택하면 내 위치 기준 반경 내 행사만 보이며, 지도에 반경 원이 표시됩니다.\n"
                + "- 축제 목록 보기: 지도 화면에 비치는 지역의 행사만 보여 주며, 카메라 중심에서 가까운 순으로 최대 20개까지 표시됩니다.\n"
                + "- 200m 이내로 들어가면 축제 구역 진입으로 참여가 인정됩니다.\n\n"
                + "### 참여 기록\n"
                + "- 축제 구역에 1초 이상 있으면 참여 기록이 저장됩니다.\n"
                + "- 참여한 축제는 5분 이상 체류 시 기록되고, 체류 미션 기록에는 30분 이상 체류한 축제만 표시됩니다.\n\n"
                + "### 기타\n"
                + "- 문의사항은 앱 설정 또는 공지사항을 이용해 주세요.";
    }
}
