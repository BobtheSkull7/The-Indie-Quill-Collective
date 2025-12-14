# The Indie Quill Collective

## Overview
The Indie Quill Collective is a 501(c)(3) non-profit organization platform designed to support emerging authors of all ages. The platform handles author application intake, contract management (with special provisions for minor authors), and integrates with The Indie Quill LLC for professional publishing services.

## Current State
- **Status**: MVP Complete
- **Last Updated**: December 2024

## Architecture Overview
```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Replit    │ ──► │    GitHub    │ ──► │     Render      │ ──► │     Neon     │
│ Development │     │ Source Truth │     │   Production    │     │   Postgres   │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
```

### Deployment Pipeline
- **Replit** → Development environment only
- **GitHub** → Source of truth for all code
- **Render** → Production hosting (Web Services)
- **Neon** → Production PostgreSQL database
- **Drizzle** → Schema management and migrations

### Production Components (Render)
- **Backend**: Node Web Service on Render
- **Frontend**: Separate Node Web Service on Render (not static)
- **Database**: Neon PostgreSQL with connect-pg-simple sessions

## Key Features
1. **NPO Author Application System** - Multi-step application form for authors
2. **Minor Author Support** - Guardian information collection for authors under 18
3. **Contract Management** - Digital contracts with author and guardian signature support
4. **Admin Dashboard** - Review and manage applications, accept/reject workflow
5. **Publishing Status Tracking** - Visual progress tracker for accepted authors
6. **User Authentication** - Secure registration and login system

## Tech Stack
- **Frontend**: React 19, Vite, TailwindCSS 3
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Routing**: Wouter (client-side)

## Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components (Navbar)
│   │   ├── pages/          # Page components
│   │   └── App.tsx         # Main app with routing
├── server/                 # Express backend
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── auth.ts             # Password hashing utilities
│   ├── db.ts               # Database connection
│   └── vite.ts             # Vite middleware
├── shared/                 # Shared code
│   └── schema.ts           # Drizzle database schema
└── drizzle.config.ts       # Drizzle configuration
```

## Database Schema
- **users** - User accounts with role (applicant/admin/board_member)
- **applications** - Author applications with story expression details:
  - `hasStoryToTell` (boolean) - Whether applicant has a story to share
  - `personalStruggles` (text) - Their personal background and struggles
  - `expressionTypes` (text) - Comma-separated types: novel, short_story, poems, graphic_novel, other
  - `expressionOther` (text) - Details if "other" is selected
  - **COPPA Compliance Fields:**
    - `guardianConsentMethod` (text) - How consent was obtained (e.g., 'e-signature', 'mail-in form', 'verbal')
    - `guardianConsentVerified` (boolean) - Staff has verified the consent process
    - `dataRetentionUntil` (timestamp) - Date for data review/deletion
- **contracts** - Publishing agreements with signature tracking
- **publishingUpdates** - Publishing status from The Indie Quill LLC
- **calendarEvents** - Shared calendar events for board meetings
- **fundraisingCampaigns** - Fundraising campaigns with goals and progress
- **donations** - Donation records linked to campaigns
- **audit_logs** - COPPA compliance audit trail for minor data access

## COPPA Compliance - Audit Logging
The platform implements comprehensive audit logging for all access to minor (under 18) data as required for COPPA compliance.

### Audit Logger Utility
Located at `server/utils/auditLogger.ts`, provides:
- `logAuditEvent()` - General purpose audit logging
- `logMinorDataAccess()` - Specialized logging for minor data access
- `getClientIp()` - IP address extraction from requests

### Logged Actions
| Route | Action | Condition |
|-------|--------|-----------|
| `GET /api/applications` (admin) | view | When listing includes minor applications |
| `GET /api/applications/:id` | view | When application is for a minor |
| `PATCH /api/applications/:id/status` | status_change | When application is for a minor |
| `GET /api/contracts/:id` | view | When contract requires guardian signature |
| `POST /api/contracts/:id/sign` | sign | When contract requires guardian signature |
| `GET /api/admin/sync-status` | view | When sync records include minors |
| `GET /api/admin/users` | view | When users have minor applications |
| `PATCH /api/admin/users/:id/role` | update | When user has minor applications |

### Audit Log Fields
- `id` - Serial primary key
- `userId` - ID of user performing the action
- `action` - Type of action (view, create, update, delete, sign, status_change)
- `targetTable` - Table being accessed (applications, contracts, users, publishing_updates)
- `targetId` - ID of the record accessed (or "bulk" for list operations)
- `details` - JSON with additional context (role, affected IDs, etc.)
- `ipAddress` - Client IP address for security tracking
- `createdAt` - Timestamp of the action

## User Roles
- **applicant** - Default role for new users, can submit applications
- **admin** - Can review applications, accept/reject, view all data
- **board_member** - Board of Directors access: can view stats, manage calendar, track fundraising

## Admin Account Setup
Admin accounts are created manually (one-time setup), not automatically on server startup. This prevents blocking database operations during deployment health checks.

**To create an admin account:**
1. Register a regular user account via the application
2. Use database admin tools (Drizzle Studio or direct SQL) to update the user's role to "admin"
3. Or use the API endpoint `PATCH /api/admin/users/:id/role` from an existing admin account

## API Endpoints
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/me` - Get current user
- `GET/POST /api/applications` - Get/create applications
- `PATCH /api/applications/:id/status` - Update application status (admin)
- `GET /api/contracts` - Get user's contracts
- `POST /api/contracts/:id/sign` - Sign a contract
- `GET /api/publishing-updates` - Get publishing status
- `GET /api/admin/stats` - Dashboard statistics (admin)

