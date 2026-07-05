package com.lifeos.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository interface for performing CRUD and query operations on the User entity.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Finds a User by email address.
     *
     * @param email the user's email address
     * @return an Optional containing the User if found, or empty
     */
    Optional<User> findByEmail(String email);

    /**
     * Checks if a User exists with the specified email address.
     *
     * @param email the email address to check
     * @return true if a user exists with the email, false otherwise
     */
    boolean existsByEmail(String email);
}
