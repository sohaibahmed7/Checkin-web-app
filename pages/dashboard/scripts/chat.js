// Chat System Implementation
// Neighborhood-specific chat with three predefined rooms:
// 1. General Discussion - All users can send/receive
// 2. Moderator Alerts - Only moderators can send, all can receive
// 3. Security Alerts - Only security company can send, all can receive

// Global variables
let currentUser = null;
let currentNeighborhood = null;
let currentRoom = null;
let chatRooms = [];

// DOM elements
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatHeader = document.querySelector('.chat-main-panel .chat-header');
const chatSidebar = document.querySelector('.chat-list');

// Import db from firebase.js.
import { db, storage } from './firebase.js';
import { collection, addDoc, query, orderBy, onSnapshot, getDocs, doc, getDoc, limit } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js';

// Initialize chat system
async function initializeChat() {
    try {
        // Get current user from localStorage
        const userData = localStorage.getItem('user');
        if (!userData) {
            console.error('No user data found');
            return;
        }
        currentUser = JSON.parse(userData);

        // Get user's neighborhood
        const neighborhoodResponse = await fetch(config.getApiUrl(`/api/user/neighborhood/${currentUser._id}`));
        if (!neighborhoodResponse.ok) {
            throw new Error('Failed to fetch neighborhood');
        }
        currentNeighborhood = await neighborhoodResponse.json();

        // Load chat rooms and listen for unread messages
        await loadChatRooms();
        await listenForUnreadMessages();

        setupChatRoomUI();
        showChatWelcomePanel();
    } catch (error) {
        console.error('Error initializing chat:', error);
        showError('Failed to initialize chat system');
    }
}

// Show a welcome/info panel in the chat main area
function showChatWelcomePanel() {
    if (!messagesContainer) return;
    messagesContainer.innerHTML = `
        <div class="chat-welcome-panel" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:1.5rem;">
            <div style="font-size:2.5rem;margin-bottom:1rem;">👋🏼</div>
            <h2 style="margin-bottom:0.5rem;">Welcome to Neighborhood Chat</h2>
            <p style="color:#666;margin-bottom:1.5rem;">Select a chatroom from the sidebar to get started.</p>
            <ul style="color:#888;text-align:left;max-width:350px;">
                <li><b>General Discussion</b>: Chat with your neighbors</li>
                <li><b>Moderator Alerts</b>: Messages from moderators</li>
                <li><b>Security Alerts</b>: Security company updates & alerts</li>
            </ul>
        </div>
    `;
}

// Load chat rooms for the current neighborhood from Firestore
async function loadChatRooms() {
    try {
        // Firestore: /neighborhoods/{neighborhoodId}/rooms
        const roomsCol = collection(db, 'neighborhoods', currentNeighborhood._id, 'rooms');
        const q = query(roomsCol, orderBy('roomType'));
        const snapshot = await getDocs(q);
        chatRooms = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        // If rooms don't exist, create them (one-time setup)
        if (chatRooms.length === 0) {
            const defaultRooms = [
                { roomType: 'general_discussion', name: 'General Discussion', description: 'Open communication for all neighbors' },
                { roomType: 'moderator_alerts', name: 'Moderator Alerts', description: 'One-way communication from moderators' },
                { roomType: 'security_alerts', name: 'Security Alerts', description: 'One-way communication from security company' }
            ];
            for (const room of defaultRooms) {
                await addDoc(roomsCol, room);
            }
            // Re-fetch
            const snapshot2 = await getDocs(q);
            chatRooms = snapshot2.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        }
        console.log('Loaded chat rooms:', chatRooms);
    } catch (error) {
        console.error('Error loading chat rooms:', error);
        throw error;
    }
}

// Set up the chat room UI in the sidebar
function setupChatRoomUI() {
    if (!chatSidebar) {
        console.error('Chat sidebar not found');
        return;
    }

    // Clear the entire sidebar content (including loading spinner)
    chatSidebar.innerHTML = '';

    // Create chat room items
    chatRooms.forEach(room => {
        const chatItem = createChatRoomItem(room);
        chatSidebar.appendChild(chatItem);
    });
}

