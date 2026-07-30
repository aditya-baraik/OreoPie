# 🍪 OreoPie

> A modern peer-to-peer file sharing platform built with React, Vite and Supabase Realtime.

![GitHub stars](https://img.shields.io/github/stars/aditya-baraik/OreoPie?style=for-the-badge)
![GitHub forks](https://img.shields.io/github/forks/aditya-baraik/OreoPie?style=for-the-badge)
![GitHub License](https://img.shields.io/github/license/aditya-baraik/OreoPie?style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)

<p align="center">
  <img src="public/favicon.svg" width="120">
</p>

<p align="center">
Modern, Secure & Lightning Fast Peer-to-Peer File Sharing Platform
</p>

<p align="center">

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-7-purple?logo=vite)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38BDF8?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

</p>

---

## 🚀 Overview

OreoPie is a modern peer-to-peer file sharing platform designed for fast, secure and seamless file transfers across devices.

It focuses on:

- ⚡ Fast Transfers
- 🔒 Secure Connections
- 📱 Cross Device Support
- 👥 Group Sharing
- 🌐 Browser Based
- 🎨 Clean Modern UI

---

## ✨ Features

- Live transfer progress
- Named sharing rooms
- Multi-user file sharing
- Drag & Drop uploads
- Mobile friendly
- Responsive Design
- Secure architecture

---

## 🛠 Tech Stack

| Technology | Usage |
|------------|------|
| React | UI |
| TypeScript | Language |
| Vite | Build Tool |
| Tailwind CSS | Styling |
| Supabase | Backend Services |

---

## 📂 Project Structure

```text
src/
public/
package.json
vite.config.ts
tsconfig.json
```

---

## ⚙️ Installation

```bash
npm install
```

Run Development

```bash
npm run dev
```

Build

```bash
npm run build
```

Preview

```bash
npm run preview
```

---

## 📜 License

MIT License

---

## 👨‍💻 Author

Developed by **Aditya Baraik**


# 🚀 How to Use

## 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/OreoPie.git
cd OreoPie
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file in the project root.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> Never commit the `.env` file.

---

## 4. Start Development Server

```bash
npm run dev
```

The application will start on:

```
http://localhost:5173
```

---

## 5. Build for Production

```bash
npm run build
```

Production files will be generated inside:

```
dist/
```

---

## 6. Deploy

Push changes to the `main` branch.

GitHub Actions will automatically:

- Install dependencies
- Build the project
- Deploy to GitHub Pages

---

# 📤 File Transfer

### Create Account

- Choose a unique username
- Enter your email
- Create a password

---

### Sign In

Login using:

- Username
- Password

---

### Send Files

1. Search another user's username.
2. Select the recipient.
3. Drag & drop files or choose files manually.
4. Click **Send**.

---

### Receive Files

Incoming transfer requests appear automatically.

Accept the request to begin receiving files.

---

# 🛠 Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase Realtime
- GitHub Pages
- WebRTC Data Channels

---

# 🔒 Security

- SHA-256 password hashing
- Peer-to-peer file transfer
- Realtime signaling via Supabase
- No third-party file storage

---

# 📦 Project Structure

```
src/
 ├── components/
 ├── context/
 ├── hooks/
 ├── lib/
 ├── pages/
 ├── App.tsx
 └── main.tsx

public/
.github/
```

---

# 🤝 Contributing

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/your-feature
```

3. Commit changes

```bash
git commit -m "Add new feature"
```

4. Push

```bash
git push origin feature/your-feature
```

5. Open a Pull Request.

---

# 📄 License

Licensed under the MIT License.
