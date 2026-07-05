package com.lifeos.document;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web integration tests verifying DocumentController upload requests,
 * filesystem write routines, download streams, mime headers, and scope bounds.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DocumentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String user1Token;
    private String user2Token;

    @BeforeEach
    void setUp() throws Exception {
        documentRepository.deleteAll();
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
    void whenUploadFile_thenSuccess() throws Exception {
        MockMultipartFile mockFile = new MockMultipartFile(
                "file",
                "receipt.pdf",
                "application/pdf",
                "Fake PDF Content".getBytes()
        );

        MvcResult result = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(mockFile)
                        .param("scanned", "true")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Document uploaded successfully")))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.fileName", is("receipt.pdf")))
                .andExpect(jsonPath("$.data.fileType", is("application/pdf")))
                .andExpect(jsonPath("$.data.fileSize", is(16)))
                .andExpect(jsonPath("$.data.scanned", is(true)))
                .andReturn();

        // Verify physical file was created in uploads folder
        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String documentId = (String) dataMap.get("id");

        Path path = Paths.get("uploads").resolve(documentId);
        assertThat(Files.exists(path)).isTrue();
        assertThat(Files.readString(path)).isEqualTo("Fake PDF Content");

        // Cleanup
        Files.deleteIfExists(path);
    }

    @Test
    void whenDownloadFile_thenSuccess() throws Exception {
        // First upload a file
        MockMultipartFile mockFile = new MockMultipartFile(
                "file",
                "notes.txt",
                "text/plain",
                "My meeting notes".getBytes()
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(mockFile)
                        .header("Authorization", "Bearer " + user1Token))
                .andReturn();

        String responseContent = uploadResult.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String documentId = (String) dataMap.get("id");

        // Download the file
        MvcResult downloadResult = mockMvc.perform(get("/api/v1/documents/" + documentId + "/download")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"notes.txt\""))
                .andExpect(header().string("Content-Type", "text/plain"))
                .andExpect(header().string("Content-Length", "16"))
                .andReturn();

        assertThat(downloadResult.getResponse().getContentAsString()).isEqualTo("My meeting notes");

        // Cleanup
        Path path = Paths.get("uploads").resolve(documentId);
        Files.deleteIfExists(path);
    }

    @Test
    void whenDeleteFile_thenDiskAndDBCleared() throws Exception {
        // Upload
        MockMultipartFile mockFile = new MockMultipartFile(
                "file",
                "delete-me.txt",
                "text/plain",
                "Temporary".getBytes()
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(mockFile)
                        .header("Authorization", "Bearer " + user1Token))
                .andReturn();

        String responseContent = uploadResult.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String documentId = (String) dataMap.get("id");

        Path path = Paths.get("uploads").resolve(documentId);
        assertThat(Files.exists(path)).isTrue();

        // Delete
        mockMvc.perform(delete("/api/v1/documents/" + documentId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Document deleted successfully")));

        // Verify cleared
        assertThat(Files.exists(path)).isFalse();
        assertThat(documentRepository.findById(java.util.UUID.fromString(documentId)).isPresent()).isFalse();
    }

    @Test
    void whenAccessOtherUsersDocument_thenReturn404() throws Exception {
        // User 2 uploads a file
        MockMultipartFile mockFile = new MockMultipartFile(
                "file",
                "secret.txt",
                "text/plain",
                "Top secret".getBytes()
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(mockFile)
                        .header("Authorization", "Bearer " + user2Token))
                .andReturn();

        String responseContent = uploadResult.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String documentId = (String) dataMap.get("id");

        // User 1 tries to fetch it
        mockMvc.perform(get("/api/v1/documents/" + documentId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());

        // User 1 tries to download it
        mockMvc.perform(get("/api/v1/documents/" + documentId + "/download")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());

        // User 1 tries to delete it
        mockMvc.perform(delete("/api/v1/documents/" + documentId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());

        // Cleanup
        Path path = Paths.get("uploads").resolve(documentId);
        Files.deleteIfExists(path);
    }
}
