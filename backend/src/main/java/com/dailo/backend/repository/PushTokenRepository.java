package com.dailo.backend.repository;

import com.dailo.backend.entity.Member;
import com.dailo.backend.entity.PushToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PushTokenRepository extends JpaRepository<PushToken, Long> {

    // 중복 저장 방지
    Optional<PushToken> findByToken(String token);

    // 알림 대상 추출
    List<PushToken> findAllByMember(Member member);

    // 로그아웃, 토큰 만료 시 삭제
    void deleteByToken(String token);
}