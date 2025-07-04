const socket = io(config.SOCKET_URL); // Connect to your Node.js server
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const attachButton = document.querySelector('.attach-button');
const emojiButton = document.querySelector('.emoji-button');

// Add a variable to keep track of the current active chat room
let currentRoom = 'community-chat'; // Default to community chat
const chatHeader = document.querySelector('.chat-main-panel .chat-header');

// Create a hidden file input element
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

// Get the current user's information from localStorage or your auth system
// *** IMPORTANT: Replace this with your actual authentication logic. ***
// For demonstration, we'll use a placeholder or data from localStorage if available.
const currentUser = JSON.parse(localStorage.getItem('user')) || { name: 'Guest' };

// Emoji Picker setup
const emojiPickerHtml = `
    <div class="emoji-picker">
        <div class="emoji-picker-header">
            <span>Quick Reactions</span>
            <button class="close-emoji-picker">&times;</button>
        </div>
        <div class="emoji-grid">
            <span>&#128077;</span><span>&#128079;</span><span>&#128150;</span><span>&#128512;</span>
            <span>&#128514;</span><span>&#128525;</span><span>&#128545;</span><span>&#129315;</span>
            <span>&#129321;</span><span>&#129303;</span><span>&#128064;</span><span>&#128169;</span>
            <span>&#128680;</span><span>&#128736;</span><span>&#129505;</span><span>&#128170;</span>
            <!-- Add more emojis as needed -->
        </div>
    </div>
`;
document.querySelector('.chat-main-panel').insertAdjacentHTML('beforeend', emojiPickerHtml);
const emojiPicker = document.querySelector('.emoji-picker');
const closeEmojiPickerButton = document.querySelector('.close-emoji-picker');

// Fetch chat history when page loads (or when room changes)
async function fetchChatHistory(room) {
    try {
        messagesContainer.innerHTML = '<div class="loading">Loading messages...</div>';
        const response = await fetch(config.getApiUrl(`${config.API_ENDPOINTS.CHAT}/messages?room=${room}`));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const messages = await response.json();
        messagesContainer.innerHTML = ''; // Clear loading message
        messages.forEach(msg => displayMessage(msg));
        scrollToBottom();
    } catch (error) {
        console.error('Error fetching chat history:', error);
        messagesContainer.innerHTML = '<div class="loading">Error loading messages. Please refresh the page.</div>';
    }
}

// Initial fetch for the default room
fetchChatHistory(currentRoom);

// Add at the top or near sendMessage:
let lastSentMessage = null;

// Handle sending messages
function sendMessage(filePath = null) {
    const message = messageInput.value.trim();
    if (message || filePath) {
        const msgObj = {
            username: currentUser.name,
            message: message,
            room: currentRoom,
            filePath: filePath
        };
        socket.emit('chat message', msgObj);
        messageInput.value = '';

        // Optimistically display the message immediately
        displayMessage({
            ...msgObj,
            createdAt: new Date().toISOString()
        });
        scrollToBottom();

        // Store last sent message for deduplication
        lastSentMessage = {
            message: msgObj.message,
            room: msgObj.room,
            filePath: msgObj.filePath
        };

        // Update the chat preview in the sidebar
        const previewContent = filePath ? `[File] ${message}`.trim() : message;
        updateChatPreview(currentRoom, `${currentUser.name}: ${previewContent}`);
    }
}

sendButton.addEventListener('click', () => sendMessage());
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Handle receiving messages
socket.on('chat message', (msg) => {
    // Ignore the echo if it's the same as the last sent message from this user
    if (
        msg.username === currentUser.name &&
        lastSentMessage &&
        msg.message === lastSentMessage.message &&
        msg.room === lastSentMessage.room &&
        msg.filePath === lastSentMessage.filePath
    ) {
        // Reset lastSentMessage so only one duplicate is skipped
        lastSentMessage = null;
        return;
    }
    // Otherwise, display the message
        displayMessage(msg);
        scrollToBottom();

    // Update the chat preview in the sidebar regardless of current room
    const previewContent = msg.filePath ? `[File] ${msg.message}`.trim() : msg.message;
    updateChatPreview(msg.room, `${msg.username}: ${previewContent}`);
});

