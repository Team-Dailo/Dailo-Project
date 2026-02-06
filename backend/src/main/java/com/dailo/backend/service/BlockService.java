package com.dailo.backend.service;

import com.dailo.backend.dto.BlockCheckResponseDto;
import com.dailo.backend.dto.BlockResponseDto;
import com.dailo.backend.entity.Block;
import com.dailo.backend.repository.BlockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BlockService {

    private final BlockRepository blockRepository;

    // 1. 차단하기
    @Transactional
    public BlockResponseDto blockUser(Long blockerId, Long blockedId) {
        // 자기 자신 차단 방지
        if (blockerId.equals(blockedId)) {
            throw new IllegalArgumentException("You cannot block yourself");
        }

        // 이미 차단했는지 확인
        if (blockRepository.existsByBlockerIdAndBlockedId(blockerId, blockedId)) {
            throw new com.dailo.backend.exception.ConflictException("Already blocked");
        }

        Block block = Block.builder()
                .blockerId(blockerId)
                .blockedId(blockedId)
                .build();

        return BlockResponseDto.from(blockRepository.save(block));
    }

    // 2. 차단 해제 (Hard delete)
    @Transactional
    public void unblockUser(Long blockerId, Long blockedId) {
        Block block = blockRepository.findByBlockerIdAndBlockedId(blockerId, blockedId)
                .orElseThrow(() -> new RuntimeException("Block not found"));

        blockRepository.delete(block);
    }

    // 3. 내 차단 목록
    public List<BlockResponseDto> getMyBlocks(Long blockerId) {
        return blockRepository.findByBlockerId(blockerId).stream()
                .map(BlockResponseDto::from)
                .toList();
    }

    // 4. 차단 여부 확인 (단방향)
    public boolean isBlocked(Long blockerId, Long blockedId) {
        return blockRepository.existsByBlockerIdAndBlockedId(blockerId, blockedId);
    }

    // 5. 상호 차단 여부 (채팅용) - A→B 또는 B→A
    public boolean isBlockedEither(Long userId1, Long userId2) {
        return blockRepository.existsBlockBetween(userId1, userId2);
    }

    // 6. 차단 방향 확인
    public BlockCheckResponseDto checkBlockDirection(Long myId, Long otherId) {
        boolean iBlocked = blockRepository.existsByBlockerIdAndBlockedId(myId, otherId);
        boolean theyBlocked = blockRepository.existsByBlockerIdAndBlockedId(otherId, myId);

        return BlockCheckResponseDto.of(iBlocked, theyBlocked);
    }

    // 7. 상호 미노출 사용자 ID 목록 (조회 필터용)
    public Set<Long> getInvisibleUserIds(Long userId) {
        Set<Long> invisibleIds = new HashSet<>();
        invisibleIds.addAll(blockRepository.findIdsUserBlocked(userId));
        invisibleIds.addAll(blockRepository.findIdsWhoBlockedUser(userId));
        invisibleIds.remove(userId);  // 자기 자신 제거 (혹시 모를 버그 방지)
        return invisibleIds;
    }
}
