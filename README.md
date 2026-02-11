# COMP 3133 – Lab Test 1  
## Real-Time Chat Application  

**Student ID:** 101512597  
**Course:** COMP 3133  
**Due Date:** 11th Feb 2026  

---

## 📌 Project Overview

This project is a real-time chat application built using:

### Backend
- Node.js
- Express
- Socket.io
- MongoDB (Mongoose)

### Frontend
- HTML5
- CSS
- Bootstrap
- jQuery
- Fetch API

The application supports user authentication, room-based messaging, private messaging, typing indicators, and message persistence using MongoDB.

---

## 🚀 Features Implemented

### 1️⃣ GitHub Repository
- Repository created with the required naming convention.
- Code committed regularly throughout development.

---

### 2️⃣ User Signup
- Users can create an account using a unique username.
- User data is stored in MongoDB.
- Username is validated as unique.
- Passwords are hashed using bcrypt.
- Required fields are enforced.

---

### 3️⃣ User Login & Logout
- Users can log in using valid credentials.
- Session is stored in `localStorage`.
- Direct access to `/chat` without login is blocked.
- Logout clears localStorage and redirects to login page.

---

### 4️⃣ Room-Based Chat
- Users can join predefined rooms:
  - devops
  - cloud computing
  - covid19
  - sports
  - nodeJS
  - general
- Users can only send and receive messages within the room they joined.
- Users can leave a room.
- Room messages are stored in MongoDB.
- When rejoining a room, previous messages are loaded from the database.

---

### 5️⃣ Private Messaging (1-to-1)
- Users can send private messages to other registered users.
- Messages are stored in MongoDB.
- Private typing indicator is implemented.
- Private message history is retrieved from the database.

---

### 6️⃣ Typing Indicator
- Room typing indicator.
- Private 1-to-1 typing indicator.

Displays:  
> "User is typing..."

---

## 🗄 MongoDB Schemas

### User Schema
Stores:
- username (unique)
- firstname
- lastname
- password (hashed)
- createdOn

### Group Message Schema
Stores:
- from_user
- room
- message
- date_sent

### Private Message Schema
Stores:
- from_user
- to_user
- message
- date_sent

---