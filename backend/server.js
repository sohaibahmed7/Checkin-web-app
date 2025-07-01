const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');

const app = express();

// CORS middleware must be applied before any routes or other middleware
const allowedOrigins = ['http://localhost:8000', 'http://127.0.0.1:8000'];
app.use(cors({
  origin: 'http://localhost:8000',
  credentials: true
}));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = 3000;

// MongoDB connection
mongoose.connect('mongodb+srv://checkin_team123:Checkin2025@cluster0.2doejzi.mongodb.net/checkin?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  message: { type: String, required: true },
  room: { type: String, default: 'general' },
  filePath: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected');

  let currentRoom = 'general'; // Keep track of the room the socket is currently in
  socket.join(currentRoom);

  // Handle joining rooms
  socket.on('joinRoom', (roomName) => {
    if (currentRoom !== roomName) {
      socket.leave(currentRoom);
      socket.join(roomName);
      currentRoom = roomName;
      console.log(`User joined room: ${roomName}`);
      // Optionally, send history of the new room to the user
      // This will be handled by the frontend making a fetch request.
    }
  });

  // Handle chat messages
  socket.on('chat message', async (data) => {
    try {
      const messageRoom = data.room || 'community-chat'; // Default to community-chat if no room specified
      console.log('Received chat message:', { ...data, room: messageRoom });
      
      // Save message to database
      const chatMessage = new ChatMessage({
        username: data.username,
        message: data.message,
        room: messageRoom,
        filePath: data.filePath
      });
      await chatMessage.save();

      // Broadcast message to all clients in the correct room
      io.to(messageRoom).emit('chat message', {
        username: data.username,
        message: data.message,
        filePath: data.filePath,
        timestamp: chatMessage.createdAt,
        room: messageRoom,
        createdAt: chatMessage.createdAt // Include createdAt for consistency
      });
      
      console.log('Broadcasted message to room:', messageRoom);
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const pingSchema = new mongoose.Schema({
  description: String,
  location: {
    lat: Number,
    lng: Number,
  },
  type: {
    type: String,
    enum: ['suspicious', 'break-enter', 'fire', 'other'],
    default: 'other'
  },
  photoPath: String,
  createdAt: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  neighborhoodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Neighborhood' }
});

const Ping = mongoose.model('Ping', pingSchema);

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  is_moderator: { type: Boolean, default: false },
  profile_picture_url: { type: String },
  verification_code: { type: String },
  verification_expiry: { type: Date },
  is_verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  neighborhoodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Neighborhood' }
});

const User = mongoose.model('User', userSchema);

// Contact Message Schema
const contactMessageSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});
const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// Routes
app.get('/', (req, res) => {
  const routes = [
    { path: '/api/pings', method: 'GET', description: 'Get all pings' },
    { path: '/api/pings', method: 'POST', description: 'Create a new ping' },
    { path: '/view-pings', method: 'GET', description: 'View pings in HTML format' },
    { path: '/view-users', method: 'GET', description: 'View registered users in HTML format' },
    { path: '/view-chats', method: 'GET', description: 'View chat messages in HTML format' },
    { path: '/view-neighborhoods', method: 'GET', description: 'View neighborhoods in HTML format' }
  ];

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Check-In Backend Routes</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        h1 {
          color: #333;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .route-list {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .route-item {
          margin: 15px 0;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #fff;
        }
        .route-item:hover {
          background: #f8f8f8;
        }
        .method {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          color: white;
          font-weight: bold;
          margin-right: 10px;
        }
        .get { background-color: #61affe; }
        .post { background-color: #49cc90; }
        .path {
          color: #333;
          font-family: monospace;
          font-size: 1.1em;
        }
        .description {
          color: #666;
          margin-top: 5px;
        }
        a {
          text-decoration: none;
          color: inherit;
        }
      </style>
    </head>
    <body>
      <h1>Check-In Backend Routes</h1>
      <div class="route-list">
  `;

  routes.forEach(route => {
    html += `
      <a href="${route.path}">
        <div class="route-item">
          <span class="method ${route.method.toLowerCase()}">${route.method}</span>
          <span class="path">${route.path}</span>
          <div class="description">${route.description}</div>
        </div>
      </a>
    `;
  });

  html += `
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

app.get('/api/pings', async (req, res) => {
  const { neighborhoodId } = req.query;
  let filter = {};
  if (neighborhoodId && mongoose.Types.ObjectId.isValid(neighborhoodId)) {
    filter.neighborhoodId = neighborhoodId;
  }
  const pings = await Ping.find(filter).sort({ createdAt: -1 }).populate('user', 'name profile_picture_url');
  res.json(pings);
});

app.post('/api/pings', upload.single('photo'), async (req, res) => {
  const { description, lat, lng, type, userId } = req.body;
  console.log('Received ping creation request with userId:', userId);
  if (!userId || userId === 'null' || userId === 'undefined') {
    console.error('Ping creation failed: userId is missing or invalid');
    return res.status(400).json({ message: 'User ID is required to create a ping.' });
  }
  // Validate userId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.error('Ping creation failed: userId is not a valid ObjectId');
    return res.status(400).json({ message: 'Invalid user ID.' });
  }
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    console.error('Ping creation failed: user not found for userId', userId);
    return res.status(404).json({ message: 'User not found.' });
  }
  const photoPath = req.file ? '/uploads/' + req.file.filename : null;
  const ping = new Ping({
    description,
    location: { lat: parseFloat(lat), lng: parseFloat(lng) },
    type,
    photoPath,
    user: userId,
    neighborhoodId: user.neighborhoodId
  });
  await ping.save();
  // Populate the user field before sending the response
  await ping.populate('user', 'name profile_picture_url');
  console.log('Created ping:', ping);
  res.status(201).json(ping);
});

// View Pings Route
app.get('/view-pings', async (req, res) => {
  try {
    // Populate user info for each ping
    const pings = await Ping.find().sort({ createdAt: -1 }).populate('user', 'name email');

    let html = '<h1>Pings</h1>';
    if (pings.length === 0) {
      html += '<p>No pings found.</p>';
    } else {
      html += '<table border="1">';
      html += '<tr><th>Description</th><th>Latitude</th><th>Longitude</th><th>Photo</th><th>Timestamp</th><th><b>Posted By</b></th></tr>';
      pings.forEach(ping => {
        html += `
          <tr>
            <td>${ping.description}</td>
            <td>${ping.location.lat}</td>
            <td>${ping.location.lng}</td>
            <td>${ping.photoPath ? `<img src="${ping.photoPath}" alt="Ping Photo" width="100">` : 'No Photo'}</td>
            <td>${ping.createdAt}</td>
            <td><b>${ping.user ? `${ping.user.name} (${ping.user.email})` : 'Unknown'}</b></td>
          </tr>
        `;
      });
      html += '</table>';
    }

    res.send(html);
  } catch (err) {
    console.error('Error fetching pings for view:', err);
    res.status(500).send('Error loading pings.');
  }
});

// View Users Route
app.get('/view-users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    let html = '<h1>Registered Users</h1>';
    if (users.length === 0) {
      html += '<p>No users found.</p>';
    } else {
      html += '<table border="1">';
      html += '<tr><th>Name</th><th>Email</th><th>Phone Number</th><th>Moderator</th><th>Verified</th><th>Registration Date</th><th>Profile Picture</th></tr>';
      users.forEach(user => {
        html += `
          <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.number}</td>
            <td>${user.is_moderator ? 'Yes' : 'No'}</td>
            <td>${user.is_verified ? 'Yes' : 'No'}</td>
            <td>${user.createdAt}</td>
            <td>${user.profile_picture_url ? `<img src="${user.profile_picture_url}" alt="Profile" width="50">` : 'No Photo'}</td>
          </tr>
        `;
      });
      html += '</table>';
    }

    res.send(html);
  } catch (err) {
    console.error('Error fetching users for view:', err);
    res.status(500).send('Error loading users.');
  }
});

