# Chat Management System

React + Express + Socket.IO + Prisma.

## Project Structure
- `backend/`: Express API + Socket.IO + Prisma
- `frontend/`: React + Tailwind (Vite)
- `.github/workflows/`: CI/CD automation
- `render.yaml`: Render blueprint for backend service

## Local Development
1. Install dependencies at repo root:
   - `npm install`
2. Configure environment files:
   - `backend/.env` (copy from `backend/.env.example`)
   - `frontend/.env` (copy from `frontend/.env.example`)
3. Start both apps:
   - `npm run dev`

Default URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Production Target (Low-Risk)
- Frontend: Vercel
- Backend: Render
- Database: Neon Postgres
- CI/CD: GitHub Actions

## One-Time Setup

### 1) Create Neon Database
1. Create a Neon project and database.
2. Copy the connection string (`postgresql://...`).
3. Ensure SSL mode is enabled (`sslmode=require`).

### 2) Configure Render Backend
1. In Render, create a Web Service from this repo, `backend` root directory.
2. Start command: `npm start`
3. Add environment variables:
   - `DATABASE_URL` = Neon connection string
   - `FRONTEND_URL` = your Vercel URL
   - `PORT` = `5000` (optional)
4. Import `render.yaml` if you prefer blueprint setup.

### 3) Configure Vercel Frontend
1. Create a Vercel project from `frontend` directory.
2. Set:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add environment variables:
   - `VITE_API_URL=https://<your-render-service>.onrender.com/api`
   - `VITE_SOCKET_URL=https://<your-render-service>.onrender.com`

### 4) Configure GitHub Actions Secrets
In GitHub repo settings -> Secrets and variables -> Actions, add:
- `DATABASE_URL` (Neon connection string)
- `RENDER_DEPLOY_HOOK_URL` (Render deploy hook URL)
- `VERCEL_DEPLOY_HOOK_URL` (Vercel deploy hook URL)

## What Is Automated
- CI on push/PR (`.github/workflows/ci.yml`):
  - Backend install + Prisma client generation
  - Frontend install + build
- Deploy on push to `main` (`.github/workflows/deploy.yml`):
  - Applies Prisma schema to Neon via `prisma db push`
  - Triggers Render deploy hook
  - Triggers Vercel deploy hook

## Backend Database Commands
From `backend/`:
- Generate client: `npm run prisma:generate`
- Sync schema to DB: `npm run prisma:db:push`
- Seed sample data: `npm run prisma:seed`
- Prepare deploy DB step: `npm run deploy:prepare`

## Notes
- Prisma provider is set to `postgresql` for Neon compatibility.
- This repo is ready for automated deploy once pushed to GitHub and secrets are added.
