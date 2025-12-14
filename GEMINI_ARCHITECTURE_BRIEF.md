# The Indie Quill Collective - Architecture Brief for Gemini

**Date**: December 14, 2024  
**Purpose**: Consulting reference for architecture review and improvements

---

## 1. Project Overview

**The Indie Quill Collective** is a 501(c)(3) non-profit author support platform that:
- Manages author applications (including minors with guardian support)
- Handles digital contract signing workflows
- Tracks publishing status through stages
- Syncs accepted authors to "The Indie Quill LLC" (separate production system)
- Supports board member functions (calendar, fundraising, donations)

---

## 2. Current Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPMENT                                        │
│  ┌─────────────┐                                                             │
│  │   Replit    │  ← Development environment only                             │
│  │  (Dev DB)   │    npm run dev on port 5000                                 │
│  └──────┬──────┘                                                             │
│         │ git push                                                           │
└─────────┼───────────────────────────────────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SOURCE CONTROL                                     │
│  ┌─────────────┐                                                             │
│  │   GitHub    │  ← Single source of truth                                   │
│  └──────┬──────┘                                                             │
│         │ manual deploy                                                      │
└─────────┼───────────────────────────────────────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRODUCTION (Render)                                │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      │
│  │    Frontend     │      │     Backend     │      │   Neon Postgres │      │
│  │  (Node Service) │ ──►  │  (Node Service) │ ──►  │    (Database)   │      │
│  │  Serves React   │      │  Express API    │      │  + Session Table│      │
│  └─────────────────┘      └─────────────────┘      └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Backend
| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 22.x |
| Language | TypeScript | 5.x |
| Framework | Express.js | 4.21.2 |
| ORM | Drizzle ORM | 0.39.3 |
| Database | PostgreSQL (Neon) | Serverless |
| Session Store | connect-pg-simple | 10.0.0 |
| Password Hashing | crypto.scrypt | Native |

### Frontend
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | 19.0.0 |
| Bundler | Vite | 6.2.3+ |
| Styling | Tailwind CSS | 3.4.17 |
| Routing | Wouter | 3.7.0 |
| Icons | Lucide React | 0.475.0 |

### Integrations
| Service | Purpose | Package |
|---------|---------|---------|
| Neon | Serverless Postgres | @neondatabase/serverless |
| Resend | Email notifications | resend |
| GitHub | LLC sync/API | @octokit/rest |

---

## 4. Database Schema

### Tables (7 total)

```sql
-- Core user management
users (id, email, password, firstName, lastName, role, createdAt)
  → roles: 'applicant', 'admin', 'board_member'

-- Application workflow
applications (id, userId, penName, dateOfBirth, isMinor, 
              guardianName, guardianEmail, guardianPhone, guardianRelationship,
              hasStoryToTell, personalStruggles, expressionTypes, expressionOther,
              whyCollective, goals, hearAboutUs,
              status, reviewNotes, reviewedBy, reviewedAt)
  → status: 'pending', 'under_review', 'accepted', 'rejected', 'migrated'

-- Contract signing
contracts (id, applicationId, userId, contractType, contractContent,
           authorSignature, authorSignedAt, guardianSignature, guardianSignedAt,
           requiresGuardian, status)
  → status: 'pending_signature', 'pending_guardian', 'signed', 'rejected'

-- Publishing tracker
publishingUpdates (id, applicationId, userId, indieQuillAuthorId,
                   status, statusMessage, estimatedCompletion,
                   syncStatus, syncError, syncAttempts, lastSyncAttempt, lastSyncedAt)
  → status: 'not_started' → 'manuscript_received' → 'editing' → 'cover_design' 
           → 'formatting' → 'review' → 'published'
  → syncStatus: 'pending', 'syncing', 'synced', 'failed'

-- Board member features
calendarEvents (id, title, description, startDate, endDate, allDay, eventType, location, createdBy)
fundraisingCampaigns (id, name, description, goalAmount, currentAmount, startDate, endDate, isActive, createdBy)
donations (id, campaignId, donorName, donorEmail, amount, isAnonymous, notes, recordedBy)

-- Session management (auto-created by connect-pg-simple)
session (sid, sess, expire)
```

