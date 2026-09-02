# 💕 Dating App — Backend

> **Scalable Dating Application Backend** built with **Node.js + Express.js + Drizzle ORM + PostgreSQL**.
>
> The backend provides authentication, user profiles, interests, preferences, likes, matches, messaging, subscriptions, notifications, safety features, and Admin APIs.

---

## 📦 Installation

### Node.js

Check Node.js:

```bash
node --version
```

Check npm:

```bash
npm --version
```

---

### Express.js

```bash
npm install express cors helmet morgan
```

---

### Authentication

```bash
npm install bcryptjs jsonwebtoken
```

---

### Validation & Utilities

```bash
npm install zod uuid
```

---

### PostgreSQL + Drizzle ORM

```bash
npm install drizzle-orm pg dotenv
```

---

### Development Dependencies

```bash
npm install -D drizzle-kit nodemon
```

---

## 📦 Complete Installation — One Command

### Production Dependencies

```bash
npm install express cors helmet morgan bcryptjs jsonwebtoken zod uuid drizzle-orm pg dotenv
```

### Development Dependencies

```bash
npm install -D drizzle-kit nodemon
```

---

# 📁 Project Structure

```text
dating-be/
├── src/
│   │
│   ├── config/
│   │   └── database.js                    ← Database/application configuration
│   │
│   ├── db/
│   │   ├── index.js                       ← Database connection (Drizzle + pg Pool)
│   │   ├── seed.js                        ← Seed file for development/master data
│   │   │
│   │   └── schema/
│   │       ├── index.js                   ← Re-exports all schemas (single entry point)
│   │       ├── users.js                   ← User accounts and authentication data
│   │       ├── profiles.js                ← User profile information
│   │       ├── photos.js                  ← User profile photos
│   │       ├── interests.js               ← Master interest data
│   │       ├── user-interests.js          ← User ↔ Interest relationships
│   │       ├── preferences.js             ← Dating preferences
│   │       ├── likes.js                   ← Likes, dislikes and super likes
│   │       ├── matches.js                 ← Mutual matches
│   │       ├── messages.js                ← Chat messages
│   │       ├── subscriptions.js           ← Premium subscriptions
│   │       ├── notifications.js           ← User notifications
│   │       ├── reports.js                 ← User/profile reports
│   │       └── blocks.js                  ← Blocked users
│   │
│   ├── controllers/
│   │   ├── auth.controller.js             ← Register / Login / Authentication
│   │   ├── user.controller.js             ← User management
│   │   ├── profile.controller.js          ← Profile management
│   │   ├── photo.controller.js            ← Photo management
│   │   ├── interest.controller.js         ← Interest management
│   │   ├── preference.controller.js       ← Dating preferences
│   │   ├── like.controller.js             ← Like / Dislike / Super Like
│   │   ├── match.controller.js            ← Match management
│   │   ├── message.controller.js          ← Messaging
│   │   ├── subscription.controller.js     ← Subscription management
│   │   ├── notification.controller.js     ← Notifications
│   │   └── admin.controller.js            ← Admin operations
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js             ← JWT authentication
│   │   ├── admin.middleware.js            ← Admin authorization
│   │   ├── validation.middleware.js       ← Request validation
│   │   └── error.middleware.js            ← Global error handling
│   │
│   ├── routes/
│   │   ├── auth.routes.js                 ← Authentication APIs
│   │   ├── user.routes.js                 ← User APIs
│   │   ├── profile.routes.js              ← Profile APIs
│   │   ├── photo.routes.js                ← Photo APIs
│   │   ├── interest.routes.js             ← Interest APIs
│   │   ├── preference.routes.js           ← Preference APIs
│   │   ├── like.routes.js                 ← Like APIs
│   │   ├── match.routes.js                ← Match APIs
│   │   ├── message.routes.js              ← Messaging APIs
│   │   ├── subscription.routes.js         ← Subscription APIs
│   │   ├── notification.routes.js         ← Notification APIs
│   │   ├── report.routes.js               ← Report APIs
│   │   ├── block.routes.js                ← Block APIs
│   │   └── admin.routes.js                ← Admin APIs
│   │
│   ├── services/
│   │   ├── auth.service.js                ← Authentication business logic
│   │   ├── user.service.js                ← User business logic
│   │   ├── profile.service.js             ← Profile business logic
│   │   ├── match.service.js               ← Matching business logic
│   │   ├── message.service.js             ← Messaging business logic
│   │   ├── notification.service.js        ← Notification business logic
│   │   └── admin.service.js               ← Admin business logic
│   │
│   ├── utils/
│   │   ├── jwt.js                         ← JWT generation / verification
│   │   ├── password.js                    ← Password hashing / comparison
│   │   ├── validation.js                  ← Validation helpers
│   │   └── response.js                    ← Standard API responses
│   │
│   ├── app.js                             ← Express application configuration
│   ├── server.js                          ← Server entry point
│   └── test-db.js                         ← Database connection test
│
├── drizzle/
│   └── migrations/                        ← Generated Drizzle migration files
│
├── uploads/
│   └── .gitkeep                           ← User-uploaded files directory
│
├── .env                                   ← Environment variables
├── .env.example                           ← Environment variable template
├── .gitignore                             ← Git ignored files
├── drizzle.config.js                     ← Drizzle Kit configuration
├── package.json                           ← Dependencies and npm scripts
├── package-lock.json                      ← Locked dependency versions
└── README.md                              ← Project documentation
```

---

# ⚙️ Tech Stack

| Layer             | Technology           | Purpose                     |
| ----------------- | -------------------- | --------------------------- |
| Runtime           | Node.js              | JavaScript runtime          |
| Framework         | Express.js           | REST API framework          |
| Language          | JavaScript           | Backend development         |
| Database          | PostgreSQL           | Primary relational database |
| ORM               | Drizzle ORM          | Type-safe database queries  |
| Migration Tool    | Drizzle Kit          | Schema migrations           |
| PostgreSQL Driver | node-postgres (`pg`) | PostgreSQL connection       |
| Authentication    | JWT                  | Token-based authentication  |
| Password Security | bcryptjs             | Password hashing            |
| Validation        | Zod                  | Request validation          |
| Security          | Helmet               | HTTP security headers       |
| CORS              | cors                 | Cross-origin requests       |
| Logging           | Morgan               | HTTP request logging        |
| Configuration     | dotenv               | Environment variables       |
| Development       | Nodemon              | Automatic server restart    |
| Utilities         | UUID                 | Unique identifiers          |

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
