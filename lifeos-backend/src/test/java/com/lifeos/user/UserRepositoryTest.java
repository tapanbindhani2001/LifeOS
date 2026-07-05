package com.lifeos.user;

import com.lifeos.common.config.JpaAuditingConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests to verify UserRepository functionality, database constraints,
 * Flyway schema validation, and JPA Auditing.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(JpaAuditingConfig.class)
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void whenSaveUser_thenAuditTimestampsArePopulatedAndIdGenerated() {
        User user = User.builder()
                .email("test@lifeos.com")
                .password("hashed_password_123")
                .fullName("Test User")
                .role(Role.ROLE_USER)
                .build();

        User savedUser = userRepository.saveAndFlush(user);

        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getCreatedAt()).isNotNull();
        assertThat(savedUser.getUpdatedAt()).isNotNull();
        assertThat(savedUser.isEnabled()).isTrue();
        assertThat(savedUser.getCreatedAt()).isBeforeOrEqualTo(Instant.now());
    }

    @Test
    void whenSaveUserWithDuplicateEmail_thenThrowException() {
        User user1 = User.builder()
                .email("duplicate@lifeos.com")
                .password("hashed_password_123")
                .fullName("User One")
                .role(Role.ROLE_USER)
                .build();
        userRepository.saveAndFlush(user1);

        User user2 = User.builder()
                .email("duplicate@lifeos.com")
                .password("another_password")
                .fullName("User Two")
                .role(Role.ROLE_USER)
                .build();

        assertThatThrownBy(() -> userRepository.saveAndFlush(user2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void whenFindByEmail_thenReturnUser() {
        String email = "search@lifeos.com";
        User user = User.builder()
                .email(email)
                .password("hashed_password_123")
                .fullName("Search User")
                .role(Role.ROLE_USER)
                .build();
        userRepository.saveAndFlush(user);

        Optional<User> foundUser = userRepository.findByEmail(email);

        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo(email);
    }
}