// View Chats Route
app.get('/view-chats', async (req, res) => {
  try {
    const messages = await ChatMessage.find().sort({ createdAt: -1 });

    let html = '<h1>Chat Messages</h1>';
    if (messages.length === 0) {
      html += '<p>No chat messages found.</p>';
    } else {
      html += '<table border="1">';
      html += '<tr><th>Username</th><th>Message</th><th>Room</th><th>Timestamp</th></tr>';
      messages.forEach(msg => {
        html += `
          <tr>
            <td>${msg.username}</td>
            <td>${msg.message}</td>
            <td>${msg.room}</td>
            <td>${msg.createdAt}</td>
          </tr>
        `;
      });
      html += '</table>';
    }

    res.send(html);
  } catch (err) {
    console.error('Error fetching chat messages for view:', err);
    res.status(500).send('Error loading chat messages.');
  }
});

// View Contacts Route
app.get('/view-contacts', async (req, res) => {
  try {
    const contacts = await ContactMessage.find().sort({ createdAt: -1 });

    let html = '<h1>Contact Form Submissions</h1>';
    if (contacts.length === 0) {
      html += '<p>No contact messages found.</p>';
    } else {
      html += '<table border="1">';
      html += '<tr><th>Name</th><th>Email</th><th>Message</th><th>Timestamp</th></tr>';
      contacts.forEach(msg => {
        html += `
          <tr>
            <td>${msg.name}</td>
            <td>${msg.email}</td>
            <td>${msg.message}</td>
            <td>${msg.createdAt}</td>
          </tr>
        `;
      });
      html += '</table>';
    }

    res.send(html);
  } catch (err) {
    console.error('Error fetching contact messages for view:', err);
    res.status(500).send('Error loading contact messages.');
  }
});

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'teamatcheckin@gmail.com',
    pass: 'bbus awsq szse dtun'
  },
});

