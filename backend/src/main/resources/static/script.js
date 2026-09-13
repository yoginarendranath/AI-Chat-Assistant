let currentConversationId = null;
let recognition = null;
let isSending = false;

const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");
const newChatBtn = document.getElementById("newChatBtn");
const clearBtn = document.getElementById("clearBtn");
const conversationList = document.getElementById("conversationList");

function showWelcome() {

    chatBox.innerHTML = `
        <div id="welcome" class="welcome">

            <div class="big-logo">
                🤖
            </div>

            <h1>How can I help you?</h1>

            <p>
                Ask me anything and I'll
                do my best to help.
            </p>

            <div class="suggestions">

                <button onclick="useSuggestion('Explain Java')">
                    ☕ Explain Java
                </button>

                <button onclick="useSuggestion('What is Spring Boot?')">
                    🌱 Spring Boot
                </button>

                <button onclick="useSuggestion('Give me project ideas')">
                    💡 Project Ideas
                </button>

                <button onclick="useSuggestion('Teach me SQL')">
                    🗄️ Learn SQL
                </button>

            </div>

        </div>
    `;
}

async function createNewChat() {

    try {

        const response =
            await fetch("/api/chat/new");

        if (!response.ok) {
            throw new Error("Could not create new chat");
        }

        const conversation =
            await response.json();

        currentConversationId =
            conversation.id;

        showWelcome();

        await loadConversations();

        messageInput.focus();

    } catch (error) {

        console.error(
            "New chat error:",
            error
        );

        alert(
            "Unable to create new chat. Make sure the backend is running."
        );
    }
}

