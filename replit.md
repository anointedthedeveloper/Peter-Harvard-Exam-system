# Peter Harvard International Schools — Exam System v2.0.0

## Project Overview
A web-based exam management system for Peter Harvard International Schools. Supports students, teachers, and admins with different role-based interfaces.

## Architecture
- **Runtime**: Node.js (no npm packages — uses only built-in Node.js modules)
- **Server**: Pure HTTP server (`server.js`) — no Express or other frameworks
- **Frontend**: Static HTML files served from `public/` directory
- **Database**: JSON files stored in `database/` directory (flat-file storage)

## Key Files
- `server.js` — Main HTTP server (1600+ lines), handles all API routes and static file serving
- `public/student.html` — Student exam interface
- `public/teacher.html` — Teacher management interface
- `public/admin.html` — Admin dashboard
- `database/` — JSON flat-file storage for users, results, sessions, etc.

## Running the App
```bash
node server.js
```
Server runs on port 5000 (configurable via `PORT` environment variable).

## Default Logins
| Role    | ID       | Password |
|---------|----------|----------|
| Teacher | teacher1 | pass123  |
| Teacher | teacher2 | pass123  |
| Student | STU001   | (blank)  |
| Admin   | admin    | admin123 |

## Features
- Student exam taking with question randomization
- Teacher exam management, CSV/JSON upload, results download
- Admin dashboard with audit trail, password resets, analytics
- Session management, computer tracking
- PDF export for results
- Keyboard shortcuts for exam navigation

## Deployment
- Target: VM (always-running, uses local file storage)
- Run command: `node server.js`
- Port: 5000
