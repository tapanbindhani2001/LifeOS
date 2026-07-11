package com.lifeos.expense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanReceiptResponse {
    private String merchant;
    private Double amount;
    private String date;
    private String category;
}