// Create a chat room item for the sidebar
function createChatRoomItem(room) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.dataset.roomId = room._id;
    chatItem.dataset.roomType = room.roomType;
    
    // Determine if user can send messages to this room
    const canSend = canUserSendToRoom(room);

    // Choose icon based on room type
    let iconClass = "fas fa-comments";
    if (room.roomType === "general_discussion") iconClass = "fas fa-comments";
    else if (room.roomType === "moderator_alerts") iconClass = "fas fa-bullhorn";
    else if (room.roomType === "security_alerts") iconClass = "fas fa-shield-alt";

    chatItem.innerHTML = `
        <div class="chat-item-icon">
            <i class="${iconClass}" style="font-size:2rem;" data-chat-icon></i>
        </div>
        <div class="chat-item-content">
            <div class="chat-item-header">
                <span class="chat-item-name">${room.name}</span>
                <span class="chat-item-time"></span>
            </div>
            <div class="chat-item-preview">${room.description}</div>
            ${!canSend ? '<div class="chat-item-readonly">Read Only</div>' : ''}
    </div>
`;
    
    // Add click event
    chatItem.addEventListener('click', () => switchToRoom(room));
    
    return chatItem;
}

// Check if current user can send messages to a specific room
function canUserSendToRoom(room) {
    switch (room.roomType) {
        case 'general_discussion':
            return true; // All users can send
        case 'moderator_alerts':
            return currentUser.is_moderator; // Only moderators can send
        case 'security_alerts':
            return currentUser.is_security_company; // Only security company can send
        default:
            return false;
    }
}

