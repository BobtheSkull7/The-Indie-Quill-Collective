# The Indie Quill Collective - Architecture Overview

**Version:** 1.0  
**Last Updated:** December 2024  
**Purpose:** Comprehensive technical reference for naming conventions, data flows, infrastructure, and security.

---

## Table of Contents

1. [Naming Conventions](#naming-conventions)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Infrastructure Map](#infrastructure-map)
4. [UUID Architecture](#uuid-architecture)
5. [Security Layers](#security-layers)
6. [Deployment Configuration](#deployment-configuration)
7. [External Integrations](#external-integrations)

---

## Naming Conventions

### Database Tables & Columns

| Pattern | Convention | Examples |
|---------|------------|----------|
| Tables | snake_case, plural | `users`, `applications`, `audit_logs`, `cohorts` |
| Columns | snake_case | `first_name`, `cohort_id`, `created_at`, `sync_status` |
| Primary Keys | `id` as varchar(36) UUID | `gen_random_uuid()` default |
| Foreign Keys | `{table}_id` | `user_id`, `cohort_id`, `application_id` |
| Timestamps | `{action}_at` | `created_at`, `updated_at`, `signed_at` |
| Booleans | `is_{state}` or descriptive | `is_minor`, `guardian_consent`, `is_sealed` |

### Internal Author ID Format

The internal author ID is generated during application acceptance and follows this pattern:

```
{LastName}{FirstInitial}-{M/A}-{YYYYMMDD}
```

| Component | Description | Example |
|-----------|-------------|---------|
| LastName | Author's last name | `Smith` |
| FirstInitial | First letter of first name | `J` |
| M/A Flag | `M` = Minor, `A` = Adult | `A` |
| Date | Application acceptance date | `20250115` |

**Full Examples:**
- Adult author: `SmithJ-A-20250115`
- Minor author: `JonesM-M-20250310`

### API Endpoints

| Pattern | Convention | Examples |
|---------|------------|----------|
| Base path | `/api/*` | All routes under `/api/` |
| Resources | RESTful nouns | `/api/applications`, `/api/users` |
| Admin routes | `/api/admin/*` | `/api/admin/sync-status`, `/api/admin/dashboard-stats` |
| Actions | Verb in path when needed | `/api/admin/force-sync-all-migrated` |

### Source Code Modules

| Category | Convention | Examples |
|----------|------------|----------|
| Services | kebab-case | `npo-sync-service.ts`, `cohort-service.ts` |
| Routes | feature-based | `routes.ts`, `auth.ts` |
| Utilities | descriptive | `auditLogger.ts`, `pdfGenerator.ts` |
| Client pages | PascalCase | `AdminDashboard.tsx`, `ApplyPage.tsx` |
| Client components | PascalCase | `ApplicationForm.tsx`, `ContractViewer.tsx` |

### Environment Variables

| Category | Convention | Examples |
|----------|------------|----------|
| Database | SCREAMING_SNAKE | `DATABASE_URL`, `PGHOST`, `PGPORT` |
| Session | SCREAMING_SNAKE | `SESSION_SECRET` |
| External APIs | `{SERVICE}_*` | `INDIE_QUILL_API_URL`, `INDIE_QUILL_API_KEY` |
| Replit-managed | `REPLIT_*` | `REPLIT_DOMAINS`, `REPLIT_CONNECTORS_HOSTNAME` |

---

## Data Flow Diagrams

### High-Level Infrastructure Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         THE INDIE QUILL COLLECTIVE                          │
│                              Platform Overview                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   REPLIT     │───▶│   GITHUB     │───▶│   RENDER     │───▶│    NEON      │
│ Development  │    │ Source Ctrl  │    │  Production  │    │  PostgreSQL  │
│   Server     │    │  Repository  │    │   Hosting    │    │   Database   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                                       │
       │                    ┌──────────────────┼──────────────────┐
       │                    ▼                  ▼                  ▼
       │              ┌──────────┐       ┌──────────┐       ┌──────────┐
       └─────────────▶│  Google  │       │   LLC    │       │  Resend  │
                      │ Calendar │       │   API    │       │  Emails  │
                      │   API    │       │  (HMAC)  │       │          │
                      └──────────┘       └──────────┘       └──────────┘
```

### 1. Author Application Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Visitor   │     │   React     │     │   Express   │     │    Neon     │
│   Browser   │     │  Frontend   │     │   Backend   │     │  Database   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │  Fill Apply Form  │                   │                   │
       │──────────────────▶│                   │                   │
       │                   │                   │                   │
       │                   │ POST /api/apply   │                   │
       │                   │──────────────────▶│                   │
       │                   │                   │                   │
       │                   │                   │ INSERT application│
       │                   │                   │──────────────────▶│
       │                   │                   │                   │
       │                   │                   │◀──────────────────│
       │                   │                   │   Return UUID     │
       │                   │                   │                   │
       │                   │                   │ [If Minor]        │
       │                   │                   │ INSERT audit_log  │
       │                   │                   │──────────────────▶│
       │                   │                   │                   │
       │                   │◀──────────────────│                   │
       │                   │   Success + ID    │                   │
       │◀──────────────────│                   │                   │
       │  Confirmation     │                   │                   │
       │                   │                   │                   │
```

### 2. Application Acceptance & Cohort Assignment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Admin    │     │  Dashboard  │     │   Backend   │     │  Database   │
│   Browser   │     │   React     │     │  Services   │     │    Neon     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │  Click "Accept"   │                   │                   │
       │──────────────────▶│                   │                   │
       │                   │                   │                   │
       │                   │ POST /api/admin/  │                   │
       │                   │ applications/:id/ │                   │
       │                   │ accept            │                   │
       │                   │──────────────────▶│                   │
       │                   │                   │                   │
       │                   │                   │ processAcceptance()
       │                   │                   │──────────────────▶│
       │                   │                   │                   │
       │                   │                   │ 1. Find/Create Cohort
       │                   │                   │    (10 authors max)
       │                   │                   │                   │
       │                   │                   │ 2. Generate Internal ID
       │                   │                   │    LastName+Init+M/A+Date
       │                   │                   │                   │
       │                   │                   │ 3. Create Contract
       │                   │                   │                   │
       │                   │                   │ 4. Update Status
       │                   │                   │    "accepted"
       │                   │                   │                   │
       │                   │                   │ 5. Queue for LLC Sync
       │                   │                   │    sync_status="pending"
       │                   │                   │                   │
       │                   │◀──────────────────│                   │
       │◀──────────────────│   Success         │                   │
       │  Updated UI       │                   │                   │
```

### 3. LLC Sync Flow (Enterprise Integration)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Background │     │   Sync      │     │    LLC      │     │  Database   │
│   Worker    │     │  Service    │     │    API      │     │    Neon     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │  */5 * * * *      │                   │                   │
       │  (Every 5 min)    │                   │                   │
       │──────────────────▶│                   │                   │
       │                   │                   │                   │
       │                   │ SELECT WHERE      │                   │
       │                   │ sync_status=      │                   │
       │                   │ 'pending_sync'    │                   │
       │                   │──────────────────────────────────────▶│
       │                   │                   │                   │
       │                   │◀──────────────────────────────────────│
       │                   │   Batch of apps   │                   │
       │                   │                   │                   │
       │                   │ For each app:     │                   │
       │                   │                   │                   │
       │                   │ 1. Build Payload  │                   │
       │                   │ 2. Generate HMAC  │                   │
       │                   │    timestamp.body │                   │
       │                   │ 3. Sign with      │                   │
       │                   │    SHA256 secret  │                   │
       │                   │                   │                   │
       │                   │ POST /api/internal│                   │
       │                   │ /npo-authors      │                   │
       │                   │──────────────────▶│                   │
       │                   │                   │                   │
       │                   │◀──────────────────│                   │
       │                   │   200 OK          │                   │
       │                   │                   │                   │
       │                   │ UPDATE sync_status│                   │
       │                   │ = 'synced'        │                   │
       │                   │──────────────────────────────────────▶│
       │                   │                   │                   │
       │                   │ [If Error]        │                   │
       │                   │ UPDATE sync_status│                   │
       │                   │ = 'sync_failed'   │                   │
       │                   │ + log error       │                   │
       │                   │──────────────────────────────────────▶│
```

### 4. Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │     │   React     │     │   Express   │     │    Neon     │
│   Browser   │     │  Frontend   │     │   Backend   │     │  Database   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │  Login Request    │                   │                   │
       │──────────────────▶│                   │                   │
       │                   │                   │                   │
       │                   │ POST /api/login   │                   │
       │                   │ (rate limited)    │                   │
       │                   │──────────────────▶│                   │
       │                   │                   │                   │
       │                   │                   │ 1. Rate Limit Check
       │                   │                   │    (5 per 15 min)
       │                   │                   │                   │
       │                   │                   │ 2. Lookup User    │
       │                   │                   │──────────────────▶│
       │                   │                   │◀──────────────────│
       │                   │                   │                   │
       │                   │                   │ 3. Verify Password
       │                   │                   │    (scrypt + salt)
       │                   │                   │                   │
       │                   │                   │ 4. Create Session │
       │                   │                   │    (pg store)     │
       │                   │                   │──────────────────▶│
       │                   │                   │                   │
       │                   │◀──────────────────│                   │
       │                   │   Set-Cookie      │                   │
       │                   │   (httpOnly,      │                   │
       │                   │    sameSite=strict)                   │
       │◀──────────────────│                   │                   │
       │  Redirect to      │                   │                   │
       │  Dashboard        │                   │                   │
```

### 5. COPPA Compliance & Audit Logging Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Admin    │     │   Backend   │     │   Audit     │     │  Database   │
│   Action    │     │   Routes    │     │   Logger    │     │    Neon     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │  Access Minor     │                   │                   │
       │  Application      │                   │                   │
       │──────────────────▶│                   │                   │
       │                   │                   │                   │
       │                   │ Check is_minor    │                   │
       │                   │──────────────────────────────────────▶│
       │                   │◀──────────────────────────────────────│
       │                   │                   │                   │
       │                   │ [If Minor]        │                   │
       │                   │ logMinorDataAccess│                   │
       │                   │──────────────────▶│                   │
       │                   │                   │                   │
       │                   │                   │ INSERT audit_logs │
       │                   │                   │ - userId          │
       │                   │                   │ - action          │
       │                   │                   │ - targetId        │
       │                   │                   │ - ipAddress       │
       │                   │                   │ - timestamp       │
       │                   │                   │──────────────────▶│
       │                   │                   │                   │
       │                   │◀──────────────────│                   │
       │◀──────────────────│                   │                   │
       │  Application Data │                   │                   │
       │  (logged access)  │                   │                   │
```

---

## Infrastructure Map

### Development Environment (Replit)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 20 | Server execution |
| Dev Server | Vite | Hot reload, bundling |
| Database | Replit PostgreSQL | Development data |
| Package Manager | npm | Dependency management |

### Source Control (GitHub)

| Aspect | Configuration |
|--------|---------------|
| Repository | Main branch as source of truth |
| Deployment Trigger | Push to main → Render auto-deploy |
| Protected Branches | None (recommended: protect main) |

### Production Hosting (Render)

| Setting | Value |
|---------|-------|
| Service Name | `the-indie-quill-collective-frontend` |
| Custom Domain | `theindiequillcollective.com` |
| Build Command | `npm run build` |
| Start Command | `npm run start` |
| Node Version | 20 |
| Plan | Starter (or as configured) |

### Production Database (Neon)

| Setting | Value |
|---------|-------|
| Provider | Neon Serverless PostgreSQL |
| Schema Management | Drizzle ORM |
| Migrations | `npm run db:generate` + `npm run db:migrate` |
| Connection | Via `DATABASE_URL` |

---

## UUID Architecture

All user and application-linked tables use standardized UUID primary keys:

### Schema Pattern

```typescript
// Standard UUID column definition
id: varchar("id", { length: 36 })
  .primaryKey()
  .default(sql`gen_random_uuid()`)
```

### Tables Using UUID Primary Keys

| Table | Column | Type |
|-------|--------|------|
| `users` | `id` | varchar(36) |
| `applications` | `id` | varchar(36) |
| `contracts` | `id` | varchar(36) |
| `cohorts` | `id` | varchar(36) |
| `audit_logs` | `id` | varchar(36) |
| `calendar_events` | `id` | varchar(36) |
| `sync_jobs` | `id` | varchar(36) |

### TypeScript Interface Alignment

```typescript
// Session interface
declare module "express-session" {
  interface SessionData {
    userId: string;      // UUID string
    userRole: string;
  }
}

// Service function signatures
async function processAcceptance(
  applicationId: string,  // UUID
  adminId: string         // UUID
): Promise<void>
```

### Cross-System Compatibility

UUIDs enable seamless integration between:
- **Collective** (NPO platform)
- **LLC** (Publishing enterprise)

Both systems reference the same author by UUID, ensuring data integrity across the ecosystem.

---

## Security Layers

### 1. HTTP Security Headers (Helmet.js)

```javascript
// Applied to all responses
{
  contentSecurityPolicy: { /* CSP rules */ },
  strictTransportSecurity: { maxAge: 31536000 },
  xFrameOptions: { action: "deny" },
  xContentTypeOptions: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}
```

### 2. Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/login` | 5 requests | 15 minutes |
| `/api/register` | 5 requests | 15 minutes |
| `/api/contracts/:id/sign` | 3 requests | 15 minutes |

### 3. Session Security

```javascript
{
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production"
  },
  store: new PgSession({ /* PostgreSQL store */ })
}
```

### 4. Password Security

- Algorithm: `crypto.scrypt`
- Salt: Random 16-byte hex
- Key Length: 64 bytes
- Storage Format: `{salt}:{hash}`

### 5. HMAC API Signing (LLC Integration)

```javascript
// Request signature generation
const message = `${timestampMs}.${JSON.stringify(payload)}`;
const signature = crypto
  .createHmac("sha256", INDIE_QUILL_API_SECRET)
  .update(message)
  .digest("hex");

// Headers sent with each LLC API request
{
  "X-API-Key": INDIE_QUILL_API_KEY,
  "X-Timestamp": timestampMs,
  "X-Signature": signature
}
```

### 6. SQL Injection Protection

- ORM: Drizzle ORM
- Queries: Parameterized via Drizzle's query builder
- Never: Raw SQL string concatenation

### 7. COPPA Compliance Controls

| Control | Implementation |
|---------|----------------|
| Guardian Consent | Required boolean field for minors |
| Audit Logging | All minor data access logged |
| Data Retention | Configurable retention periods |
| M/A Flag | Minor status in internal ID |

---

## Deployment Configuration

### Required Environment Variables

#### Database

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `PGHOST` | PostgreSQL host | Auto from DATABASE_URL |
| `PGPORT` | PostgreSQL port | Auto from DATABASE_URL |
| `PGUSER` | PostgreSQL user | Auto from DATABASE_URL |
| `PGPASSWORD` | PostgreSQL password | Auto from DATABASE_URL |
| `PGDATABASE` | PostgreSQL database name | Auto from DATABASE_URL |

#### Application

| Variable | Description | Required |
|----------|-------------|----------|
| `SESSION_SECRET` | Express session encryption key | Yes |
| `NODE_ENV` | Environment (`production`/`development`) | Yes |
| `PORT` | Server port (default: 5000) | No |

#### LLC Integration

| Variable | Description | Required |
|----------|-------------|----------|
| `INDIE_QUILL_API_URL` | LLC API base URL | For sync |
| `INDIE_QUILL_API_KEY` | LLC API key | For sync |
| `INDIE_QUILL_API_SECRET` | HMAC signing secret | For sync |

#### Email Service (Resend) - Production Only

> **Note:** In development (Replit), email uses Replit Connectors. For production (Render), configure these directly.

| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | Resend API key from resend.com | For emails |
| `RESEND_FROM_EMAIL` | Verified sender email address | For emails |

#### Google Calendar - Production Only

> **Note:** In development (Replit), calendar uses Replit Connectors. For production (Render), configure OAuth directly.

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For calendar |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | For calendar |
| `GOOGLE_REFRESH_TOKEN` | Long-lived refresh token | For calendar |

### Render Blueprint

See `render.yaml` in project root for Infrastructure-as-Code deployment configuration.

---

## External Integrations

### Google Calendar API

- **Purpose:** Board meeting scheduling, shared calendar management
- **Auth (Development):** OAuth 2.0 via Replit Connectors (automatic)
- **Auth (Production):** Direct Google OAuth credentials in environment variables
- **Scope:** Calendar read/write

### Resend Email API

- **Purpose:** Transactional emails (confirmations, acceptances)
- **Auth (Development):** API key via Replit Connectors (automatic)
- **Auth (Production):** Direct Resend API key in environment variables
- **Templates:** Application received, accepted, rejected

### The Indie Quill LLC API

- **Purpose:** Enterprise sync of author data
- **Endpoint:** `POST /api/internal/npo-authors`
- **Auth:** HMAC-SHA256 signed requests
- **Data:** Author profile, cohort, internal ID, contract status

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 2024 | Initial architecture documentation |
