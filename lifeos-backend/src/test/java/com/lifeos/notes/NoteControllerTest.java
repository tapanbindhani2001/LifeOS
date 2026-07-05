package com.lifeos.notes;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.notes.dto.CreateNoteRequest;
import com.lifeos.notes.dto.UpdateNoteRequest;
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

import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web integration tests verifying NoteController endpoint operations,
 * JSR-380 validation, database audits, and secure cross-user boundaries.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String user1Token;
    private String user2Token;

    @BeforeEach
    void setUp() throws Exception {
        noteRepository.deleteAll();
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
    void whenCreateNote_thenSuccess() throws Exception {
        CreateNoteRequest request = CreateNoteRequest.builder()
                .title("My First Note")
                .content("Note body content goes here")
                .pinned(false)
                .color("#FFD370")
                .build();

        mockMvc.perform(post("/api/v1/notes")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Note created successfully")))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.title", is("My First Note")))
                .andExpect(jsonPath("$.data.content", is("Note body content goes here")))
                .andExpect(jsonPath("$.data.color", is("#FFD370")))
                .andExpect(jsonPath("$.data.pinned", is(false)));
    }

    @Test
    void whenCreateNoteWithMissingTitle_thenReturn400() throws Exception {
        CreateNoteRequest request = CreateNoteRequest.builder()
                .title("") // Blank title
                .content("Body")
                .build();

        mockMvc.perform(post("/api/v1/notes")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Validation failed")))
                .andExpect(jsonPath("$.errors.title", is("Title is required")));
    }

    @Test
    void whenGetNotes_thenReturnOnlyUserNotesSortedByPinned() throws Exception {
        // Create 3 notes for User 1: two regular, one pinned
        CreateNoteRequest note1 = CreateNoteRequest.builder().title("Note 1").pinned(false).build();
        CreateNoteRequest note2 = CreateNoteRequest.builder().title("Note 2").pinned(true).build(); // Pinned
        CreateNoteRequest note3 = CreateNoteRequest.builder().title("Note 3").pinned(false).build();

        mockMvc.perform(post("/api/v1/notes").header("Authorization", "Bearer " + user1Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(note1)));
        mockMvc.perform(post("/api/v1/notes").header("Authorization", "Bearer " + user1Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(note2)));
        mockMvc.perform(post("/api/v1/notes").header("Authorization", "Bearer " + user1Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(note3)));

        // Create 1 note for User 2
        CreateNoteRequest user2Note = CreateNoteRequest.builder().title("User 2 Note").build();
        mockMvc.perform(post("/api/v1/notes").header("Authorization", "Bearer " + user2Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(user2Note)));

        // Retrieve notes for User 1
        mockMvc.perform(get("/api/v1/notes")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(3)))
                // Pinned note ("Note 2") must be first in list
                .andExpect(jsonPath("$.data[0].title", is("Note 2")))
                .andExpect(jsonPath("$.data[0].pinned", is(true)))
                // Other notes should follow by creation date descending
                .andExpect(jsonPath("$.data[1].title", is("Note 3")))
                .andExpect(jsonPath("$.data[2].title", is("Note 1")));
    }

    @Test
    void whenAccessOtherUsersNote_thenReturn404() throws Exception {
        // User 2 creates a note
        CreateNoteRequest request = CreateNoteRequest.builder().title("Private Note").build();
        MvcResult result = mockMvc.perform(post("/api/v1/notes")
                        .header("Authorization", "Bearer " + user2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String noteId = (String) dataMap.get("id");

        // User 1 tries to fetch it
        mockMvc.perform(get("/api/v1/notes/" + noteId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());

        // User 1 tries to update it
        UpdateNoteRequest update = UpdateNoteRequest.builder().title("Hacked Title").build();
        mockMvc.perform(put("/api/v1/notes/" + noteId)
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isNotFound());

        // User 1 tries to delete it
        mockMvc.perform(delete("/api/v1/notes/" + noteId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());
    }

    @Test
    void whenTogglePin_thenPinStatusInverts() throws Exception {
        // User 1 creates note
        CreateNoteRequest create = CreateNoteRequest.builder().title("Note").pinned(false).build();
        MvcResult result = mockMvc.perform(post("/api/v1/notes")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String noteId = (String) dataMap.get("id");

        // Pin the note
        mockMvc.perform(put("/api/v1/notes/" + noteId + "/pin")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pinned", is(true)));

        // Unpin the note
        mockMvc.perform(put("/api/v1/notes/" + noteId + "/pin")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pinned", is(false)));
    }
}
