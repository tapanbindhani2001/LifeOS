package com.lifeos.common.exception;

import com.lifeos.common.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Unit tests to verify standard API response and global exception handling.
 */
class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TestController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void whenSuccess_thenReturnStandardResponse() throws Exception {
        mockMvc.perform(get("/test/success"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Operation completed successfully")))
                .andExpect(jsonPath("$.data", is("Hello World")))
                .andExpect(jsonPath("$.timestamp", notNullValue()));
    }

    @Test
    void whenResourceNotFoundExceptionThrown_thenReturn404ErrorResponse() throws Exception {
        mockMvc.perform(get("/test/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Resource could not be found")))
                .andExpect(jsonPath("$.timestamp", notNullValue()));
    }

    @Test
    void whenValidationFails_thenReturn400ErrorResponseWithValidationDetails() throws Exception {
        mockMvc.perform(post("/test/validation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Validation failed")))
                .andExpect(jsonPath("$.errors.name", is("Name cannot be blank")))
                .andExpect(jsonPath("$.timestamp", notNullValue()));
    }

    @Test
    void whenGeneralExceptionThrown_thenReturn500ErrorResponse() throws Exception {
        mockMvc.perform(get("/test/error"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("An unexpected error occurred. Please contact system administrator.")))
                .andExpect(jsonPath("$.timestamp", notNullValue()));
    }

    @RestController
    private static class TestController {

        @GetMapping("/test/success")
        public ApiResponse<String> getSuccess() {
            return ApiResponse.success("Hello World");
        }

        @GetMapping("/test/not-found")
        public void getNotFound() {
            throw new ResourceNotFoundException("Resource could not be found");
        }

        @PostMapping("/test/validation")
        public void getValidation(@Valid @RequestBody TestRequest request) {
        }

        @GetMapping("/test/error")
        public void getError() {
            throw new RuntimeException("Unexpected db error");
        }
    }

    @Getter
    @Setter
    private static class TestRequest {
        @NotBlank(message = "Name cannot be blank")
        private String name;
    }
}
