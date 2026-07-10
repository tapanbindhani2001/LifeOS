package com.lifeos.document.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object representing user storage statistics and limits.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StorageSummaryResponse {
    private long usedBytes;
    private long limitBytes;
    private String planName;
    private boolean isPremium;
}
