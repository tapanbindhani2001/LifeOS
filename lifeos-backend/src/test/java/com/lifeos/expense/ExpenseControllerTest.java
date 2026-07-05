package com.lifeos.expense;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.expense.dto.CreateExpenseRequest;
import com.lifeos.expense.dto.UpdateExpenseRequest;
import com.lifeos.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web integration tests verifying ExpenseController endpoint operations,
 * BigDecimal accuracy, aggregation reports, custom grouping projections,
 * and user boundary limits.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExpenseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String user1Token;
    private String user2Token;

    @BeforeEach
    void setUp() throws Exception {
        expenseRepository.deleteAll();
        userRepository.deleteAll();

        // Create user 1 and get token
        RegisterRequest register1 = RegisterRequest.builder()
                .email("user1@lifeos.com")
                .password("password123")
                .fullName("User One")
                .build();
        user1Token = obtainToken(register1);

        // Create user 2 and get token
        RegisterRequest register2 = RegisterRequest.builder()
                .email("user2@lifeos.com")
                .password("password123")
                .fullName("User Two")
                .build();
        user2Token = obtainToken(register2);
    }

    private String obtainToken(RegisterRequest request) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();
        String content = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(content, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        return (String) dataMap.get("token");
    }

    @Test
    void whenCreateExpense_thenSuccess() throws Exception {
        CreateExpenseRequest request = CreateExpenseRequest.builder()
                .amount(new BigDecimal("150.75"))
                .type(ExpenseType.EXPENSE)
                .category("Food")
                .description("Grocery shopping")
                .transactionDate(LocalDate.of(2026, 7, 5))
                .build();

        mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Transaction added successfully")))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.amount", is(150.75)))
                .andExpect(jsonPath("$.data.type", is("EXPENSE")))
                .andExpect(jsonPath("$.data.category", is("Food")))
                .andExpect(jsonPath("$.data.transactionDate", is("2026-07-05")));
    }

    @Test
    void whenCreateExpenseWithInvalidAmount_thenReturn400() throws Exception {
        CreateExpenseRequest request = CreateExpenseRequest.builder()
                .amount(new BigDecimal("0.00")) // Invalid: amount must be >= 0.01
                .type(ExpenseType.EXPENSE)
                .category("Food")
                .transactionDate(LocalDate.now())
                .build();

        mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Validation failed")))
                .andExpect(jsonPath("$.errors.amount", is("Amount must be at least 0.01")));
    }

    @Test
    void whenGetSummary_thenReturnCalculatedReport() throws Exception {
        // Create 3 transactions for User 1:
        // 1. Income: $1200.00
        CreateExpenseRequest tr1 = CreateExpenseRequest.builder()
                .amount(new BigDecimal("1200.00"))
                .type(ExpenseType.INCOME)
                .category("Salary")
                .transactionDate(LocalDate.of(2026, 7, 1))
                .build();
        // 2. Expense: $150.00 (Food)
        CreateExpenseRequest tr2 = CreateExpenseRequest.builder()
                .amount(new BigDecimal("150.00"))
                .type(ExpenseType.EXPENSE)
                .category("Food")
                .transactionDate(LocalDate.of(2026, 7, 5))
                .build();
        // 3. Expense: $50.00 (Transport)
        CreateExpenseRequest tr3 = CreateExpenseRequest.builder()
                .amount(new BigDecimal("50.00"))
                .type(ExpenseType.EXPENSE)
                .category("Transport")
                .transactionDate(LocalDate.of(2026, 7, 6))
                .build();

        mockMvc.perform(post("/api/v1/expenses").header("Authorization", "Bearer " + user1Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(tr1)));
        mockMvc.perform(post("/api/v1/expenses").header("Authorization", "Bearer " + user1Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(tr2)));
        mockMvc.perform(post("/api/v1/expenses").header("Authorization", "Bearer " + user1Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(tr3)));

        // Retrieve summary
        mockMvc.perform(get("/api/v1/expenses/summary")
                        .header("Authorization", "Bearer " + user1Token)
                        .param("start", "2026-07-01")
                        .param("end", "2026-07-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.totalIncome", is(1200.00)))
                .andExpect(jsonPath("$.data.totalExpense", is(200.00)))
                .andExpect(jsonPath("$.data.netBalance", is(1000.00)))
                .andExpect(jsonPath("$.data.categoryBreakdown", hasSize(2)))
                // Groupings: Food: 150, Transport: 50
                .andExpect(jsonPath("$.data.categoryBreakdown[0].category", is("Food")))
                .andExpect(jsonPath("$.data.categoryBreakdown[0].amount", is(150.00)))
                .andExpect(jsonPath("$.data.categoryBreakdown[1].category", is("Transport")))
                .andExpect(jsonPath("$.data.categoryBreakdown[1].amount", is(50.00)));
    }

    @Test
    void whenAccessOtherUsersExpense_thenReturn404() throws Exception {
        // User 2 adds transaction
        CreateExpenseRequest request = CreateExpenseRequest.builder()
                .amount(new BigDecimal("10.00"))
                .type(ExpenseType.EXPENSE)
                .category("Snacks")
                .transactionDate(LocalDate.now())
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", "Bearer " + user2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String expenseId = (String) dataMap.get("id");

        // User 1 tries to fetch it
        mockMvc.perform(get("/api/v1/expenses/" + expenseId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());

        // User 1 tries to update it
        UpdateExpenseRequest update = UpdateExpenseRequest.builder()
                .amount(new BigDecimal("20.00"))
                .type(ExpenseType.EXPENSE)
                .category("Hacked category")
                .transactionDate(LocalDate.now())
                .build();
        mockMvc.perform(put("/api/v1/expenses/" + expenseId)
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isNotFound());

        // User 1 tries to delete it
        mockMvc.perform(delete("/api/v1/expenses/" + expenseId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());
    }
}
