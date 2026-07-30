# 🍪 OreoPie

<p align="center">
  <img src="public/favicon.svg" width="96" alt="OreoPie logo"/>
</p>

<p align="center">
  <strong>Modern · Secure · Peer-to-Peer File Sharing & Chat</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square"/>
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=flat-square"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square"/>
  <img src="https://img.shields.io/badge/TailwindCSS-4-38BDF8?logo=tailwindcss&logoColor=white&style=flat-square"/>
  <img src="https://img.shields.io/badge/WebRTC-DataChannel-orange?style=flat-square"/>
  <img src="https://img.shields.io/badge/AES--256--GCM-Encrypted-green?style=flat-square"/>
  <img src="https://img.shields.io/badge/License-MIT-lightgrey?style=flat-square"/>
</p>

---

## Overview

OreoPie is a browser-based peer-to-peer platform for **transferring files** and **chatting securely** between devices — with zero server involvement for your actual data.

- Files and chat travel **directly device-to-device** over encrypted WebRTC DataChannels.
- Chat messages are **end-to-end encrypted** with AES-256-GCM using ephemeral ECDH keys.
- Supabase is used **only** for signalling (WebRTC handshake) and authentication. No file bytes, no chat text, and no transfer history ever touch the server.
- Everything clears when you close the tab.

---

## Security Architecture

### File Transfers

| Layer | Technology | What it does |
|---|---|---|
| Transport | WebRTC DataChannel + DTLS | TLS-grade encryption on every byte between devices |
| Storage | Browser memory (ArrayBuffer) | Files are never written to disk or any server |
| History | None | Cleared on tab close; no server logs |

### Chat Messages

| Layer | Technology | What it does |
|---|---|---|
| Key exchange | ECDH P-256 | Ephemeral key pair generated per connection, public keys exchanged over the DTLS-encrypted DataChannel |
| Message encryption | AES-256-GCM | Each message encrypted with a fresh 96-bit random IV |
| Storage | Browser memory only | No history in Supabase, no history in localStorage |
| Forward secrecy | New keys per session | Closing and reopening a connection generates entirely new keys |

**Man-in-the-middle?** Not possible in practice. Public keys are exchanged over the already-DTLS-encrypted WebRTC DataChannel — not over Supabase signalling. An attacker who controls Supabase Realtime cannot intercept or inject keys because the key exchange happens inside the encrypted tunnel.

---

## Features

- ⚡ **Direct P2P file transfer** — no upload/download size limits, no server copies
- 💬 **Encrypted P2P chat** — AES-256-GCM, zero server involvement
- 🔒 **Zero transfer history** — tab close wipes everything
- 📱 **Responsive design** — works on mobile and desktop
- 🖱️ **Drag & drop uploads**
- 📥 **Batch download** with select-all
- 👥 **Multi-peer sessions** — connect with multiple devices at once
- 🔔 **New device login alerts** — get notified when your account logs in elsewhere
- 🔑 **Device session management** — view and revoke active sessions
- 🔐 **Password change** — requires current password for security

---

## Tech Stack

| Technology | Role |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite 6 | Build tool & dev server |
| Tailwind CSS 4 | Styling |
| Supabase | Signalling + custom auth DB |
| WebRTC DataChannel | P2P file & chat transport |
| Web Crypto API (ECDH + AES-GCM) | End-to-end chat encryption |
| Framer Motion | Animations |
| shadcn/ui (Radix) | Component library |
| Wouter | Client-side routing |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone & install

```bash
git clone <repo-url>
cd oreopie
npm install
```

### 2. Set up Supabase

Run the SQL in `supabase-migrations.sql` in your Supabase project's **SQL Editor**:

```
Supabase Dashboard → SQL Editor → New Query → paste & run
```

This creates:
- `oreopie_users` — custom auth table
- `oreopie_sessions` — device session tracking

### 3. Configure environment

Create a `.env` file (or set as Replit Secrets):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## How to Use

### Sending files

1. **Sign up / Log in** with a username, email, and password.
2. On the dashboard, **search** for a recipient's username in the left panel.
3. Click **+** to send them a connection request.
4. Once they **accept**, their status turns green.
5. **Drag and drop** files onto the drop zone (or click to browse).
6. Files transfer instantly — no upload, directly to their browser.

### Receiving files

1. Accept the incoming connection request via the banner at the top.
2. Switch to the **Received** tab to see incoming files.
3. Click **Save** to download or **Download all** for batch download.

### Chat

1. Connect with at least one peer (accepted connection).
2. Switch to the **Chat** tab.
3. Select a peer from the list and start typing.
4. Messages are end-to-end encrypted and exist only in memory — closing the tab deletes everything.

### Login Info & Device Sessions

1. Click the **bell icon** in the header to see new login alerts.
2. Click your **username** in the header → **Login Info** to manage sessions.
3. View all active devices, see when they logged in, and **remove** any you don't recognise.
4. **Change your password** from the same panel — requires your current password.

---

## Project Structure

```
src/
├── components/
│   └── ui/              # shadcn/ui primitives
├── context/
│   └── AppContext.tsx    # Global state + P2P bridge
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/
│   ├── auth.ts          # Custom auth + device sessions
│   ├── crypto.ts        # ECDH + AES-256-GCM helpers
│   ├── fileUtils.ts     # Formatting helpers
│   ├── p2p.ts           # WebRTC P2P manager + encrypted chat
│   ├── session.ts       # localStorage session helpers
│   ├── supabase.ts      # Supabase client
│   └── utils.ts         # Tailwind merge
├── pages/
│   ├── AuthPage.tsx
│   ├── DashboardPage.tsx
│   └── not-found.tsx
├── App.tsx
├── index.css
└── main.tsx

public/
├── favicon.svg
└── robots.txt

supabase-migrations.sql  # Run in Supabase SQL Editor
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on `0.0.0.0:5173` |
| `npm run build` | Production build |
| `npm run serve` | Preview production build |
| `npm run typecheck` | TypeScript type check |

---

## Security Notes

- Passwords are hashed with **SHA-256(password + username)** before storage.
- No plaintext passwords are stored anywhere.
- Chat keys are **non-extractable** (`extractable: false`) from the Web Crypto API — they cannot be read from memory via JavaScript.
- ECDH public keys travel over the **DTLS-encrypted WebRTC DataChannel** (not Supabase Realtime), preventing server-side MITM attacks.
- There is no file or chat history — everything is discarded on disconnect or tab close.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

Licensed under the [MIT License](LICENSE).
