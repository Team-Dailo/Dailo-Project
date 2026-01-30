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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;

    public Page<PostListResponseDto> getAllPosts(Pageable pageable) {
        return postRepository.findAll(pageable)
                .map(PostListResponseDto::from);
    }

    @Transactional
    public PostResponseDto getPostById(Long id) {
        // 조회수 먼저 증가 (동시성 안전한 UPDATE 쿼리)
        postRepository.increaseViewCount(id);

        // 증가된 조회수 반영된 데이터 조회
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found: " + id));

        return PostResponseDto.from(post);
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

    public Page<PostListResponseDto> getPostsByCategory(String categoryType, Pageable pageable) {
        return postRepository.findByCategoryType(categoryType, pageable)
                .map(PostListResponseDto::from);
    }

    public Page<PostListResponseDto> searchPosts(String keyword, Pageable pageable) {
        return postRepository.findByTitleContaining(keyword, pageable)
                .map(PostListResponseDto::from);
    }
}
