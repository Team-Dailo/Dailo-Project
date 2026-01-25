package com.dailo.backend.controller;

import com.dailo.backend.entity.Event;
import com.dailo.backend.repository.EventRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventRepository eventRepository;

    // 생성자 주입 (DI)
    public EventController(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    // 1. 전체 조회 (GET /api/events)
    @GetMapping
    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    // 2. 단건 조회 (GET /api/events/{id})
    @GetMapping("/{id}")
    public ResponseEntity<Event> getEventById(@PathVariable Long id) {
        return eventRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 3. 생성 (POST /api/events)
    @PostMapping
    public Event createEvent(@RequestBody Event event) {
        return eventRepository.save(event);
    }

    // 4. 수정 (PUT /api/events/{id})
    @PutMapping("/{id}")
    public ResponseEntity<Event> updateEvent(@PathVariable Long id, @RequestBody Event eventDetails) {
        return eventRepository.findById(id)
                .map(event -> {
                    event.setTitle(eventDetails.getTitle());
                    event.setLocation(eventDetails.getLocation());
                    event.setStartDate(eventDetails.getStartDate());
                    event.setEndDate(eventDetails.getEndDate());
                    event.setCategory(eventDetails.getCategory());
                    event.setDescription(eventDetails.getDescription());
                    Event updatedEvent = eventRepository.save(event);
                    return ResponseEntity.ok(updatedEvent);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // 5. 삭제 (DELETE /api/events/{id})
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        return eventRepository.findById(id)
                .map(event -> {
                    eventRepository.delete(event);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}