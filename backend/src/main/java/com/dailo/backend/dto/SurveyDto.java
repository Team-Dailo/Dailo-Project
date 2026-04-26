package com.dailo.backend.dto;

import com.dailo.backend.entity.Survey;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurveyDto {
    private Long id;
    private Long memberId;
    private Long eventId;
    private String eventTitle;
    private String name;
    private String phone;
    private String feedback;
    private LocalDateTime createdAt;

    public static SurveyDto from(Survey entity) {
        return SurveyDto.builder()
                .id(entity.getId())
                .memberId(entity.getMemberId())
                .eventId(entity.getEventId())
                .eventTitle(entity.getEventTitle())
                .name(entity.getName())
                .phone(entity.getPhone())
                .feedback(entity.getFeedback())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
