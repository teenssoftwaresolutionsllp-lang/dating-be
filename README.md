# 💕 Dating App — Backend

> **Scalable Dating Application Backend** built with **TypeScript + Node.js + Express.js + Drizzle ORM + PostgreSQL**.
>
> The backend provides authentication, user profiles, interests, preferences, likes, matches, messaging, subscriptions, notifications, safety features, and Admin APIs.

---

## 📦 Installation & Setup

### Install Dependencies

```bash
npm install
```

### TypeScript Development Dependencies

```bash
npm install -D typescript tsx @types/node @types/express @types/cors @types/jsonwebtoken @types/bcryptjs @types/morgan @types/pg drizzle-kit
```

---

## 🚀 Running the Project

### Development Server (with hot reload)
```bash
npm run dev
```

### Type Checking & Build
```bash
npm run typecheck
npm run build
```

### Run Tests
```bash
npm test            # Logic & unit tests
npm run test:api    # API validation tests
npm run test:live   # Live PostgreSQL flow tests
npm run test:db     # Database connectivity test
```

---

# 📁 Project Structure

```text
dating-be/
├── src/
│   │
│   ├── config/
│   │   ├── constants.ts                   ← Application constants & languages
│   │   └── database.ts                    ← Database/application configuration
│   │
│   ├── db/
│   │   ├── index.ts                       ← Database connection (Drizzle + pg Pool)
│   │   ├── migrate.ts                     ← Database migration runner
│   │   │
│   │   └── schema/
│   │       ├── index.ts                   ← Re-exports all schemas & inferred types
│   │       ├── users.ts                   ← User accounts and authentication schema
│   │       ├── otp-verifications.ts       ← OTP verification records
│   │       ├── user-sessions.ts           ← Active JWT user sessions
│   │       └── social-accounts.ts         ← Social OAuth login records
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts             ← Register / Login / Authentication
│   │   ├── user.controller.ts             ← User management
│   │   ├── profile.controller.ts          ← Profile management
│   │   ├── match.controller.ts            ← Match management
│   │   ├── message.controller.ts          ← Messaging
│   │   └── admin.controller.ts            ← Admin operations
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts             ← JWT authentication & req.user attachment
│   │   ├── admin.middleware.ts            ← Admin authorization
│   │   ├── validation.middleware.ts       ← Request body & parameter validation
│   │   └── error.middleware.ts            ← Async & global error handling
│   │
│   ├── routes/
│   │   ├── auth.routes.ts                 ← Authentication & onboarding APIs
│   │   ├── user.routes.ts                 ← User APIs
│   │   ├── profile.routes.ts              ← Profile APIs
│   │   ├── match.routes.ts                ← Match APIs
│   │   ├── message.routes.ts              ← Messaging APIs
│   │   └── admin.routes.ts                ← Admin APIs
│   │
│   ├── services/
│   │   ├── auth.service.ts                ← Authentication & OTP business logic
│   │   ├── user.service.ts                ← User business logic
│   │   ├── profile.service.ts             ← Profile business logic
│   │   ├── match.service.ts               ← Matching business logic
│   │   └── message.service.ts             ← Messaging business logic
│   │
│   ├── types/
│   │   └── index.ts                       ← Centralized TypeScript interfaces & models
│   │
│   ├── utils/
│   │   ├── jwt.ts                         ← JWT generation / verification
│   │   ├── otp.ts                         ← 4-digit OTP generation & SMS simulation
│   │   ├── password.ts                    ← Password hashing / comparison
│   │   └── response.ts                    ← Standard API response formatter
│   │
│   ├── app.ts                             ← Express application setup & middleware
│   ├── server.ts                          ← Server entry point
│   ├── test-auth-flow.ts                  ← Logic & unit tests
│   ├── test-api-validation.ts             ← API route validation tests
│   ├── test-live-auth.ts                  ← Live DB auth flow tests
│   └── test-db.ts                         ← Database connection test
│
├── drizzle/                               ← Drizzle SQL migrations & snapshots
├── .env                                   ← Environment variables
├── .env.example                           ← Environment variable template
├── .gitignore                             ← Git ignored files (including dist/)
├── tsconfig.json                          ← TypeScript configuration
├── drizzle.config.ts                      ← Drizzle Kit TypeScript configuration
├── package.json                           ← Dependencies and npm scripts
├── package-lock.json                      ← Locked dependency versions
└── README.md                              ← Project documentation
```

---

# ⚙️ Tech Stack

| Layer             | Technology           | Purpose                     |
| ----------------- | -------------------- | --------------------------- |
| Runtime           | Node.js              | JavaScript / TS runtime     |
| Language          | TypeScript           | Strict static typing        |
| Framework         | Express.js           | REST API framework          |
| Database          | PostgreSQL           | Primary relational database |
| ORM               | Drizzle ORM          | Type-safe database queries  |
| Migration Tool    | Drizzle Kit          | Schema migrations           |
| PostgreSQL Driver | node-postgres (`pg`) | PostgreSQL connection       |
| Authentication    | JWT (`jsonwebtoken`) | Token-based authentication  |
| Password Security | bcryptjs             | Password hashing            |
| Security          | Helmet               | HTTP security headers       |
| CORS              | cors                 | Cross-origin requests       |
| Logging           | Morgan               | HTTP request logging        |
| Configuration     | dotenv               | Environment variables       |
| TS Execution/Dev  | tsx                  | TypeScript dev runtime      |

