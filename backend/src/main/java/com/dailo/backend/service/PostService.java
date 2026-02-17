package com.dailo.backend.service;

import com.dailo.backend.dto.PostListResponseDto;
import com.dailo.backend.dto.PostRequestDto;
import com.dailo.backend.dto.PostResponseDto;
import com.dailo.backend.entity.Event;
import com.dailo.backend.entity.Member;
import com.dailo.backend.entity.Post;
import com.dailo.backend.entity.PostLike;
import com.dailo.backend.repository.CommentRepository;
import com.dailo.backend.repository.EventRepository;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.repository.PostLikeRepository;
import com.dailo.backend.repository.PostRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final PostRepository postRepository;
    private final MemberRepository memberRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommentRepository commentRepository;
    private final EventRepository eventRepository;
    private final BlockService blockService;

    /** authorId 목록으로 닉네임 맵 조회 (N+1 방지) */
    private Map<Long, String> getAuthorNicknameMap(List<Post> posts) {
        Set<Long> authorIds = posts.stream().map(Post::getAuthorId).collect(Collectors.toSet());
        if (authorIds.isEmpty()) return Map.of();
        List<Member> members = memberRepository.findAllById(authorIds);
        return members.stream().collect(Collectors.toMap(Member::getId, Member::getNickname, (a, b) -> a));
    }

    /** post 목록에서 eventId 추출 후 eventId -> 행사 제목 맵 조회 (후기 목록에서 행사명 표시용) */
    private Map<Long, String> getEventTitleMap(List<Post> posts) {
        Set<Long> eventIds = posts.stream().map(Post::getEventId).filter(id -> id != null).collect(Collectors.toSet());
        if (eventIds.isEmpty()) return Map.of();
        List<Event> events = eventRepository.findAllById(eventIds);
        return events.stream().collect(Collectors.toMap(Event::getId, Event::getTitle, (a, b) -> a));
    }

    /** 내가 쓴 글 목록 (마이페이지 게시판 기록) */
    public Page<PostListResponseDto> getMyPosts(Long authorId, Pageable pageable) {
        Page<Post> page = postRepository.findByAuthorId(authorId, pageable);
        List<Post> posts = page.getContent();
        Map<Long, String> nicknameMap = getAuthorNicknameMap(posts);
        Map<Long, String> eventTitleMap = getEventTitleMap(posts);
        return page.map(post -> PostListResponseDto.from(post, nicknameMap.get(post.getAuthorId()), null, post.getEventId() != null ? eventTitleMap.get(post.getEventId()) : null));
    }

    public Page<PostListResponseDto> getAllPosts(Long userId, Pageable pageable) {
        Page<Post> page;
        if (userId == null) {
            page = postRepository.findAll(pageable);
        } else {
            Set<Long> blockedIds = blockService.getBlockedUserIds(userId);
            page = blockedIds.isEmpty()
                    ? postRepository.findAll(pageable)
                    : postRepository.findAllExcludingAuthors(blockedIds, pageable);
        }
        List<Post> posts = page.getContent();
        Map<Long, String> nicknameMap = getAuthorNicknameMap(posts);
        Map<Long, String> eventTitleMap = getEventTitleMap(posts);
        Set<Long> likedPostIds = (userId != null) ? postLikeRepository.findPostIdsByMemberId(userId) : Set.of();
        return page.map(post -> PostListResponseDto.from(post, nicknameMap.get(post.getAuthorId()), likedPostIds.contains(post.getId()), post.getEventId() != null ? eventTitleMap.get(post.getEventId()) : null));
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
        String eventTitle = null;
        if (post.getEventId() != null) {
            eventTitle = eventRepository.findById(post.getEventId())
                    .map(e -> e.getTitle())
                    .orElse(null);
        }
        Boolean isLiked = (userId != null && postLikeRepository.existsByMemberIdAndPostId(userId, id));
        return PostResponseDto.from(post, nickname, isLiked, eventTitle);
    }

    private void validateVisible(Post post, Long userId) {
        if (userId == null) return;

        Set<Long> blockedIds = blockService.getBlockedUserIds(userId);
        if (blockedIds.contains(post.getAuthorId())) {
            throw new RuntimeException("Post not found: " + post.getId());
        }
    }

    @Transactional
    public PostResponseDto createPost(PostRequestDto requestDto, Long authorId) {
        Post post = requestDto.toEntity(authorId);
        setImageUrlsJson(post, requestDto.getImageUrls());
        Post savedPost = postRepository.save(post);
        String nickname = memberRepository.findById(authorId).map(Member::getNickname).orElse(null);
        return PostResponseDto.from(savedPost, nickname);
    }

    private void setImageUrlsJson(Post post, List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            post.setImageUrlsJson(null);
            return;
        }
        try {
            post.setImageUrlsJson(OBJECT_MAPPER.writeValueAsString(imageUrls));
        } catch (JsonProcessingException e) {
            post.setImageUrlsJson(null);
        }
    }

    @Transactional
    public PostResponseDto updatePost(Long id, PostRequestDto requestDto, Long authorId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found: " + id));

        if (!post.getAuthorId().equals(authorId)) {
            throw new RuntimeException("You are not the author of this post");
        }

        post.update(requestDto.getTitle(), requestDto.getContent(), requestDto.getCategoryType(), requestDto.getEventId());
        setImageUrlsJson(post, requestDto.getImageUrls());
        String nickname = memberRepository.findById(post.getAuthorId()).map(Member::getNickname).orElse(null);
        return PostResponseDto.from(post, nickname);
    }

    /** 행사별 후기 게시글 목록 (eventId 로 조회). 로그인 시 내가 차단한 작성자 글 제외 */
    public Page<PostListResponseDto> getPostsByEventId(Long eventId, Long userId, Pageable pageable) {
        Page<Post> page;
        if (userId == null) {
            page = postRepository.findByEventId(eventId, pageable);
        } else {
            Set<Long> blockedIds = blockService.getBlockedUserIds(userId);
            page = blockedIds.isEmpty()
                    ? postRepository.findByEventId(eventId, pageable)
                    : postRepository.findByEventIdExcludingAuthors(eventId, blockedIds, pageable);
        }
        List<Post> posts = page.getContent();
        Map<Long, String> nicknameMap = getAuthorNicknameMap(posts);
        Map<Long, String> eventTitleMap = getEventTitleMap(posts);
        Set<Long> likedPostIds = (userId != null) ? postLikeRepository.findPostIdsByMemberId(userId) : Set.of();
        return page.map(post -> PostListResponseDto.from(post, nicknameMap.get(post.getAuthorId()), likedPostIds.contains(post.getId()), post.getEventId() != null ? eventTitleMap.get(post.getEventId()) : null));
    }

    /** 내가 댓글 단 글 목록 (마이페이지) - 인증 필요 */
    public Page<PostListResponseDto> getCommentedPosts(Long userId, Pageable pageable) {
        List<Long> postIds = commentRepository.findDistinctPostIdsByAuthorId(userId, pageable);
        long total = commentRepository.countDistinctPostsByAuthorId(userId);
        if (postIds.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, total);
        }
        List<Post> posts = postRepository.findAllById(postIds);
        Map<Long, Post> postMap = posts.stream().collect(Collectors.toMap(Post::getId, p -> p));
        List<Post> ordered = postIds.stream().map(postMap::get).filter(p -> p != null).toList();
        Map<Long, String> nicknameMap = getAuthorNicknameMap(ordered);
        Map<Long, String> eventTitleMap = getEventTitleMap(ordered);
        Set<Long> likedPostIds = postLikeRepository.findPostIdsByMemberId(userId);
        List<PostListResponseDto> content = ordered.stream()
                .map(post -> PostListResponseDto.from(post, nicknameMap.get(post.getAuthorId()), likedPostIds.contains(post.getId()), post.getEventId() != null ? eventTitleMap.get(post.getEventId()) : null))
                .toList();
        return new PageImpl<>(content, pageable, total);
    }

    /** 좋아요 누른 글 목록 (마이페이지) - 인증 필요 */
    public Page<PostListResponseDto> getLikedPosts(Long userId, Pageable pageable) {
        Page<PostLike> likePage = postLikeRepository.findByMemberIdOrderByPostCreatedAtDesc(userId, pageable);
        List<Post> posts = likePage.getContent().stream().map(PostLike::getPost).toList();
        Map<Long, String> nicknameMap = getAuthorNicknameMap(posts);
        Map<Long, String> eventTitleMap = getEventTitleMap(posts);
        List<PostListResponseDto> content = likePage.getContent().stream()
                .map(pl -> {
                    Post p = pl.getPost();
                    return PostListResponseDto.from(p, nicknameMap.get(p.getAuthorId()), true, p.getEventId() != null ? eventTitleMap.get(p.getEventId()) : null);
                })
                .toList();
        return new PageImpl<>(content, likePage.getPageable(), likePage.getTotalElements());
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

    /** 관리자용: 게시글 삭제(소프트 삭제). 작성자 여부 무관. */
    @Transactional
    public void deletePostByAdmin(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found: " + postId));
        postRepository.delete(post);
    }

    public Page<PostListResponseDto> getPostsByCategory(String categoryType, Long userId, Pageable pageable) {
        Page<Post> page;
        if (userId == null) {
            page = postRepository.findByCategoryType(categoryType, pageable);
        } else {
            Set<Long> blockedIds = blockService.getBlockedUserIds(userId);
            page = blockedIds.isEmpty()
                    ? postRepository.findByCategoryType(categoryType, pageable)
                    : postRepository.findByCategoryTypeExcludingAuthors(categoryType, blockedIds, pageable);
        }
        List<Post> posts = page.getContent();
        Map<Long, String> nicknameMap = getAuthorNicknameMap(posts);
        Map<Long, String> eventTitleMap = getEventTitleMap(posts);
        Set<Long> likedPostIds = (userId != null) ? postLikeRepository.findPostIdsByMemberId(userId) : Set.of();
        return page.map(post -> PostListResponseDto.from(post, nicknameMap.get(post.getAuthorId()), likedPostIds.contains(post.getId()), post.getEventId() != null ? eventTitleMap.get(post.getEventId()) : null));
    }

    public Page<PostListResponseDto> searchPosts(String keyword, Long userId, Pageable pageable) {
        if (keyword != null && keyword.trim().matches("\\d+")) {
            try {
                Long id = Long.parseLong(keyword.trim());
                return postRepository.findById(id)
                        .filter(post -> {
                            if (userId == null) return true;
                            Set<Long> blockedIds = blockService.getBlockedUserIds(userId);
                            return !blockedIds.contains(post.getAuthorId());
                        })
                        .<Page<PostListResponseDto>>map(post -> {
                            List<Post> one = List.of(post);
                            Map<Long, String> nicknameMap = getAuthorNicknameMap(one);
                            Map<Long, String> eventTitleMap = getEventTitleMap(one);
                            Set<Long> likedPostIds = (userId != null) ? postLikeRepository.findPostIdsByMemberId(userId) : Set.of();
                            PostListResponseDto dto = PostListResponseDto.from(post, nicknameMap.get(post.getAuthorId()), likedPostIds.contains(post.getId()), post.getEventId() != null ? eventTitleMap.get(post.getEventId()) : null);
                            return new PageImpl<>(List.of(dto), pageable, 1);
                        })
                        .orElseGet(() -> searchPostsByTitle(keyword, userId, pageable));
            } catch (NumberFormatException ignored) {
            }
        }
        return searchPostsByTitle(keyword, userId, pageable);
    }

    private Page<PostListResponseDto> searchPostsByTitle(String keyword, Long userId, Pageable pageable) {
        Page<Post> page;
        if (userId == null) {
            page = postRepository.findByTitleContaining(keyword, pageable);
        } else {
            Set<Long> blockedIds = blockService.getBlockedUserIds(userId);
            page = blockedIds.isEmpty()
                    ? postRepository.findByTitleContaining(keyword, pageable)
                    : postRepository.findByTitleContainingExcludingAuthors(keyword, blockedIds, pageable);
        }
        List<Post> posts = page.getContent();
        Map<Long, String> nicknameMap = getAuthorNicknameMap(posts);
        Map<Long, String> eventTitleMap = getEventTitleMap(posts);
        Set<Long> likedPostIds = (userId != null) ? postLikeRepository.findPostIdsByMemberId(userId) : Set.of();
        return page.map(post -> PostListResponseDto.from(post, nicknameMap.get(post.getAuthorId()), likedPostIds.contains(post.getId()), post.getEventId() != null ? eventTitleMap.get(post.getEventId()) : null));
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
