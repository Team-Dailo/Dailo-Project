package com.dailo.backend.repository;

import com.dailo.backend.entity.AppContent;

import java.util.Optional;

public interface AppContentRepository extends org.springframework.data.jpa.repository.JpaRepository<AppContent, Long> {

    Optional<AppContent> findByContentKey(String contentKey);
}
