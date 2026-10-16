# FinSense - Personal Finance & Spending Advisor

A full-stack, cloud-ready personal finance tracker built with Next.js (App Router API), React + Vite, Tailwind CSS, and PostgreSQL via Prisma.

## Features
- **Authentication:** Secure JWT authentication with `httpOnly` cookies and rate limiting.
- **Accounts:** Track DEPOSITORY, LOAN, CREDIT, and INVESTMENT accounts.
- **Transactions:** Log income and expenses.
- **Budgets:** Set monthly budgets per category with visual progress bars.
- **Goals:** Track long-term savings goals.
- **Dashboard:** Interactive charts using Recharts for data visualization.
- **Multi-tenant Security:** Complete data isolation by user ID.

## Prerequisites
- Node.js (v18+)
- PostgreSQL (Running locally or via Docker)

## Setup Instructions

### 1. Database Setup (Docker)
If you don't have Postgres installed locally, you can quickly spin one up using Docker:
```bash
docker run --name finsense-postgres -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=finsense -p 5432:5432 -d postgres
```

### 2. Backend Setup (`/server`)
```bash
cd server
npm install

# Copy environment variables
cp .env.example .env

# Push the Prisma schema to your database
npx prisma db push

# Seed the database with default transaction categories
npx tsx prisma/seed.ts

# Start the Next.js API server
npm run dev
```

### 3. Frontend Setup (`/client`)
Open a new terminal window:
```bash
cd client
npm install
npm run dev
```

### 4. Open the App
Go to `http://localhost:5173` in your browser. Register a new account to get started!

---

## Deploying to Vercel

FinSense can be deployed to Vercel as two linked projects (Frontend + Backend) from this repository:

1. **Deploy Backend (`/server`)**:
   - Vercel Root Directory: `server`
   - Framework: `Next.js`
   - Environment Variables: `DATABASE_URL` (PostgreSQL), `JWT_SECRET`, `GEMINI_API_KEY`, `CLIENT_ORIGIN`

2. **Deploy Frontend (`/client`)**:
   - Vercel Root Directory: `client`
   - Framework: `Vite`
   - Environment Variables: `VITE_API_URL` (Your deployed backend URL)

For a detailed step-by-step walkthrough, see [VERCEL_DEPLOYMENT.md](file:///VERCEL_DEPLOYMENT.md).

