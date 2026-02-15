package com.dailo.backend.dto.event;

import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.entity.Event;
import com.dailo.backend.domain.enums.EventCategory;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@NoArgsConstructor
public class EventCreateRequest {
    private String title;
    private String thumbnailUrl;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private String placeName;
    private List<EventCategory> categories;
    private String region;

    public Event toEntity() {
        return Event.builder()
                .title(this.title)
                .thumbnailUrl(this.thumbnailUrl)
                .startAt(this.startAt)
                .endAt(this.endAt)
                .placeName(this.placeName)
                .categories(this.categories)
                .regionName(this.region)
                .status(EventStatus.ACTIVE)
                .build();
    }
}