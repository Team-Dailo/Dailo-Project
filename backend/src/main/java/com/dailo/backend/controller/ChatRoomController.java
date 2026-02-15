package com.dailo.backend.controller;

import com.dailo.backend.dto.ChatRoomRequestDto;
import com.dailo.backend.dto.ChatRoomResponseDto;
import com.dailo.backend.service.ChatRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat/rooms")
@RequiredArgsConstructor
public class ChatRoomController {

    private final ChatRoomService chatRoomService;

    // 1. 채팅방 생성
    @PostMapping
    public ResponseEntity<ChatRoomResponseDto> createRoom(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ChatRoomRequestDto requestDto) {

        Long userId = Long.parseLong(userDetails.getUsername());
        ChatRoomResponseDto response = chatRoomService.createRoom(userId, requestDto.getTargetUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 2. 내 채팅방 목록
    @GetMapping
    public ResponseEntity<List<ChatRoomResponseDto>> getMyRooms(
            @AuthenticationPrincipal UserDetails userDetails) {

        Long userId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(chatRoomService.getMyRooms(userId));
    }

    // 3. 채팅방 상세
    @GetMapping("/{roomId}")
    public ResponseEntity<ChatRoomResponseDto> getRoom(
            @PathVariable Long roomId,
            @AuthenticationPrincipal UserDetails userDetails) {

        Long userId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(chatRoomService.getRoom(roomId, userId));
    }

    // 4. 채팅방 나가기
    @DeleteMapping("/{roomId}")
    public ResponseEntity<Void> leaveRoom(
            @PathVariable Long roomId,
            @AuthenticationPrincipal UserDetails userDetails) {

        Long userId = Long.parseLong(userDetails.getUsername());
        chatRoomService.leaveRoom(roomId, userId);
        return ResponseEntity.ok().build();
    }
}
