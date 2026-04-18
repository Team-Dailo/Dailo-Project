package com.dailo.backend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(List.of(
                caffeineCache("busArrivals",   30),
                caffeineCache("busLocations",  30),
                caffeineCache("busRouteStops", 3600)  // 노선 정류장 구조는 자주 바뀌지 않으므로 1시간
        ));
        return manager;
    }

    private CaffeineCache caffeineCache(String name, long ttlSeconds) {
        return new CaffeineCache(name, Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(ttlSeconds, TimeUnit.SECONDS)
                .build());
    }
}