async function sendMessage() {

    const message =
        messageInput.value.trim();

    if (!message || isSending) {
        return;
    }

    isSending = true;

    sendBtn.disabled = true;
    messageInput.disabled = true;

    try {

        if (!currentConversationId) {

            const response =
                await fetch("/api/chat/new");

            if (!response.ok) {
                throw new Error(
                    "Could not create conversation"
                );
            }

            const conversation =
                await response.json();

            currentConversationId =
                conversation.id;
        }

        const welcome =
            document.getElementById("welcome");

        if (welcome) {
            welcome.remove();
        }

        addUserMessage(message);

        messageInput.value = "";

        showTypingIndicator();

        const response =
            await fetch(
                `/api/chat?conversationId=${encodeURIComponent(currentConversationId)}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/plain"
                    },
                    body: message
                }
            );

        removeTypingIndicator();

        if (!response.ok) {
            throw new Error(
                `Server returned ${response.status}`
            );
        }

        const data =
            await response.json();

        if (
            data &&
            data.aiResponse &&
            data.aiResponse.trim()
        ) {

            addAIMessage(
                data.aiResponse
            );

        } else {

            addAIMessage(
                "Sorry, I could not generate a response."
            );
        }

        await loadConversations();

        scrollToBottom();

    } catch (error) {

        console.error(
            "Send message error:",
            error
        );

        removeTypingIndicator();

        addAIMessage(
            "Sorry, something went wrong. Please check that the backend, MySQL and Gemini API are running."
        );

    } finally {

        isSending = false;

        sendBtn.disabled = false;
        messageInput.disabled = false;

        messageInput.focus();
    }
}

function addUserMessage(message) {

    const messageDiv =
        document.createElement("div");

    messageDiv.className =
        "message user-message";

    messageDiv.innerHTML = `
        <div class="message-content">

            <div class="message-text">
                ${escapeHtml(message)}
            </div>

        </div>
    `;

    chatBox.appendChild(messageDiv);

    scrollToBottom();
}

function addAIMessage(message) {

    const messageDiv =
        document.createElement("div");

    messageDiv.className =
        "message ai-message";

    const formattedMessage =
        formatAIResponse(message);

    messageDiv.innerHTML = `
        <div class="message-avatar">
            🤖
        </div>

        <div class="message-content">

            <div class="message-text">
                ${formattedMessage}
            </div>

        </div>
    `;

    chatBox.appendChild(messageDiv);

    scrollToBottom();
}

function formatAIResponse(text) {

    if (
        text === null ||
        text === undefined
    ) {
        return "";
    }

    let safeText =
        escapeHtml(String(text));

    safeText =
        safeText.replace(
            /```([\s\S]*?)```/g,
            function(match, code) {

                return `
                    <pre><code>${code.trim()}</code></pre>
                `;
            }
        );

    safeText =
        safeText.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

    safeText =
        safeText.replace(
            /\*(.*?)\*/g,
            "<em>$1</em>"
        );

    safeText =
        safeText.replace(
            /^### (.*)$/gm,
            "<h3>$1</h3>"
        );

    safeText =
        safeText.replace(
            /^## (.*)$/gm,
            "<h2>$1</h2>"
        );

    safeText =
        safeText.replace(
            /^# (.*)$/gm,
            "<h1>$1</h1>"
        );

    safeText =
        safeText.replace(
            /^- (.*)$/gm,
            "<li>$1</li>"
        );

    safeText =
        safeText.replace(
            /((?:<li>.*<\/li>\s*)+)/gs,
            "<ul>$1</ul>"
        );

    safeText =
        safeText.replace(
            /\n/g,
            "<br>"
        );

    safeText =
        safeText.replace(
            /<\/ul><br>/g,
            "</ul>"
        );

    return safeText;
}

function showTypingIndicator() {

    removeTypingIndicator();

    const typing =
        document.createElement("div");

    typing.id =
        "typingIndicator";

    typing.className =
        "message ai-message";

    typing.innerHTML = `
        <div class="message-avatar">
            🤖
        </div>

        <div class="message-content">

            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>

        </div>
    `;

    chatBox.appendChild(typing);

    scrollToBottom();
}

function removeTypingIndicator() {

    const typing =
        document.getElementById(
            "typingIndicator"
        );

    if (typing) {
        typing.remove();
    }
}

async function loadConversations() {

    try {

        const response =
            await fetch(
                "/api/chat/conversations"
            );

        if (!response.ok) {
            throw new Error(
                "Could not load conversations"
            );
        }

        const conversations =
            await response.json();

        conversationList.innerHTML = "";

        if (
            !conversations ||
            conversations.length === 0
        ) {
            return;
        }

        conversations.forEach(
            conversation => {

                createConversationItem(
                    conversation
                );
            }
        );

    } catch (error) {

        console.error(
            "Conversation loading error:",
            error
        );
    }
}

function createConversationItem(conversation) {

    const item =
        document.createElement("div");

    item.className =
        "conversation-item";

    if (
        conversation.id ===
        currentConversationId
    ) {

        item.classList.add(
            "active"
        );
    }

    const title =
        conversation.title &&
        conversation.title.trim()
            ? conversation.title
            : "New Chat";

    item.innerHTML = `
        <div class="conversation-main">

            <div class="conversation-icon">
                💬
            </div>

            <div class="conversation-title">
                ${escapeHtml(title)}
            </div>

        </div>

        <button
            type="button"
            class="conversation-menu"
            title="More options"
            aria-label="More options">
            ⋮
        </button>

        <div class="conversation-options">

            <button
                type="button"
                class="delete-conversation">
                🗑️ Delete
            </button>

        </div>
    `;

    const main =
        item.querySelector(
            ".conversation-main"
        );

    const menu =
        item.querySelector(
            ".conversation-menu"
        );

    const options =
        item.querySelector(
            ".conversation-options"
        );

    const deleteButton =
        item.querySelector(
            ".delete-conversation"
        );

    main.addEventListener(
        "click",
        function() {

            openConversation(
                conversation.id
            );
        }
    );

    menu.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();

            document
                .querySelectorAll(
                    ".conversation-options.show"
                )
                .forEach(
                    option => {

                        if (
                            option !== options
                        ) {

                            option.classList.remove(
                                "show"
                            );
                        }
                    }
                );

            options.classList.toggle(
                "show"
            );
        }
    );

    options.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();
        }
    );

    deleteButton.addEventListener(
        "click",
        function(event) {

            event.stopPropagation();

            options.classList.remove(
                "show"
            );

            deleteConversation(
                conversation.id
            );
        }
    );

    conversationList.appendChild(
        item
    );
}

async function openConversation(
    conversationId
) {

    try {

        currentConversationId =
            conversationId;

        chatBox.innerHTML = "";

        const response =
            await fetch(
                `/api/chat/history?conversationId=${encodeURIComponent(conversationId)}`
            );

        if (!response.ok) {
            throw new Error(
                "Could not load chat history"
            );
        }

        const messages =
            await response.json();

        if (
            !messages ||
            messages.length === 0
        ) {

            showWelcome();

        } else {

            messages.forEach(
                message => {

                    addUserMessage(
                        message.userMessage
                    );

                    addAIMessage(
                        message.aiResponse
                    );
                }
            );
        }

        await loadConversations();

        scrollToBottom();

    } catch (error) {

        console.error(
            "Open conversation error:",
            error
        );

        chatBox.innerHTML = "";

        addAIMessage(
            "Could not load this conversation."
        );
    }
}

async function deleteConversation(
    conversationId
) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this conversation?"
        );

    if (!confirmed) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/chat/conversation?conversationId=${encodeURIComponent(conversationId)}`,
                {
                    method: "DELETE"
                }
            );

        if (!response.ok) {
            throw new Error(
                "Could not delete conversation"
            );
        }

        if (
            conversationId ===
            currentConversationId
        ) {

            currentConversationId =
                null;

            chatBox.innerHTML = "";

            showWelcome();
        }

        await loadConversations();

    } catch (error) {

        console.error(
            "Delete conversation error:",
            error
        );

        alert(
            "Could not delete conversation."
        );
    }
}

