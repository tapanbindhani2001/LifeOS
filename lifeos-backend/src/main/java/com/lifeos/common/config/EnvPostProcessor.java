package com.lifeos.common.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

/**
 * Custom EnvironmentPostProcessor that automatically loads variables from a .env file
 * in the local workspace directory (or parent directory) into the Spring Environment.
 */
public class EnvPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Path path = Paths.get(".env");
        if (!Files.exists(path)) {
            // Look up one level in case of monorepo subproject directory testing
            path = Paths.get("../.env");
            if (!Files.exists(path)) {
                // If .env doesn't exist, rely on external environment settings
                return;
            }
        }

        try {
            Map<String, Object> envProperties = new HashMap<>();
            for (String line : Files.readAllLines(path)) {
                line = line.trim();
                if (!line.isEmpty() && !line.startsWith("#") && line.contains("=")) {
                    int index = line.indexOf("=");
                    String key = line.substring(0, index).trim();
                    String value = line.substring(index + 1).trim();
                    
                    // Strip enclosing quotes if present (e.g. "value" or 'value')
                    if ((value.startsWith("\"") && value.endsWith("\"")) ||
                            (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.substring(1, value.length() - 1);
                    }
                    envProperties.put(key, value);
                }
            }

            if (!envProperties.isEmpty()) {
                environment.getPropertySources().addFirst(new MapPropertySource("dotenvProperties", envProperties));
            }
        } catch (IOException e) {
            throw new IllegalStateException("Failed to load environment configuration from .env", e);
        }
    }
}
