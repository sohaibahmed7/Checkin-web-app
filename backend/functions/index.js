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
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const {config} = require("dotenv");
const admin = require("firebase-admin");

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
// REMOVE or comment out the global body parser to avoid interfering with multer
// app.use(express.json());

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

// Chat System Schemas

// Chat Room Schema
const chatRoomSchema = new mongoose.Schema({
  neighborhoodId: {type: mongoose.Schema.Types.ObjectId, ref: "Neighborhood", required: true},
  roomType: {
    type: String,
    enum: ["general_discussion", "moderator_alerts", "security_alerts"],
    required: true,
  },
  name: {type: String, required: true},
  description: {type: String},
  createdAt: {type: Date, default: Date.now},
});

// Ensure unique combination of neighborhood and room type
chatRoomSchema.index({neighborhoodId: 1, roomType: 1}, {unique: true});

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  roomId: {type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true},
  senderId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
  senderName: {type: String, required: true},
  message: {type: String, required: true},
  messageType: {
    type: String,
    enum: ["text", "alert"],
    default: "text",
  },
  createdAt: {type: Date, default: Date.now},
});

// Index for efficient querying
chatMessageSchema.index({roomId: 1, createdAt: -1});

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
  photo_url: {type: String},
  createdAt: {type: Date, default: Date.now},
  user: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
  neighborhoodId: {type: mongoose.Schema.Types.ObjectId, ref: "Neighborhood"},
  status: {
    type: String,
    enum: ["pending", "investigating", "resolved", "escalated", "solved"],
    default: "pending",
  },
  timeResolved: {type: Date},
  escalatedTo: {type: String},
  notes: [{
    content: String,
    addedBy: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    addedAt: {type: Date, default: Date.now},
  }],
  followUps: [{
    action: String,
    description: String,
    addedBy: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    addedAt: {type: Date, default: Date.now},
  }],
});

const Ping = mongoose.model("Ping", pingSchema);

// User Schema
const userSchema = new mongoose.Schema({
  firstName: {type: String, required: true},
  lastName: {type: String, required: true},
  number: {type: String, default: "1111111111"},
  email: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  is_moderator: {type: Boolean, default: false},
  is_security_company: {type: Boolean, default: false},
  profile_picture_url: {type: String},
  verification_code: {type: String},
  verification_expiry: {type: Date},
  is_verified: {type: Boolean, default: false},
  createdAt: {type: Date, default: Date.now},
  resetToken: {type: String},
  resetTokenExpiry: {type: Date},
  neighborhoodId: {type: mongoose.Schema.Types.ObjectId, ref: "Neighborhood"},
});
userSchema.virtual("name").get(function() {
  return `${this.firstName} ${this.lastName}`;
});
userSchema.set("toJSON", {virtuals: true});
userSchema.set("toObject", {virtuals: true});
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

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket: process.env.FB_STORAGE_BUCKET,
  });
}


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
            <td>${ping.photo_url ? `<img src="${ping.photo_url}" alt="Ping Photo" width="100">` : "No Photo"}</td>
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
            <td>${user.profile_picture_url ? `<img src="${user.profile_picture_url}" alt="Profile" width="50">` : "No Photo"}</td>
            
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