async function clearCurrentHistory() {

    if (!currentConversationId) {

        showWelcome();

        return;
    }

    const confirmed =
        confirm(
            "Clear all messages from this chat?"
        );

    if (!confirmed) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/chat/history?conversationId=${encodeURIComponent(currentConversationId)}`,
                {
                    method: "DELETE"
                }
            );

        if (!response.ok) {
            throw new Error(
                "Could not clear history"
            );
        }

        chatBox.innerHTML = "";

        showWelcome();

        await loadConversations();

    } catch (error) {

        console.error(
            "Clear history error:",
            error
        );

        alert(
            "Could not clear chat history."
        );
    }
}

function useSuggestion(text) {

    messageInput.value =
        text;

    messageInput.focus();

    sendMessage();
}

function setupVoiceRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        voiceBtn.disabled = true;

        voiceBtn.title =
            "Speech recognition is not supported in this browser";

        return;
    }

    recognition =
        new SpeechRecognition();

    recognition.continuous =
        false;

    recognition.interimResults =
        false;

    recognition.lang =
        "en-IN";

    recognition.onstart =
        function() {

            voiceBtn.classList.add(
                "listening"
            );

            voiceBtn.innerHTML =
                "🔴";

            voiceBtn.title =
                "Listening...";
        };

    recognition.onresult =
        function(event) {

            if (
                event.results &&
                event.results.length > 0
            ) {

                const transcript =
                    event
                        .results[0][0]
                        .transcript;

                messageInput.value =
                    transcript;

                messageInput.focus();
            }
        };

    recognition.onerror =
        function(event) {

            console.error(
                "Speech recognition error:",
                event.error
            );

            if (
                event.error ===
                "not-allowed"
            ) {

                alert(
                    "Microphone permission is blocked. Please allow microphone access for localhost."
                );

            } else if (
                event.error ===
                "no-speech"
            ) {

                alert(
                    "No speech detected. Please speak again."
                );

            } else if (
                event.error ===
                "audio-capture"
            ) {

                alert(
                    "Microphone was not detected. Please check your microphone."
                );

            } else if (
                event.error ===
                "network"
            ) {

                alert(
                    "Speech recognition network error. Please check your internet connection."
                );

            } else if (
                event.error ===
                "aborted"
            ) {

                console.log(
                    "Speech recognition stopped."
                );

            } else {

                alert(
                    "Voice recognition error: " +
                    event.error
                );
            }
        };

    recognition.onend =
        function() {

            voiceBtn.classList.remove(
                "listening"
            );

            voiceBtn.innerHTML =
                "🎤";

            voiceBtn.title =
                "Voice input";
        };

    voiceBtn.addEventListener(
        "click",
        function() {

            if (!recognition) {
                return;
            }

            try {

                recognition.start();

            } catch (error) {

                console.error(
                    "Recognition start error:",
                    error
                );
            }
        }
    );
}

function escapeHtml(text) {

    if (
        text === null ||
        text === undefined
    ) {

        return "";
    }

    return String(text)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

function scrollToBottom() {

    chatBox.scrollTop =
        chatBox.scrollHeight;
}

sendBtn.addEventListener(
    "click",
    function() {

        sendMessage();
    }
);

messageInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }
    }
);

newChatBtn.addEventListener(
    "click",
    function() {

        createNewChat();
    }
);

clearBtn.addEventListener(
    "click",
    function() {

        clearCurrentHistory();
    }
);

document.addEventListener(
    "click",
    function(event) {

        if (
            !event.target.closest(
                ".conversation-menu"
            ) &&
            !event.target.closest(
                ".conversation-options"
            )
        ) {

            document
                .querySelectorAll(
                    ".conversation-options.show"
                )
                .forEach(
                    option => {

                        option.classList.remove(
                            "show"
                        );
                    }
                );
        }
    }
);

async function initializeApp() {

    try {

        const response =
            await fetch(
                "/api/chat/conversations"
            );

        if (!response.ok) {
            throw new Error(
                "Could not load conversations"
            );
        }

        const conversations =
            await response.json();

        conversationList.innerHTML =
            "";

        if (
            conversations &&
            conversations.length > 0
        ) {

            conversations.forEach(
                conversation => {

                    createConversationItem(
                        conversation
                    );
                }
            );

            await openConversation(
                conversations[0].id
            );

        } else {

            currentConversationId =
                null;

            showWelcome();
        }

    } catch (error) {

        console.error(
            "Initialization error:",
            error
        );

        currentConversationId =
            null;

        showWelcome();
    }

    messageInput.focus();
}

setupVoiceRecognition();

initializeApp();