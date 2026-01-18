# Jon's AI Architect - The Indie Quill Collective

**Version:** 1.0  
**Last Updated:** January 18, 2026  
**Purpose:** Living architectural reference document for AI context persistence across sessions.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [What's Built](#whats-built)
3. [Identity Bridge Integration](#identity-bridge-integration)
4. [Database Topology](#database-topology)
5. [Security Layers](#security-layers)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Deployment Configuration](#deployment-configuration)
8. [Key Files Reference](#key-files-reference)
9. [Roadmap](#roadmap)
10. [Session Notes](#session-notes)

---

## Project Overview

**The Indie Quill Collective** is a 501(c)(3) non-profit platform supporting emerging authors of all ages. It handles:

- Author application intake (adults and minors)
- COPPA-compliant minor data handling with audit logging
- Digital contract management with forensic signature metadata
- Cohort-based author organization (10 authors per cohort)
- Enterprise-grade synchronization with The Indie Quill LLC Bookstore

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, TailwindCSS 3 |
| Backend | Express.js (TypeScript) |
| Database | PostgreSQL (Neon production, Supabase dev) |
| ORM | Drizzle |
| Routing | Wouter (client-side) |
| Auth | Session-based with secure cookies |

---

## What's Built

### Core Features (Complete)

| Feature | Description | Status |
|---------|-------------|--------|
| User Authentication | Registration/login with rate limiting, secure sessions | ✅ |
| Author Application | Multi-step form with minor author support | ✅ |
| COPPA Compliance | Guardian consent, audit logging for minor data | ✅ |
| Contract Management | Digital signing with PDF generation, forensic metadata (IP, user agent) | ✅ |
| Cohort System | Auto-assigns authors to cohorts (10 per cohort) | ✅ |
| Admin Dashboard | Application review, user management, sync monitoring | ✅ |
| Board Dashboard | Fundraising campaigns, donation tracking, Google Calendar sync | ✅ |
| Publishing Tracker | Tracks manuscript → editing → formatting → published | ✅ |
| Identity Bridge | Collective UUID ↔ Bookstore authorId mapping | ✅ |
| Bulk Sync Tool | `bulk-author-sync.ts` with dry-run, batch processing | ✅ |

### User Roles

| Role | Permissions |
|------|-------------|
| `applicant` | Submit applications, sign contracts, view publishing status |
| `admin` | Review applications, manage users, monitor sync, all applicant permissions |
| `board_member` | Calendar management, fundraising, all admin permissions |

---

## Identity Bridge Integration

The Collective and Bookstore maintain separate databases linked via the Identity Bridge pattern.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                        IDENTITY BRIDGE                               │
└─────────────────────────────────────────────────────────────────────┘

  COLLECTIVE (NPO)                              BOOKSTORE (LLC)
  ┌────────────────────┐                        ┌────────────────────┐
  │ applications table │                        │ npo_authors table  │
  │                    │                        │                    │
  │ id (UUID)  ────────┼──── collectiveAppId ──▶│ collective_app_id  │
  │                    │                        │                    │
  │ bookstore_id ◀─────┼──── authorId ──────────│ id (UUID)          │
  └────────────────────┘                        └────────────────────┘
```

### Sync Flow

1. Admin accepts application → status changes to "accepted"
2. Background worker picks up pending syncs
3. Collective sends author data to Bookstore `/api/authors/register`
4. Bookstore creates `npo_author` record, returns `authorId`
5. Collective saves `authorId` as `bookstore_id`
6. Author can now access Bookstore features (manuscript conversion, etc.)

### HMAC Authentication

All Collective → Bookstore API calls are signed:

```javascript
const timestamp = Date.now();
const message = `${timestamp}.${JSON.stringify(payload)}`;
const signature = crypto
  .createHmac("sha256", INDIE_QUILL_API_SECRET)
  .update(message)
  .digest("hex");

headers: {
  "x-api-key": INDIE_QUILL_API_KEY,
  "x-timestamp": timestamp,
  "x-signature": signature
}
```

### Synced Authors (as of Jan 2026)

| Author | Collective UUID | Bookstore ID | Status |
|--------|-----------------|--------------|--------|
| Tiny Test | ✅ | ✅ | Synced |
| Solomiia S | ✅ | ✅ | Synced |
| Little Test | ✅ | ✅ | Synced |
| Test Author | ✅ | ✅ | Synced |

---

## Database Topology

### Environments

| Environment | Database | Purpose |
|-------------|----------|---------|
| Development | Supabase (Collective-Dev) | Local dev, testing |
| Production | Neon PostgreSQL | Live production data |

**CRITICAL:** Never mix environments. `DATABASE_URL` in production points to Neon.

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id (UUID), email, role, password |
| `applications` | Author applications | id (UUID), user_id, status, is_minor, bookstore_id |
| `contracts` | Publishing agreements | id (UUID), user_id, status, signature metadata |
| `cohorts` | Author groupings | id (UUID), label, capacity (10) |
| `audit_logs` | COPPA compliance logging | user_id, action, target_id, ip_address |
| `calendar_events` | Board calendar | id (UUID), google_event_id |
| `fundraising_campaigns` | Donation tracking | id (UUID), goal, current_amount |
| `publishing_updates` | Book progress tracking | application_id, status, notes |

### Application Status Flow

```
pending → accepted → migrated (synced to Bookstore)
       ↘ rejected
```

### Internal Author ID Format

Generated on acceptance:
```
{LastName}{FirstInitial}-{M/A}-{YYYYMMDD}
```

Examples:
- Adult: `SmithJ-A-20250115`
- Minor: `JonesM-M-20250310`

---

## Security Layers

### 1. HTTP Security (Helmet.js)

- Content Security Policy (CSP)
- Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### 2. Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/login` | 5 requests | 15 minutes |
| `/api/auth/register` | 5 requests | 15 minutes |
| `/api/contracts/:id/sign` | 3 requests | 15 minutes |

### 3. Session Security

```javascript
{
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: true // production only
  },
  store: PostgreSQL session store
}
```

### 4. Password Security

- Algorithm: `crypto.scrypt`
- Salt: Random 16-byte hex
- Key Length: 64 bytes
- Format: `{salt}:{hash}`

### 5. Contract Signature Forensics

Captured on signing:
- `author_signature_ip` - IP address
- `author_signature_user_agent` - Browser/device info
- `signed_at` - Timestamp
- Linked audit log entry

---

## Data Flow Diagrams

### Author Application Flow

```
Visitor → React Form → POST /api/applications → Validate → Insert DB
                                                         ↓
                                              [If Minor] Log to audit_logs
                                                         ↓
                                              Return UUID to user
```

### Application Acceptance Flow

```
Admin clicks "Accept" → POST /api/admin/applications/:id/accept
                                        ↓
                              processAcceptance()
                                        ↓
                        ┌───────────────┼───────────────┐
                        ↓               ↓               ↓
                Find/Create      Generate ID      Create Contract
                  Cohort        (Name-M/A-Date)
                        ↓               ↓               ↓
                        └───────────────┼───────────────┘
                                        ↓
                              Update status = "accepted"
                                        ↓
                              Queue for LLC sync
```

### LLC Sync Flow

```
Background Worker (cron) → Find pending syncs → Build payload
                                                      ↓
                                          Generate HMAC signature
                                                      ↓
                                    POST to Bookstore /api/authors/register
                                                      ↓
                              ┌─────────────┬─────────────────────┐
                              ↓             ↓                     ↓
                           Success       Failure              Error
                              ↓             ↓                     ↓
                      Save bookstore_id  Retry later       Log error
                      status="migrated"
```

---

## Deployment Configuration

### Development (Replit)

- Runtime: Node.js 20
- Dev Server: Vite (port 5000)
- Database: Supabase (Collective-Dev)
- Command: `npm run dev`

### Production (Render)

| Setting | Value |
|---------|-------|
| Service | `the-indie-quill-collective-frontend` |
| Domain | `theindiequillcollective.com` |
| Build | `npm run build` |
| Start | `npm run start` |
| Node | 20 |

### Required Environment Variables

| Variable | Environment | Purpose |
|----------|-------------|---------|
| `DATABASE_URL` | Production | Neon connection string |
| `SESSION_SECRET` | Both | Session encryption |
| `INDIE_QUILL_API_URL` | Both | Bookstore API endpoint |
| `INDIE_QUILL_API_KEY` | Both | API authentication |
| `INDIE_QUILL_API_SECRET` | Both | HMAC signing |
| `GOOGLE_CLIENT_ID` | Production | Calendar OAuth |
| `GOOGLE_CLIENT_SECRET` | Production | Calendar OAuth |

---

## Key Files Reference

### Backend

| File | Purpose |
|------|---------|
| `server/index.ts` | Express app entry point |
| `server/routes.ts` | All API routes |
| `server/services/npo-sync-service.ts` | Bookstore sync logic |
| `server/indie-quill-integration.ts` | LLC API integration |
| `server/utils/auditLogger.ts` | COPPA audit logging |
| `shared/schema.ts` | Drizzle database schema |

### Frontend

| File | Purpose |
|------|---------|
| `client/src/pages/AdminDashboard.tsx` | Admin interface |
| `client/src/pages/Board.tsx` | Board member interface |
| `client/src/pages/Apply.tsx` | Author application form |
| `client/src/pages/Dashboard.tsx` | Author dashboard |

### Tools

| File | Purpose |
|------|---------|
| `bulk-author-sync.ts` | CLI bulk sync tool |
| `drizzle.config.ts` | Database configuration |
| `render.yaml` | Render deployment blueprint |

---

## Roadmap

### Completed

| Phase | Description | Date |
|-------|-------------|------|
| Phase 1 | Core platform (auth, applications, contracts) | Nov 2024 |
| Phase 2 | Admin/Board dashboards | Dec 2024 |
| Phase 3 | Identity Bridge integration | Dec 2024 |
| Phase 4 | Production deployment (Render + Neon) | Dec 2024 |
| Phase 5 | Bulk sync tool & documentation | Jan 2026 |

### Future Considerations

| Feature | Description | Priority |
|---------|-------------|----------|
| Daily Stats Sync | Pull publishing progress from Bookstore → Collective | Medium |
| Email Notifications | Resend integration for status updates | Low |
| GDPR Data Export | Right to erasure & data portability | Low |
| Analytics Dashboard | Application/sync metrics visualization | Low |

---

## Session Notes

### January 18, 2026

- Created this architecture document
- Render production alert received (exit status 1) - likely transient, auto-recovered
- Bookstore added PDF/MOBI conversion (Calibre-based) - available to synced NPO authors
- Added "Back to Home" button on application form Step 1

### Previous Sessions

- Successfully synced 4 authors via Identity Bridge
- Fixed Bookstore-Dev missing `collective_application_id` column
- Created `ARCHITECTURE.md` with full diagrams
- Implemented forensic signature metadata on contracts

---

*This document should be updated after each significant development session.*