// Password validation function
const validatePassword = (password) => {
  const minLength = 8;
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return password.length >= minLength && hasSpecialChar;
};

// Registration Endpoint
app.post('/api/register', upload.single('profile_picture'), async (req, res) => {
  try {
    const { name, number, email, password, is_moderator, inviteCode, neighborhoodId } = req.body;
    const profile_picture_url = req.file ? '/uploads/' + req.file.filename : null;

    // Validate password
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long and contain at least one special character' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Determine neighborhoodId to set
    let neighborhoodIdToSet = neighborhoodId;
    if (inviteCode) {
      const neighborhood = await Neighborhood.findOne({ inviteCode });
      if (neighborhood) {
        neighborhoodIdToSet = neighborhood._id;
      }
    }

    // Create new user
    const user = new User({
      name,
      number,
      email,
      password: hashedPassword,
      is_moderator: is_moderator === 'true',
      profile_picture_url,
      verification_code: verificationCode,
      verification_expiry: verificationExpiry,
      is_verified: false,
      neighborhoodId: neighborhoodIdToSet,
    });

    await user.save();

    // Send verification email
    const mailOptions = {
      from: 'teamatcheckin@gmail.com',
      to: email,
      subject: 'Email Verification - CheckIn',
      html: `
        <h1>Welcome to CheckIn!</h1>
        <p>Thank you for registering. Please use the following code to verify your email address:</p>
        <h2 style="color: #4CAF50; font-size: 24px; padding: 10px; background: #f5f5f5; text-align: center;">${verificationCode}</h2>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending verification email:', error);
        return res.status(500).json({ message: 'Error sending verification email' });
      }
      console.log('Verification email sent:', info.response);
      res.status(201).json({ 
        message: 'User registered successfully. Please check your email for verification.',
        email: email // Send back email for frontend to use in verification
      });
    });

  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Email Verification Endpoint
app.post('/api/verify-email', async (req, res) => {
  try {
    const { email, verification_code } = req.body;

    const user = await User.findOne({ 
      email, 
      verification_code,
      verification_expiry: { $gt: new Date() } // Check if code hasn't expired
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification code. Please request a new code.' 
      });
    }

    user.is_verified = true;
    user.verification_code = null;
    user.verification_expiry = null;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Error verifying email:', err);
    res.status(500).json({ message: 'Error verifying email' });
  }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // 1. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    // 2. Check if user is verified (optional)
    if (!user.is_verified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }
    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    // 4. Success! (You can return user info, or set a session/cookie here)
    res.json({
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        is_moderator: user.is_moderator
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resend Verification Code Endpoint
app.post('/api/resend-code', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, is_verified: false });
    if (!user) {
      return res.status(400).json({ message: 'User not found or already verified' });
    }

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Update user with new code
    user.verification_code = verificationCode;
    user.verification_expiry = verificationExpiry;
    await user.save();

    // Send new verification email
    const mailOptions = {
      from: 'teamatcheckin@gmail.com',
      to: email,
      subject: 'New Verification Code - CheckIn',
      html: `
        <h1>New Verification Code</h1>
        <p>Here is your new verification code:</p>
        <h2 style="color: #4CAF50; font-size: 24px; padding: 10px; background: #f5f5f5; text-align: center;">${verificationCode}</h2>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending verification email:', error);
        return res.status(500).json({ message: 'Error sending verification email' });
      }
      console.log('New verification email sent:', info.response);
      res.status(200).json({ message: 'New verification code sent successfully' });
    });

  } catch (err) {
    console.error('Error resending verification code:', err);
    res.status(500).json({ message: 'Error resending verification code' });
  }
});