// Switch to a different chat room
async function switchToRoom(room) {
    try {
        // Update current room
        currentRoom = room;
        
        // Update UI to show selected room
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedItem = document.querySelector(`[data-room-id="${room._id}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
        
        // Update chat header
        if (chatHeader) {
            chatHeader.textContent = room.name;
        }
        
        // Clear messages container
        messagesContainer.innerHTML = '<div class="loading">Loading messages...</div>';
        
        // Load messages for this room
        await loadMessages(room._id);
        
        // Update message input based on permissions
        updateMessageInput();
        
    } catch (error) {
        console.error('Error switching to room:', error);
        showError('Failed to switch to room');
    }
}

// Listen for messages in the current room
let unsubscribeMessages = null;
async function loadMessages(roomId) {
    if (unsubscribeMessages) unsubscribeMessages();
    messagesContainer.innerHTML = '<div class="loading">Loading messages...</div>';
    try {
        const messagesCol = collection(db, 'neighborhoods', currentNeighborhood._id, 'rooms', roomId, 'messages');
        const q = query(messagesCol, orderBy('createdAt'));
        unsubscribeMessages = onSnapshot(q, async (snapshot) => {
            messagesContainer.innerHTML = '';
            snapshot.forEach(docSnap => {
                const msg = docSnap.data();
                // Optionally fetch sender info from MongoDB if needed
                displayMessage({ ...msg, _id: docSnap.id });
            });
            scrollToBottom();
        });
    } catch (error) {
        console.error('Error loading messages:', error);
        messagesContainer.innerHTML = '<div class="error">Failed to load messages</div>';
    }
}

// Display a message in the chat
async function displayMessage(message) {
    // Determine sender info
    let senderName = '';
    let senderAvatar = config.DEFAULT_AVATAR;
    let senderId = '';

    if (message.senderId && typeof message.senderId === 'object') {
        senderName = message.senderId.firstName && message.senderId.lastName
            ? `${message.senderId.firstName} ${message.senderId.lastName}`
            : (message.senderId.name || message.senderName || 'Unknown');
        senderId = message.senderId._id || message.senderId.id || '';
    } else if (typeof message.senderId === 'string') {
        senderId = message.senderId;
        senderName = message.senderName || 'Unknown';
    } else {
        senderName = message.senderName || 'Unknown';
    }

    // Compare senderId robustly
    const isSentByMe = String(senderId) === String(currentUser._id);

    // For received messages, use config.getUserAvatarUrl(senderId)
    if (!isSentByMe && senderId) {
        senderAvatar = config.getUserAvatarUrl(senderId);
    }

    // Format timestamp
    let dateObj = message.createdAt;
    if (dateObj && typeof dateObj.toDate === 'function') {
        dateObj = dateObj.toDate();
    } else if (typeof dateObj === 'string' || typeof dateObj === 'number') {
        dateObj = new Date(dateObj);
    }
    const timestamp = dateObj && !isNaN(dateObj) ? dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }) : '';

    // Determine message styling based on type
    const messageClass = message.messageType === 'alert' ? 'alert-message' : '';

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSentByMe ? 'sent' : 'received'}`;
    messageDiv.innerHTML = `
        ${!isSentByMe ? `<div class="message-avatar"><img src="${senderAvatar}" alt="${senderName}" onerror="this.onerror=null;this.src='assets/avatar.svg';"></div>` : ''}
        <div class="message-content ${messageClass}">
            <div class="message-header">
                <span class="username">${isSentByMe ? 'Me' : senderName}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-text">
                ${message.imageUrl ? `<img src="${message.imageUrl}" alt="Image" class="chat-image-message" style="max-width: 320px; max-height: 320px; border-radius: 10px; margin-bottom: 0.5em; display: block;">` : ''}
                ${message.message}
            </div>
        </div>
    `;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Update message input based on user permissions
function updateMessageInput() {
    if (!currentRoom) return;
    const canSend = canUserSendToRoom(currentRoom);
    if (canSend) {
        messageInput.disabled = false;
        messageInput.placeholder = 'Type a message...';
        sendButton.disabled = false;
        if (attachButton) attachButton.disabled = false;
    } else {
        messageInput.disabled = true;
        messageInput.placeholder = 'Read only - You cannot send messages to this room';
        sendButton.disabled = true;
        if (attachButton) attachButton.disabled = true;
    }
}

// Send a message to Firestore
async function sendMessage() {
    if (!currentRoom || !currentUser) return;
    const message = messageInput.value.trim();
    if (!message) return;
    if (!canUserSendToRoom(currentRoom)) {
        showError('You do not have permission to send messages to this room');
        return;
    }
    try {
        // No optimistic display! Only clear input and write to Firestore
        messageInput.value = '';
        const messagesCol = collection(db, 'neighborhoods', currentNeighborhood._id, 'rooms', currentRoom._id, 'messages');
        await addDoc(messagesCol, {
            senderId: currentUser._id,
            senderName: currentUser.name,
            message: message,
            messageType: currentRoom.roomType.includes('alerts') ? 'alert' : 'text',
            createdAt: new Date()
        });
        } catch (error) {
        console.error('Error sending message:', error);
        showError('Failed to send message');
    }
}

// Update chat preview in sidebar
function updateChatPreview(roomId, latestMessage) {
    const chatItem = document.querySelector(`[data-room-id="${roomId}"]`);
    if (chatItem) {
        const previewElement = chatItem.querySelector('.chat-item-preview');
        const timeElement = chatItem.querySelector('.chat-item-time');
        
        if (previewElement) {
            previewElement.textContent = latestMessage;
        }
        
        if (timeElement) {
            timeElement.textContent = new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    }
}

// Scroll to bottom of messages
function scrollToBottom() {
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Show error message
function showError(message) {
    console.error(message);
    // You can implement a toast notification system here
    alert(message);
}

// Event listeners
if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

if (sendButton) {
    sendButton.addEventListener('click', sendMessage);
}

// File/image upload logic
const attachButton = document.querySelector('.attach-button');
const imageInput = document.getElementById('chat-image-input');

if (attachButton && imageInput) {
    attachButton.addEventListener('click', () => {
        imageInput.click();
    });
    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!currentRoom || !currentUser) return;
        if (!canUserSendToRoom(currentRoom)) {
            showError('You do not have permission to send images to this room');
            return;
        }
        try {
            // Convert file to base64
            const file_base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            // Upload to backend
            const response = await fetch(config.getApiUrl('/api/chat/upload'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_base64,
                    userId: currentUser._id,
                    neighborhoodId: currentNeighborhood._id,
                    roomId: currentRoom._id,
                    fileName: file.name
                })
            });
            if (!response.ok) throw new Error('Failed to upload image');
            const data = await response.json();
            const imageUrl = data.url;
            // Send image message to Firestore
            const messagesCol = collection(db, 'neighborhoods', currentNeighborhood._id, 'rooms', currentRoom._id, 'messages');
            await addDoc(messagesCol, {
                senderId: currentUser._id,
                senderName: currentUser.name,
                imageUrl,
                message: '',
                messageType: 'image',
                createdAt: new Date()
            });
            imageInput.value = '';
        } catch (error) {
            console.error('Error uploading image:', error);
            showError('Failed to upload image');
        }
    });
}

// --- Notification Badge Logic ---
const chatSidebarNav = document.querySelector(".sidebar-nav a[data-tab='chat']");
let unreadCounts = {};