// --- Registration ---
app.post("/api/register", express.json(), async (req, res) => {
  try {
    const {firstName, lastName, number, email, password, is_moderator, inviteCode, neighborhoodId, profile_picture_base64} = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({message: "Missing required fields."});
    }
    if (!validatePassword(password)) {
      return res.status(400).json({message: "Password must be at least 8 characters long and contain at least one special character"});
    }
    const existingUser = await User.findOne({email});
    if (existingUser) {
      return res.status(400).json({message: "User already exists"});
    }

    let profile_picture_url = "";

    // Upload profile picture to Firebase Storage if provided
    if (profile_picture_base64) {
      try {
        const bucket = admin.storage().bucket();
        const fileName = `profile_pictures/${Date.now()}_profile.jpg`;
        const file = bucket.file(fileName);

        // Convert base64 to buffer
        const base64Data = profile_picture_base64.replace(/^data:image\/[a-z]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        await file.save(buffer, {
          metadata: {
            contentType: "image/jpeg",
          },
        });

        // Make the file publicly accessible
        await file.makePublic();

        // Get the public URL
        profile_picture_url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } catch (uploadError) {
        console.error("Error uploading profile picture:", uploadError);
        return res.status(500).json({message: "Error uploading profile picture"});
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verification_code = Math.floor(100000 + Math.random() * 900000).toString();
    const verification_expiry = new Date(Date.now() + 10 * 60 * 1000);
    let neighborhoodIdToSet = neighborhoodId;
    if (inviteCode) {
      const neighborhood = await Neighborhood.findOne({inviteCode});
      if (neighborhood) {
        neighborhoodIdToSet = neighborhood._id;
      }
    }
    const userData = {
      firstName,
      lastName,
      number,
      email,
      password: hashedPassword,
      is_moderator: Boolean(is_moderator),
      verification_code,
      verification_expiry,
      is_verified: false,
      neighborhoodId: neighborhoodIdToSet,
      profile_picture_url: profile_picture_url,
    };
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

// --- Pings ---
app.get("/api/pings", async (req, res) => {
  const {neighborhoodId} = req.query;
  const filter = {};
  if (neighborhoodId && mongoose.Types.ObjectId.isValid(neighborhoodId)) {
    filter.neighborhoodId = neighborhoodId;
  }
  const pings = await Ping.find(filter)
      .sort({createdAt: -1})
      .populate("user", "_id firstName lastName name profile_picture_url")
      .lean();
  res.json(pings);
});

app.post("/api/pings", express.json(), async (req, res) => {
  const {description, lat, lng, type, userId, photo_base64, status, timeResolved, escalatedTo, notes, followUps} = req.body;
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
    followUps,
  };

  // Upload photo to Firebase Storage if provided
  if (photo_base64) {
    try {
      const bucket = admin.storage().bucket();
      const fileName = `ping_photos/${Date.now()}_ping.jpg`;
      const file = bucket.file(fileName);

      // Convert base64 to buffer
      const base64Data = photo_base64.replace(/^data:image\/[a-z]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      await file.save(buffer, {
        metadata: {
          contentType: "image/jpeg",
        },
      });

      // Make the file publicly accessible
      await file.makePublic();

      // Get the public URL
      const photo_url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      pingData.photo_url = photo_url;
    } catch (uploadError) {
      console.error("Error uploading ping photo:", uploadError);
      return res.status(500).json({message: "Error uploading photo"});
    }
  }

  const ping = new Ping(pingData);
  await ping.save();
  await ping.populate("user", "name");
  res.status(201).json(ping);
});

// --- Users ---
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
    // Check if user is a moderator and needs to create a neighborhood
    let redirectUrl = "/pages/auth/login.html";
    if (user.is_moderator && !user.neighborhoodId) {
      redirectUrl = "/pages/neighborhood/create-neighborhood.html";
    }
    res.status(200).json({
      message: "Email verified successfully",
      redirectUrl: redirectUrl,
      isModerator: user.is_moderator,
      hasNeighborhood: !!user.neighborhoodId,
    });
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
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({message: "Invalid email or password"});
    }
    if (!user.is_verified) {
      return res.status(403).json({message: "Please verify your email before logging in."});
    }
    res.json({
      message: "Login successful",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        is_moderator: user.is_moderator,
        neighborhoodId: user.neighborhoodId,
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
      firstName: user.firstName,
      lastName: user.lastName,
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

app.put("/api/user/settings", express.json(), async (req, res) => {
  try {
    const {userId, number, email, profile_picture_base64, oldPassword, newPassword, confirmNewPassword} = req.body;
    if (!userId || userId === "undefined") {
      return res.status(400).json({message: "User ID is required for updating settings."});
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({message: "User not found"});
    }
    let emailChanged = false;
    if (number) user.number = number;
    if (email && email !== user.email) {
      user.email = email;
      user.is_verified = false;
      // Generate new verification code and expiry
      user.verification_code = Math.floor(100000 + Math.random() * 900000).toString();
      user.verification_expiry = new Date(Date.now() + 10 * 60 * 1000);
      emailChanged = true;
    }
    // Upload new profile picture if provided
    if (profile_picture_base64) {
      try {
        const bucket = admin.storage().bucket();
        const fileName = `profile_pictures/${Date.now()}_profile.jpg`;
        const file = bucket.file(fileName);
        const base64Data = profile_picture_base64.replace(/^data:image\/[a-z]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        await file.save(buffer, {
          metadata: {
            contentType: "image/jpeg",
          },
        });
        await file.makePublic();
        user.profile_picture_url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } catch (uploadError) {
        console.error("Error uploading profile picture:", uploadError);
        return res.status(500).json({message: "Error uploading profile picture"});
      }
    }
    // Password change logic
    if (oldPassword || newPassword || confirmNewPassword) {
      if (!oldPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({message: "To change your password, you must provide old password, new password, and confirm new password."});
      }
      // Check old password
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({message: "Old password is incorrect."});
      }
      // Check new password requirements
      if (!validatePassword(newPassword)) {
        return res.status(400).json({message: "New password must be at least 8 characters long and contain at least one special character."});
      }
      // Check new/confirm match
      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({message: "New password and confirm password do not match."});
      }
      // Check new password is not same as old
      const isSame = await bcrypt.compare(newPassword, user.password);
      if (isSame) {
        return res.status(400).json({message: "New password must be different from the old password."});
      }
      // All good, update password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }
    await user.save();
    // Send verification email if email was changed
    if (emailChanged) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Email Verification - CheckIn",
        html: `
          <h1>Email Change Verification - CheckIn</h1>
          <p>Your email was changed. Please use the following code to verify your new email address:</p>
          <h2 style="color: #4CAF50; font-size: 24px; padding: 10px; background: #f5f5f5; text-align: center;">${user.verification_code}</h2>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this change, please contact support.</p>
        `,
      };
      try {
        await getTransporter().sendMail(mailOptions);
      } catch (error) {
        console.error("Error sending verification email after email change:", error);
        // Don't fail the request, but log the error
      }
    }
    res.json({
      message: "Settings updated successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        number: user.number,
        is_moderator: user.is_moderator,
      },
      emailChanged,
    });
  } catch (err) {
    console.error("Error updating user settings:", err);
    res.status(500).json({message: "Error updating user settings"});
  }
});

// --- Neighborhoods ---
app.post("/api/user/neighborhood/create-neighborhood", async (req, res) => {
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

// Endpoint to serve user profile pictures
app.get("/api/user/:id/profile-picture", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.profile_picture_url) {
      return res.status(404).send("No profile picture");
    }
    // Redirect to the actual Firebase Storage URL
    res.redirect(user.profile_picture_url);
  } catch (err) {
    res.status(500).send("Error fetching profile picture");
  }
});

// Endpoint to serve ping photos
app.get("/api/ping/:id/photo", async (req, res) => {
  try {
    const ping = await Ping.findById(req.params.id);
    if (!ping || !ping.photo_url) {
      return res.status(404).send("No photo");
    }
    // Redirect to the actual Firebase Storage URL
    res.redirect(ping.photo_url);
  } catch (err) {
    res.status(500).send("Error fetching ping photo");
  }
});

// --- Reports ---
// Get reports with enhanced data
app.get("/api/reports", async (req, res) => {
  try {
    const {neighborhoodId, status, type, dateFrom, dateTo} = req.query;
    const filter = {};
    if (neighborhoodId && mongoose.Types.ObjectId.isValid(neighborhoodId)) {
      filter.neighborhoodId = neighborhoodId;
    }
    if (status && status !== "all") {
      filter.status = status;
    }
    if (type && type !== "all") {
      filter.type = type;
    }
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + "T23:59:59.999Z");
    }
    const reports = await Ping.find(filter)
        .sort({createdAt: -1})
        .populate("user", "_id firstName lastName name profile_picture_url")
        .populate("notes.addedBy", "name")
        .populate("followUps.addedBy", "name")
        .lean();
    res.json(reports);
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({message: "Error fetching reports"});
  }
});

