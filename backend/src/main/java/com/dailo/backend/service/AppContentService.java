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
    public static final String KEY_PRIVACY_POLICY = "privacy_policy";

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

    @Transactional(readOnly = true)
    public String getPrivacyPolicy() {
        return appContentRepository.findByContentKey(KEY_PRIVACY_POLICY)
                .map(AppContent::getContentValue)
                .orElse(getDefaultPrivacyPolicy());
    }

    @Transactional
    public String updatePrivacyPolicy(String content) {
        String value = content != null ? content : "";
        AppContent entity = appContentRepository.findByContentKey(KEY_PRIVACY_POLICY)
                .orElse(null);
        if (entity == null) {
            entity = appContentRepository.save(AppContent.builder()
                    .contentKey(KEY_PRIVACY_POLICY)
                    .contentValue(value)
                    .updatedAt(java.time.LocalDateTime.now())
                    .build());
            return entity.getContentValue();
        }
        entity.updateValue(value);
        appContentRepository.save(entity);
        return entity.getContentValue();
    }

    private static String getDefaultPrivacyPolicy() {
        return "## '다일로(Dailo)' 개인정보처리방침\n\n"
                + "본 개인정보처리방침은 '다일로(Dailo)' 앱(이하 '서비스')이 사용자의 개인정보를 어떻게 수집, 사용, 보관 및 파기하는지 규정합니다. 본 서비스는 구글 플레이의 개발자 프로그램 정책(특히 사용자 데이터 및 데이터 보안 정책)을 엄격히 준수합니다.\n\n"
                + "### 1. 수집하는 개인정보 항목 및 수집 목적\n"
                + "서비스는 원활한 기능 제공을 위해 최소한의 정보만 수집합니다.\n\n"
                + "- **위치 정보 (선택):** 사용자의 현재 위치를 기반으로 '내 주변 축제, 공연, 학교 행사' 정보를 맞춤형으로 제공하기 위해 기기의 위치 데이터를 수집합니다. 이 데이터는 행사 목록을 불러오는 즉시 폐기되거나 익명화되며, 백그라운드에서 무단으로 추적하지 않습니다.\n\n"
                + "- **소셜 로그인 정보 (필수):** 구글/카카오/애플 등을 통한 OAuth 2.0 로그인 시, 사용자 식별 및 계정 관리를 위해 '이메일 주소'와 '고유 식별자(UID)'를 수집합니다.\n\n"
                + "### 2. 개인정보의 보관 및 보호 (보안 정책)\n\n"
                + "- 모든 API 통신은 HTTPS/TLS 암호화 프로토콜을 통해 안전하게 전송됩니다.\n"
                + "- 수집된 사용자 데이터는 외부 접근이 통제된 안전한 클라우드 데이터베이스(AWS RDS 등)에 암호화되어 보관됩니다.\n\n"
                + "### 3. 개인정보의 제3자 제공\n"
                + "서비스는 원칙적으로 사용자의 개인정보를 외부나 제3자에게 제공하지 않습니다. 단, 법령에 따른 요구가 있거나 사용자의 사전 동의가 있는 경우는 예외로 합니다.\n\n"
                + "### 4. 사용자 권리 및 데이터/계정 삭제 요청 (Data Deletion)\n"
                + "사용자는 언제든지 자신의 개인정보 열람, 수정 및 삭제를 요청할 수 있습니다. 특히 구글 플레이 데이터 안전 정책에 따라, 사용자는 앱을 삭제하더라도 아래의 방법을 통해 계정 및 연동된 모든 데이터의 완전한 삭제를 요구할 수 있습니다.\n\n"
                + "- **앱 내부에서 삭제:** [마이페이지/설정] > [계정 탈퇴 및 데이터 삭제] 버튼 클릭\n\n"
                + "- **웹/이메일을 통한 삭제 요청:** 앱에 접속할 수 없는 경우, 아래의 연락처로 '계정 삭제 요청' 이메일을 보내주시면 7일 이내에 DB에서 해당 유저의 식별자 및 관련 데이터를 영구적으로 파기합니다.\n\n"
                + "### 5. 개인정보 보호책임자 (Contact Information)\n"
                + "사용자의 개인정보를 보호하고 관련 불만을 처리하기 위해 아래와 같이 책임자를 지정하고 있습니다.\n\n"
                + "- **이름(Developer):** Junghwan Yun\n"
                + "- **문의 이메일:** yuntyu01\n\n"
                + "### 6. 부칙\n"
                + "이 개인정보처리방침은 2026년 02월 20일부터 적용됩니다.";
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