---

## 5. Server Architecture

### Entry Point: `server/index.ts`

```
Server Startup Flow:
1. Create Express app + HTTP server
2. Set trust proxy (for Render)
3. Register /health endpoint IMMEDIATELY
4. Start listening on PORT (5000)
5. Run bootstrapFast() asynchronously:
   a. Load middleware (cors, json, urlencoded)
   b. Initialize session store (Postgres in prod, memory in dev)
   c. Register logging middleware
   d. Register API routes
   e. Setup static file serving (prod) or Vite dev server (dev)
   f. Register error handler
```

### Key Design Decisions
- **Immediate health check**: Server responds to /health before any database operations
- **Async bootstrap**: Heavy initialization happens after server is already listening
- **Conditional session store**: Postgres in production, in-memory for dev speed
- **Trust proxy**: Required for secure cookies behind Render's load balancer

---

## 6. API Routes Structure

### Authentication
```
POST /api/auth/register  → Create account (default role: applicant)
POST /api/auth/login     → Login with email/password
POST /api/auth/logout    → Destroy session
GET  /api/auth/me        → Get current user info
```

### Applications
```
GET  /api/applications              → Get user's applications
POST /api/applications              → Submit new application
PATCH /api/applications/:id/status  → Update status (admin only)
```

### Contracts
```
GET  /api/contracts           → Get user's contracts
POST /api/contracts/:id/sign  → Sign contract (author or guardian)
```

### Admin
```
GET   /api/admin/stats              → Dashboard statistics
GET   /api/admin/users              → All users with application counts
PATCH /api/admin/users/:id/role     → Change user role
GET   /api/admin/sync-status        → LLC sync status
POST  /api/admin/retry-sync/:id     → Retry failed sync
POST  /api/admin/retry-all-failed   → Retry all failed syncs
```

### Board Member
```
GET/POST   /api/board/calendar     → Calendar events
DELETE     /api/board/calendar/:id → Delete event
GET/POST   /api/board/campaigns    → Fundraising campaigns
PATCH      /api/board/campaigns/:id → Update campaign
GET/POST   /api/board/donations    → Donation records
GET        /api/board/stats        → Read-only statistics
```

---

## 7. Frontend Pages