// Chat History API
app.get('/api/chat/messages', async (req, res) => {
  try {
    const room = req.query.room || 'general'; // Get room from query parameter, default to 'general'
    const messages = await ChatMessage.find({ room }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

// API endpoint for chat file uploads
app.post('/api/chat/upload', upload.single('chatFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  // Return the path where the file is accessible
  res.json({ filePath: '/uploads/' + req.file.filename });
});

// Contact Form Endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Store in database
    const contactMsg = new ContactMessage({ name, email, message });
    await contactMsg.save();

    // Send email to team
    const mailOptionsTeam = {
      from: 'teamatcheckin@gmail.com',
      to: 'teamatcheckin@gmail.com',
      subject: 'New Contact Form Submission - CheckIn',
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    // Send confirmation email to user
    const mailOptionsUser = {
      from: 'teamatcheckin@gmail.com',
      to: email,
      subject: 'Thank you for contacting CheckIn',
      html: `
        <h2>Thank you for reaching out!</h2>
        <p>Dear ${name},</p>
        <p>We have received your message and will get back to you soon.</p>
        <hr>
        <p><strong>Your message:</strong></p>
        <p>${message}</p>
        <hr>
        <p>Best regards,<br>CheckIn Team</p>
      `,
    };

    // Send both emails in parallel
    await Promise.all([
      transporter.sendMail(mailOptionsTeam),
      transporter.sendMail(mailOptionsUser)
    ]);

    res.status(200).json({ message: 'Message sent and stored successfully' });
  } catch (err) {
    console.error('Error processing contact form:', err);
    res.status(500).json({ message: 'Error processing message' });
  }
});

// Render Contact Form Page
app.get('/contact', (req, res) => {
  res.send(`
    <h1>Contact Us</h1>
    <form method="POST" action="/contact" style="display:inline-block;vertical-align:top;">
      <label>Name: <input type="text" name="name" required></label><br><br>
      <label>Email: <input type="email" name="email" required></label><br><br>
      <label>Message:<br><textarea name="message" rows="5" cols="40" required></textarea></label><br><br>
      <button type="submit">Send Message</button>
    </form>
    <div id="status-message" style="display:inline-block;vertical-align:top;margin-left:30px;"></div>
    <script>
      // Hide status message after 5 seconds
      if (window.location.hash === '#sent') {
        document.getElementById('status-message').innerHTML = '<span style="color:green;font-weight:bold;">Message sent!</span>';
        setTimeout(() => { document.getElementById('status-message').innerHTML = ''; }, 5000);
      } else if (window.location.hash === '#error') {
        document.getElementById('status-message').innerHTML = '<span style="color:red;font-weight:bold;">Error sending message. Please try again.</span>';
        setTimeout(() => { document.getElementById('status-message').innerHTML = ''; }, 5000);
      }
    </script>
  `);
});

// Handle Contact Form Submission
app.post('/contact', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { name, email, message } = req.body;
    // Store in database
    const contactMsg = new ContactMessage({ name, email, message });
    await contactMsg.save();
    // Send email to team
    const mailOptionsTeam = {
      from: 'teamatcheckin@gmail.com',
      to: 'teamatcheckin@gmail.com',
      subject: 'New Contact Form Submission - CheckIn',
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };
    // Send confirmation email to user
    const mailOptionsUser = {
      from: 'teamatcheckin@gmail.com',
      to: email,
      subject: 'Thank you for contacting CheckIn',
      html: `
        <h2>Thank you for reaching out!</h2>
        <p>Dear ${name},</p>
        <p>We have received your message and will get back to you soon.</p>
        <hr>
        <p><strong>Your message:</strong></p>
        <p>${message}</p>
        <hr>
        <p>Best regards,<br>CheckIn Team</p>
      `,
    };
    await Promise.all([
      transporter.sendMail(mailOptionsTeam),
      transporter.sendMail(mailOptionsUser)
    ]);
    res.redirect('/contact#sent');
  } catch (err) {
    console.error('Error processing contact form:', err);
    res.redirect('/contact#error');
  }
});

