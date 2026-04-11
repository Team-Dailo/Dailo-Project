package com.dailo.backend.repository;

import com.dailo.backend.entity.AppVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppVersionRepository extends JpaRepository<AppVersion, Long> {
    Optional<AppVersion> findByPlatform(String platform);
}
