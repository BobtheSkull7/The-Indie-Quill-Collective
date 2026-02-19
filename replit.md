# The Indie Quill Collective

## Overview
The Indie Quill Collective is a 501(c)(3) non-profit platform dedicated to supporting emerging authors. Its primary purpose is to manage author applications, contracts (including provisions for minor authors), and integrate with The Indie Quill LLC for professional publishing services. The platform aims to provide a comprehensive system for nurturing new literary talent, handling the process from application to publishing, while adhering to legal and compliance standards such as COPPA and GDPR. It also includes modules for grant and donor logistics, board management, and a virtual classroom for literacy education.

## User Preferences
I prefer clear, concise explanations and a direct communication style. For coding tasks, I value modularity and well-structured code. When making changes, please prioritize security, compliance, and maintainability. Always ask for confirmation before implementing major architectural changes or significant code refactoring. I prefer an iterative development approach, with regular updates and opportunities for feedback.

## CRITICAL: Database Schema Drift Policy
**Every time a database schema change is made (new table, new column, altered column, etc.), you MUST tell the user exactly what SQL to run in Supabase.** The Replit dev database and the Supabase databases (dev + prod) are separate and do NOT auto-sync. Schema drift between them has caused production outages.

**Checklist for every schema change:**
1. Make the change in `shared/schema.ts` (Drizzle ORM)
2. Run `npm run db:push` to apply to the local Replit database
3. **Immediately tell the user** the exact SQL statements needed for both Supabase Dev and Supabase Prod databases
4. Format the SQL clearly so it can be copy-pasted into the Supabase SQL Editor
5. Never assume a column or table exists in Supabase just because it exists locally

**Current Supabase schema additions (already applied):**
- `users` table: `secondary_role TEXT` column added
- `board_members` table created (id SERIAL PK, name, title, bio, photo_filename, email, linkedin, display_order, is_active, created_at, updated_at)

## System Architecture
The project employs a client-server architecture. The frontend is built with React 19, Vite, and TailwindCSS 3, while the backend uses Express.js with TypeScript. Data is managed in a PostgreSQL database via Supabase and Drizzle ORM. Client-side routing is handled by Wouter.

**Key Features:**
- **Author Application & Management:** Features a multi-step NPO author application process, support for minor authors with guardian information, and digital contract management including PDF generation and forensic signature metadata. Enterprise sync with The Indie Quill LLC is atomic and deferred until contract signing, ensuring data integrity and compliance.
- **Admin Dashboard:** A consolidated interface for managing applicants, calendar events, and operational metrics. Includes secure identity vault for pseudonym-to-legal name linking.
- **User & Data Management:** Implements secure user authentication with rate limiting, GDPR compliance (Right to Erasure, Data Portability), and COPPA compliance with audit logging for minor data access. PII firewall ensures only pseudonyms are transmitted externally for sync.
- **Grant & Donor Logistics:** A CRM for foundations, managing solicitations, grant allocation, efficiency surplus calculation, and author-to-donation locking with Zero-PII compliance.
- **Friendly 4 Pilot Layer:** Includes a Form Vault for standardized legal documents and a Manual Ledger for tracking sponsorships and publishing expenses, including ISBN Arbitrage Surplus.
- **BoD Wiki:** A collaborative knowledge base for administrators and board members, featuring CRUD operations, category filtering, full-text search, and file attachments stored on disk.
- **Dynamic Board Management:** Database-driven board member profiles with admin CRUD capabilities and photo uploads.
- **Dual-Role System:** Supports primary and secondary user roles for flexible authorization.
- **Dynamic Impact Metrics:** Real-time impact analytics displayed on the homepage, fetching data from a public API.
- **Author Self-Service & Transparency:** Offers a consolidated home page for donor conversion and author onboarding, an Author Dashboard for tracking application progress, and a "Kill Switch" for application rescission (soft-delete).
- **Auditor Role & Dashboard:** Provides Zero-PII analytics for conversion funnels and forensic health indicators using aggregate data.
- **Frictionless Literacy - Virtual Classroom:** Includes student and mentor profiles, assignment management, curriculum modules, progress tracking, TABE assessments for EFL gains, video meeting scheduling, and activity logging.
- **Branching Curriculum System:** Delivers personalized learning paths based on user persona (Writer, Adult Student, Family Student) and an auto-generated VibeScribe ID.
- **DGLF Grant Reporting:** Generates impact reports based on TABE EFL gains, PACT time totals, and curriculum progress.
- **Student Dashboard:** Displays key metrics (hours active, word count, course progress), curriculum visualization, TABE scores, upcoming meetings, and an RPG-style CharacterCard component.
- **Curriculum Player:** Allows students to access module content with progress tracking, text-to-speech, and completion functionality.
- **Drafting Suite:** A manuscript editor with auto-save, real-time word count, document management, text-to-speech for proofreading, and one-click publishing.
- **Mentor Dashboard:** Provides mentor with student rosters, progress metrics, meeting scheduling, and mentor statistics.
- **VibeScribe 2.0 (Mobile PWA):** A mobile-first voice authoring PWA featuring numeric keypad login, a drafting hub with voice-to-text, challenge mode for quizzes, and offline capabilities for voice capture.

**UI/UX Decisions:**
- Uses Playfair Display for headings and Inter for body text.
- Employs a teal and blue color scheme.
- Styling is implemented using standard Tailwind CSS classes.

**Security Features:**
- **HTTP Security:** Utilizes Helmet.js for comprehensive HTTP header protection.
- **Rate Limiting:** Implemented using `express-rate-limit` for critical endpoints.
- **Secure Sessions:** Uses `httpOnly` and `sameSite="strict"` session cookies.
- **Password Security:** Employs `crypto.scrypt` with random salt for hashing.
- **Database Security:** Drizzle ORM provides SQL injection protection.
- **COPPA Compliance:** Includes audit logging for minor data access.
- **PII Firewall:** Ensures PII is never transmitted externally during sync.
- **Signature Gate:** Enterprise sync is gated until all necessary contract signatures are secured.

## External Dependencies
- **GitHub:** Used for source code version control.
- **Render:** Cloud platform for hosting production web services.
- **Supabase:** Provides PostgreSQL database services.
- **Google Calendar API:** Integrated via custom OAuth2 for two-way event synchronization, storing refresh tokens in `system_settings`.
- **The Indie Quill LLC API:** External API for secure author application and status data synchronization using HMAC-SHA256 signed requests.