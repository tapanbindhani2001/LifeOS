package com.lifeos.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Configuration class to enable JPA auditing (e.g. @CreatedDate, @LastModifiedDate annotations).
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}
