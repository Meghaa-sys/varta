# Varta Release Checklist

## Open Locally

- App: http://localhost:5173/app
- Login page: http://localhost:5173/login
- Backend health: http://localhost:4000/health

Seed users use password `Password123!`.

## Recommended Hosting: Render Blueprint

This project includes `render.yaml`, which creates:

- `varta-api`: Node/Express/Socket.IO backend
- `varta-web`: React/Vite static frontend
- `varta-postgres`: managed PostgreSQL database

## Before Deploying

1. Push the project to GitHub or GitLab.
2. Do not commit `backend/.env` or `frontend/.env`.
3. In Render, create a new Blueprint from the repository.
4. Enter secret values when Render asks:
   - `GEMINI_API_KEY`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. Let Render create the PostgreSQL database from `render.yaml`.
6. After deploy, open:
   - `https://varta-web.onrender.com`
   - `https://varta-api.onrender.com/health`

## If Render Gives Different URLs

Update these values in Render:

- Backend `CLIENT_URL`: your frontend URL
- Frontend `VITE_API_URL`: your backend URL plus `/api`
- Frontend `VITE_SOCKET_URL`: your backend URL without `/api`

## Production Test

After deploy:

1. Register two users in two different browsers.
2. Search by username and start a chat.
3. Send a text message.
4. Send an image or document.
5. Record a voice message.
6. Toggle Auto Translate on and confirm translated messages appear.
7. Check backend health at `/health`.