### User Management Endpoints (Admin only)
- `GET /api/admin/users` - Get all users with application stats
- `PATCH /api/admin/users/:id/role` - Update user role (syncs to LLC)

### Board Member Endpoints
- `GET /api/board/stats` - Read-only statistics (board_member)
- `GET/POST /api/board/calendar` - Calendar events (board_member)
- `DELETE /api/board/calendar/:id` - Delete calendar event (board_member)
- `GET/POST /api/board/campaigns` - Fundraising campaigns (board_member)
- `PATCH /api/board/campaigns/:id` - Update campaign status (board_member)
- `GET/POST /api/board/donations` - Donation records (board_member)

## Running Locally (Replit Development)
```bash
npm run dev          # Start development server
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio for database management
```

## Environment Variables

### Development (Replit)
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)

### Production (Render)
- `DATABASE_URL` - Neon PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption
- `VITE_API_BASE_URL` - Base URL for API calls from frontend
- `NODE_ENV=production` - Enable production mode

## Integration with The Indie Quill LLC
**All data is synced immediately to The Indie Quill LLC database.** The Collective keeps minimal local data (only session/login info) while all author and application data is stored in the LLC's production database.

### Immediate Sync Points:
1. **Application Submission** - Full application data sent to LLC immediately
2. **Status Updates** - Accept/reject decisions synced to LLC in real-time
3. **Contract Signatures** - Both author and guardian signatures synced immediately
4. **Final Migration** - After contract signing, author is created in LLC system

### Integration Configuration (Required Environment Variables)
- `INDIE_QUILL_API_URL` - Base URL of The Indie Quill LLC API
- `INDIE_QUILL_API_KEY` - API key for authentication
- `INDIE_QUILL_API_SECRET` - HMAC secret for request signing

### LLC API Endpoint Requirements
The Indie Quill LLC must implement:
- `POST /api/internal/npo-applications` - Receive new application
  - Headers: X-API-Key, X-Timestamp, X-Signature (HMAC-SHA256)
  - Body: Full application data (author, guardian, story, motivation)
  - Response: { applicationId: string }
  
- `PATCH /api/internal/npo-applications/:id/status` - Receive status update
  - Headers: X-API-Key, X-Timestamp, X-Signature (HMAC-SHA256)
  - Body: { status, reviewNotes, updatedAt }
  
- `POST /api/internal/npo-applications/:id/signature` - Receive contract signature
  - Headers: X-API-Key, X-Timestamp, X-Signature (HMAC-SHA256)
  - Body: { signatureType, signature, signedAt }
  
- `POST /api/internal/npo-authors` - Create NPO author (after contract signed)
  - Headers: X-API-Key, X-Timestamp, X-Signature (HMAC-SHA256)
  - Body: Author profile, story details, guardian info (for minors)
  - Response: { authorId: string }

## Notes
- All text styling uses standard Tailwind classes
- Playfair Display font for headings, Inter for body text
- Teal and blue color scheme for branding
