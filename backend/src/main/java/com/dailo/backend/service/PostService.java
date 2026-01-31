package com.dailo.backend.service;

import com.dailo.backend.dto.PostListResponseDto;
import com.dailo.backend.dto.PostRequestDto;
import com.dailo.backend.dto.PostResponseDto;
import com.dailo.backend.entity.Post;
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

    public Page<PostListResponseDto> getAllPosts(Long userId, Pageable pageable) {
        // 비로그인 또는 차단 없으면 전체 조회
        if (userId == null) {
            return postRepository.findAll(pageable).map(PostListResponseDto::from);
        }

        Set<Long> invisibleIds = blockService.getInvisibleUserIds(userId);
        if (invisibleIds.isEmpty()) {
            return postRepository.findAll(pageable).map(PostListResponseDto::from);
        }

        return postRepository.findAllExcludingAuthors(invisibleIds, pageable)
                .map(PostListResponseDto::from);
    }

    @Transactional
    public PostResponseDto getPostById(Long id, Long userId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found: " + id));

        validateVisible(post, userId);
        postRepository.increaseViewCount(id);

        return PostResponseDto.from(post);
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
        return PostResponseDto.from(savedPost);
    }

    @Transactional
    public PostResponseDto updatePost(Long id, PostRequestDto requestDto, Long authorId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found: " + id));

        if (!post.getAuthorId().equals(authorId)) {
            throw new RuntimeException("You are not the author of this post");
        }

        post.update(requestDto.getTitle(), requestDto.getContent(), requestDto.getCategoryType());
        return PostResponseDto.from(post);
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
                    .map(PostListResponseDto::from);
        }

        Set<Long> invisibleIds = blockService.getInvisibleUserIds(userId);
        if (invisibleIds.isEmpty()) {
            return postRepository.findByCategoryType(categoryType, pageable)
                    .map(PostListResponseDto::from);
        }

        return postRepository.findByCategoryTypeExcludingAuthors(categoryType, invisibleIds, pageable)
                .map(PostListResponseDto::from);
    }

    public Page<PostListResponseDto> searchPosts(String keyword, Long userId, Pageable pageable) {
        if (userId == null) {
            return postRepository.findByTitleContaining(keyword, pageable)
                    .map(PostListResponseDto::from);
        }

        Set<Long> invisibleIds = blockService.getInvisibleUserIds(userId);
        if (invisibleIds.isEmpty()) {
            return postRepository.findByTitleContaining(keyword, pageable)
                    .map(PostListResponseDto::from);
        }

        return postRepository.findByTitleContainingExcludingAuthors(keyword, invisibleIds, pageable)
                .map(PostListResponseDto::from);
    }
}
