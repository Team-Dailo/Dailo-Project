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

        String email = userDetails.getUsername();
        ChatRoomResponseDto response = chatRoomService.createRoom(email, requestDto.getTargetUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 2. 내 채팅방 목록
    @GetMapping
    public ResponseEntity<List<ChatRoomResponseDto>> getMyRooms(
            @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername();
        return ResponseEntity.ok(chatRoomService.getMyRooms(email));
    }

    // 3. 채팅방 상세
    @GetMapping("/{roomId}")
    public ResponseEntity<ChatRoomResponseDto> getRoom(
            @PathVariable Long roomId,
            @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername();
        return ResponseEntity.ok(chatRoomService.getRoom(roomId, email));
    }

    // 4. 읽음 처리 (미읽음 수 0으로)
    @PutMapping("/{roomId}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long roomId,
            @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername();
        chatRoomService.markAsRead(roomId, email);
        return ResponseEntity.ok().build();
    }

    // 5. 채팅방 나가기
    @DeleteMapping("/{roomId}")
    public ResponseEntity<Void> leaveRoom(
            @PathVariable Long roomId,
            @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername();
        chatRoomService.leaveRoom(roomId, email);
        return ResponseEntity.ok().build();
    }
}