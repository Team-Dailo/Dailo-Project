package com.dailo.backend.service;

import com.dailo.backend.dto.PostListResponseDto;
import com.dailo.backend.dto.PostRequestDto;
import com.dailo.backend.dto.PostResponseDto;
import com.dailo.backend.entity.Member;
import com.dailo.backend.entity.Post;
import com.dailo.backend.entity.PostLike;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.repository.PostLikeRepository;
import com.dailo.backend.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final MemberRepository memberRepository;
    private final PostLikeRepository postLikeRepository;
    private final BlockService blockService;

    /** authorId 목록으로 닉네임 맵 조회 (N+1 방지) */
    private Map<Long, String> getAuthorNicknameMap(List<Post> posts) {
        Set<Long> authorIds = posts.stream().map(Post::getAuthorId).collect(Collectors.toSet());
        if (authorIds.isEmpty()) return Map.of();
        List<Member> members = memberRepository.findAllById(authorIds);
        return members.stream().collect(Collectors.toMap(Member::getId, Member::getNickname, (a, b) -> a));
    }

    public Page<PostListResponseDto> getAllPosts(Long userId, Pageable pageable) {
        Page<Post> page;
        if (userId == null) {
            page = postRepository.findAll(pageable);
        } else {
            Set<Long> invisibleIds = blockService.getInvisibleUserIds(userId);
            page = invisibleIds.isEmpty()
                    ? postRepository.findAll(pageable)
                    : postRepository.findAllExcludingAuthors(invisibleIds, pageable);
        }
        List<Post> posts = page.getContent();
        Map<Long, String> nicknameMap = getAuthorNicknameMap(posts);
        return page.map(post -> PostListResponseDto.from(post, nicknameMap.get(post.getAuthorId())));
    }

    @Transactional
    public PostResponseDto getPostById(Long id, Long userId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found: " + id));

        validateVisible(post, userId);
        postRepository.increaseViewCount(id);

        String nickname = memberRepository.findById(post.getAuthorId())
                .map(Member::getNickname)
                .orElse(null);
        Boolean isLiked = (userId != null && postLikeRepository.existsByMemberIdAndPostId(userId, id));
        return PostResponseDto.from(post, nickname, isLiked);
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
        String nickname = memberRepository.findById(authorId).map(Member::getNickname).orElse(null);
        return PostResponseDto.from(savedPost, nickname);
    }

    @Transactional
    public PostResponseDto updatePost(Long id, PostRequestDto requestDto, Long authorId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found: " + id));

        if (!post.getAuthorId().equals(authorId)) {
            throw new RuntimeException("You are not the author of this post");
        }

        post.update(requestDto.getTitle(), requestDto.getContent(), requestDto.getCategoryType());
        String nickname = memberRepository.findById(post.getAuthorId()).map(Member::getNickname).orElse(null);
        return PostResponseDto.from(post, nickname);
    }

    @Transactional
    public void updatePostAuthor(Long postId, Long authorId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found: " + postId));
        post.setAuthorId(authorId);
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
        Page<Post> page;
        if (userId == null) {
            page = postRepository.findByCategoryType(categoryType, pageable);
        } else {
            Set<Long> invisibleIds = blockService.getInvisibleUserIds(userId);
            page = invisibleIds.isEmpty()
                    ? postRepository.findByCategoryType(categoryType, pageable)
                    : postRepository.findByCategoryTypeExcludingAuthors(categoryType, invisibleIds, pageable);
        }
        List<Post> posts = page.getContent();
        Map<Long, String> nicknameMap = getAuthorNicknameMap(posts);
        return page.map(post -> PostListResponseDto.from(post, nicknameMap.get(post.getAuthorId())));
    }

    public Page<PostListResponseDto> searchPosts(String keyword, Long userId, Pageable pageable) {
        Page<Post> page;
        if (userId == null) {
            page = postRepository.findByTitleContaining(keyword, pageable);
        } else {
            Set<Long> invisibleIds = blockService.getInvisibleUserIds(userId);
            page = invisibleIds.isEmpty()
                    ? postRepository.findByTitleContaining(keyword, pageable)
                    : postRepository.findByTitleContainingExcludingAuthors(keyword, invisibleIds, pageable);
        }
        List<Post> posts = page.getContent();
        Map<Long, String> nicknameMap = getAuthorNicknameMap(posts);
        return page.map(post -> PostListResponseDto.from(post, nicknameMap.get(post.getAuthorId())));
    }

    /** 게시글 좋아요 토글. 반환값: 좋아요 누른 상태(true) / 취소(false) */
    @Transactional
    public boolean togglePostLike(Long postId, Long userId) {
        if (userId == null) {
            throw new RuntimeException("로그인이 필요합니다.");
        }
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found: " + postId));
        Member member = memberRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Member not found: " + userId));

        var existing = postLikeRepository.findByMemberIdAndPostId(userId, postId);
        if (existing.isPresent()) {
            postLikeRepository.delete(existing.get());
            post.decreaseLikeCount();
            return false;
        }
        postLikeRepository.save(PostLike.builder().member(member).post(post).build());
        post.increaseLikeCount();
        return true;
    }

    public int getLikeCount(Long postId) {
        return postRepository.findById(postId)
                .map(Post::getLikeCount)
                .orElse(0);
    }
}