// Update report status
app.put("/api/reports/:id/status", async (req, res) => {
  try {
    const {id} = req.params;
    const {status, escalatedTo, timeResolved} = req.body;
    const updateData = {status};
    if (escalatedTo) updateData.escalatedTo = escalatedTo;
    if (timeResolved) updateData.timeResolved = new Date(timeResolved);
    if (status === "resolved" && !timeResolved) {
      updateData.timeResolved = new Date();
    }
    const report = await Ping.findByIdAndUpdate(
        id,
        updateData,
        {new: true},
    ).populate("user", "_id firstName lastName name profile_picture_url");
    if (!report) {
      return res.status(404).json({message: "Report not found"});
    }
    res.json(report);
  } catch (err) {
    console.error("Error updating report status:", err);
    res.status(500).json({message: "Error updating report status"});
  }
});

// Add note to report
app.post("/api/reports/:id/notes", async (req, res) => {
  try {
    const {id} = req.params;
    const {content, addedBy} = req.body;
    if (!content || !addedBy) {
      return res.status(400).json({message: "Content and user ID are required"});
    }
    const report = await Ping.findByIdAndUpdate(
        id,
        {$push: {notes: {content, addedBy}}},
        {new: true},
    ).populate("user", "_id firstName lastName name profile_picture_url")
        .populate("notes.addedBy", "name");
    if (!report) {
      return res.status(404).json({message: "Report not found"});
    }
    res.json(report);
  } catch (err) {
    console.error("Error adding note to report:", err);
    res.status(500).json({message: "Error adding note"});
  }
});

