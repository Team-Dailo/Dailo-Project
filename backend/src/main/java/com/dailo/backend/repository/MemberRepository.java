package com.dailo.backend.repository;

import com.dailo.backend.domain.enums.MemberStatus;
import com.dailo.backend.entity.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByEmail(String email);
    boolean existsByEmail(String email);

    /** 개인정보처리방침 준수: 탈퇴자(DELETED)는 목록에 노출하지 않음 */
    Page<Member> findByStatusNot(MemberStatus status, Pageable pageable);
}