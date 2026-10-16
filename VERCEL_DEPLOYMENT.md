# Vercel Deployment Guide for FinSense

FinSense is architected as a monorepo consisting of:
1. **Backend Server (`server/`)**: Next.js 16 App Router API with Prisma ORM & PostgreSQL.
2. **Frontend Client (`client/`)**: React 19 + Vite 8 SPA.

Both the backend and frontend are deployed onto Vercel as two linked projects from this GitHub repository (`Cloud-Computing`).

---

## Architecture Overview

```
                      ┌───────────────────────────────┐
                      │    Client (Vercel Project)    │
                      │   https://finsense.vercel.app │
                      └───────────────┬───────────────┘
                                      │
                         Cross-Origin (HTTPS)
                         Credentials: 'include'
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    Server (Vercel Project)    │
                      │ https://finsense-api.vercel.app│
                      └───────────────┬───────────────┘
                                      │
                              Prisma Client
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │ Hosted PostgreSQL (Neon/Supabase)
                      └───────────────────────────────┘
```

---

## Step 1: Database Setup (Free PostgreSQL)

Vercel Serverless functions require an external hosted PostgreSQL database. You can get one for free in 60 seconds from:
- [Neon](https://neon.tech) (Recommended - instant serverless Postgres with pooling)
- [Supabase](https://supabase.com)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

Copy your connection string (`DATABASE_URL`). Example:
```
postgresql://user:password@ep-cool-fog-123456.us-east-2.aws.neon.tech/finsense?sslmode=require
```

---

## Step 2: Deploy the Backend API (`server`)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** > **"Project"**.
2. Select your repository: `anmaynayak-del/Cloud-Computing`.
3. Configure the project:
   - **Project Name**: `finsense-api` (or any name you prefer)
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click **Edit** and select **`server`**.
4. Expand **Environment Variables** and add:
   - `DATABASE_URL`: Your Supabase transaction pooler connection string (Port 6543, `?pgbouncer=true`).
   - `DIRECT_URL`: Your Supabase session connection string (Port 5432).
   - `JWT_SECRET`: A random secure string (e.g. `openssl rand -hex 32` or any random 32+ character string).
   - `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API key from Google AI Studio.
   - `CLIENT_ORIGIN`: Your client's Vercel URL (e.g. `https://finsense.vercel.app`). *Tip: You can add or update this after deploying the client.*
5. Click **Deploy**.
6. Once deployed, note down your backend URL (e.g. `https://finsense-api.vercel.app`).

### Initialize the Database Schema:
From your local terminal, run `prisma db push` to create tables in your remote database:
```bash
cd server
DATABASE_URL="your-production-database-url" npx prisma db push
DATABASE_URL="your-production-database-url" npx tsx prisma/seed.ts
```

---

## Step 3: Deploy the Frontend Client (`client`)

1. In your [Vercel Dashboard](https://vercel.com/dashboard), click **"Add New..."** > **"Project"** again.
2. Select the **same** repository: `anmaynayak-del/Cloud-Computing`.
3. Configure the project:
   - **Project Name**: `finsense-app` (or any name you prefer)
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select **`client`**.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_URL`: Your deployed backend URL from Step 2 (e.g. `https://finsense-api.vercel.app`).
5. Click **Deploy**.

---

## Step 4: Verify Deployment

1. Visit your frontend Vercel URL (`https://finsense-app.vercel.app`).
2. Click **Create FinSense Account** to register a new user.
3. Test creating accounts, transactions, budgets, goals, and interacting with the AI adviser.
4. If needed, go back to your `finsense-api` project settings on Vercel and ensure `CLIENT_ORIGIN` matches your frontend domain `https://finsense-app.vercel.app`.
