package com.lifeos.calendar;

import com.lifeos.calendar.dto.CreateCalendarEventRequest;
import com.lifeos.calendar.dto.CalendarEventResponse;
import com.lifeos.calendar.dto.UpdateCalendarEventRequest;
import com.lifeos.common.exception.BadRequestException;
import com.lifeos.common.exception.ResourceNotFoundException;
import com.lifeos.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class handling calendar events creation, range schedules, modifications, and deletion.
 */
@Service
public class CalendarEventService {

    private final CalendarEventRepository calendarEventRepository;

    /**
     * Constructs a CalendarEventService.
     *
     * @param calendarEventRepository repository handling calendar events queries
     */
    public CalendarEventService(CalendarEventRepository calendarEventRepository) {
        this.calendarEventRepository = calendarEventRepository;
    }

    private CalendarEventResponse mapToResponse(CalendarEvent event) {
        return CalendarEventResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .location(event.getLocation())
                .color(event.getColor())
                .createdAt(event.getCreatedAt())
                .updatedAt(event.getUpdatedAt())
                .build();
    }

    private void validateTimeOrdering(Instant start, Instant end) {
        if (end.isBefore(start) || end.equals(start)) {
            throw new BadRequestException("End time must be after start time");
        }
    }

    /**
     * Retrieves all events belonging to the user.
     *
     * @param user the currently authenticated user
     * @return chronologically sorted list of CalendarEventResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<CalendarEventResponse> getUserEvents(User user) {
        return calendarEventRepository.findAllByUserIdOrderByStartTimeAsc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves user events within a specific time range.
     *
     * @param user  the currently authenticated user
     * @param start range start timestamp
     * @param end   range end timestamp
     * @return chronologically sorted list of overlapping events
     */
    @Transactional(readOnly = true)
    public List<CalendarEventResponse> getUserEventsRange(User user, Instant start, Instant end) {
        validateTimeOrdering(start, end);
        return calendarEventRepository.findAllByUserIdAndStartTimeBetweenOrderByStartTimeAsc(user.getId(), start, end)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a single event. Enforces user security boundary.
     *
     * @param user    the currently authenticated user
     * @param eventId event UUID
     * @return CalendarEventResponse DTO
     */
    @Transactional(readOnly = true)
    public CalendarEventResponse getEventById(User user, UUID eventId) {
        CalendarEvent event = calendarEventRepository.findByIdAndUserId(eventId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + eventId));
        return mapToResponse(event);
    }

    /**
     * Creates a new calendar event.
     *
     * @param user    the currently authenticated user
     * @param request the create payload DTO
     * @return the created CalendarEventResponse DTO
     */
    @Transactional
    public CalendarEventResponse createEvent(User user, CreateCalendarEventRequest request) {
        validateTimeOrdering(request.getStartTime(), request.getEndTime());

        CalendarEvent event = CalendarEvent.builder()
                .user(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .location(request.getLocation())
                .color(request.getColor())
                .build();

        CalendarEvent savedEvent = calendarEventRepository.save(event);
        return mapToResponse(savedEvent);
    }

    /**
     * Updates an existing event. Enforces user security boundary.
     *
     * @param user    the currently authenticated user
     * @param eventId event UUID
     * @param request update payload DTO
     * @return the updated CalendarEventResponse DTO
     */
    @Transactional
    public CalendarEventResponse updateEvent(User user, UUID eventId, UpdateCalendarEventRequest request) {
        validateTimeOrdering(request.getStartTime(), request.getEndTime());

        CalendarEvent event = calendarEventRepository.findByIdAndUserId(eventId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + eventId));

        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setStartTime(request.getStartTime());
        event.setEndTime(request.getEndTime());
        event.setLocation(request.getLocation());
        if (request.getColor() != null) {
            event.setColor(request.getColor());
        }

        CalendarEvent savedEvent = calendarEventRepository.save(event);
        return mapToResponse(savedEvent);
    }

    /**
     * Deletes an event. Enforces user security boundary.
     *
     * @param user    the currently authenticated user
     * @param eventId event UUID
     */
    @Transactional
    public void deleteEvent(User user, UUID eventId) {
        CalendarEvent event = calendarEventRepository.findByIdAndUserId(eventId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + eventId));
        calendarEventRepository.delete(event);
    }
}
