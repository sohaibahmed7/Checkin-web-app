/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Firebase Functions configuration
const {setGlobalOptions} = require("firebase-functions");

// Set global options for cost control
setGlobalOptions({maxInstances: 10});

// Load Firebase Functions configuration
const {onRequest} = require("firebase-functions/v2/https");
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const {config} = require("dotenv");
const fs = require('fs');
const path = require('path');

config({path: __dirname + "/.env"});

const app = express();

// CORS middleware - allow requests from your Vercel frontend
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["http://localhost:8000"];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// Handle preflight requests
app.options("*", cors());

// Middleware
app.use(express.json());

// MongoDB connection middleware
let isConnected = false;
const connectDb = async () => {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
};
app.use(async (req, res, next) => {
  try {
    await connectDb();
    next();
  } catch (err) {
    console.error("MongoDB connection error:", err);
    res.status(500).send("Database connection error.");
  }
});

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  return transporter;
}

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  username: {type: String, required: true},
  message: {type: String, required: true},
  room: {type: String, default: "general"},
  filePath: {type: String},
  createdAt: {type: Date, default: Date.now},
});

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

const pingSchema = new mongoose.Schema({
  description: String,
  location: {
    lat: Number,
    lng: Number,
  },
  type: {
    type: String,
    enum: ["suspicious", "break-enter", "fire", "other"],
    default: "other",
  },
  photo: {
    data: Buffer,
    contentType: String,
  },
  createdAt: {type: Date, default: Date.now},
  user: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
  neighborhoodId: {type: mongoose.Schema.Types.ObjectId, ref: "Neighborhood"},
  status: {
    type: String,
    enum: ["pending", "investigating", "resolved", "escalated", "solved"],
    default: "pending"
  },
  timeResolved: { type: Date },
  escalatedTo: { type: String },
  notes: [{
    content: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    addedAt: { type: Date, default: Date.now }
  }],
  followUps: [{
    action: String,
    description: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    addedAt: { type: Date, default: Date.now }
  }]
});

const Ping = mongoose.model("Ping", pingSchema);

// User Schema
const userSchema = new mongoose.Schema({
  name: {type: String, required: true},
  number: {type: String, required: true},
  email: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  is_moderator: {type: Boolean, default: false},
  profile_picture: {
    data: Buffer,
    contentType: String,
  },
  verification_code: {type: String},
  verification_expiry: {type: Date},
  is_verified: {type: Boolean, default: false},
  createdAt: {type: Date, default: Date.now},
  resetToken: {type: String},
  resetTokenExpiry: {type: Date},
  neighborhoodId: {type: mongoose.Schema.Types.ObjectId, ref: "Neighborhood"},
});

const User = mongoose.model("User", userSchema);

// Contact Message Schema
const contactMessageSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  createdAt: {type: Date, default: Date.now},
});
const ContactMessage = mongoose.model("ContactMessage", contactMessageSchema);

// Neighborhood Schema
const neighborhoodSchema = new mongoose.Schema({
  inviteCode: {type: String, required: true, unique: true},
  name: {type: String, required: true},
  moderators: [{type: String}],
  permissions: [{type: String}],
  bounds: {
    type: {
      type: String,
      enum: ["Polygon"],
      required: true,
    },
    coordinates: {
      type: [[[Number]]],
      required: true,
    },
  },
  createdAt: {type: Date, default: Date.now},
  createdBy: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
});

const Neighborhood = mongoose.model("Neighborhood", neighborhoodSchema);

// Multer setup for file uploads (memory storage for Firebase Functions)
const upload = multer({storage: multer.memoryStorage()});

// Password validation function
const validatePassword = (password) => {
  const minLength = 8;
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return password.length >= minLength && hasSpecialChar;
};

