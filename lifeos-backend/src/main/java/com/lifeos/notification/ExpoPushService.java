package com.lifeos.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/**
 * Service to deliver push notifications via Expo's Push API.
 */
@Service
public class ExpoPushService {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ExpoPushService() {
        this.httpClient = HttpClient.newBuilder().build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Sends a push notification to a registered Expo push token.
     *
     * @param token Expo Push Token (e.g. ExponentPushToken[xxx])
     * @param title Title of the push notification
     * @param body  Message content of the push notification
     */
    public void sendPushNotification(String token, String title, String body) {
        if (token == null || !token.startsWith("ExponentPushToken")) {
            System.err.println("Invalid Expo Push Token: " + token);
            return;
        }

        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("to", token);
            payload.put("title", title);
            payload.put("body", body);
            payload.put("sound", "default");

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://exp.host/--/api/v2/push/send"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                    .thenAccept(response -> {
                        if (response.statusCode() != 200) {
                            System.err.println("Failed to send push notification to Expo. Status: " 
                                    + response.statusCode() + ", Body: " + response.body());
                        }
                    })
                    .exceptionally(ex -> {
                        ex.printStackTrace();
                        return null;
                    });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
