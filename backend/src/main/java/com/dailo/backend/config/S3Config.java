package com.dailo.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

@Configuration
public class S3Config {
    @Value("${cloud.aws.region:ap-northeast-2}")
    private String region;

    /**
     * S3 호환 엔드포인트 override. 비어 있으면 표준 AWS S3(기존 동작).
     * 값이 있으면(예: Cloudflare R2 https://<acct>.r2.cloudflarestorage.com) 그쪽으로 라우팅.
     */
    @Value("${cloud.aws.s3.endpoint:}")
    private String endpoint;

    private boolean useCustomEndpoint() {
        return endpoint != null && !endpoint.isBlank();
    }

    @Bean
    public S3Client s3Client() {
        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create());
        if (useCustomEndpoint()) {
            // R2 등 커스텀 엔드포인트엔 path-style이 안전 (가상호스트 서브도메인 회피)
            builder.endpointOverride(URI.create(endpoint))
                    .serviceConfiguration(S3Configuration.builder()
                            .pathStyleAccessEnabled(true).build());
        }
        return builder.build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        S3Presigner.Builder builder = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create());
        if (useCustomEndpoint()) {
            builder.endpointOverride(URI.create(endpoint))
                    .serviceConfiguration(S3Configuration.builder()
                            .pathStyleAccessEnabled(true).build());
        }
        return builder.build();
    }
}
