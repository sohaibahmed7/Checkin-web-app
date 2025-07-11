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
import { db } from './firebase.js';
import { collection, addDoc, query, orderBy, onSnapshot, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

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
        
        // Load chat rooms for the neighborhood
        await loadChatRooms();
        
        // Set up chat room UI
        setupChatRoomUI();
        
        // Join the first room (General Discussion)
        if (chatRooms.length > 0) {
            await switchToRoom(chatRooms[0]);
        }
        
    } catch (error) {
        console.error('Error initializing chat:', error);
        showError('Failed to initialize chat system');
    }
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
                { roomType: 'general_discussion', name: 'General Discussion', description: 'Open communication for all users' },
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
    
    chatItem.innerHTML = `
        <div class="chat-item-avatar">
            <img src="assets/avatar.svg" alt="${room.name}">
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
function displayMessage(message) {
    // Determine sender info
    let senderName = '';
    let senderAvatar = config.DEFAULT_AVATAR;
    let senderId = '';

    if (message.senderId && typeof message.senderId === 'object') {
        // Populated senderId from backend or optimistic send
        senderName = message.senderId.firstName && message.senderId.lastName
            ? `${message.senderId.firstName} ${message.senderId.lastName}`
            : (message.senderId.name || message.senderName || 'Unknown');
        senderAvatar = message.senderId.profile_picture_url || config.DEFAULT_AVATAR;
        senderId = message.senderId._id || message.senderId.id || '';
    } else if (typeof message.senderId === 'string') {
        // Only userId, need to fetch profile
        senderId = message.senderId;
        if (userProfileCache[senderId]) {
            senderName = userProfileCache[senderId].name;
            senderAvatar = userProfileCache[senderId].profile_picture_url || config.DEFAULT_AVATAR;
        } else {
            // Fetch from backend API (MongoDB) or Firestore users collection
            fetchUserProfile(senderId).then(profile => {
                userProfileCache[senderId] = profile;
                // Re-render this message with profile info
                displayMessage({ ...message, senderId: profile });
            });
            senderName = message.senderName || 'Unknown';
        }
    } else {
        senderName = message.senderName || 'Unknown';
    }

    // Compare senderId robustly
    const isSentByMe = String(senderId) === String(currentUser._id);

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
        <div class="message-avatar">
            <img src="${senderAvatar}" alt="${senderName}" onerror="this.onerror=null;this.src='assets/avatar.svg';">
        </div>
        <div class="message-content ${messageClass}">
            <div class="message-header">
                <span class="username">${senderName}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-text">
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
    } else {
        messageInput.disabled = true;
        messageInput.placeholder = 'Read only - You cannot send messages to this room';
        sendButton.disabled = true;
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
        // Optimistically display
        const optimisticMessage = {
            senderId: {
                _id: currentUser._id,
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
                profile_picture_url: currentUser.profile_picture_url || config.DEFAULT_AVATAR
            },
            senderName: currentUser.name,
            message: message,
            messageType: currentRoom.roomType.includes('alerts') ? 'alert' : 'text',
            createdAt: new Date().toISOString()
        };
        displayMessage(optimisticMessage);
        messageInput.value = '';
        // Firestore write
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