# TaskFlow — Task Management App with Role-Based Access Control

## 1. Project Summary

TaskFlow is a full-stack task management web application built for the Rabbit Global Software Engineering Internship 2026 assignment. It allows users to create, assign, and track tasks through a Kanban-style board with three status columns: Todo, In Progress, and Done. The core feature is a hand-written Role-Based Access Control (RBAC) system that governs every action in the app — a Manager has full access, a Member can manage their own tasks, and a Viewer can only read. The application is built with two independent backend microservices (Auth Service and Task Service), a Next.js 14 frontend, and MongoDB Atlas as the database.

---

## 2. How to Run Locally

### Prerequisites
- Node.js 18+
- npm
- MongoDB Atlas account (or local MongoDB)
- GitHub OAuth App (for social login)

### Step 1: Clone the repository
```bash
git clone https://github.com/your-username/taskflow.git
cd taskflow
```

### Step 2: Set up environment variables

**auth-service/.env**
```env
PORT=3001
MONGODB_URI=your_mongodb_uri
JWT_SECRET=super_secret_jwt_key_taskflow_2025
JWT_REFRESH_SECRET=super_secret_refresh_key_taskflow_2025
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=7d
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback
FRONTEND_URL=http://localhost:3000
```

**task-service/.env**
```env
PORT=3002
MONGODB_URI=your_mongodb_uri
JWT_SECRET=super_secret_jwt_key_taskflow_2025
FRONTEND_URL=http://localhost:3000
```

**frontend/.env.local**
```env
GEMINI_API_KEY=your_gemini_api_key
```

### Step 3: Install dependencies
```bash
# Auth Service
cd auth-service
npm install

# Task Service
cd ../task-service
npm install

# Frontend
cd ../frontend
npm install
```

### Step 4: Start all services

Open 3 terminal tabs and run:
```bash
# Terminal 1 — Auth Service (port 3001)
cd auth-service
npm run dev

# Terminal 2 — Task Service (port 3002)
cd task-service
npm run dev

# Terminal 3 — Frontend (port 3000)
cd frontend
npm run dev
```

### Step 5: Open the app
Go to [http://localhost:3000](http://localhost:3000)

---

## 3. Seed Data

Run the seed script to populate the database with test users and tasks:
```bash
cd auth-service
npm run seed
```

---

## 4. Test Accounts

| Email | Password | Role |
|-------|----------|------|
| manager@taskflow.dev | Manager@2025! | manager |
| member@taskflow.dev | Member@2025! | member |
| viewer@taskflow.dev | Viewer@2025! | viewer |

---

## 5. API Reference

### Auth Service (port 3001)

| Method | Path | Auth Required | Role Required |
|--------|------|---------------|---------------|
| POST | /auth/register | No | — |
| POST | /auth/login | No | — |
| POST | /auth/refresh | No | — |
| POST | /auth/logout | No | — |
| GET | /auth/me | Yes | Any |
| GET | /auth/github | No | — |
| GET | /auth/github/callback | No | — |
| GET | /auth/users | Yes | Any |
| PATCH | /auth/users/:id/role | Yes | manager |

### Task Service (port 3002)

| Method | Path | Auth Required | Role Required |
|--------|------|---------------|---------------|
| GET | /tasks | Yes | manager, member, viewer |
| POST | /tasks | Yes | manager, member |
| GET | /tasks/:id | Yes | manager, member, viewer |
| PATCH | /tasks/:id | Yes | manager, member (own only) |
| DELETE | /tasks/:id | Yes | manager, member (created only) |

---

## 6. RBAC Explanation

TaskFlow implements Role-Based Access Control entirely through custom middleware — no third-party RBAC library is used. Every protected route in the Task Service follows this pattern: `route → verifyJWT() → authorize('permission') → controller`.

The `verifyJWT` middleware extracts and verifies the JWT from the Authorization header using the shared JWT_SECRET. It decodes the token and attaches the user's `userId`, `email`, `username`, and `role` to the request object. The role is embedded in the JWT by the Auth Service at login time, so the Task Service can enforce permissions without making a network call to the Auth Service.

The `authorize(permission, options)` middleware checks permissions in three steps. First, it looks up the requested permission in a `permissionMap` object that maps permission strings like `tasks:update` to allowed roles like `['manager', 'member']`. If the user's role is not in the allowed list, it returns HTTP 403 immediately. Second, if `ownerOnly: true` is passed (used for PATCH), it fetches the task from MongoDB and checks whether `task.createdBy === userId OR task.assignee === userId` — Managers bypass this check entirely. Third, if `creatorOnly: true` is passed (used for DELETE), it checks only `task.createdBy === userId`. Unauthorized access always returns 403, never 404, to avoid leaking that a resource exists.

---

## 7. AI Tool Usage

This project was built with the assistance of **Claude (claude.ai)** by Anthropic as the primary AI coding assistant.

### What Claude was used for:
- Scaffolding the initial project structure for all three services
- Writing the Express route handlers and Mongoose models
- Implementing the JWT authentication flow with refresh tokens
- Writing the `authorize()` RBAC middleware logic
- Building all Next.js pages and API proxy routes
- Debugging TypeScript compilation errors and Node.js version compatibility issues
- Writing the seed script and Docker Compose configuration

### What had to be fixed manually:
- MongoDB connection string encoding (the `@` in the password needed to be `%40`)
- TypeScript 6 + Node 25 compatibility — `ts-node-dev` had to be replaced with `tsx`
- Express 5 was installed by default but our code targeted Express 4 — had to downgrade
- The `JWT_SECRET` was missing from `task-service/.env` causing all 401 errors
- Next.js API routes needed explicit `GET`/`POST`/`PATCH`/`DELETE` exports instead of a single handler
- The `auth/callback` page needed a `Suspense` wrapper for `useSearchParams`
- File casing issue on macOS — `API.ts` needed to be renamed to `api.ts` via terminal

### Prompting approach:
Commands were given step by step — one file at a time — with screenshots of errors attached for debugging. Claude was asked to explain the RBAC middleware in detail so the implementation could be understood and discussed in interviews.

---

## 8. Known Limitations

- **Token refresh** — The access token expiry is set to 7 days for development convenience. In production this should be 15 minutes with automatic refresh.
- **No input sanitization** — Task inputs are not sanitized against XSS attacks.
- **GitHub OAuth** — Requires a GitHub OAuth app to be configured. The callback URL must match exactly.
- **AI Summary rate limits** — The Gemini API free tier has per-minute rate limits. If the summary fails, waiting 60 seconds and retrying works.
- **No pagination** — The task list fetches all tasks at once. With large datasets this would need pagination.
- **Activities collection** — Only appears in MongoDB after the first task action is performed.

---

## 9. Demo Video

[Add your Loom or YouTube Unlisted link here]

---
