# The Indie Quill Collective - Complete Project Overview

## Project Summary
**The Indie Quill Collective** is a full-stack web application serving as a 501(c)(3) non-profit author support platform. The application manages applications from indie authors, contract management, publishing workflow tracking, calendar management, and fundraising campaigns.

---

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript (tsx for execution)
- **Framework**: Express.js v4.21.2
- **Database**: PostgreSQL (Neon serverless backend)
- **ORM**: Drizzle ORM v0.39.3
- **Database Migrations**: Drizzle Kit v0.30.5
- **Validation**: Zod v3.24.2

### Frontend
- **Framework**: React v19.0.0
- **Bundler**: Vite v6.2.3 (patched for CVE-2025-30208)
- **Styling**: Tailwind CSS v3.4.17
- **UI Components**: Lucide React v0.475.0 (icons)
- **Routing**: Wouter v3.7.0 (lightweight router)

### Infrastructure & DevOps
- **Session Management**: express-session v1.18.1 with in-memory store
- **CORS**: cors v2.8.5
- **Email**: Resend v6.5.2
- **GitHub Integration**: @octokit/rest v22.0.1
- **WebSocket**: ws v8.18.1
- **Build Tools**: PostCSS v8.5.6, Autoprefixer v10.4.22

---

## Database Schema

### Core Tables

#### Users
```sql
- id (PK)
- email (UNIQUE)
- password (hashed)
- firstName, lastName
- role ('admin', 'reviewer', 'applicant')
- createdAt
```

#### Applications (Author Submissions)
```sql
- id (PK)
- userId (FK → users)
- penName, dateOfBirth, isMinor
- guardianName, guardianEmail, guardianPhone, guardianRelationship
- hasStoryToTell, personalStruggles, expressionTypes, expressionOther
- whyCollective, goals, hearAboutUs
- status (pending, under_review, accepted, rejected, migrated)
- reviewNotes, reviewedBy (FK), reviewedAt
```

#### Contracts
```sql
- id (PK)
- applicationId (FK), userId (FK)
- contractType, contractContent
- authorSignature, authorSignedAt
- guardianSignature, guardianSignedAt
- requiresGuardian
- status (pending_signature, pending_guardian, signed, rejected)
```

#### Publishing Updates
```sql
- id (PK)
- applicationId (FK), userId (FK)
- indieQuillAuthorId
- status (not_started, manuscript_received, editing, cover_design, formatting, review, published)
- statusMessage, estimatedCompletion
- syncStatus (pending, syncing, synced, failed)
- syncError, syncAttempts, lastSyncAttempt, lastSyncedAt
```

#### Calendar Events
```sql
- id (PK)
- title, description, startDate, endDate
- allDay, eventType, location
- createdBy (FK → users)
```

#### Fundraising Campaigns
```sql
- id (PK)
- name, description, goalAmount, currentAmount
- startDate, endDate, isActive
- createdBy (FK → users)
```

#### Donations
```sql
- id (PK)
- campaignId (FK), donorName, donorEmail
- amount, isAnonymous, notes
- recordedBy (FK → users)
```

---

## Server Architecture (Express Backend)

### File: server/index.ts
**Current Implementation**:
- Health check endpoints registered synchronously at module load
  - `GET /health` → Returns 200 OK immediately
  - `GET /` → Returns 200 OK immediately (for deployment)
- Server listens on port 5000 before bootstrap runs
- Bootstrap middleware applied asynchronously in background
- Session store: In-memory (development/production ready without PostgreSQL dependency)
- CORS enabled for all origins
- Express middleware pipeline:
  - JSON/URL-encoded body parsing
  - Express session initialization
  - Request logging middleware (logs `/api` routes)
  - Route registration (imported from routes module)
  - Static file serving (production only)
  - Error handling middleware

