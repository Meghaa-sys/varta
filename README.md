# Varta - AI-Powered Real-Time Chat

Production-ready full-stack chat application inspired by WhatsApp and Discord, with private messaging, groups, file sharing, realtime presence, notifications, and Gemini-powered live translation.

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios, Socket.IO Client
- Backend: Node.js, Express, Socket.IO, JWT, Multer, Cloudinary
- Database: PostgreSQL, Prisma ORM
- AI: Google Gemini API for language detection, translation, and regional slang mode
- Deployment: Docker, Docker Compose, production Dockerfiles

## Features

- Register, login, JWT authentication, avatar upload, user preferences
- Contacts with request, accept, remove, and direct-message flow
- Private conversations and group chats with admin controls
- Realtime messages, typing indicators, reactions, replies, read receipts
- Image, PDF, document, and voice-message sharing through Cloudinary
- Online/offline presence, last seen, active member status
- Notifications and unread badges
- Manual translation from the message action bar
- Auto translation per user based on preferred language
- Translation cache in PostgreSQL to avoid repeated Gemini calls
- Supported languages: English, Malayalam, Hindi, Tamil, Telugu, Kannada

## Project Structure

```text
backend/
  prisma/                Prisma schema, migration, and seed data
  src/
    config/              Environment, Prisma, Cloudinary
    constants/           Supported language metadata
    middleware/          Auth, validation, uploads, errors
    modules/             Auth, conversations, messages, notifications, translation
    realtime/            Socket.IO server and events
frontend/
  src/
    api/                 Axios API wrappers
    components/          Chat UI components
    constants/           Frontend language metadata
    lib/                 Axios and socket helpers
    pages/               Login and chat screens
    state/               Auth context
docs/
  API.md                 REST API reference
  SOCKET_EVENTS.md       Realtime event reference
  DEPLOYMENT.md          Deployment guide
```

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment files:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

4. Update `backend/.env` with:

   - `DATABASE_URL`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

5. Create tables and seed sample users:

   ```bash
   npm run prisma:migrate --workspace backend
   npm run seed --workspace backend
   ```

6. Run both apps:

   ```bash
   npm run dev
   ```

7. Open:

   - Frontend: http://localhost:5173
   - Backend health: http://localhost:4000/health

Seeded users use password `Password123!`.

## Docker Setup

```bash
docker compose up --build
```

The compose stack starts:

- PostgreSQL on `localhost:5432`
- Backend on `localhost:4000`
- Frontend on `localhost:5173`

For production, set real values for `JWT_SECRET`, `GEMINI_API_KEY`, and Cloudinary credentials before starting the stack.

## Translation Flow

1. User sends a message.
2. Backend stores the original text and detects language when Gemini is configured.
3. Manual translation calls `POST /api/messages/:messageId/translate`.
4. Auto translation is handled by the frontend for incoming messages when enabled in user preferences.
5. Backend checks the `Translation` table first.
6. Missing translations are generated with Gemini and cached by message, target language, and slang mode.

## Useful Commands

```bash
npm run build
npm run lint
npm run prisma:generate
npm run prisma:migrate --workspace backend
npm run prisma:studio --workspace backend
```

## API Docs

See [docs/API.md](docs/API.md) and [docs/SOCKET_EVENTS.md](docs/SOCKET_EVENTS.md).
