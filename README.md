# وَظِيف (Wazeef) - منصة التوظيف الذكي

Full-stack hiring/recruitment web application with voice recording, job management, agent/referral system, frozen amounts tracking, email verification, and animated particle background.

## Tech Stack

- **Backend:** Node.js + Express.js
- **Database:** SQLite (better-sqlite3)
- **Frontend:** HTML5 + CSS3 + Vanilla JavaScript (no framework)
- **Email:** Nodemailer (Gmail SMTP)
- **Auth:** JWT (JSON Web Tokens) + bcryptjs
- **Security:** Helmet + express-rate-limit

## Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/MohamedSamiAG/wazef.git
cd wazef
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the server
```bash
node server.js
```

Server runs on `http://localhost:3000`

### 4. Access the app
- **Login page:** `http://localhost:3000/`
- **Admin dashboard:** `http://localhost:3000/admin`
- **Agent dashboard:** `http://localhost:3000/agent`
- **User dashboard:** `http://localhost:3000/dashboard`

## Default Admin Accounts

| Email | Password | Role |
|-------|----------|------|
| mohamed.sami.gawad@gmail.com | Sm@2024!Wazef#Xk9 | admin |
| Youssafmohamed999@gmail.com | Ys@2024!Wazef#Mp7 | admin |
| 1stvampiresslayer@gmail.com | Vp@2024!Wazef#Qz3 | admin |

## Environment Variables (Optional)

If deploying to production, set these environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `JWT_SECRET` | `sss_super_secret_key_2024` | Secret key for JWT token signing |
| `SMTP_USER` | `mohamedfaron297@gmail.com` | Gmail address for sending emails |
| `SMTP_PASS` | `ushf stxg rmgp xhig` | Gmail app password |

If not set, the app uses hardcoded defaults in `server.js`.

## Project Structure

```
wazef/
├── server.js              # Express server + all API routes
├── package.json           # Dependencies
├── public/
│   ├── login.html         # Login/Register/Forgot Password/Email Verification
│   ├── dashboard.html     # User dashboard (recording, jobs, selections)
│   ├── admin.html         # Admin dashboard (apps, jobs, agents, finance)
│   └── agent.html         # Agent/referral dashboard
├── uploads/
│   ├── wazef.png          # Logo image
│   └── *.webm             # Voice recordings (auto-generated)
├── app.db                 # SQLite database (auto-created)
└── .gitignore
```

## Features

### User
- Registration with 13 required fields + email verification (6-digit code)
- Voice recording (Web Audio API)
- Job listings with company name, position, interview time, salary range
- Selection tracking with status (pending/confirmed/cancelled)
- Forgot password flow (email code → reset token → new password)
- Animated particle background (gold particles + bokeh on black)

### Admin
- Application management (approve/reject/re-record/allow-reapply)
- Job management (add single/batch jobs with optional company email)
- Agent management (create/disable agents, view referral stats)
- Selection management (confirm/cancel with frozen amounts, unfreeze/apologize)
- Financial dashboard (earnings, frozen amounts, agent breakdown)
- All data sent to company email when company_email is provided in job form

### Agent
- View referred users with status tracking
- Add jobs for referred users
- Earnings breakdown (today/week/month)
- Frozen amounts tracking
- Notifications system

## Security Features

- **Rate limiting:** 20 requests/15min on auth routes, 10 requests/hour on registration
- **Security headers:** Helmet.js
- **Password hashing:** bcryptjs with salt rounds = 10
- **JWT auth:** 7-day token expiry
- **SQL injection prevention:** All queries use parameterized statements
- **Input validation:** Server-side + client-side validation on all fields
- **Email verification:** Required before login
- **Reset token:** Cryptographically random 32-byte hex token (15min expiry)
- **Global error handler:** Internal errors not exposed to clients
- **File upload limit:** 10MB max for audio files

## API Endpoints

### Auth
- `POST /api/register` - Register new user
- `POST /api/verify-code` - Verify email code
- `POST /api/resend-code` - Resend verification code
- `POST /api/login` - User/Admin login
- `POST /api/agent/login` - Agent login
- `POST /api/forgot-password` - Send reset code
- `POST /api/verify-reset-code` - Verify reset code
- `POST /api/reset-password` - Reset password with token

### User
- `GET /api/user/application-status` - Get application status
- `POST /api/applications` - Submit application with audio
- `GET /api/applications/my` - Get my applications
- `GET /api/user/jobs` - Get jobs for approved applications
- `POST /api/user/select-job` - Select a job
- `GET /api/user/selections` - Get my selections
- `GET /api/user/notifications` - Get notifications

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/applications` - All applications
- `PUT /api/admin/applications/:id/approve` - Approve application
- `PUT /api/admin/applications/:id/reject` - Reject application
- `PUT /api/admin/applications/:id/rerecord` - Request re-recording
- `PUT /api/admin/applications/:id/allow-reapply` - Allow reapply
- `POST /api/admin/jobs` - Add single job
- `POST /api/admin/jobs/batch` - Add multiple jobs
- `POST /api/admin/agents` - Create agent
- `GET /api/admin/agents` - List agents with stats
- `PUT /api/admin/agents/:id/toggle` - Enable/disable agent
- `GET /api/admin/agent-earnings` - Agent earnings breakdown
- `PUT /api/admin/selections/:id` - Update selection
- `PUT /api/admin/selections/:id/unfreeze` - Unfreeze amount
- `PUT /api/admin/selections/:id/apologize` - Apologize/cancel selection
- `PUT /api/admin/selections/:id/allow-reapply` - Allow reapply from selection

### Agent
- `GET /api/agent/stats` - Agent dashboard stats
- `GET /api/agent/applications` - Referred users' applications
- `POST /api/agent/jobs/batch` - Add jobs for referred user
- `GET /api/agent/jobs/:applicationId` - Get jobs for application
- `GET /api/agent/notifications` - Get notifications

## License

Private - All rights reserved.
