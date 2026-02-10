package com.dailo.backend.controller;

import com.dailo.backend.dto.IngestLogResponseDto;
import com.dailo.backend.service.AdminIngestLogService;
import com.dailo.backend.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/ingest-logs")
@RequiredArgsConstructor
public class AdminIngestLogController {

    private final AdminIngestLogService adminIngestLogService;

    private static Long adminIdOr401() {
        Long id = SecurityUtil.getCurrentMemberId();
        if (id == null) throw new org.springframework.security.access.AccessDeniedException("인증이 필요합니다.");
        return id;
    }

    @GetMapping
    public ResponseEntity<Page<IngestLogResponseDto>> getIngestLogs(
            @RequestParam(required = false) String source,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(adminIngestLogService.getIngestLogs(adminIdOr401(), source, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<IngestLogResponseDto> getIngestLog(@PathVariable Long id) {
        return ResponseEntity.ok(adminIngestLogService.getIngestLog(adminIdOr401(), id));
    }
}