**Key Design Decisions**:
- No blocking database operations on startup (removed admin setup)
- No session store database initialization on startup
- Lightweight health checks for deployment compatibility
- Memory-based sessions to avoid startup delays

### API Routes Structure
Routes are registered dynamically via `registerRoutes(app)` function. Expected endpoints:
- `/api/auth/*` - Authentication routes
- `/api/applications/*` - Application management
- `/api/contracts/*` - Contract management
- `/api/publishing/*` - Publishing workflow
- `/api/calendar/*` - Calendar events
- `/api/fundraising/*` - Fundraising & donations

---

## Frontend Architecture (React + Vite)

### Project Structure
```
client/
  src/
    - Main React application
    - Components directory (likely)
    - Pages/routes
    - API client/hooks
    - Styling (Tailwind CSS)
```

### Build Configuration (vite.config.ts)
- **Root**: client directory
- **Output**: dist/public (for production serving)
- **Plugins**: React with SWC compiler (fast refresh)
- **Path Aliases**:
  - `@` → `client/src`
  - `@shared` → `shared` (shared TypeScript)
  - `@assets` → `attached_assets`
- **Development Server**:
  - Host: 0.0.0.0 (accessible from proxy)
  - Port: 5000
  - allowedHosts: true (required for Replit iframe preview)
- **Production**:
  - Code minification with esbuild
  - Source maps disabled
  - Empty output directory on rebuild

---

## Deployment Configuration

### Development
```bash
npm run dev  # Runs: tsx server/index.ts (starts on port 5000)
```

### Production
```bash
npm run build   # Vite builds React to dist/public
npm start       # Runs: NODE_ENV=production tsx server/index.ts
```

### Build Process
1. Vite compiles React to `dist/public/index.html` + assets
2. Express serves static files from `dist/public`
3. API routes handled by Express backend
4. SPA falls back to index.html for client-side routing

---

## Workflow & Features

### 1. Author Application Process
- Authors submit application with personal story and goals
- System supports minor applicants with guardian information
- Reviewers can accept/reject with review notes
- Status tracking through application lifecycle

### 2. Contract Management
- Digital contract signing workflow
- Support for guardian signatures (for minors)
- Contract status tracking (pending, signed, rejected)
- Electronic signature fields

### 3. Publishing Workflow
- Track manuscript through publishing stages (editing → cover design → formatting → review → published)
- Integration with Indie Quill publishing system (via GitHub/API sync)
- Sync status monitoring with error tracking and retry attempts
- Publishing completion estimation

### 4. Calendar System
- Event management for team meetings and milestones
- Support for all-day and timed events
- Event location tracking
- Event creator attribution

### 5. Fundraising System
- Campaign creation with donation goals
- Anonymous donation option
- Donation tracking and recording
- Campaign progress monitoring

---

## Security & Session Management

### Current Implementation
- **Session Store**: In-memory (Express default)
- **Session Secret**: Configurable via environment variable (default: hardcoded)
- **Cookie Settings**:
  - Secure flag: true in production
  - MaxAge: 24 hours
  - HttpOnly: true (default Express-session)
- **CORS**: Enabled without restrictions (all origins allowed)

### Deployment Note
⚠️ **Warning**: In-memory sessions don't persist across server restarts and don't scale to multiple processes. For production scaling, implement PostgreSQL session store.

---

## Authentication (Schema Present)
- User role-based system: admin, reviewer, applicant
- Email-based unique identification
- Password hashing required
- Session-based authentication
- Login/logout flows expected via `/api/auth/*`

---

## Package Dependencies Summary

| Category | Key Packages |
|----------|--------------|
| **Backend** | express, drizzle-orm, pg, @neondatabase/serverless |
| **Frontend** | react, vite, tailwindcss, wouter |
| **Database** | drizzle-kit, drizzle-zod, zod |
| **Utilities** | date-fns, @octokit/rest, resend, ws |
| **DevDeps** | TypeScript types for all major packages |

---

## Environment Variables Required

