
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const path = require("path");

const friendRoutes = require("./routes/friendRoutes");
const userRoutes = require("./routes/userRoutes");
const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const initializeSocket = require("./socket/socket");

const app = express();
const server = http.createServer(app);

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.1.80:5173",
  "https://popularity-hourly-make-ceiling.trycloudflare.com",
];

// Express CORS configuration
const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  "/voice",
  express.static(path.join(__dirname, "../client/public/voice"))
);

app.use(express.static(path.join(__dirname, "../public")));

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

// Existing API routes
app.use("/api/auth", authRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

// Root route
app.get("/", (_req, res) => {
  res.send("ConnectHub API is running");
});

// Database test route
app.get("/api/test-db", (_req, res) => {
  db.query("SELECT 1 AS connected", (err, results) => {
    if (err) {
      console.error("Database error:", err.message);

      return res.status(500).json({
        success: false,
        message: "Database connection failed",
        error: err.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Database connected successfully",
      result: results[0],
    });
  });
});

// Initialize Socket.IO
initializeSocket(io, db);

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`ConnectHub server running on port ${PORT}`);
  console.log("Allowed frontend origins:", allowedOrigins);
});
