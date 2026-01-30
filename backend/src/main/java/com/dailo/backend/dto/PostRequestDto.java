package com.dailo.backend.dto;

import com.dailo.backend.entity.Post;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PostRequestDto {

    private String title;
    private String content;
    private String categoryType;

    public Post toEntity(Long authorId) {
        return Post.builder()
                .authorId(authorId)
                .title(this.title)
                .content(this.content)
                .categoryType(this.categoryType)
                .build();
    }
}
