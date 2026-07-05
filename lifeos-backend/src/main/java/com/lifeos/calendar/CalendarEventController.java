package com.lifeos.calendar;

import com.lifeos.calendar.dto.CalendarEventResponse;
import com.lifeos.calendar.dto.CreateCalendarEventRequest;
import com.lifeos.calendar.dto.UpdateCalendarEventRequest;
import com.lifeos.common.response.ApiResponse;
import com.lifeos.common.security.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * REST Controller exposing secure endpoints to create, view, modify, and delete user calendar events.
 */
@RestController
@RequestMapping("/api/v1/calendar/events")
public class CalendarEventController {

    private final CalendarEventService calendarEventService;

    /**
     * Constructs CalendarEventController.
     *
     * @param calendarEventService service handling calendar events business rules
     */
    public CalendarEventController(CalendarEventService calendarEventService) {
        this.calendarEventService = calendarEventService;
    }

    /**
     * Retrieves calendar events. Supports optional start and end range filters.
     *
     * @param userDetails Spring security principal wrapper
     * @param start       optional range start ISO-8601 timestamp
     * @param end         optional range end ISO-8601 timestamp
     * @return standard ApiResponse containing chronologically sorted list of CalendarEventResponse DTOs
     */
    @GetMapping
    public ApiResponse<List<CalendarEventResponse>> getEvents(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false) Instant start,
            @RequestParam(required = false) Instant end
    ) {
        List<CalendarEventResponse> response;
        if (start != null && end != null) {
            response = calendarEventService.getUserEventsRange(userDetails.getUser(), start, end);
        } else {
            response = calendarEventService.getUserEvents(userDetails.getUser());
        }
        return ApiResponse.success(response, "Fetched calendar events successfully");
    }

    /**
     * Retrieves details of a specific event.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          event UUID
     * @return standard ApiResponse containing CalendarEventResponse DTO
     */
    @GetMapping("/{id}")
    public ApiResponse<CalendarEventResponse> getEventById(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        CalendarEventResponse response = calendarEventService.getEventById(userDetails.getUser(), id);
        return ApiResponse.success(response, "Fetched calendar event successfully");
    }

    /**
     * Creates a new calendar event.
     *
     * @param userDetails Spring security principal wrapper
     * @param request     create event payload DTO
     * @return standard ApiResponse containing created CalendarEventResponse DTO
     */
    @PostMapping
    public ApiResponse<CalendarEventResponse> createEvent(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody CreateCalendarEventRequest request
    ) {
        CalendarEventResponse response = calendarEventService.createEvent(userDetails.getUser(), request);
        return ApiResponse.success(response, "Calendar event created successfully");
    }

    /**
     * Updates an existing event.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          event UUID
     * @param request     update event payload DTO
     * @return standard ApiResponse containing updated CalendarEventResponse DTO
     */
    @PutMapping("/{id}")
    public ApiResponse<CalendarEventResponse> updateEvent(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCalendarEventRequest request
    ) {
        CalendarEventResponse response = calendarEventService.updateEvent(userDetails.getUser(), id, request);
        return ApiResponse.success(response, "Calendar event updated successfully");
    }

    /**
     * Deletes an event.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          event UUID
     * @return standard ApiResponse with success message
     */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteEvent(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        calendarEventService.deleteEvent(userDetails.getUser(), id);
        return ApiResponse.successWithMessage("Calendar event deleted successfully");
    }
}
