package com.example.backend;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final AIService aiService;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatConversationRepository chatConversationRepository;

    public ChatController(
            AIService aiService,
            ChatMessageRepository chatMessageRepository,
            ChatConversationRepository chatConversationRepository) {

        this.aiService = aiService;
        this.chatMessageRepository = chatMessageRepository;
        this.chatConversationRepository = chatConversationRepository;
    }


    // ==========================================
    // TEST API
    // ==========================================

    @GetMapping
    public String test() {
        return "Chat API is working!";
    }


    // ==========================================
    // CREATE NEW CONVERSATION
    // ==========================================

    @GetMapping("/new")
    public ChatConversation createNewConversation() {

        String id =
                UUID.randomUUID().toString();

        ChatConversation conversation =
                new ChatConversation(
                        id,
                        "New Chat"
                );

        return chatConversationRepository
                .save(conversation);
    }


    // ==========================================
    // SEND MESSAGE
    // ==========================================

    @PostMapping
    public ChatMessage sendMessage(
            @RequestParam String conversationId,
            @RequestBody String message) {

        ChatConversation conversation =
                chatConversationRepository
                        .findById(conversationId)
                        .orElseGet(() -> {

                            ChatConversation newChat =
                                    new ChatConversation(
                                            conversationId,
                                            "New Chat"
                                    );

                            return chatConversationRepository
                                    .save(newChat);
                        });


        List<ChatMessage> previousMessages =
                chatMessageRepository
                        .findByConversationId(
                                conversationId
                        );


        String aiResponse =
                aiService.getAIResponse(
                        message,
                        previousMessages
                );


        ChatMessage chatMessage =
                new ChatMessage(
                        conversationId,
                        message,
                        aiResponse
                );


        ChatMessage saved =
                chatMessageRepository
                        .save(chatMessage);


        conversation.setUpdatedAt(
                LocalDateTime.now()
        );


        // First question becomes chat title
        if (
                conversation.getTitle()
                        .equals("New Chat")
        ) {

            String title =
                    message.trim();

            if (title.length() > 35) {

                title =
                        title.substring(0, 35)
                                + "...";
            }

            conversation.setTitle(title);
        }


        chatConversationRepository
                .save(conversation);


        return saved;
    }


    // ==========================================
    // GET CHAT HISTORY
    // ==========================================

    @GetMapping("/history")
    public List<ChatMessage> getHistory(
            @RequestParam String conversationId) {

        return chatMessageRepository
                .findByConversationId(
                        conversationId
                );
    }


    // ==========================================
    // GET ALL CONVERSATIONS
    // ==========================================

    @GetMapping("/conversations")
    public List<ChatConversation> getConversations() {

        return chatConversationRepository
                .findAllByOrderByUpdatedAtDesc();
    }


    // ==========================================
    // CLEAR CHAT MESSAGES
    // ==========================================

    @DeleteMapping("/history")
    public String clearHistory(
            @RequestParam String conversationId) {

        chatMessageRepository
                .deleteByConversationId(
                        conversationId
                );

        return "History cleared";
    }


    // ==========================================
    // DELETE COMPLETE CONVERSATION
    // ==========================================

    @DeleteMapping("/conversation")
    public String deleteConversation(
            @RequestParam String conversationId) {

        try {

            // First delete all messages
            chatMessageRepository
                    .deleteByConversationId(
                            conversationId
                    );


            // Then delete conversation
            if (
                    chatConversationRepository
                            .existsById(conversationId)
            ) {

                chatConversationRepository
                        .deleteById(conversationId);
            }


            return "Conversation deleted successfully";


        } catch (Exception e) {

            e.printStackTrace();

            throw new RuntimeException(
                    "Could not delete conversation: "
                            + e.getMessage()
            );
        }
    }
}