// Get User Settings Endpoint
app.get('/api/user/settings', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user settings (excluding sensitive data)
    res.json({
      name: user.name,
      email: user.email,
      number: user.number,
      profile_picture_url: user.profile_picture_url,
      is_moderator: user.is_moderator
    });
  } catch (err) {
    console.error('Error fetching user settings:', err);
    res.status(500).json({ message: 'Error fetching user settings' });
  }
});

// Update User Settings Endpoint
app.put('/api/user/settings', upload.single('profile_picture'), async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId || userId === 'undefined') {
      return res.status(400).json({ message: 'User ID is required for updating settings.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.number) user.number = req.body.number;
    if (req.file) user.profile_picture_url = '/uploads/' + req.file.filename;

    // If password is being updated
    if (req.body.password) {
      if (!validatePassword(req.body.password)) {
        return res.status(400).json({ 
          message: 'Password must be at least 8 characters long and contain at least one special character' 
        });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    await user.save();

    // Return updated user info (excluding sensitive data)
    res.json({
      message: 'Settings updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        number: user.number,
        profile_picture_url: user.profile_picture_url,
        is_moderator: user.is_moderator
      }
    });
  } catch (err) {
    console.error('Error updating user settings:', err);
    res.status(500).json({ message: 'Error updating user settings' });
  }
});

// Neighborhood Schema
const neighborhoodSchema = new mongoose.Schema({
    inviteCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    moderators: [{ type: String }],
    permissions: [{ type: String }],
    bounds: {
        type: {
            type: String,
            enum: ['Polygon'],
            required: true
        },
        coordinates: {
            type: [[[Number]]],
            required: true
        }
    },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Neighborhood = mongoose.model('Neighborhood', neighborhoodSchema);

// Create neighborhood endpoint
app.post('/api/create-neighborhood', async (req, res) => {
    try {
        const { inviteCode, neighborhoodName, moderators, permissions, bounds } = req.body;
        // createdBy is optional for now
        const neighborhood = new Neighborhood({
            inviteCode,
            name: neighborhoodName,
            moderators,
            permissions,
            bounds: {
                type: 'Polygon',
                coordinates: [bounds]
            },
            createdBy: null // No user tracking for now
        });
        await neighborhood.save();
        res.status(201).json({ message: 'Neighborhood created successfully' });
    } catch (error) {
        console.error('Error creating neighborhood:', error);
        res.status(500).json({ message: 'Failed to create neighborhood' });
    }
});

// View Neighborhoods Route
app.get('/view-neighborhoods', async (req, res) => {
    try {
        const neighborhoods = await Neighborhood.find().sort({ createdAt: -1 });
        let html = '<h1>Neighborhoods</h1>';
        if (neighborhoods.length === 0) {
            html += '<p>No neighborhoods found.</p>';
        } else {
            html += '<table border="1">';
            html += '<tr><th>Name</th><th>Invite Code</th><th>Moderators</th><th>Permissions</th><th>Bounds (first 2 points)</th><th>Created At</th></tr>';
            neighborhoods.forEach(n => {
                html += `<tr>
                    <td>${n.name}</td>
                    <td>${n.inviteCode}</td>
                    <td>${n.moderators && n.moderators.length ? n.moderators.join('<br>') : 'None'}</td>
                    <td>${n.permissions && n.permissions.length ? n.permissions.join('<br>') : 'None'}</td>
                    <td>${n.bounds && n.bounds.coordinates && n.bounds.coordinates[0] ?
                        n.bounds.coordinates[0].slice(0,2).map(pt => `[${pt[0].toFixed(4)}, ${pt[1].toFixed(4)}]`).join('<br>') : 'N/A'}</td>
                    <td>${n.createdAt.toLocaleString()}</td>
                </tr>`;
            });
            html += '</table>';
        }
        res.send(html);
    } catch (err) {
        console.error('Error fetching neighborhoods for view:', err);
        res.status(500).send('Error loading neighborhoods.');
    }
});

// Validate invite code endpoint
app.post('/api/validate-invite-code', async (req, res) => {
    try {
        const { inviteCode } = req.body;
        const neighborhood = await Neighborhood.findOne({ inviteCode });
        
        if (neighborhood) {
            res.status(200).json({ 
                valid: true,
                neighborhoodName: neighborhood.name
            });
        } else {
            res.status(400).json({ 
                valid: false,
                message: 'Invalid invite code'
            });
        }
    } catch (error) {
        console.error('Error validating invite code:', error);
        res.status(500).json({ 
            valid: false,
            message: 'Error validating invite code'
        });
    }
});

// Get neighborhood by invite code
app.get('/api/neighborhood/:inviteCode', async (req, res) => {
    try {
        const neighborhood = await Neighborhood.findOne({ inviteCode: req.params.inviteCode });
        if (neighborhood) {
            res.status(200).json(neighborhood);
        } else {
            res.status(404).json({ message: 'Neighborhood not found' });
        }
    } catch (error) {
        console.error('Error fetching neighborhood:', error);
        res.status(500).json({ message: 'Error fetching neighborhood' });
    }
});

// Password reset request endpoint
app.post('/api/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email.' });
    }
    // Generate a reset token (using crypto for a random token)
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour
    await user.save();
    // In a real system, send an email with the reset link
    // For now, log the reset link
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
    console.log(`Password reset link for ${email}: ${resetLink}`);
    return res.json({ message: 'If this email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error('Error in password reset request:', err);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Reset password endpoint
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }
    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: Date.now() } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }
    // Update the user's password
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    return res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Get user's neighborhood
app.get('/api/user/neighborhood/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('neighborhoodId');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.neighborhoodId) {
      return res.status(404).json({ message: 'User not connected to any neighborhood' });
    }
    res.status(200).json(user.neighborhoodId);
  } catch (error) {
    console.error('Error fetching user neighborhood:', error);
    res.status(500).json({ message: 'Error fetching neighborhood' });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 