package com.dailo.backend.service;

import com.dailo.backend.dto.BlockCheckResponseDto;
import com.dailo.backend.dto.BlockResponseDto;
import com.dailo.backend.entity.Block;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.BlockRepository;
import com.dailo.backend.repository.MemberRepository;
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
    private final MemberRepository memberRepository;

    // --- 외부(Controller) 호출용 이메일 기반 메서드 ---

    /** 1. 차단하기 (이메일 기반) */
    @Transactional
    public BlockResponseDto blockUserByEmail(String email, Long blockedId) {
        if (email == null) {
            throw new com.dailo.backend.exception.UnauthorizedException("로그인이 필요합니다.");
        }
        Member blocker = memberRepository.findByEmail(email)
                .orElseThrow(() -> new com.dailo.backend.exception.NotFoundException("사용자를 찾을 수 없습니다."));
        return blockUser(blocker.getId(), blockedId);
    }

    /** 2. 차단 해제 (이메일 기반) */
    @Transactional
    public void unblockUserByEmail(String email, Long blockedId) {
        if (email == null) {
            throw new com.dailo.backend.exception.UnauthorizedException("로그인이 필요합니다.");
        }
        Member blocker = memberRepository.findByEmail(email)
                .orElseThrow(() -> new com.dailo.backend.exception.NotFoundException("사용자를 찾을 수 없습니다."));
        unblockUser(blocker.getId(), blockedId);
    }

    /** 3. 내 차단 목록 조회 (이메일 기반) */
    public List<BlockResponseDto> getMyBlocksByEmail(String email) {
        if (email == null) {
            throw new com.dailo.backend.exception.UnauthorizedException("로그인이 필요합니다.");
        }
        Member blocker = memberRepository.findByEmail(email)
                .orElseThrow(() -> new com.dailo.backend.exception.NotFoundException("사용자를 찾을 수 없습니다."));
        return getMyBlocks(blocker.getId());
    }

    /** 4. 차단 방향 확인 (이메일 기반) */
    public BlockCheckResponseDto checkBlockDirectionByEmail(String email, Long targetUserId) {
        if (email == null) {
            throw new com.dailo.backend.exception.UnauthorizedException("로그인이 필요합니다.");
        }
        Member me = memberRepository.findByEmail(email)
                .orElseThrow(() -> new com.dailo.backend.exception.NotFoundException("사용자를 찾을 수 없습니다."));
        return checkBlockDirection(me.getId(), targetUserId);
    }


    // --- 내부 로직 및 기존 ID 기반 메서드 ---

    @Transactional
    public BlockResponseDto blockUser(Long blockerId, Long blockedId) {
        if (blockerId.equals(blockedId)) {
            throw new IllegalArgumentException("You cannot block yourself");
        }

        if (blockRepository.existsByBlockerIdAndBlockedId(blockerId, blockedId)) {
            throw new com.dailo.backend.exception.ConflictException("Already blocked");
        }

        Block block = Block.builder()
                .blockerId(blockerId)
                .blockedId(blockedId)
                .build();

        return BlockResponseDto.from(blockRepository.save(block));
    }

    @Transactional
    public void unblockUser(Long blockerId, Long blockedId) {
        Block block = blockRepository.findByBlockerIdAndBlockedId(blockerId, blockedId)
                .orElseThrow(() -> new com.dailo.backend.exception.NotFoundException("차단 내역을 찾을 수 없습니다."));

        blockRepository.delete(block);
    }

    public List<BlockResponseDto> getMyBlocks(Long blockerId) {
        List<Block> blocks = blockRepository.findByBlockerId(blockerId);
        if (blocks.isEmpty()) return List.of();
        List<Long> blockedIds = blocks.stream().map(Block::getBlockedId).distinct().toList();

        java.util.Map<Long, String> nicknameMap = memberRepository.findAllById(blockedIds).stream()
                .collect(java.util.stream.Collectors.toMap(Member::getId, Member::getNickname, (a, b) -> a));

        return blocks.stream()
                .map(b -> BlockResponseDto.from(b, nicknameMap.get(b.getBlockedId())))
                .toList();
    }

    public boolean isBlocked(Long blockerId, Long blockedId) {
        return blockRepository.existsByBlockerIdAndBlockedId(blockerId, blockedId);
    }

    public boolean isBlockedEither(Long userId1, Long userId2) {
        return blockRepository.existsBlockBetween(userId1, userId2);
    }

    public BlockCheckResponseDto checkBlockDirection(Long myId, Long otherId) {
        boolean iBlocked = blockRepository.existsByBlockerIdAndBlockedId(myId, otherId);
        boolean theyBlocked = blockRepository.existsByBlockerIdAndBlockedId(otherId, myId);

        return BlockCheckResponseDto.of(iBlocked, theyBlocked);
    }

    public Set<Long> getInvisibleUserIds(Long userId) {
        Set<Long> invisibleIds = new HashSet<>();
        invisibleIds.addAll(blockRepository.findIdsUserBlocked(userId));
        invisibleIds.addAll(blockRepository.findIdsWhoBlockedUser(userId));
        invisibleIds.remove(userId);
        return invisibleIds;
    }

    public Set<Long> getBlockedUserIds(Long userId) {
        List<Long> blocked = blockRepository.findIdsUserBlocked(userId);
        return blocked.isEmpty() ? Set.of() : new HashSet<>(blocked);
    }
}