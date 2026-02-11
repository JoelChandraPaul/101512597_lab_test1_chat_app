require("dotenv").config();
const path = require("path");
const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const User = require("./models/User");
const GroupMessage = require("./models/GroupMessage");
const PrivateMessage = require("./models/PrivateMessage");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// static
app.use("/public", express.static(path.join(__dirname, "public")));

// api
app.use("/api/auth", authRoutes);

// pages
app.get("/", (req, res) => res.redirect("/login"));
app.get("/signup", (req, res) => res.sendFile(path.join(__dirname, "view", "signup.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "view", "login.html")));
app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, "view", "chat.html")));

// rooms list (predefined)
const ROOMS = ["devops", "cloud computing", "covid19", "sports", "nodeJS", "general"];

// username -> socket.id
const onlineUsers = new Map();

function getUsernameFromPayload(payload) {
  const u = payload && payload.username ? String(payload.username).trim() : "";
  return u;
}

function ensureRegistered(socket, payload) {
  if (socket.data.username) return true;

  const u = getUsernameFromPayload(payload);
  if (!u) return false;

  socket.data.username = u;
  onlineUsers.set(u, socket.id);
  return true;
}

io.on("connection", (socket) => {
  // Client must send registerUser { username }
  socket.on("registerUser", (payload = {}) => {
    const username = getUsernameFromPayload(payload);
    if (!username) return;

    socket.data.username = username;
    onlineUsers.set(username, socket.id);

    socket.emit("roomsList", ROOMS);
  });

  socket.on("joinRoom", async (payload = {}) => {
    if (!ensureRegistered(socket, payload)) {
      return socket.emit("errorMsg", "Not registered (missing username).");
    }

    const room = String(payload.room || "").trim();
    if (!room) return socket.emit("errorMsg", "Room is required.");
    if (!ROOMS.includes(room)) return socket.emit("errorMsg", "Invalid room.");

    // leave old room if any
    if (socket.data.room) {
      socket.leave(socket.data.room);
    }

    socket.join(room);
    socket.data.room = room;

    socket.emit("joinedRoom", { room });

    // last 20 messages in that room
    const history = await GroupMessage.find({ room })
      .sort({ date_sent: -1 })
      .limit(20)
      .lean();

    socket.emit("roomHistory", history.reverse());
  });

  socket.on("leaveRoom", () => {
    const room = socket.data.room;
    if (!room) return;

    socket.leave(room);
    socket.data.room = null;

    socket.emit("leftRoom", { room });
    socket.to(room).emit("roomTypingStop", { user: socket.data.username });
  });

  socket.on("roomMessage", async (payload = {}) => {
    if (!ensureRegistered(socket, payload)) {
      return socket.emit("errorMsg", "Not registered (missing username).");
    }

    const username = socket.data.username;
    const room = socket.data.room;
    const message = String(payload.message || "").trim();

    if (!room) return socket.emit("errorMsg", "Join a room first.");
    if (!message) return;

    // ensure user exists in DB (signup required)
    const userExists = await User.findOne({ username }).lean();
    if (!userExists) return socket.emit("errorMsg", "User not found in DB. Signup again.");

    const saved = await GroupMessage.create({
      from_user: username,
      room,
      message
    });

    io.to(room).emit("roomMessage", {
      from_user: saved.from_user,
      room: saved.room,
      message: saved.message,
      date_sent: saved.date_sent
    });
  });

  socket.on("privateMessage", async (payload = {}) => {
    if (!ensureRegistered(socket, payload)) {
      return socket.emit("errorMsg", "Not registered (missing username).");
    }

    const from_user = socket.data.username;
    const to_user = String(payload.to_user || "").trim();
    const message = String(payload.message || "").trim();

    if (!to_user) return socket.emit("errorMsg", "Recipient username required.");
    if (!message) return;
    if (to_user === from_user) return socket.emit("errorMsg", "You can't message yourself.");

    // ensure recipient exists
    const toUserExists = await User.findOne({ username: to_user }).lean();
    if (!toUserExists) return socket.emit("errorMsg", "Recipient user not found.");

    const saved = await PrivateMessage.create({
      from_user,
      to_user,
      message
    });

    const msgObj = {
      from_user: saved.from_user,
      to_user: saved.to_user,
      message: saved.message,
      date_sent: saved.date_sent
    };

    // sender gets it
    socket.emit("privateMessage", msgObj);

    // receiver gets it if online
    const toSocketId = onlineUsers.get(to_user);
    if (toSocketId) io.to(toSocketId).emit("privateMessage", msgObj);
  });

  // typing indicators (room)
  socket.on("roomTyping", (payload = {}) => {
    if (!ensureRegistered(socket, payload)) return;
    const room = socket.data.room;
    if (!room) return;
    socket.to(room).emit("roomTyping", { user: socket.data.username });
  });

  socket.on("roomTypingStop", (payload = {}) => {
    if (!ensureRegistered(socket, payload)) return;
    const room = socket.data.room;
    if (!room) return;
    socket.to(room).emit("roomTypingStop", { user: socket.data.username });
  });

  // typing indicators (private)
  socket.on("privateTyping", (payload = {}) => {
    if (!ensureRegistered(socket, payload)) return;
    const to = String(payload.to_user || "").trim();
    if (!to) return;
    const toSocketId = onlineUsers.get(to);
    if (toSocketId) io.to(toSocketId).emit("privateTyping", { from_user: socket.data.username });
  });

  socket.on("privateTypingStop", (payload = {}) => {
    if (!ensureRegistered(socket, payload)) return;
    const to = String(payload.to_user || "").trim();
    if (!to) return;
    const toSocketId = onlineUsers.get(to);
    if (toSocketId) io.to(toSocketId).emit("privateTypingStop", { from_user: socket.data.username });
  });

  socket.on("disconnect", () => {
    const username = socket.data.username;
    if (username) onlineUsers.delete(username);
  });
});

async function start() {
  const PORT = process.env.PORT || 3000;
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error("Missing MONGO_URI in .env");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("MongoDB connected");

  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
