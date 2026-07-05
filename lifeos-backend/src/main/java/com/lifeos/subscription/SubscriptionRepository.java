package com.lifeos.subscription;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository interface for performing CRUD operations on Subscription configurations.
 */
@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    /**
     * Retrieves subscription details belonging to a user.
     *
     * @param userId the owner user UUID
     * @return an Optional containing Subscription details if found, or empty
     */
    Optional<Subscription> findByUserId(UUID userId);
}
