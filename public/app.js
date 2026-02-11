document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("username");
  if (!username) {
    window.location.href = "/login";
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "/login";
    });
  }

  const who = document.getElementById("whoami");
  if (who) who.textContent = username;
});

const username = localStorage.getItem("username");
if (!username) window.location.href = "/login";

const socket = io();

let currentRoom = null;
let roomTypingTimer = null;
let pmTypingTimer = null;

function showTopMsg(text) {
  const el = $("#topMsg");
  if (!el.length) return alert(text);
  el.removeClass("d-none").text(text);
  setTimeout(() => el.addClass("d-none"), 2000);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function appendChatLine(line) {
  const box = $("#chatBox");
  box.append(`<div class="mb-1">${line}</div>`);
  box.scrollTop(box[0].scrollHeight);
}

function appendPmLine(line) {
  const box = $("#pmBox");
  box.append(`<div class="mb-1">${line}</div>`);
  box.scrollTop(box[0].scrollHeight);
}

// Register on socket
socket.emit("registerUser", { username });

// Rooms list from server
socket.on("roomsList", (rooms) => {
  const sel = $("#roomSelect");
  sel.empty();
  rooms.forEach((r) => sel.append(`<option value="${r}">${r}</option>`));
});

// Join room
$("#joinBtn").on("click", () => {
  const room = $("#roomSelect").val();
  socket.emit("joinRoom", { room });
});

socket.on("joinedRoom", ({ room }) => {
  currentRoom = room;
  $("#currentRoom").text(room);
  $("#leaveBtn").prop("disabled", false);
  $("#chatBox").empty();
  $("#roomTyping").text("");
  showTopMsg(`Joined room: ${room}`);
});

// Room history
socket.on("roomHistory", (messages) => {
  messages.forEach((m) => {
    const t = new Date(m.date_sent).toLocaleTimeString();
    appendChatLine(`<strong>[${t}] ${m.from_user}:</strong> ${escapeHtml(m.message)}`);
  });
});

// Leave room
$("#leaveBtn").on("click", () => {
  socket.emit("leaveRoom");
});

socket.on("leftRoom", ({ room }) => {
  if (currentRoom === room) currentRoom = null;
  $("#currentRoom").text("");
  $("#leaveBtn").prop("disabled", true);
  $("#roomTyping").text("");
  showTopMsg(`Left room: ${room}`);
});

// Send room message
$("#sendBtn").on("click", sendRoomMessage);
$("#chatText").on("keypress", (e) => {
  if (e.key === "Enter") sendRoomMessage();
});

function sendRoomMessage() {
  const msg = $("#chatText").val().trim();
  if (!currentRoom) return showTopMsg("Join a room first.");
  if (!msg) return;

  socket.emit("roomMessage", { message: msg });
  $("#chatText").val("");
  socket.emit("roomTypingStop");
}

// Receive room message
socket.on("roomMessage", (m) => {
  const t = new Date(m.date_sent).toLocaleTimeString();
  appendChatLine(`<strong>[${t}] ${m.from_user}:</strong> ${escapeHtml(m.message)}`);
});

// Typing indicators (room)
$("#chatText").on("input", () => {
  if (!currentRoom) return;
  socket.emit("roomTyping");
  clearTimeout(roomTypingTimer);
  roomTypingTimer = setTimeout(() => socket.emit("roomTypingStop"), 800);
});

socket.on("roomTyping", ({ user }) => {
  if (!currentRoom) return;
  $("#roomTyping").text(user + " is typing...");
});

socket.on("roomTypingStop", () => {
  $("#roomTyping").text("");
});

// Private message send
$("#pmSendBtn").on("click", sendPrivateMessage);
$("#pmText").on("keypress", (e) => {
  if (e.key === "Enter") sendPrivateMessage();
});

function sendPrivateMessage() {
  const to_user = $("#pmTo").val().trim();
  const message = $("#pmText").val().trim();
  if (!to_user) return showTopMsg("Enter recipient username.");
  if (!message) return;

  socket.emit("privateMessage", { to_user, message });
  $("#pmText").val("");
  socket.emit("privateTypingStop", { to_user });
}

// Receive private message
socket.on("privateMessage", (m) => {
  const t = new Date(m.date_sent).toLocaleTimeString();
  const direction = (m.from_user === username) ? "To " + m.to_user : "From " + m.from_user;
  appendPmLine(`<strong>[${t}] ${direction}:</strong> ${escapeHtml(m.message)}`);
});

// Typing indicator (private)
$("#pmText").on("input", () => {
  const to_user = $("#pmTo").val().trim();
  if (!to_user) return;

  socket.emit("privateTyping", { to_user });
  clearTimeout(pmTypingTimer);
  pmTypingTimer = setTimeout(() => socket.emit("privateTypingStop", { to_user }), 800);
});

socket.on("privateTyping", ({ from_user }) => {
  $("#pmTyping").text(from_user + " is typing...");
});

socket.on("privateTypingStop", () => {
  $("#pmTyping").text("");
});

// Errors from server
socket.on("errorMsg", (text) => showTopMsg(text));