// Display a message in the chat
function displayMessage(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.username === currentUser.name ? 'sent' : 'received'}`;
    
    // Format timestamp to show only hours and minutes with AM/PM
    const timestamp = new Date(msg.timestamp || msg.createdAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    let messageActionsHtml = '';
    if (msg.username === currentUser.name) {
        messageActionsHtml = `
            <div class="message-actions">
                <button class="action-btn undo-send" title="Undo Send">
                    <i class="fas fa-undo"></i>
                </button>
            </div>
        `;
    } else {
        messageActionsHtml = `
            <div class="message-actions">
                <button class="action-btn reply" title="Reply">
                    <i class="fas fa-reply"></i>
                </button>
                <button class="action-btn forward" title="Forward">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        `;
    }
    
    let fileContentHtml = '';
    if (msg.filePath) {
        const fileExtension = msg.filePath.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
            fileContentHtml = `<img src="${msg.filePath}" alt="Attached File" style="max-width: 100%; height: auto; display: block; margin-top: 10px; border-radius: 8px;">`;
        } else {
            fileContentHtml = `<a href="${msg.filePath}" target="_blank" style="display: inline-flex; align-items: center; gap: 5px; margin-top: 10px; padding: 8px 12px; background: rgba(0,0,0,0.1); border-radius: 5px; text-decoration: none; color: inherit;"><i class="fas fa-file-alt"></i> ${msg.filePath.split('/').pop()}</a>`;
        }
    }
    
    let avatarSrc = 'assets/avatar.svg';
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <img src="${avatarSrc}" alt="${msg.username}" onerror="this.onerror=null;this.src='assets/avatar.svg';">
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="username">${msg.username}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-text">
                ${msg.message}
                ${fileContentHtml}
            </div>
        </div>
        ${messageActionsHtml}
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();

    // Attach event listeners for actions
    const undoButton = messageDiv.querySelector('.undo-send');
    if (undoButton) {
        undoButton.addEventListener('click', () => {
            alert(`Undo send: "${msg.message}"`);
            // Implement actual undo logic (e.g., delete from DB, update UI)
        });
    }

    const replyButton = messageDiv.querySelector('.reply');
    if (replyButton) {
        replyButton.addEventListener('click', () => {
            messageInput.value = `@${msg.username} `; // Pre-fill input for reply
            messageInput.focus();
        });
    }

    const forwardButton = messageDiv.querySelector('.forward');
    if (forwardButton) {
        forwardButton.addEventListener('click', () => {
            alert(`Forward: "${msg.message}"`);
            // Implement actual forward logic
        });
    }
}

// Scroll to bottom of messages
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Toggle emoji picker
emojiButton.addEventListener('click', () => {
    emojiPicker.classList.toggle('active');
});

closeEmojiPickerButton.addEventListener('click', () => {
    emojiPicker.classList.remove('active');
});

// Insert emoji into input
emojiPicker.querySelectorAll('.emoji-grid span').forEach(emojiSpan => {
    emojiSpan.addEventListener('click', (e) => {
        messageInput.value += e.target.textContent;
        messageInput.focus();
        emojiPicker.classList.remove('active'); // Hide after selection
    });
});

// Handle file attachment
attachButton.addEventListener('click', () => {
    console.log('Attach button clicked, triggering file input.');
    fileInput.click(); // Trigger the hidden file input
});

fileInput.addEventListener('change', async (e) => {
    console.log('File input change event triggered.');
    const file = e.target.files[0];
    if (file) {
        console.log('File selected:', file);
        const formData = new FormData();
        formData.append('chatFile', file); // 'chatFile' must match the name in upload.single('chatFile')
        console.log('FormData created:', formData);

        try {
            console.log('Attempting to upload file to /api/chat/upload...');
            const response = await fetch(config.getApiUrl(`${config.API_ENDPOINTS.CHAT}/upload`), {
                method: 'POST',
                body: formData
            });

            console.log('File upload response status:', response.status);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('File uploaded successfully. Server response data:', data);
            console.log('File path received from server:', data.filePath);

            // Send the chat message with the file path
            sendMessage(data.filePath);

        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file. Please try again.');
        }
    } else {
        console.log('No file selected.');
    }
    fileInput.value = ''; // Clear the input so the same file can be selected again
});

// Close emoji picker if clicked outside
document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && !emojiButton.contains(e.target) && emojiPicker.classList.contains('active')) {
        emojiPicker.classList.remove('active');
    }
});

// Handle connection events
socket.on('connect', () => {
    console.log('Socket connected successfully');
});

socket.on('disconnect', () => {
    console.log('Socket disconnected');
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

// Function to update the chat preview in the sidebar
function updateChatPreview(chatId, latestMessage) {
    const chatItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
    if (chatItem) {
        const previewElement = chatItem.querySelector('.chat-item-preview');
        const timeElement = chatItem.querySelector('.chat-item-time');
        if (previewElement) {
            previewElement.textContent = latestMessage;
        }
        if (timeElement) {
            timeElement.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }
}

// Initial update for chat previews on page load and handle room switching
document.addEventListener('DOMContentLoaded', () => {
    // Set initial chat header text
    const initialChatItem = document.querySelector(`.chat-item[data-chat-id="${currentRoom}"] .chat-item-name`);
    if (initialChatItem) {
        chatHeader.textContent = initialChatItem.textContent;
    }

    // Fetch initial chat history for the default room
    fetchChatHistory(currentRoom);

    // Fetch and update preview for all chat items on load (optional, but good for consistency)
    // In a real app, you'd typically fetch the last message for each chat from the server.
    // For now, we'll just fetch the last message of the default room.
    fetch(config.getApiUrl(`${config.API_ENDPOINTS.CHAT}/messages?room=community-chat&limit=1`))
        .then(response => response.json())
        .then(messages => {
            if (messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                const previewContent = lastMsg.filePath ? `[File] ${lastMsg.message}`.trim() : lastMsg.message;
                updateChatPreview('community-chat', `${lastMsg.username}: ${previewContent}`);
            }
        })
        .catch(error => console.error('Error fetching initial community-chat preview:', error));
});

// Handle chat item clicks for room switching
document.querySelectorAll('.chat-item').forEach(item => {
    item.addEventListener('click', function() {
        const newRoom = this.dataset.chatId;
        switchRoom(newRoom);
            // Update UI to show active room
            document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
    });
});

// Room switching logic
function switchRoom(newRoom) {
    if (currentRoom !== newRoom) {
        currentRoom = newRoom;
        socket.emit('joinRoom', currentRoom);
        messagesContainer.innerHTML = '';
        fetchChatHistory(currentRoom);
            // Update chat header
            if (chatHeader) {
            let headerText = '';
            switch (currentRoom) {
                case 'community-chat':
                    headerText = 'Community Chat';
                    break;
                case 'neighborhood-1':
                    headerText = 'Neighborhood 1';
                    break;
                case 'neighborhood-2':
                    headerText = 'Neighborhood 2';
                    break;
                case 'watch':
                    headerText = 'Neighborhood Watch';
                    break;
                case 'safety':
                    headerText = 'Safety Committee';
                    break;
                case 'events':
                    headerText = 'Community Events';
                    break;
                default:
                    headerText = currentRoom;
        }
            chatHeader.textContent = headerText;
        }
    }
}