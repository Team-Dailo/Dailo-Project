package com.dailo.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/**
 * /static/** 요청을 오브젝트 스토리지(R2 등) 공개 URL로 302 redirect.
 *
 * 이미 설치된 앱들은 이미지 URL을 ${API_BASE_URL} + 상대경로(/static/...)로 만들어
 * 저장/요청한다. 실제 객체는 R2(public-base-url)에 있으므로 여기서 redirect로 연결한다.
 * 덕분에 앱 업데이트 없이(절대 R2 URL 이중 연결 버그 없이) 옛/새 앱 모두 동작한다.
 *
 * public-base-url이 비어 있으면(기존 AWS + CloudFront 환경 등) 404로 패스해
 * 외부 CDN/정적 핸들러가 처리하게 둔다.
 */
@RestController
public class StaticRedirectController {

    @Value("${cloud.aws.s3.public-base-url:}")
    private String publicBaseUrl;

    @GetMapping("/static/**")
    public ResponseEntity<Void> redirectStatic(HttpServletRequest request) {
        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            return ResponseEntity.notFound().build();
        }
        String base = publicBaseUrl.endsWith("/")
                ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;
        // request.getRequestURI() = "/static/uploads/xxx.png" → base + URI = R2 공개 URL
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(base + request.getRequestURI()))
                .build();
    }
}