---

# 🚀 Setup — Step by Step

## 1. Create Project

```bash
mkdir dating-be
cd dating-be
```

Initialize Node.js:

```bash
npm init -y
```

---

## 2. Install Express.js

```bash
npm install express cors helmet morgan
```

---

## 3. Install Authentication Packages

```bash
npm install bcryptjs jsonwebtoken
```

---

## 4. Install Validation & Utilities

```bash
npm install zod uuid
```

---

## 5. Install PostgreSQL + Drizzle ORM

```bash
npm install drizzle-orm pg dotenv
```

---

## 6. Install Development Tools

```bash
npm install -D drizzle-kit nodemon
```

---

# 🐘 PostgreSQL Setup

Check PostgreSQL:

```bash
psql --version
```

Connect:

```bash
psql -U postgres
```

Create the database:

```sql
CREATE DATABASE dating_app;
```

Connect to the database:

```sql
\c dating_app
```

Check tables:

```sql
\dt
```

Exit:

```sql
\q
```

---

# 🔐 Environment Configuration

Create `.env` in the project root:

```env
PORT=5000

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/dating_app

JWT_SECRET=your_super_secret_jwt_key

JWT_EXPIRES_IN=7d

NODE_ENV=development
```

> ⚠️ Never commit `.env` to GitHub.

Create `.env.example`:

```env
PORT=5000

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/dating_app

JWT_SECRET=your_super_secret_jwt_key

JWT_EXPIRES_IN=7d

NODE_ENV=development
```

---

# 🗄️ Drizzle ORM Setup

Install:

```bash
npm install drizzle-orm pg dotenv
```

Install Drizzle Kit:

```bash
npm install -D drizzle-kit
```

---

## Drizzle Configuration

Create:

```text
drizzle.config.js
```

```javascript
import "dotenv/config";

export default {
  schema: "./src/db/schema/*.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
```

---

# 🔄 Drizzle Database Commands

### Generate migration SQL files from schema

```bash
npm run db:generate
```

### Apply migrations to PostgreSQL

```bash
npm run db:migrate
```

### Push schema directly to PostgreSQL

```bash
npm run db:push
```

> **`db:push`** skips migration files and directly synchronizes the schema. Use it mainly during development.

### Open Drizzle Studio

```bash
npm run db:studio
```

Drizzle Studio provides a visual interface for viewing and managing database data.

---

# 🌱 Database Seeding

Seed development/master data:

```bash
npm run db:seed
```

If using the seed file directly:

```bash
node src/db/seed.js
```

---

# 📜 Package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",

    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "node src/db/seed.js"
  }
}
```

---

# 🧪 Database Connection Test

Run:

```bash
node src/test-db.js
```

Expected:

```text
✅ Database connected successfully!
Users: []
```

---

# ▶️ Run Backend

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

Backend URL:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

---

# 🔄 Database Change Workflow

When the database schema changes:

```bash
npm run db:generate
```

Then:

```bash
npm run db:migrate
```

For development-only direct synchronization:

```bash
npm run db:push
```

---

# 📦 Final Dependency List

## Dependencies

```text
express
cors
helmet
morgan
bcryptjs
jsonwebtoken
zod
uuid
drizzle-orm
pg
dotenv
```

## DevDependencies

```text
drizzle-kit
nodemon
```

---

# 🗃️ Database Schema

The initial Dating App database contains the following core tables:

```text
users
profiles
photos
interests
user_interests
preferences
likes
matches
messages
subscriptions
notifications
reports
blocks
```

Additional tables can be added as the application requirements grow.

---

# 🔒 Security Packages

The backend uses:

```text
bcryptjs       → Password hashing
jsonwebtoken   → JWT authentication
helmet         → HTTP security headers
cors           → Cross-origin request handling
zod            → Request validation
dotenv         → Environment configuration
```

---

# 🛠️ Development Tools

Recommended tools:

```text
Node.js
npm
PostgreSQL
pgAdmin 4
VS Code
Postman
Drizzle Studio
Git
GitHub
Nodemon
```

---

# 📋 Quick Start

For an existing project:

```bash
cd dating-be
```

Install all packages:

```bash
npm install
```

Check database:

```bash
node src/test-db.js
```

Generate schema migration:

```bash
npm run db:generate
```

Apply migration:

```bash
npm run db:migrate
```

Start backend:

```bash
npm run dev
```

Open:

```text
http://localhost:5000
```

---

# ✅ Current Setup

```text
Node.js                 ✅
npm                     ✅
Express.js              ✅
PostgreSQL              ✅
pg                      ✅
Drizzle ORM             ✅
Drizzle Kit             ✅
dotenv                  ✅
bcryptjs                ✅
jsonwebtoken            ✅
cors                    ✅
helmet                  ✅
morgan                  ✅
nodemon                 ✅
Zod                     ✅
UUID                    ✅
```