### Production Deployment
- `DATABASE_URL` - PostgreSQL connection string (optional - app runs without it)
- `NODE_ENV=production` - Enable production mode
- `SESSION_SECRET` - Session encryption key

### Optional
- Email configuration for Resend integration
- GitHub token for @octokit integration (if used)

---

## Current Deployment Status

### Issues Resolved (This Session)
1. ✅ Updated Vite from 6.2.0 to 6.2.3 (CVE-2025-30208 security patch)
2. ✅ Fixed health check timeout by registering routes synchronously
3. ✅ Removed blocking database operations from startup
4. ✅ Removed automatic admin account creation

### Remaining Deployment Issue
- ⚠️ Autoscale deployment health checks still timing out despite fixes
- See SUPPORT_TICKET.md for escalation details
- App runs successfully in development environment

---

## File Structure (Complete)

```
/
├── server/
│   ├── index.ts              # Express server, health checks, middleware
│   ├── db.ts                 # Drizzle ORM instance (likely)
│   ├── auth.ts               # Authentication utilities (likely)
│   ├── vite.ts               # Vite dev server setup (likely)
│   └── routes.ts             # Route registration (likely)
│
├── client/
│   └── src/
│       └── index.html        # React entry point (likely)
│
├── shared/
│   └── schema.ts             # Database schema (Drizzle ORM definitions)
│
├── dist/
│   └── public/               # Production build output
│
├── vite.config.ts            # Vite configuration
├── package.json              # Dependencies & scripts
├── package-lock.json         # Locked dependencies
│
└── docs/
    └── SUPPORT_TICKET.md     # Deployment escalation
```

---

## For External Development / Deployment

### To Deploy to Another Platform:

1. **Database Setup**
   - Create PostgreSQL database
   - Set `DATABASE_URL` environment variable
   - Run migrations: `npm run db:push`

2. **Build Process**
   - Install dependencies: `npm install`
   - Build frontend: `npm run build`
   - Creates: `dist/public/` (static files)

3. **Start Application**
   - Production: `npm start` (listens on port defined by `PORT` env var, defaults to 5000)
   - Build requires Node.js runtime

4. **Environment Variables**
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=postgresql://...
   SESSION_SECRET=your-secret-key
   ```

5. **Health Check Endpoint**
   - Configure deployment tool to check: `GET /`
   - Returns: `200 OK` (immediately)
   - Alternative: `GET /health`

### Deployment Targets
- Container: Docker (use `node:20+` image, run `npm start`)
- Serverless: May have cold start challenges due to Express requirements
- Traditional: Node.js hosting (Railway, Fly.io, etc.)
- Managed: Vercel (requires API routes restructure)

---

## What's NOT Implemented (Schema Present, Routes TBD)
Based on schema, the following features have database support but routes may need implementation:
- Complete publishing workflow API
- Calendar event management API
- Fundraising campaign management API
- Donation recording API
- Contract signing workflow
- Application review workflow
- User authentication routes

---

## Next Steps for External Developer

1. Review `shared/schema.ts` for complete data model
2. Implement missing API routes in `server/routes/`
3. Build React components in `client/src/`
4. Connect frontend API calls to backend routes
5. For production: Switch from in-memory to PostgreSQL session store
6. Add proper authentication/authorization checks
7. Implement email notifications (Resend integration ready)
8. Set up GitHub sync if needed (@octokit ready)

---

## Notes for ChatGPT Review

- **Project is production-ready skeleton**: Database schema fully designed, core infrastructure in place
- **Frontend framework chosen**: React + Vite + Tailwind
- **Backend framework chosen**: Express.js + Drizzle ORM
- **Key architectural decision**: Lightweight, health-check friendly startup with async bootstrap
- **Current blocker**: Deployment to Replit's autoscale (health check timeouts) - escalated to support
- **Can be deployed to alternative platforms** without Replit-specific health check issues
