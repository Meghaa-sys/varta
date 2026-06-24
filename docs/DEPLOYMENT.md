# Deployment Guide

## Required Services

- PostgreSQL database
- Cloudinary account for avatars and message attachments
- Google Gemini API key for language detection and translation
- Node.js 22 runtime or Docker

## Backend Environment

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?schema=public
JWT_SECRET=long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend.example.com
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-flash-latest
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
MAX_FILE_SIZE_MB=15
MAX_FILES_PER_MESSAGE=5
```

## Frontend Environment

```env
VITE_API_URL=https://your-api.example.com/api
VITE_SOCKET_URL=https://your-api.example.com
```

## Docker

Build and run:

```bash
docker compose up --build
```

For managed hosting, deploy `backend/Dockerfile` and `frontend/Dockerfile` as separate services. Run Prisma migrations before exposing the backend:

```bash
npx prisma migrate deploy
```

## Production Checklist

- Use a strong `JWT_SECRET`.
- Restrict `CLIENT_URL` to the deployed frontend origin.
- Use managed PostgreSQL with backups.
- Configure Cloudinary upload presets and account-level limits.
- Monitor Gemini quota and add billing alerts.
- Terminate TLS at the load balancer or platform.
- Add an application log drain and uptime checks for `/health`.
- Run `npm run build` before publishing images.

## Render Blueprint

The repository includes `render.yaml` for a managed deployment with:

- `varta-api`: Node.js backend with Socket.IO.
- `varta-web`: React static frontend with React Router rewrites.
- `varta-postgres`: managed PostgreSQL database.

Steps:

1. Push this repository to GitHub or GitLab.
2. In Render, create a new Blueprint from the repository.
3. When Render asks for secret values, enter `GEMINI_API_KEY` and the Cloudinary credentials.
4. Deploy once, then confirm the generated service URLs. If Render changes either subdomain, update:
   - Backend `CLIENT_URL`
   - Frontend `VITE_API_URL`
   - Frontend `VITE_SOCKET_URL`

Render runs `npx prisma migrate deploy` before starting the backend, so the production database is migrated automatically.
