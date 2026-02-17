package com.dailo.backend.controller;

import com.dailo.backend.dto.NoticeCreateRequest;
import com.dailo.backend.service.NoticeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/notices")
@RequiredArgsConstructor
public class AdminNoticeController {

    private final NoticeService noticeService;

    @PostMapping
    public ResponseEntity<Long> createNotice(@RequestBody @Valid NoticeCreateRequest request) {
        Long id = noticeService.createNotice(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(id);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Long> updateNotice(
            @PathVariable Long id,
            @RequestBody @Valid NoticeCreateRequest request) {
        Long updatedId = noticeService.updateNotice(id, request);
        return ResponseEntity.ok(updatedId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotice(@PathVariable Long id) {
        noticeService.deleteNotice(id);
        return ResponseEntity.noContent().build();
    }
}