// Add follow-up to report
app.post("/api/reports/:id/follow-ups", async (req, res) => {
  try {
    const {id} = req.params;
    const {action, description, addedBy} = req.body;
    if (!action || !addedBy) {
      return res.status(400).json({message: "Action and user ID are required"});
    }
    const report = await Ping.findByIdAndUpdate(
        id,
        {$push: {followUps: {action, description, addedBy}}},
        {new: true},
    ).populate("user", "_id firstName lastName name profile_picture_url")
        .populate("followUps.addedBy", "name");
    if (!report) {
      return res.status(404).json({message: "Report not found"});
    }
    res.json(report);
  } catch (err) {
    console.error("Error adding follow-up to report:", err);
    res.status(500).json({message: "Error adding follow-up"});
  }
});

// Get report trail (notes and follow-ups)
app.get("/api/reports/:id/trail", async (req, res) => {
  try {
    const {id} = req.params;
    const report = await Ping.findById(id)
        .populate("user", "_id firstName lastName name profile_picture_url")
        .populate("notes.addedBy", "name")
        .populate("followUps.addedBy", "name")
        .select("notes followUps createdAt user description type status");
    if (!report) {
      return res.status(404).json({message: "Report not found"});
    }
    res.json(report);
  } catch (err) {
    console.error("Error fetching report trail:", err);
    res.status(500).json({message: "Error fetching report trail"});
  }
});

// --- Chat System Endpoints ---

// Get chat rooms for a neighborhood
app.get("/api/chat/rooms/:neighborhoodId", async (req, res) => {
  try {
    const {neighborhoodId} = req.params;

    if (!mongoose.Types.ObjectId.isValid(neighborhoodId)) {
      return res.status(400).json({message: "Invalid neighborhood ID"});
    }

    // Find or create the three predefined rooms for the neighborhood
    const roomTypes = [
      {roomType: "general_discussion", name: "General Discussion", description: "Open communication for all users"},
      {roomType: "moderator_alerts", name: "Moderator Alerts", description: "One-way communication from moderators"},
      {roomType: "security_alerts", name: "Security Alerts", description: "One-way communication from security company"},
    ];

    const rooms = [];
    for (const roomConfig of roomTypes) {
      let room = await ChatRoom.findOne({
        neighborhoodId,
        roomType: roomConfig.roomType,
      });

      if (!room) {
        room = new ChatRoom({
          neighborhoodId,
          roomType: roomConfig.roomType,
          name: roomConfig.name,
          description: roomConfig.description,
        });
        await room.save();
      }
      rooms.push(room);
    }

    res.json(rooms);
  } catch (err) {
    console.error("Error fetching chat rooms:", err);
    res.status(500).json({message: "Error fetching chat rooms"});
  }
});

