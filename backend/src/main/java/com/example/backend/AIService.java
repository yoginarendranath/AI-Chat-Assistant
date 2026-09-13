package com.example.backend;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AIService {

    private final Client client;

    public AIService() {

        // Get Gemini API key from environment variable
        String apiKey = System.getenv("GEMINI_API_KEY");

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "GEMINI_API_KEY is not set. Please set your Gemini API key."
            );
        }

        // Create Gemini client
        client = Client.builder()
                .apiKey(apiKey)
                .build();
    }

    public String getAIResponse(
            String message,
            List<ChatMessage> previousMessages) {

        try {

            // Build prompt
            StringBuilder prompt = new StringBuilder();

            prompt.append("""
                    You are an intelligent and helpful AI Chat Assistant.

                    Answer the user's questions directly and clearly.

                    You can answer questions about:
                    - Programming
                    - Java
                    - Python
                    - SQL
                    - Spring Boot
                    - Android
                    - Computer Science
                    - Mathematics
                    - General knowledge
                    - Study questions
                    - Project ideas
                    - Daily questions
                    - Any other normal topic

                    If the user asks a simple question, give a simple answer.
                    If the user asks for an explanation, explain with examples.
                    If the user asks for code, provide correct code.

                    Do not say that you cannot answer unless the request is
                    genuinely impossible or unsafe.

                    """);

            // Add previous conversation for context
            if (previousMessages != null
                    && !previousMessages.isEmpty()) {

                prompt.append("\nPrevious Conversation:\n");

                for (ChatMessage chat : previousMessages) {

                    prompt.append("User: ")
                            .append(chat.getUserMessage())
                            .append("\n");

                    prompt.append("Assistant: ")
                            .append(chat.getAiResponse())
                            .append("\n\n");
                }
            }

            // Add current question
            prompt.append("\nCurrent User Question:\n");
            prompt.append(message);

            // Send question to Gemini
            GenerateContentResponse response =
                    client.models.generateContent(
                            "gemini-3.6-flash",
                            prompt.toString(),
                            null
                    );

            // Get Gemini's answer
            String answer = response.text();

            // Check empty response
            if (answer == null || answer.isBlank()) {
                return "Sorry, Gemini did not return an answer.";
            }

            return answer;

        } catch (Exception e) {

            e.printStackTrace();

            // Show actual Gemini error
            return "Gemini Error: " + e.getMessage();
        }
    }
}