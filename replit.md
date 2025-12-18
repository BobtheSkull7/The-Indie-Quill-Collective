# The Indie Quill Collective

## Overview
The Indie Quill Collective is a 501(c)(3) non-profit platform supporting emerging authors of all ages. Its core purpose is to streamline author application intake, manage contracts (including provisions for minor authors), and integrate with The Indie Quill LLC for professional publishing services. The platform aims to be a comprehensive system for nurturing new literary talent, handling everything from initial application to tracking publishing progress, while adhering to legal and compliance standards such as COPPA and GDPR.

## User Preferences
I prefer clear, concise explanations and a direct communication style. For coding tasks, I value modularity and well-structured code. When making changes, please prioritize security, compliance, and maintainability. Always ask for confirmation before implementing major architectural changes or significant code refactoring. I prefer an iterative development approach, with regular updates and opportunities for feedback.

## System Architecture
The project utilizes a client-server architecture with a React 19, Vite, and TailwindCSS 3 frontend and an Express.js (TypeScript) backend. Data is persisted in a PostgreSQL database managed by Neon and Drizzle ORM. Routing is handled client-side with Wouter.

**Key Features:**
- **Author Application & Management:** Multi-step NPO author application system, minor author support with guardian information, and digital contract management with PDF generation and forensic signature metadata.
- **Admin & Board Dashboards:** Tools for reviewing applications, managing workflows, tracking publishing status, and shared calendar management with Google Calendar integration.
- **User & Data Management:** Secure user authentication with rate limiting, GDPR Right to Erasure and Data Portability, and COPPA compliance with audit logging for minor data access.
- **Enterprise Sync:** A single-step atomic synchronization process with The Indie Quill LLC for approved applications, including cohort assignment, unique ID generation, and background worker processing with HMAC-signed requests.

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

**Deployment & Development:**
- **Development:** Replit for local development.
- **Source Control:** GitHub as the source of truth.
- **Production Hosting:** Render for backend and frontend web services.
- **Database:** Neon for production PostgreSQL.
- **Schema Management:** Drizzle for schema and migrations. Production schema updates require generating and applying migrations, never `db:push`.

**Core Database Schema Highlights:**
- **users:** User accounts with roles (applicant, admin, board_member).
- **cohorts:** Manages author cohorts (10 authors per cohort).
- **applications:** Stores author application details, including COPPA compliance fields (guardian consent, data retention).
- **contracts:** Publishing agreements with signature tracking.
- **audit_logs:** Comprehensive logging for COPPA compliance, tracking user actions on sensitive data.

## External Dependencies
- **GitHub:** Source code version control and repository.
- **Render:** Cloud platform for hosting production web services (frontend and backend).
- **Neon:** Serverless PostgreSQL database for production.
- **Google Calendar API:** Two-way synchronization for event management.
- **The Indie Quill LLC API:** External API for synchronizing author application and status data, requiring HMAC-SHA256 signed requests for secure integration.