| Route | Component | Access |
|-------|-----------|--------|
| `/` | Home | Public |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/apply` | Apply | Authenticated |
| `/dashboard` | Dashboard | Authenticated |
| `/contracts` | Contracts | Authenticated |
| `/contracts/:id/sign` | ContractSign | Authenticated |
| `/publishing` | PublishingStatus | Authenticated |
| `/admin` | AdminDashboard | Admin only |
| `/board` | Board | Board member |

---

## 8. Admin Dashboard Fields

### Statistics Cards
- Total Applications
- Pending Applications
- Synced to LLC
- Migrated Authors
- Pending Sync
- Failed Sync

### Applicants Tab
| Column | Description |
|--------|-------------|
| Author | Name + Email |
| Expression Type | Novel, Short Story, Poems, Graphic Novel, Other |
| Has Story | Yes/Not Sure badge |
| Age | Minor/Adult badge |
| Status | pending, under_review, accepted, rejected, migrated |
| Applied | Date/time |
| Actions | View details |

### Sync Tab
| Column | Description |
|--------|-------------|
| Author | Name + Email |
| Expression Type | Writing format |
| Sync Status | pending, syncing, synced, failed |
| LLC Author ID | ID from external system |
| Attempts | Retry count |
| Actions | Retry button |

### Users Tab
| Column | Description |
|--------|-------------|
| User | Name + Email |
| Role | applicant, admin, board_member |
| Applications | Count + accepted indicator |
| Joined | Registration date |
| Actions | Edit role |

---

## 9. Environment Variables

### Production (Render)
```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
SESSION_SECRET=your-secure-random-string
VITE_API_BASE_URL=https://your-backend-domain.com
NODE_ENV=production
PORT=5000
```

### Development (Replit)
```env
DATABASE_URL=auto-configured-by-replit
```

### Optional (LLC Integration)
```env
INDIE_QUILL_API_URL=https://theindiequill.com/api
INDIE_QUILL_API_KEY=your-api-key
INDIE_QUILL_API_SECRET=your-hmac-secret
```

---

## 10. Current Status

### What's Working
- User registration and authentication
- Application submission with minor/guardian support
- Admin dashboard (applications, users, sync status)
- Role management (applicant → admin → board_member)
- Session persistence in production (Postgres-backed)
- Health check endpoints for deployment

### What Needs Work
- LLC sync integration (endpoints defined, implementation TBD)
- Contract signing workflow (schema ready, UI incomplete)
- Publishing status tracking (schema ready, sync TBD)
- Board member calendar and fundraising features
- Email notifications (Resend integration ready)

---

## 11. File Structure

```
/
├── server/
│   ├── index.ts              # Express server, health checks, bootstrap
│   ├── db.ts                 # Drizzle ORM + Neon pool
│   ├── auth.ts               # Password hashing (crypto.scrypt)
│   ├── routes.ts             # All API route handlers
│   ├── vite.ts               # Vite dev server middleware
│   ├── email.ts              # Resend email integration
│   └── indie-quill-integration.ts  # LLC sync functions
│
├── client/
│   └── src/
│       ├── App.tsx           # Main app, routing, auth context
│       ├── main.tsx          # React entry point
│       ├── index.css         # Tailwind imports
│       ├── components/
│       │   └── Navbar.tsx    # Navigation component
│       └── pages/
│           ├── Home.tsx
│           ├── Login.tsx
│           ├── Register.tsx
│           ├── Apply.tsx
│           ├── Dashboard.tsx
│           ├── Contracts.tsx
│           ├── ContractSign.tsx
│           ├── PublishingStatus.tsx
│           ├── AdminDashboard.tsx
│           └── Board.tsx
│
├── shared/
│   └── schema.ts             # Drizzle schema definitions
│
├── vite.config.ts            # Vite build configuration
├── drizzle.config.ts         # Drizzle migration config
├── package.json              # Dependencies and scripts
├── replit.md                 # Project documentation
└── PROJECT_OVERVIEW_FOR_CHATGPT.md  # Detailed architecture doc
```

---

## 12. NPM Scripts

```bash
npm run dev       # Start development server (tsx server/index.ts)
npm run build     # Build frontend (vite build)
npm start         # Start production server (NODE_ENV=production tsx server/index.ts)
npm run db:push   # Push schema changes to database (drizzle-kit push)
npm run db:studio # Open Drizzle Studio for database management
```

---

## 13. Known Issues / Considerations

1. **Session handling in dev**: Uses in-memory store, so sessions are lost on restart
2. **CORS**: Currently allows all origins - may need tightening for production
3. **Password in logs**: Request logging truncates but should avoid logging sensitive data
4. **LLC Integration**: API endpoints defined but external system endpoints need implementation
5. **Minor protection**: Guardian signatures implemented in schema but workflow needs testing

---

## 14. Questions for Gemini

1. Should we implement a job queue (like BullMQ) for LLC sync retries?
2. Best practices for handling minor author data (COPPA compliance)?
3. Should frontend/backend be combined or kept separate on Render?
4. Recommendations for contract PDF generation?
5. Email template structure for Resend integration?

---

## 15. Related Systems

- **The Indie Quill Bookstore**: Separate app, same architecture pattern (Replit → GitHub → Render → Neon)
- **The Indie Quill LLC**: Production publishing system that receives synced author data

---

*This document is maintained in the repository for infrastructure understanding by developers and AI assistants.*
