package com.lifeos.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository for UserDevice entity CRUD operations.
 */
@Repository
public interface UserDeviceRepository extends JpaRepository<UserDevice, UUID> {
    Optional<UserDevice> findByExpoPushToken(String expoPushToken);
    List<UserDevice> findAllByUserId(UUID userId);
    void deleteByExpoPushToken(String expoPushToken);
}