// Routes
app.get("/", (req, res) => {
  const routes = [
    {path: "/api/pings", method: "GET", description: "Get all pings"},
    {path: "/api/pings", method: "POST", description: "Create a new ping"},
    {path: "/view-pings", method: "GET", description: "View pings in HTML format"},
    {path: "/view-users", method: "GET", description: "View registered users in HTML format"},
    {path: "/view-chats", method: "GET", description: "View chat messages in HTML format"},
    {path: "/view-neighborhoods", method: "GET", description: "View neighborhoods in HTML format"},
  ];

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Check-In Backend Routes</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .route-list { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .route-item { margin: 15px 0; padding: 15px; border: 1px solid #ddd; border-radius: 4px; background: #fff; }
        .route-item:hover { background: #f8f8f8; }
        .method { display: inline-block; padding: 4px 8px; border-radius: 4px; color: white; font-weight: bold; margin-right: 10px; }
        .get { background-color: #61affe; }
        .post { background-color: #49cc90; }
        .put { background-color: #fca130; }
        .path { color: #333; font-family: monospace; font-size: 1.1em; }
        .description { color: #666; margin-top: 5px; }
        a { text-decoration: none; color: inherit; }
      </style>
    </head>
    <body>
      <h1>Check-In Backend Routes</h1>
      <div class="route-list">
  `;
  routes.forEach((route) => {
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
  html += `</div></body></html>`;
  res.send(html);
});

// View Pings Route
app.get("/view-pings", async (req, res) => {
  try {
    const pings = await Ping.find().sort({createdAt: -1}).populate("user", "name email").lean();

    let html = "<h1>Pings</h1>";
    if (pings.length === 0) {
      html += "<p>No pings found.</p>";
    } else {
      html += "<table border=\"1\">";
      html += "<tr><th>Description</th><th>Latitude</th><th>Longitude</th><th>Photo</th><th>Timestamp</th><th><b>Posted By</b></th></tr>";
      pings.forEach((ping) => {
        html += `
          <tr>
            <td>${ping.description}</td>
            <td>${ping.location.lat}</td>
            <td>${ping.location.lng}</td>
            <td>${ping.photo ? `<img src="${ping.photo}" alt="Ping Photo" width="100">` : "No Photo"}</td>
            <td>${ping.createdAt}</td>
            <td><b>${ping.user ? `${ping.user.name} (${ping.user.email})` : "Unknown"}</b></td>
          </tr>
        `;
      });
      html += "</table>";
    }

    res.send(html);
  } catch (err) {
    console.error("Error fetching pings for view:", err);
    res.status(500).send("Error loading pings.");
  }
});

// View Users Route
app.get("/view-users", async (req, res) => {
  try {
    const users = await User.find().sort({createdAt: -1}).lean();

    let html = "<h1>Registered Users</h1>";
    if (users.length === 0) {
      html += "<p>No users found.</p>";
    } else {
      html += "<table border=\"1\">";
      html += "<tr><th>Name</th><th>Email</th><th>Phone Number</th><th>Moderator</th><th>Verified</th><th>Registration Date</th><th>Profile Picture</th></tr>";
      users.forEach((user) => {
        html += `
          <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.number}</td>
            <td>${user.is_moderator ? "Yes" : "No"}</td>
            <td>${user.is_verified ? "Yes" : "No"}</td>
            <td>${user.createdAt}</td>
            <td>${user.profile_picture ? `<img src="/api/user/${user._id}/profile-picture" alt="Profile" width="50">` : "No Photo"}</td>
            
          </tr>
        `;
      });
      html += "</table>";
    }

    res.send(html);
  } catch (err) {
    console.error("Error fetching users for view:", err);
    res.status(500).send("Error loading users.");
  }
});

// View Chats Route
app.get("/view-chats", async (req, res) => {
  try {
    const messages = await ChatMessage.find().sort({createdAt: -1}).lean();

    let html = "<h1>Chat Messages</h1>";
    if (messages.length === 0) {
      html += "<p>No chat messages found.</p>";
    } else {
      html += "<table border=\"1\">";
      html += "<tr><th>Username</th><th>Message</th><th>Room</th><th>Timestamp</th></tr>";
      messages.forEach((msg) => {
        html += `
          <tr>
            <td>${msg.username}</td>
            <td>${msg.message}</td>
            <td>${msg.room}</td>
            <td>${msg.createdAt}</td>
          </tr>
        `;
      });
      html += "</table>";
    }

    res.send(html);
  } catch (err) {
    console.error("Error fetching chat messages for view:", err);
    res.status(500).send("Error loading chat messages.");
  }
});

// View Neighborhoods Route
app.get("/view-neighborhoods", async (req, res) => {
  try {
    const neighborhoods = await Neighborhood.find().sort({createdAt: -1}).lean();
    let html = "<h1>Neighborhoods</h1>";
    if (neighborhoods.length === 0) {
      html += "<p>No neighborhoods found.</p>";
    } else {
      html += "<table border=\"1\">";
      html += "<tr><th>Name</th><th>Invite Code</th><th>Moderators</th><th>Permissions</th><th>Bounds (first 2 points)</th><th>Created At</th></tr>";
      neighborhoods.forEach((n) => {
        html += `<tr>
                  <td>${n.name}</td>
                  <td>${n.inviteCode}</td>
                  <td>${n.moderators && n.moderators.length ? n.moderators.join("<br>") : "None"}</td>
                  <td>${n.permissions && n.permissions.length ? n.permissions.join("<br>") : "None"}</td>
                  <td>${n.bounds && n.bounds.coordinates && n.bounds.coordinates[0] ?
                      n.bounds.coordinates[0].slice(0, 2).map((pt) => `[${pt[0].toFixed(4)}, ${pt[1].toFixed(4)}]`).join("<br>") : "N/A"}</td>
                  <td>${n.createdAt.toLocaleString()}</td>
              </tr>`;
      });
      html += "</table>";
    }
    res.send(html);
  } catch (err) {
    console.error("Error fetching neighborhoods for view:", err);
    res.status(500).send("Error loading neighborhoods.");
  }
});

// --- Pings ---
app.get("/api/pings", async (req, res) => {
  const {neighborhoodId} = req.query;
  const filter = {};
  if (neighborhoodId && mongoose.Types.ObjectId.isValid(neighborhoodId)) {
    filter.neighborhoodId = neighborhoodId;
  }
  const pings = await Ping.find(filter).sort({createdAt: -1}).populate("user", "name").lean();
  res.json(pings);
});

app.post("/api/pings", upload.single("photo"), async (req, res) => {
  const {description, lat, lng, type, userId, status, timeResolved, escalatedTo, notes, followUps} = req.body;
  if (!userId || userId === "null" || userId === "undefined") {
    return res.status(400).json({message: "User ID is required to create a ping."});
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({message: "Invalid user ID."});
  }
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({message: "User not found."});
  }

  const pingData = {
    description,
    location: {lat: parseFloat(lat), lng: parseFloat(lng)},
    type,
    user: userId,
    neighborhoodId: user.neighborhoodId,
    status,
    timeResolved,
    escalatedTo,
    notes,
    followUps
  };

  // Handle file upload if present
  if (req.file) {
    pingData.photo = {
      data: req.file.buffer,
      contentType: req.file.mimetype,
    };
  }

  const ping = new Ping(pingData);
  await ping.save();
  await ping.populate("user", "name");
  res.status(201).json(ping);
});

// --- Users ---
app.post("/api/register", upload.single("profile_picture"), async (req, res) => {
  try {
    const {name, number, email, password, is_moderator, inviteCode, neighborhoodId} = req.body;

    // Validate password
    if (!validatePassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long and contain at least one special character",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({email});
    if (existingUser) {
      return res.status(400).json({message: "User already exists"});
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification code
    const verification_code = Math.floor(100000 + Math.random() * 900000).toString();
    const verification_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Determine neighborhoodId to set
    let neighborhoodIdToSet = neighborhoodId;
    if (inviteCode) {
      const neighborhood = await Neighborhood.findOne({inviteCode});
      if (neighborhood) {
        neighborhoodIdToSet = neighborhood._id;
      }
    }

    const userData = {
      name,
      number,
      email,
      password: hashedPassword,
      is_moderator: is_moderator === "true",
      verification_code: verification_code,
      verification_expiry: verification_expiry,
      is_verified: false,
      neighborhoodId: neighborhoodIdToSet,
    };

    // Handle profile picture if uploaded
    if (req.file) {
      userData.profile_picture = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    const user = new User(userData);
    await user.save();

    // Send verification email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification - CheckIn",
      html: `
        <h1>Welcome to CheckIn!</h1>
        <p>Thank you for registering. Please use the following code to verify your email address:</p>
        <h2 style="color: #4CAF50; font-size: 24px; padding: 10px; background: #f5f5f5; text-align: center;">${verification_code}</h2>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
      `,
    };

    getTransporter().sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending verification email:", error);
        return res.status(500).json({message: "Error sending verification email"});
      }
      res.status(201).json({
        message: "User registered successfully. Please check your email for verification.",
        email: email,
      });
    });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({message: "Error registering user"});
  }
});

app.post("/api/verify-email", async (req, res) => {
  try {
    const {email, verification_code} = req.body;

    const user = await User.findOne({
      email,
      verification_code,
      verification_expiry: {$gt: new Date()},
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification code. Please request a new code.",
      });
    }

    user.is_verified = true;
    user.verification_code = null;
    user.verification_expiry = null;
    await user.save();

    res.status(200).json({message: "Email verified successfully"});
  } catch (err) {
    console.error("Error verifying email:", err);
    res.status(500).json({message: "Error verifying email"});
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const {email, password} = req.body;
    const user = await User.findOne({email});
    if (!user) {
      return res.status(400).json({message: "Invalid email or password"});
    }
    if (!user.is_verified) {
      return res.status(403).json({message: "Please verify your email before logging in."});
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({message: "Invalid email or password"});
    }
    res.json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        is_moderator: user.is_moderator,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({message: "Server error"});
  }
});

app.post("/api/resend-code", async (req, res) => {
  try {
    const {email} = req.body;
    const user = await User.findOne({email, is_verified: false});
    if (!user) {
      return res.status(400).json({message: "User not found or already verified"});
    }
    const verification_code = Math.floor(100000 + Math.random() * 900000).toString();
    const verification_expiry = new Date(Date.now() + 10 * 60 * 1000);
    user.verification_code = verification_code;
    user.verification_expiry = verification_expiry;
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "New Verification Code - CheckIn",
      html: `
        <h1>New Verification Code</h1>
        <p>Here is your new verification code:</p>
        <h2 style="color: #4CAF50; font-size: 24px; padding: 10px; background: #f5f5f5; text-align: center;">${verification_code}</h2>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
      `,
    };

    getTransporter().sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending verification email:", error);
        return res.status(500).json({message: "Error sending verification email"});
      }
      res.status(200).json({message: "New verification code sent successfully"});
    });
  } catch (err) {
    console.error("Error resending verification code:", err);
    res.status(500).json({message: "Error resending verification code"});
  }
});

// --- Contact Form ---
app.post("/api/contact", async (req, res) => {
  try {
    const {name, email, message} = req.body;
    const contactMsg = new ContactMessage({name, email, message});
    await contactMsg.save();

    const mailOptionsTeam = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Contact Form Submission - CheckIn",
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    const mailOptionsUser = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Thank you for contacting CheckIn",
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
      getTransporter().sendMail(mailOptionsTeam),
      getTransporter().sendMail(mailOptionsUser),
    ]);

    res.status(200).json({message: "Message sent and stored successfully"});
  } catch (err) {
    console.error("Error processing contact form:", err);
    res.status(500).json({message: "Error processing message"});
  }
});

// --- User Settings ---
app.get("/api/user/settings", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({message: "User ID is required"});
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({message: "User not found"});
    }
    res.json({
      name: user.name,
      email: user.email,
      number: user.number,
      is_moderator: user.is_moderator,
    });
  } catch (err) {
    console.error("Error fetching user settings:", err);
    res.status(500).json({message: "Error fetching user settings"});
  }
});

app.put("/api/user/settings", upload.single("profile_picture"), async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId || userId === "undefined") {
      return res.status(400).json({message: "User ID is required for updating settings."});
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({message: "User not found"});
    }

    if (req.body.name) user.name = req.body.name;
    if (req.body.number) user.number = req.body.number;

    if (req.file) {
      user.profile_picture = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    if (req.body.password) {
      if (!validatePassword(req.body.password)) {
        return res.status(400).json({
          message: "Password must be at least 8 characters long and contain at least one special character",
        });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    await user.save();

    res.json({
      message: "Settings updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        number: user.number,
        is_moderator: user.is_moderator,
      },
    });
  } catch (err) {
    console.error("Error updating user settings:", err);
    res.status(500).json({message: "Error updating user settings"});
  }
});

// --- Neighborhoods ---
app.post("/api/create-neighborhood", async (req, res) => {
  try {
    const {inviteCode, neighborhoodName, moderators, permissions, bounds} = req.body;
    const neighborhood = new Neighborhood({
      inviteCode,
      name: neighborhoodName,
      moderators,
      permissions,
      bounds: {
        type: "Polygon",
        coordinates: [bounds],
      },
      createdBy: null,
    });
    await neighborhood.save();
    res.status(201).json({message: "Neighborhood created successfully"});
  } catch (error) {
    console.error("Error creating neighborhood:", error);
    res.status(500).json({message: "Failed to create neighborhood"});
  }
});

app.post("/api/validate-invite-code", async (req, res) => {
  try {
    const {inviteCode} = req.body;
    const neighborhood = await Neighborhood.findOne({inviteCode});
    if (neighborhood) {
      res.status(200).json({valid: true, neighborhoodName: neighborhood.name});
    } else {
      res.status(400).json({valid: false, message: "Invalid invite code"});
    }
  } catch (error) {
    console.error("Error validating invite code:", error);
    res.status(500).json({valid: false, message: "Error validating invite code"});
  }
});

app.get("/api/neighborhood/:inviteCode", async (req, res) => {
  try {
    const neighborhood = await Neighborhood.findOne({inviteCode: req.params.inviteCode});
    if (neighborhood) {
      res.status(200).json(neighborhood);
    } else {
      res.status(404).json({message: "Neighborhood not found"});
    }
  } catch (error) {
    console.error("Error fetching neighborhood:", error);
    res.status(500).json({message: "Error fetching neighborhood"});
  }
});

// --- Password Reset ---
app.post("/api/request-password-reset", async (req, res) => {
  try {
    const {email} = req.body;
    if (!email) {
      return res.status(400).json({message: "Email is required."});
    }
    const user = await User.findOne({email});
    if (!user) {
      return res.status(404).json({message: "No user found with that email."});
    }
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();
    res.json({message: "If this email is registered, a reset link has been sent."});
  } catch (err) {
    console.error("Error in password reset request:", err);
    res.status(500).json({message: "Server error. Please try again later."});
  }
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const {token, newPassword} = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({message: "Token and new password are required."});
    }
    const user = await User.findOne({resetToken: token, resetTokenExpiry: {$gt: Date.now()}});
    if (!user) {
      return res.status(400).json({message: "Invalid or expired reset token."});
    }
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    return res.json({message: "Password has been reset successfully."});
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({message: "Server error. Please try again later."});
  }
});

// --- Logout ---
app.post("/api/logout", (req, res) => {
  res.json({message: "Logged out successfully"});
});

// --- Get User's Neighborhood ---
app.get("/api/user/neighborhood/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("neighborhoodId");
    if (!user) {
      return res.status(404).json({message: "User not found"});
    }
    if (!user.neighborhoodId) {
      return res.status(404).json({message: "User not connected to any neighborhood"});
    }
    res.status(200).json(user.neighborhoodId);
  } catch (error) {
    console.error("Error fetching user neighborhood:", error);
    res.status(500).json({message: "Error fetching neighborhood"});
  }
});

// --- Chat History API ---
app.get("/api/chat/messages", async (req, res) => {
  try {
    const room = req.query.room || "general";
    const messages = await ChatMessage.find({room}).sort({createdAt: 1}).lean();
    res.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({error: "Failed to fetch chat messages"});
  }
});

// Endpoint to serve user profile pictures
app.get("/api/user/:id/profile-picture", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.profile_picture || !user.profile_picture.data) {
      return res.status(404).send("No profile picture");
    }
    res.set("Content-Type", user.profile_picture.contentType);
    res.send(user.profile_picture.data);
  } catch (err) {
    res.status(500).send("Error fetching profile picture");
  }
});

// Endpoint to serve ping photos
app.get("/api/ping/:id/photo", async (req, res) => {
  try {
    const ping = await Ping.findById(req.params.id);
    if (!ping || !ping.photo || !ping.photo.data) {
      return res.status(404).send("No photo");
    }
    res.set("Content-Type", ping.photo.contentType);
    res.send(ping.photo.data);
  } catch (err) {
    res.status(500).send("Error fetching ping photo");
  }
});

// --- Chat File Upload API ---
app.post('/api/chat/upload', upload.single('chatFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  // Save file to disk
  const filePath = path.join(uploadsDir, req.file.originalname);
  fs.writeFileSync(filePath, req.file.buffer);
  // Return the path where the file is accessible (relative to public server root)
  res.json({ filePath: '/uploads/' + req.file.originalname });
});

// Export the Express app as a Firebase HTTPS function with environment variables
exports.api = onRequest({
  memory: "256MiB",
  timeoutSeconds: 60,
}, app);
