package com.dailo.backend.entity;

import com.dailo.backend.domain.enums.RoomType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "chat_rooms", uniqueConstraints = {
        @UniqueConstraint(name = "uk_chat_room_direct_key", columnNames = "direct_room_key")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_type", nullable = false)
    @Builder.Default
    private RoomType roomType = RoomType.DIRECT;

    // 1:1 채팅방 중복 생성 방지용 (DIRECT:minUserId:maxUserId)
    @Column(name = "direct_room_key")
    private String directRoomKey;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "room", cascade = CascadeType.PERSIST)
    @Builder.Default
    private List<ChatMember> members = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // 메시지 전송 시 타임스탬프 갱신용
    public void updateTimestamp() {
        this.updatedAt = LocalDateTime.now();
    }

    // 나가기 시 재사용 방지 (재채팅 시 새 방 생성)
    public void clearDirectRoomKey() {
        this.directRoomKey = null;
    }
}
