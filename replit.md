# The Indie Quill Collective

## Overview
The Indie Quill Collective is a 501(c)(3) non-profit platform supporting emerging authors of all ages. Its core purpose is to streamline author application intake, manage contracts (including provisions for minor authors), and integrate with The Indie Quill LLC for professional publishing services. The platform aims to be a comprehensive system for nurturing new literary talent, handling everything from initial application to tracking publishing progress, while adhering to legal and compliance standards such as COPPA and GDPR.

## User Preferences
I prefer clear, concise explanations and a direct communication style. For coding tasks, I value modularity and well-structured code. When making changes, please prioritize security, compliance, and maintainability. Always ask for confirmation before implementing major architectural changes or significant code refactoring. I prefer an iterative development approach, with regular updates and opportunities for feedback.

## System Architecture
The project utilizes a client-server architecture with a React 19, Vite, and TailwindCSS 3 frontend and an Express.js (TypeScript) backend. Data is persisted in a PostgreSQL database managed by Supabase and Drizzle ORM. Routing is handled client-side with Wouter.

**Key Features:**
- **Author Application & Management:** Multi-step NPO author application system, minor author support with guardian information, and digital contract management with PDF generation and forensic signature metadata.
- **Admin & Board Dashboards:** Tools for reviewing applications, managing workflows, tracking publishing status, and shared calendar management with Google Calendar integration.
- **User & Data Management:** Secure user authentication with rate limiting, GDPR Right to Erasure and Data Portability, and COPPA compliance with audit logging for minor data access.
- **Enterprise Sync:** A single-step atomic synchronization process with The Indie Quill LLC for approved applications, including cohort assignment, unique ID generation, and background worker processing with HMAC-signed requests. **Sync is deferred until contract is fully signed** to ensure Manual Ledger and Forensic Audit Trail accuracy.
- **Grant & Donor Logistics Module:** Foundation CRM with contact person management, solicitation logging to prevent double-tapping, grant allocation with cohort assignment, efficiency surplus calculation showing donors when cost optimization serves more authors than promised, and author-to-donation locking for immutable donor impact reporting with Zero-PII compliance (initial+emoji format).
- **Friendly 4 Pilot Layer:** Form Vault (/admin/vault) for standardized legal documents (Guardian Consent, Code of Conduct, Conflict of Interest, Pilot Feedback) with one-click copy. Manual Ledger (/admin/ledger) tracking $777 per-capita sponsorships, ISBN/copyright expenses, and ISBN Arbitrage Surplus ($119.25 reinvestable per author). Author spending breakdown shows sponsorship vs. spent amounts.

**UI/UX Decisions:**
- Uses Playfair Display for headings and Inter for body text.
- Employs a teal and blue color scheme for branding.
- Styling is implemented using standard Tailwind classes.

**Security Features:**
- **HTTP Security:** Helmet.js for comprehensive HTTP headers (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Cross-Origin policies, Referrer-Policy, CSP).
- **Rate Limiting:** `express-rate-limit` for login, registration, and contract signing endpoints.
- **Secure Sessions:** `httpOnly` and `sameSite="strict"` session cookies.
- **Password Security:** `crypto.scrypt` with random salt for hashing.
- **Database Security:** Drizzle ORM for SQL injection protection via parameterized queries.
- **COPPA Compliance:** Audit logging for all access to minor data.
- **PII Firewall:** All sync payloads to The Indie Quill LLC use ONLY pseudonym/pen name - never legal names (firstName, lastName), guardian info, or dateOfBirth. Legal names are stored in NPO contracts for forensic records but never transmitted externally.
- **Signature Gate:** Enterprise sync to LLC is deferred until contract is fully signed (both author and guardian when required).

**Deployment & Development:**
- **Development:** Replit for local development.
- **Source Control:** GitHub as the source of truth.
- **Production Hosting:** Render for backend and frontend web services.
- **Database:** Supabase for development and production PostgreSQL (SUPABASE_DEV_URL / SUPABASE_PROD_URL).
- **Schema Management:** Drizzle for schema and migrations. Production schema updates require generating and applying migrations, never `db:push`.

**Author Self-Service & Transparency:**
- **Consolidated Home Page (/):** Single-page landing experience optimized for donor conversion and author onboarding with 5 sections: Hero (mission statement), Identity Bridge (Legal Name vs Pseudonym visual), Chevron Path (7-phase publishing flywheel), Impact Analytics (4 key metrics side-by-side), and Unified CTA Footer (Apply + Donations). The /about route redirects to /.
- **Author Dashboard:** 4-step pipeline tracker (Applied → Under Review → Contract Ready → Signed), Download Contract button for signed agreements, Kill Switch for application rescission.
- **Kill Switch (Rescind Application):** Soft-delete pattern - sets status='rescinded', nulls PII fields (dateOfBirth, guardianName, guardianEmail, guardianPhone, personalStruggles, whyCollective), preserves pseudonym/createdAt/id for audit trail.
- **Auditor Role & Dashboard (/auditor):** Zero-PII Analytics Command Center with conversion funnel metrics, identity mode distribution, forensic health indicators - aggregate data only, no individual identifiers. Active Cohort Progress shows n/10 denominator.
- **Secure Identity Vault:** Admin-only view at /admin/vault linking Pseudonym ↔ Legal Name with LLC Sync Status and audit logging of all access.

**Core Database Schema Highlights:**
- **users:** User accounts with roles (applicant, admin, board_member, auditor).
- **cohorts:** Manages author cohorts (10 authors per cohort).
- **applications:** Stores author application details, COPPA compliance fields, `public_identity_enabled` toggle, status includes 'rescinded' for soft-deleted applications.
- **contracts:** Publishing agreements with signature tracking.
- **audit_logs:** Comprehensive logging for COPPA compliance, tracking user actions on sensitive data including Secure Identity Vault access.

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md):** Comprehensive technical reference including naming conventions, data flow diagrams, infrastructure map, UUID architecture, security layers, and deployment configuration.
- **[render.yaml](./render.yaml):** Infrastructure-as-Code blueprint for Render deployment with service configuration, custom domain, and environment variables.

## External Dependencies
- **GitHub:** Source code version control and repository.
- **Render:** Cloud platform for hosting production web services (frontend and backend). See `render.yaml` for deployment blueprint.
- **Supabase:** PostgreSQL database provider for development and production environments.
- **Google Calendar API:** Two-way synchronization for event management.
- **The Indie Quill LLC API:** External API for synchronizing author application and status data, requiring HMAC-SHA256 signed requests for secure integration.