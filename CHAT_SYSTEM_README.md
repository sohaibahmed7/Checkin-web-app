# Neighborhood-Specific Chat System Implementation

## Overview

This document describes the complete rework of the chat system as specified in the Jira ticket. The new system implements neighborhood-specific communication with three predefined chat rooms and strict access controls.

## Features Implemented

### ✅ Core Requirements Met

1. **Complete Rework**: The existing chat implementation has been entirely discarded and rebuilt from scratch
2. **Neighborhood-Specific Chats**: All chatrooms are tied to specific neighborhoods
3. **Three Predefined Rooms per Neighborhood**:
   - **General Discussion**: Open communication for all users
   - **Moderator Alerts**: One-way communication from moderators to all users
   - **Security Alerts**: One-way communication from security company to all users
4. **Role-Based Access Control**:
   - Regular users can only send to General Discussion
   - Moderators can send to General Discussion and Moderator Alerts
   - Security company users can send to General Discussion and Security Alerts
5. **No Direct Messages**: Users cannot send private messages
6. **No Custom Group Creation**: Users cannot create new chat rooms

### ✅ Technical Implementation

#### Backend (Node.js/Express + Socket.IO)

**New MongoDB Schemas:**
```javascript
// ChatRoom Schema
const chatRoomSchema = new mongoose.Schema({
  neighborhoodId: { type: mongoose.Schema.Types.ObjectId, ref: "Neighborhood", required: true },
  roomType: { 
    type: String, 
    enum: ["general_discussion", "moderator_alerts", "security_alerts"], 
    required: true 
  },
  name: { type: String, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// ChatMessage Schema
const chatMessageSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  senderName: { type: String, required: true },
  message: { type: String, required: true },
  messageType: { 
    type: String, 
    enum: ["text", "alert"], 
    default: "text" 
  },
  createdAt: { type: Date, default: Date.now }
});
```

**Updated User Schema:**
```javascript
// Added security_company role
const userSchema = new mongoose.Schema({
  // ... existing fields ...
  is_moderator: { type: Boolean, default: false },
  is_security_company: { type: Boolean, default: false }, // NEW
  // ... rest of fields ...
});
```

**API Endpoints:**
- `GET /api/chat/rooms/:neighborhoodId` - Get chat rooms for a neighborhood
- `GET /api/chat/messages/:roomId` - Get messages for a specific room
- `POST /api/chat/messages` - Send a message to a room

**Socket.IO Events:**
- `joinRoom` - Join a chat room
- `sendMessage` - Send a message
- `leaveRoom` - Leave a chat room
- `newMessage` - Receive new messages
- `roomJoined` - Confirm room joined
- `error` - Handle errors

#### Frontend (JavaScript)

**New chat.js Implementation:**
- Neighborhood-specific room loading
- Role-based permission checking
- Real-time messaging via Socket.IO
- Read-only UI for restricted rooms
- Message persistence and history

**Key Functions:**
```javascript
// Check user permissions for a room
function canUserSendToRoom(room) {
  switch (room.roomType) {
    case 'general_discussion': return true;
    case 'moderator_alerts': return currentUser.is_moderator;
    case 'security_alerts': return currentUser.is_security_company;
    default: return false;
  }
}

// Switch between chat rooms
async function switchToRoom(room) {
  // Leave current room, join new room, load messages
}

// Send messages with permission checking
async function sendMessage() {
  // Validate permissions, send via Socket.IO and REST API
}
```

## Database Design

### Efficient Querying
- Indexed on `roomId` and `createdAt` for fast message retrieval
- Unique index on `neighborhoodId` + `roomType` to prevent duplicate rooms
- Populated sender information for efficient display

### Data Relationships
```
Neighborhood (1) → (Many) ChatRoom (1) → (Many) ChatMessage
User (1) → (Many) ChatMessage
```

## Security & Access Control

### Neighborhood Isolation
- Users can only access rooms in their assigned neighborhood
- Server-side validation prevents cross-neighborhood access

### Role-Based Permissions
- **Regular Users**: Can only send to General Discussion
- **Moderators**: Can send to General Discussion + Moderator Alerts
- **Security Company**: Can send to General Discussion + Security Alerts

