package com.dailo.backend.dto;

import com.dailo.backend.entity.Post;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PostRequestDto {

    private String title;
    private String content;
    private String categoryType;
    /** 후기 카테고리일 때 연관 행사 ID (선택) */
    private Long eventId;
    /** S3 이미지 key 목록 */
    private List<String> imageKeys;

    public Post toEntity(Long authorId) {
        return Post.builder()
                .authorId(authorId)
                .title(this.title)
                .content(this.content)
                .categoryType(this.categoryType)
                .eventId(this.eventId)
                .imageKeys(this.imageKeys != null ? this.imageKeys : new ArrayList<>())
                .build();
    }
}
