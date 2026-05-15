# API Documentation
## Customer Complaint & Resolution Tracking System

Base URL: `http://localhost:5000/api`

All protected routes require: `Authorization: Bearer <token>`

---

## Authentication

### POST `/auth/register`
Register a new customer account.

**Body:**
```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "password": "Password@123",
  "phone": "+1-555-0100"
}
```
**Response:** `201` — Returns user object + JWT token

---

### POST `/auth/login`
Login with email and password.

**Body:**
```json
{
  "email": "admin@complainttracker.com",
  "password": "Admin@123"
}
```
**Response:** `200` — Returns user object + access token + refresh token

---

### GET `/auth/me`
Get currently authenticated user. 🔒

**Response:** `200` — Returns user profile

---

### POST `/auth/forgot-password`
Send password reset email.

**Body:** `{ "email": "user@example.com" }`

**Response:** `200` — Reset link sent to email

---

### POST `/auth/reset-password`
Reset password using token from email.

**Body:** `{ "token": "...", "password": "NewPassword@123" }`

**Response:** `200` — Password reset successfully

---

### POST `/auth/change-password`
Change password for authenticated user. 🔒

**Body:** `{ "currentPassword": "...", "newPassword": "..." }`

---

### POST `/auth/refresh-token`
Get a new access token using refresh token.

**Body:** `{ "refreshToken": "..." }`

---

## Complaints

### GET `/complaints` 🔒
List complaints. Filters by role automatically.

**Query Params:** `status`, `priority`, `category`, `search`, `page`, `limit`

**Response:**
```json
{
  "success": true,
  "data": {
    "complaints": [...],
    "pagination": { "total": 25, "page": 1, "pages": 3, "limit": 10 }
  }
}
```

---

### GET `/complaints/stats` 🔒
Get complaint statistics for dashboard.

**Response:** Returns totals, recent complaints, monthly trends, SLA data

---

### GET `/complaints/:id` 🔒
Get single complaint with history, attachments, and feedback.

---

### POST `/complaints` 🔒 (Customer, Admin)
Create a new complaint. Supports file attachments (multipart/form-data).

**Body:**
```json
{
  "title": "Internet outage",
  "category_id": 2,
  "description": "Service has been down since...",
  "priority": "High"
}
```
**Response:** `201` — Returns `complaintId` and `complaintNumber`

---

### PUT `/complaints/:id/assign` 🔒 (Admin, Supervisor)
Assign complaint to a support agent.

**Body:** `{ "agent_id": 3 }`

---

### PUT `/complaints/:id/status` 🔒 (Admin, Supervisor, Agent)
Update complaint status. Supports file attachments.

**Body:**
```json
{
  "status": "Resolved",
  "comment": "Issue fixed after applying patch"
}
```

**Valid statuses:** `Open` → `Assigned` → `In Progress` → `Pending Customer Response` → `Escalated` → `Resolved` → `Closed`

---

### POST `/complaints/:id/feedback` 🔒 (Customer)
Submit feedback after resolution. Auto-closes the complaint.

**Body:** `{ "rating": 5, "comments": "Great support!" }`

---

## Users

### GET `/users` 🔒 (Admin, Supervisor)
List all users with pagination and filters.

**Query Params:** `role`, `search`, `page`, `limit`

---

### GET `/users/profile` 🔒
Get authenticated user's own profile.

---

### PUT `/users/profile` 🔒
Update authenticated user's name and phone.

---

### GET `/users/agents` 🔒 (Admin, Supervisor)
List active agents with their active complaint count (for assignment).

---

### POST `/users` 🔒 (Admin)
Create a new user (any role).

**Body:** `{ "name": "...", "email": "...", "password": "...", "role": "Agent", "phone": "..." }`

---

### PUT `/users/:id` 🔒 (Admin)
Update a user's name, phone, role, or active status.

---

### DELETE `/users/:id` 🔒 (Admin)
Deactivate a user (soft delete).

---

## Categories

### GET `/categories` 🔒
List all active categories.

### POST `/categories` 🔒 (Admin)
Create a new category.

**Body:** `{ "name": "New Category", "description": "..." }`

### PUT `/categories/:id` 🔒 (Admin)
Update or activate/deactivate a category.

---

## Dashboard

### GET `/dashboard/stats` 🔒
Full analytics data including totals, trends, agent performance, category breakdown.

### GET `/dashboard/sla-breaches` 🔒 (Admin, Supervisor)
List all active SLA breaches. Also auto-marks newly overdue complaints.

---

## Notifications

### GET `/notifications` 🔒
Get notifications for the logged-in user (last 50).

**Response:** `{ notifications: [...], unreadCount: 3 }`

### PUT `/notifications/read-all` 🔒
Mark all notifications as read.

### PUT `/notifications/:id/read` 🔒
Mark a single notification as read.

---

## Health Check

### GET `/health`
Check if the API is running.

**Response:** `{ "success": true, "message": "Complaint Tracker API is running.", "version": "1.0.0" }`

---

## Error Response Format

All errors return a consistent structure:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [{ "field": "email", "message": "Valid email is required" }]
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 409 | Conflict (duplicate entry) |
| 422 | Validation Error |
| 500 | Internal Server Error |
