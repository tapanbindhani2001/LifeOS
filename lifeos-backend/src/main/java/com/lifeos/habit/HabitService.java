package com.lifeos.habit;

import com.lifeos.common.exception.ResourceNotFoundException;
import com.lifeos.habit.dto.CreateHabitRequest;
import com.lifeos.habit.dto.HabitResponse;
import com.lifeos.habit.dto.UpdateHabitRequest;
import com.lifeos.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class handling habit configurations and dynamic completion streak computations.
 */
@Service
public class HabitService {

    private final HabitRepository habitRepository;
    private final HabitLogRepository habitLogRepository;

    /**
     * Constructs HabitService.
     *
     * @param habitRepository    repository handling habit config settings
     * @param habitLogRepository repository handling habit check-in logs
     */
    public HabitService(HabitRepository habitRepository, HabitLogRepository habitLogRepository) {
        this.habitRepository = habitRepository;
        this.habitLogRepository = habitLogRepository;
    }

    private HabitResponse mapToResponse(Habit habit, StreakStats stats) {
        return HabitResponse.builder()
                .id(habit.getId())
                .name(habit.getName())
                .description(habit.getDescription())
                .frequency(habit.getFrequency())
                .completedToday(stats.completedToday)
                .currentStreak(stats.currentStreak)
                .bestStreak(habit.getBestStreak())
                .createdAt(habit.getCreatedAt())
                .updatedAt(habit.getUpdatedAt())
                .build();
    }

    private StreakStats calculateStreaks(List<HabitLog> logs) {
        if (logs.isEmpty()) {
            return new StreakStats(0, 0, false);
        }

        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        // Extract completion dates sorted chronologically
        List<LocalDate> sortedDates = logs.stream()
                .map(HabitLog::getDate)
                .sorted()
                .collect(Collectors.toList());

        boolean completedToday = sortedDates.contains(today);
        boolean completedYesterday = sortedDates.contains(yesterday);

        // Calculate Current Streak
        int currentStreak = 0;
        if (completedToday || completedYesterday) {
            LocalDate checkDate = completedToday ? today : yesterday;
            while (sortedDates.contains(checkDate)) {
                currentStreak++;
                checkDate = checkDate.minusDays(1);
            }
        }

        // Calculate Best Streak
        int bestStreak = 0;
        int currentRun = 0;
        LocalDate expectedDate = null;

        for (LocalDate date : sortedDates) {
            if (expectedDate == null) {
                currentRun = 1;
            } else if (date.equals(expectedDate)) {
                currentRun++;
            } else {
                bestStreak = Math.max(bestStreak, currentRun);
                currentRun = 1;
            }
            expectedDate = date.plusDays(1);
        }
        bestStreak = Math.max(bestStreak, currentRun);

        return new StreakStats(currentStreak, bestStreak, completedToday);
    }

    private HabitResponse getHabitResponse(User user, Habit habit) {
        List<HabitLog> logs = habitLogRepository.findAllByHabitIdOrderByDateDesc(habit.getId());
        StreakStats stats = calculateStreaks(logs);
        
        boolean updated = false;
        if (logs.isEmpty() && habit.getBestStreak() != 0) {
            habit.setBestStreak(0);
            updated = true;
        } else if (stats.currentStreak > habit.getBestStreak()) {
            habit.setBestStreak(stats.currentStreak);
            updated = true;
        }

        if (updated) {
            habit = habitRepository.save(habit);
        }
        return mapToResponse(habit, stats);
    }

    /**
     * Lists user habits with computed stats.
     *
     * @param user the currently authenticated user
     * @return list of HabitResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<HabitResponse> getUserHabits(User user) {
        return habitRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(habit -> getHabitResponse(user, habit))
                .collect(Collectors.toList());
    }

    /**
     * Creates a new habit config.
     *
     * @param user    the currently authenticated user
     * @param request create payload DTO
     * @return the created HabitResponse DTO
     */
    @Transactional
    public HabitResponse createHabit(User user, CreateHabitRequest request) {
        Habit habit = Habit.builder()
                .user(user)
                .name(request.getName())
                .description(request.getDescription())
                .frequency(request.getFrequency())
                .build();

        Habit savedHabit = habitRepository.save(habit);
        return mapToResponse(savedHabit, new StreakStats(0, 0, false));
    }

    /**
     * Updates an existing habit. Secure user checked.
     *
     * @param user    the currently authenticated user
     * @param habitId habit UUID
     * @param request update payload DTO
     * @return updated HabitResponse DTO
     */
    @Transactional
    public HabitResponse updateHabit(User user, UUID habitId, UpdateHabitRequest request) {
        Habit habit = habitRepository.findByIdAndUserId(habitId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Habit not found with id: " + habitId));

        habit.setName(request.getName());
        habit.setDescription(request.getDescription());
        habit.setFrequency(request.getFrequency());

        Habit savedHabit = habitRepository.save(habit);
        return getHabitResponse(user, savedHabit);
    }

    /**
     * Toggles checks in database log records (adds log if check-in missing, deletes if check-in exists).
     *
     * @param user    the currently authenticated user
     * @param habitId habit UUID
     * @param date    target check-in date
     * @return updated HabitResponse DTO containing updated streak indicators
     */
    @Transactional
    public HabitResponse toggleHabit(User user, UUID habitId, LocalDate date) {
        Habit habit = habitRepository.findByIdAndUserId(habitId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Habit not found with id: " + habitId));

        Optional<HabitLog> existingLog = habitLogRepository.findByHabitIdAndDate(habitId, date);
        if (existingLog.isPresent()) {
            habitLogRepository.delete(existingLog.get());
        } else {
            HabitLog log = HabitLog.builder()
                    .habit(habit)
                    .date(date)
                    .build();
            habitLogRepository.save(log);
        }

        return getHabitResponse(user, habit);
    }

    /**
     * Deletes a habit configuration. Secure user checked.
     *
     * @param user    the currently authenticated user
     * @param habitId habit UUID
     */
    @Transactional
    public void deleteHabit(User user, UUID habitId) {
        Habit habit = habitRepository.findByIdAndUserId(habitId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Habit not found with id: " + habitId));
        habitRepository.delete(habit);
    }

    private static class StreakStats {
        final int currentStreak;
        final int bestStreak;
        final boolean completedToday;

        StreakStats(int currentStreak, int bestStreak, boolean completedToday) {
            this.currentStreak = currentStreak;
            this.bestStreak = bestStreak;
            this.completedToday = completedToday;
        }
    }
}
