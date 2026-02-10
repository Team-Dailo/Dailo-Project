package com.dailo.backend.service;

import com.dailo.backend.dto.PostListResponseDto;
import com.dailo.backend.dto.PostRequestDto;
import com.dailo.backend.dto.PostResponseDto;
import com.dailo.backend.entity.Post;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final BlockService blockService;
    private final MemberRepository memberRepository;

    private String getAuthorNickname(Long authorId) {
        return memberRepository.findById(authorId)
                .map(m -> m.getNickname() != null && !m.getNickname().isBlank() ? m.getNickname() : ("user_" + authorId))
                .orElse("user_" + authorId);
    }

    public Page<PostListResponseDto> getAllPosts(Long userId, Pageable pageable) {
        if (userId == null) {
            return postRepository.findAll(pageable).map(p -> PostListResponseDto.from(p, getAuthorNickname(p.getAuthorId())));
        }

        Set<Long> invisibleIds = blockService.getInvisibleUserIds(userId);
        if (invisibleIds.isEmpty()) {
            return postRepository.findAll(pageable).map(p -> PostListResponseDto.from(p, getAuthorNickname(p.getAuthorId())));
        }

        return postRepository.findAllExcludingAuthors(invisibleIds, pageable)
                .map(p -> PostListResponseDto.from(p, getAuthorNickname(p.getAuthorId())));
    }

    @Transactional
    public PostResponseDto getPostById(Long id, Long userId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found: " + id));

        validateVisible(post, userId);
        postRepository.increaseViewCount(id);

        return PostResponseDto.from(post, getAuthorNickname(post.getAuthorId()));
    }

    private void validateVisible(Post post, Long userId) {
        if (userId == null) return;

        Set<Long> invisibleIds = blockService.getInvisibleUserIds(userId);
        if (invisibleIds.contains(post.getAuthorId())) {
            throw new RuntimeException("Post not found: " + post.getId());
        }
    }

    @Transactional
    public PostResponseDto createPost(PostRequestDto requestDto, Long authorId) {
        Post post = requestDto.toEntity(authorId);
        Post savedPost = postRepository.save(post);
        return PostResponseDto.from(savedPost, getAuthorNickname(savedPost.getAuthorId()));
    }

    @Transactional
    public PostResponseDto updatePost(Long id, PostRequestDto requestDto, Long authorId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found: " + id));

        if (!post.getAuthorId().equals(authorId)) {
            throw new RuntimeException("You are not the author of this post");
        }

        post.update(requestDto.getTitle(), requestDto.getContent(), requestDto.getCategoryType());
        return PostResponseDto.from(post, getAuthorNickname(post.getAuthorId()));
    }

    @Transactional
    public void deletePost(Long id, Long authorId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found: " + id));

        if (!post.getAuthorId().equals(authorId)) {
            throw new RuntimeException("You are not the author of this post");
        }

        postRepository.delete(post);
    }

    public Page<PostListResponseDto> getPostsByCategory(String categoryType, Long userId, Pageable pageable) {
        if (userId == null) {
            return postRepository.findByCategoryType(categoryType, pageable)
                    .map(p -> PostListResponseDto.from(p, getAuthorNickname(p.getAuthorId())));
        }

        Set<Long> invisibleIds = blockService.getInvisibleUserIds(userId);
        if (invisibleIds.isEmpty()) {
            return postRepository.findByCategoryType(categoryType, pageable)
                    .map(p -> PostListResponseDto.from(p, getAuthorNickname(p.getAuthorId())));
        }

        return postRepository.findByCategoryTypeExcludingAuthors(categoryType, invisibleIds, pageable)
                .map(p -> PostListResponseDto.from(p, getAuthorNickname(p.getAuthorId())));
    }

    public Page<PostListResponseDto> searchPosts(String keyword, Long userId, Pageable pageable) {
        if (userId == null) {
            return postRepository.findByTitleContaining(keyword, pageable)
                    .map(p -> PostListResponseDto.from(p, getAuthorNickname(p.getAuthorId())));
        }

        Set<Long> invisibleIds = blockService.getInvisibleUserIds(userId);
        if (invisibleIds.isEmpty()) {
            return postRepository.findByTitleContaining(keyword, pageable)
                    .map(p -> PostListResponseDto.from(p, getAuthorNickname(p.getAuthorId())));
        }

        return postRepository.findByTitleContainingExcludingAuthors(keyword, invisibleIds, pageable)
                .map(p -> PostListResponseDto.from(p, getAuthorNickname(p.getAuthorId())));
    }

    /** 내가 쓴 글 목록 (게시판 기록용) */
    public Page<PostListResponseDto> getPostsByAuthorId(Long authorId, Pageable pageable) {
        return postRepository.findByAuthorId(authorId, pageable)
                .map(p -> PostListResponseDto.from(p, getAuthorNickname(p.getAuthorId())));
    }

    /** 관리자용: 게시글 작성자 변경 (기존 데이터 수정 시 사용) */
    @Transactional
    public void updatePostAuthor(Long postId, Long newAuthorId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found: " + postId));
        if (newAuthorId == null || newAuthorId <= 0) {
            throw new IllegalArgumentException("authorId must be positive");
        }
        post.changeAuthor(newAuthorId);
    }
}
