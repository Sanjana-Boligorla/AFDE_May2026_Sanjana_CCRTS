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
| ETL       | Python 3 + Pandas |
| Dataset   | CSV (250 records) |

## Project Structure

```
project-root/
├── frontend/          # React + Vite + Tailwind CSS
├── backend/           # Node.js + Express REST API
├── database/          # MySQL schema, seed & analytics schema
├── datasets/          # complaints_dataset.csv (250 records)
├── etl/               # Python ETL pipeline
│   ├── etl_pipeline.py
│   └── requirements.txt
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

## ETL Workflow (Phase 2)

The ETL pipeline ingests complaint records from a CSV dataset and loads processed analytics into dedicated MySQL tables.

```
datasets/complaints_dataset.csv
          │
          ▼
  ┌──────────────┐
  │   EXTRACT    │  Read CSV with Pandas (250 records)
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  TRANSFORM   │  • Standardise field casing
  └──────┬───────┘  • Parse & validate dates
         │          • Recompute SLA breach flags
         │          • Calculate resolution hours
         │          • Derive breach_hours (time over SLA)
         │          • Build report_month grouping key
         ▼
  ┌──────────────┐
  │     LOAD     │  Writes into 4 analytics tables:
  └──────────────┘  • sla_analytics         (1 row per complaint)
                    • category_analytics     (monthly × category)
                    • agent_performance_analytics (monthly × agent)
                    • monthly_summary_analytics  (1 row per month)
```

### Running the ETL Pipeline

```bash
# 1. Set up Python dependencies
cd etl
pip install -r requirements.txt

# 2. Run the analytics schema (one-time setup)
# In MySQL Workbench: run database/analytics_schema.sql

# 3. Execute the pipeline
python etl_pipeline.py

# 4. Custom dataset path (optional)
python etl_pipeline.py --file ../datasets/my_custom.csv
```

### Analytics Tables

| Table | Description |
|-------|-------------|
| `sla_analytics` | Per-complaint SLA detail (breach flag, hours over SLA, resolution time) |
| `category_analytics` | Monthly totals per complaint category |
| `agent_performance_analytics` | Monthly resolution rate & SLA compliance per agent |
| `monthly_summary_analytics` | High-level monthly dashboard metrics |
| `etl_runs` | Audit log of each pipeline execution |

## Phase Milestones

### Phase 1

| Milestone | Scope | Status |
|-----------|-------|--------|
| **1** | Project scaffold, MySQL schema, Auth APIs, Login/Register UI | ✅ Complete |
| **2** | Complaint CRUD, workflow, assignment, history, file uploads | ✅ Complete |
| **3** | Dashboard analytics, SLA tracking, notifications, reports, profile | ✅ Complete |

### Phase 2

| Milestone | Scope | Status |
|-----------|-------|--------|
| **1** | CSV dataset (250 records), analytics DB tables, Python ETL pipeline | ✅ Complete |
| **2** | Backend analytics APIs (SLA reports, category, agent, trends) | 🔄 Next |
| **3** | Frontend analytics dashboard powered by ETL data | ⏳ Pending |

## Screenshots

*(To be added after each milestone)*

## Author

Sanjana — Prodapt FDE Capstone Project