function getLastReadTimestamps() {
    return JSON.parse(localStorage.getItem('chatLastReadTimestamps') || '{}');
}
function setLastReadTimestamp(roomId, timestamp) {
    const data = getLastReadTimestamps();
    data[roomId] = timestamp;
    localStorage.setItem('chatLastReadTimestamps', JSON.stringify(data));
}

function updateSidebarBadges() {
    // Main sidebar badge
    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
    let badge = chatSidebarNav.querySelector('.sidebar-badge');
    if (totalUnread > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'sidebar-badge';
            chatSidebarNav.appendChild(badge);
        }
        badge.style.display = 'block';
    } else if (badge) {
        badge.style.display = 'none';
    }
    // Per-room badges
    chatRooms.forEach(room => {
        const chatItem = document.querySelector(`[data-room-id="${room._id}"]`);
        if (!chatItem) return;
        let roomBadge = chatItem.querySelector('.chat-room-badge');
        const count = unreadCounts[room._id] || 0;
        if (count > 0) {
            if (!roomBadge) {
                roomBadge = document.createElement('span');
                roomBadge.className = 'chat-room-badge';
                chatItem.querySelector('.chat-item-icon').appendChild(roomBadge);
            }
            roomBadge.style.display = 'block';
        } else if (roomBadge) {
            roomBadge.style.display = 'none';
        }
    });
}

// Patch loadMessages to update last read timestamp and clear badge
const originalLoadMessages = loadMessages;
loadMessages = async function(roomId) {
    await originalLoadMessages.call(this, roomId);
    // Mark as read
    setLastReadTimestamp(roomId, Date.now());
    unreadCounts[roomId] = 0;
    updateSidebarBadges();
};

// Listen for new messages in all rooms for badge updates
async function listenForUnreadMessages() {
    if (!currentNeighborhood || !chatRooms.length) return;
    const lastRead = getLastReadTimestamps();
    unreadCounts = {};
    chatRooms.forEach(room => {
        const messagesCol = collection(db, 'neighborhoods', currentNeighborhood._id, 'rooms', room._id, 'messages');
        const q = query(messagesCol, orderBy('createdAt', 'desc'), limit(1));
        onSnapshot(q, (snapshot) => {
            snapshot.forEach(docSnap => {
                const msg = docSnap.data();
                // Only count as unread if not sent by me
                let senderId = msg.senderId;
                if (typeof senderId === 'object') senderId = senderId._id || senderId.id;
                if (String(senderId) === String(currentUser._id)) {
                    unreadCounts[room._id] = 0;
                    updateSidebarBadges();
                    return;
                }
                let dateObj = msg.createdAt;
                if (dateObj && typeof dateObj.toDate === 'function') {
                    dateObj = dateObj.toDate();
                } else if (typeof dateObj === 'string' || typeof dateObj === 'number') {
                    dateObj = new Date(dateObj);
                }
                const lastReadTime = lastRead[room._id];
                // If no lastRead timestamp, treat as unread
                if (lastReadTime === undefined) {
                    unreadCounts[room._id] = 1;
                } else if (dateObj && dateObj.getTime() > lastReadTime) {
                    unreadCounts[room._id] = 1;
                } else {
                    unreadCounts[room._id] = 0;
                }
                updateSidebarBadges();
            });
        });
    });
}

// Call after chatRooms are loaded
async function loadChatRoomsAndListen() {
    await loadChatRooms();
    await listenForUnreadMessages();
}
// Remove or comment out the following line to prevent double initialization and null errors:
// initializeChat = loadChatRoomsAndListen;

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeChat();
});

// User profile cache
const userProfileCache = {};

// Helper to fetch user profile from backend or Firestore
async function fetchUserProfile(userId) {
    // Try backend API first
    try {
        const res = await fetch(config.getApiUrl(`/api/user/${userId}`));
        if (res.ok) {
            const user = await res.json();
            return {
                _id: user._id,
                name: user.name,
                profile_picture_url: user.profile_picture_url || config.DEFAULT_AVATAR
            };
        }
    } catch (e) {}
    // Fallback: try Firestore users collection
    try {
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js');
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const data = userDoc.data();
            return {
                _id: userId,
                name: data.name || 'Unknown',
                profile_picture_url: data.profile_picture_url || config.DEFAULT_AVATAR
            };
        }
    } catch (e) {}
    return { _id: userId, name: 'Unknown', profile_picture_url: config.DEFAULT_AVATAR };
}