// Get messages for a specific room
app.get("/api/chat/messages/:roomId", async (req, res) => {
  try {
    const {roomId} = req.params;
    const {limit = 50, before} = req.query;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({message: "Invalid room ID"});
    }

    const query = {roomId};
    if (before) {
      query.createdAt = {$lt: new Date(before)};
    }

    const messages = await ChatMessage.find(query)
        .sort({createdAt: -1})
        .limit(parseInt(limit))
        .populate("senderId", "firstName lastName profile_picture_url")
        .lean();

    res.json(messages.reverse()); // Return in chronological order
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({message: "Error fetching messages"});
  }
});

// Send a message to a room
app.post("/api/chat/messages", async (req, res) => {
  try {
    const {roomId, senderId, message} = req.body;

    if (!roomId || !senderId || !message) {
      return res.status(400).json({message: "Room ID, sender ID, and message are required"});
    }

    // Validate room and sender
    const [room, sender] = await Promise.all([
      ChatRoom.findById(roomId),
      User.findById(senderId),
    ]);

    if (!room || !sender) {
      return res.status(404).json({message: "Room or sender not found"});
    }

    // Check if user belongs to the neighborhood
    if (sender.neighborhoodId.toString() !== room.neighborhoodId.toString()) {
      return res.status(403).json({message: "Access denied: User not in this neighborhood"});
    }

    // Check permissions based on room type
    if (room.roomType === "moderator_alerts" && !sender.is_moderator) {
      return res.status(403).json({message: "Only moderators can send messages to Moderator Alerts"});
    }

    if (room.roomType === "security_alerts" && !sender.is_security_company) {
      return res.status(403).json({message: "Only security company users can send messages to Security Alerts"});
    }

    const chatMessage = new ChatMessage({
      roomId,
      senderId,
      senderName: sender.name,
      message,
      messageType: room.roomType.includes("alerts") ? "alert" : "text",
    });

    await chatMessage.save();

    // Populate sender info for response
    await chatMessage.populate("senderId", "firstName lastName profile_picture_url");

    res.status(201).json(chatMessage);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({message: "Error sending message"});
  }
});

// --- Chat Attachment Upload ---
app.post("/api/chat/upload", express.json({limit: "20mb"}), async (req, res) => {
  try {
    const {file_base64, userId, neighborhoodId, roomId, fileName} = req.body;
    if (!file_base64 || !userId || !neighborhoodId || !roomId) {
      return res.status(400).json({message: "Missing required fields."});
    }
    // Optionally validate user and room here
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({message: "User not found"});
    }
    // Upload file to Firebase Storage
    const bucket = admin.storage().bucket();
    const safeFileName = fileName ? fileName.replace(/[^a-zA-Z0-9._-]/g, "_") : `attachment_${Date.now()}.jpg`;
    const storagePath = `chat_uploads/${neighborhoodId}/${roomId}/${Date.now()}_${safeFileName}`;
    // Detect content type
    let contentType = "image/jpeg";
    if (file_base64.startsWith("data:")) {
      const match = file_base64.match(/^data:([a-zA-Z0-9\-\/]+);base64,/);
      if (match) contentType = match[1];
    }
    const base64Data = file_base64.replace(/^data:[a-zA-Z0-9\-\/]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const file = bucket.file(storagePath);
    await file.save(buffer, {metadata: {contentType}});
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    res.status(201).json({url: publicUrl});
  } catch (error) {
    console.error("Error uploading chat attachment:", error);
    res.status(500).json({message: "Error uploading attachment"});
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.stack || err.message); // Log the full error stack
  // Fallback for any other unhandled errors
  res.status(500).json({message: "An unexpected server error occurred."});
});

// Export both HTTP and Socket.IO servers
const functions = require("firebase-functions");
exports.api = functions.https.onRequest(app);