### Real-Time Validation
- Socket.IO events validate permissions before broadcasting
- REST API endpoints validate permissions before saving

## UI/UX Features

### Visual Indicators
- Read-only rooms show "Read Only" indicator
- Alert messages have distinct styling
- Disabled input fields for restricted rooms

### Real-Time Updates
- Instant message display via Socket.IO
- Live chat preview updates
- Connection status indicators

### Responsive Design
- Mobile-friendly chat interface
- Adaptive message layout
- Touch-friendly controls

## Testing

### Backend Testing
1. **API Endpoints**: Test all chat endpoints with valid/invalid data
2. **Socket.IO**: Test real-time messaging and room management
3. **Permissions**: Test role-based access control
4. **Database**: Test message persistence and retrieval

### Frontend Testing
1. **Room Loading**: Verify three rooms display for neighborhood
2. **Permissions**: Test read-only vs. writable rooms
3. **Real-Time**: Test instant message updates
4. **Error Handling**: Test connection failures and validation

## Deployment

### Backend Deployment
```bash
cd backend/functions
npm install
firebase deploy --only functions
```

### Frontend Integration
- Updated `config.js` with Socket.IO endpoint
- New `chat.js` replaces old implementation
- Updated CSS for new UI elements

## Configuration

### Environment Variables
```env
MONGODB_URI=your_mongodb_connection_string
ALLOWED_ORIGINS=http://localhost:8000,https://yourdomain.com
```

### Socket.IO Configuration
```javascript
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

## Monitoring & Logging

### Backend Logs
- Connection events logged
- Permission violations logged
- Error handling with detailed messages

### Frontend Logs
- Socket connection status
- API call results
- User permission checks

## Future Enhancements

### Out of Scope (as specified)
- Message editing/deletion
- File attachments
- Typing indicators
- Read receipts
- Push notifications

### Potential Future Features
- Message reactions
- Message threading
- Advanced search
- Message export
- Chat analytics

## Troubleshooting

### Common Issues

1. **Socket Connection Failed**
   - Check CORS configuration
   - Verify Socket.IO endpoint URL
   - Check network connectivity

2. **Permission Denied**
   - Verify user roles in database
   - Check neighborhood assignment
   - Validate room type permissions

3. **Messages Not Loading**
   - Check MongoDB connection
   - Verify room ID exists
   - Check API endpoint responses

### Debug Commands
```javascript
// Check user permissions
console.log('User:', currentUser);
console.log('Can send to room:', canUserSendToRoom(currentRoom));

// Check Socket.IO connection
console.log('Socket connected:', socket.connected);

// Check room data
console.log('Current room:', currentRoom);
console.log('Chat rooms:', chatRooms);
```

## Acceptance Criteria Verification

✅ **Users can log in and access a chat page**
- Chat system initializes on dashboard load

✅ **Chat page displays three rooms for user's neighborhood**
- Dynamic room loading based on neighborhood
- Three predefined rooms created automatically

✅ **Users can send/receive messages in General Discussion**
- Real-time messaging via Socket.IO
- Message persistence in MongoDB

✅ **Moderators can send to Moderator Alerts, all can read**
- Role-based permission checking
- Read-only UI for non-moderators

✅ **Security company can send to Security Alerts, all can read**
- Security company role validation
- Restricted access for regular users

✅ **Regular users cannot send to alert channels**
- Server-side permission validation
- Client-side UI restrictions

✅ **No DM or custom group creation functionality**
- Removed all DM-related code
- No UI for creating new groups

✅ **Messages persisted in MongoDB**
- All messages saved to database
- Message history loaded on room entry

## Conclusion

The new chat system successfully implements all requirements from the Jira ticket. The system provides:

- **Robust real-time communication** via Socket.IO
- **Strict access controls** based on user roles
- **Neighborhood-specific chat rooms** with automatic creation
- **Persistent message storage** in MongoDB
- **Clean, modern UI** with proper permission indicators

The implementation is production-ready and can be deployed immediately. 