# 📎 Staple App

Staple App is a modern, real-time, browser-based communication platform built for individuals, gaming communities, and businesses. It offers seamless messaging, file sharing, voice/video calls, and more — all wrapped in a clean and minimal interface powered by modern web technologies.

## 🌐 Live Demo

> [StapleApp](https://web.stapleapp.com/)

## 📌 Features

- 🧑‍🤝‍🧑 Real-time individual and group chat
- 📞 Voice and video calls
- 🖥️ Screen sharing
- 📁 File upload & sharing (via Google Drive)
- 🔔 Smart notification system
- 📋 To-Do list integration
- 🧷 Pin (staple) favorite users for quick access
- 🔐 Secure authentication via Firebase (Google or Email)
- 📚 Channel creation & management
- 🧑‍💼 Profile and friends system

---

## 🧠 Architecture

Staple App follows a modular **client-server architecture** built with modern technologies and best practices, developed in Agile sprints.

| Layer          | Stack                                |
| -------------- | ------------------------------------ |
| Frontend       | React, Vite, Tailwind CSS            |
| Backend        | Node.js, Express.js, Socket.io       |
| Database       | Firebase Firestore, Google Drive API |
| Authentication | Firebase Auth                        |
| Hosting        | Vercel (Frontend), AWS (Backend)     |
| Real-Time      | Socket.io                            |
| Dev Method     | Agile                                |

---

## 🏗 System Overview

### 1. 🔐 Authentication & Session

- Users log in using Firebase Auth.
- JWT tokens are used for secure API and Socket.io interactions.

### 2. 🗣 Real-Time Messaging

- WebSocket-based communication using Socket.io.
- Messages are stored in Firestore and broadcast to all connected clients.
- Room/channel support to be implemented in future versions.

### 3. 📁 File Sharing

- Uploads handled via backend to Google Drive.
- Drive file links stored in Firestore and shared in real-time.

### 4. 📡 Socket Management

- Realtime event broadcasting (messages, file uploads, etc.).

---

## 🛡 Security & Reliability

- ✅ Firebase Auth for secure user identity management
- 🔒 All data exchanges over HTTPS
- 🔍 Firestore rules for document-level access control
- ⚙️ Scalable deployment on Vercel & AWS
- 🔑 Encrypted token-based access to files

---

## 📈 Future Roadmap

- [ ] Room/Channel support for scoped conversations
- [ ] End-to-end encryption for messaging
- [ ] Dark mode and Light Mode
- [ ] Android and iOS native apps
- [ ] Desktop app for Windows/macOS
- [ ] Spam filtering and content moderation
- [ ] User blocking and reporting system

---

## 🚀 Installation & Running Locally

> Prerequisites: Node.js, Firebase project

```bash
# Clone the repository
git clone https://github.com/StapleApp/client
cd staple-app

# Install dependencies
npm install

# Set environment variables
.env file

# Start the frontend
cd client
npm run dev

# Start the backend
cd ../server
node server.sjs
```

## 🤝 Contribution

Feel free to open issues for bug reports, feature requests, or general feedback.

## 📄 License

This project is licensed under the **MIT License**. You are free to use, modify, and distribute it under the terms of this license.

## 👨‍💻 Developers

Staple App is developed by a team of students with a goal to deliver a sleek, scalable, and secure web communication platform.

- **Mustafa AYKUT**
- **Eren KÖSE**
- **Eren GÜRELİ**
- **Lütfü BEDEL**
- **Yusuf BALMUMCU**
- **Ahmet Yusuf BİRDİR**

## 📬 Contact

For questions, suggestions, or collaboration inquiries, reach out via:

- Email: stapleapp@outlook.com
