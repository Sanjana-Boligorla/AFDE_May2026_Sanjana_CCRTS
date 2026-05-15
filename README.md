# Customer Complaint & Resolution Tracking System

A full-stack enterprise web application for managing customer complaints from registration through resolution, with SLA tracking, escalation workflows, and real-time analytics.

## Features

- **Role-Based Access Control** — Admin, Supervisor, Support Agent, Customer
- **Complaint Lifecycle Management** — Open → Assigned → In Progress → Resolved → Closed
- **SLA Tracking & Auto-Escalation** — Priority-based SLA timers with breach alerts
- **Real-Time Dashboard** — Metrics, charts, agent performance, trends
- **Notification System** — In-app + Email (Gmail SMTP via Nodemailer)
- **File Attachments** — Attach supporting documents to complaints
- **Feedback & Rating** — Customer satisfaction scores post-resolution
- **Secure Auth** — JWT + Refresh Tokens, bcrypt, forgot/reset password via email

## Technology Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React.js (Vite) + Tailwind CSS |
| Backend   | Node.js + Express.js |
| Database  | MySQL |
| Auth      | JWT (jsonwebtoken) + bcryptjs |
| Email     | Nodemailer (Gmail SMTP) |
| Charts    | Recharts |

## Project Structure

```
project-root/
├── frontend/          # React + Vite + Tailwind CSS
├── backend/           # Node.js + Express REST API
├── database/          # MySQL schema & seed scripts
├── screenshots/       # UI screenshots
├── docs/              # API documentation
├── README.md
└── .gitignore
```

## Setup Instructions

### Prerequisites
- Node.js >= 18
- MySQL >= 8.0
- npm >= 9

### 1. Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Run schema and seed
source database/schema.sql
source database/seed.sql
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials and Gmail SMTP settings
npm install
npm run dev
```

Backend runs at: `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

## Demo Credentials

| Role       | Email                               | Password   |
|------------|-------------------------------------|------------|
| Admin      | admin@complainttracker.com          | Admin@123  |
| Supervisor | supervisor@complainttracker.com     | Admin@123  |
| Agent      | agent1@complainttracker.com         | Admin@123  |
| Customer   | customer1@example.com               | Admin@123  |

## API Endpoints

### Auth
| Method | Endpoint                    | Description              | Auth |
|--------|-----------------------------|--------------------------|------|
| POST   | /api/auth/register          | Customer self-register   | ❌   |
| POST   | /api/auth/login             | Login                    | ❌   |
| GET    | /api/auth/me                | Get current user         | ✅   |
| POST   | /api/auth/refresh-token     | Refresh access token     | ❌   |
| POST   | /api/auth/forgot-password   | Send reset email         | ❌   |
| POST   | /api/auth/reset-password    | Reset password           | ❌   |
| POST   | /api/auth/change-password   | Change password          | ✅   |

### Users
| Method | Endpoint         | Description              | Role           |
|--------|-----------------|--------------------------|----------------|
| GET    | /api/users      | List all users           | Admin/Supervisor |
| POST   | /api/users      | Create user              | Admin          |
| PUT    | /api/users/:id  | Update user              | Admin          |
| DELETE | /api/users/:id  | Deactivate user          | Admin          |
| GET    | /api/users/agents | List agents for assignment | Admin/Supervisor |
| GET    | /api/users/profile | Own profile            | All            |

### Categories
| Method | Endpoint              | Description     | Role  |
|--------|-----------------------|-----------------|-------|
| GET    | /api/categories       | List categories | All   |
| POST   | /api/categories       | Create category | Admin |
| PUT    | /api/categories/:id   | Update category | Admin |

## Milestones

| Milestone | Scope | Status |
|-----------|-------|--------|
| **1** | Project scaffold, MySQL schema, Auth APIs, Login/Register UI | ✅ Complete |
| **2** | Complaint CRUD, workflow, assignment, history, file uploads | 🔄 Next |
| **3** | Dashboard analytics, SLA tracking, escalation, notifications, feedback | 🔜 Planned |

## Screenshots

*(To be added after each milestone)*

## Author

Sanjana — Prodapt FDE Capstone Project
