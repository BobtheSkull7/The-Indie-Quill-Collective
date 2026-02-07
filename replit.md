# The Indie Quill Collective

## Overview
The Indie Quill Collective is a 501(c)(3) non-profit platform supporting emerging authors of all ages. Its core purpose is to streamline author application intake, manage contracts (including provisions for minor authors), and integrate with The Indie Quill LLC for professional publishing services. The platform aims to be a comprehensive system for nurturing new literary talent, handling everything from initial application to tracking publishing progress, while adhering to legal and compliance standards such as COPPA and GDPR.

## User Preferences
I prefer clear, concise explanations and a direct communication style. For coding tasks, I value modularity and well-structured code. When making changes, please prioritize security, compliance, and maintainability. Always ask for confirmation before implementing major architectural changes or significant code refactoring. I prefer an iterative development approach, with regular updates and opportunities for feedback.

## System Architecture
The project utilizes a client-server architecture with a React 19, Vite, and TailwindCSS 3 frontend and an Express.js (TypeScript) backend. Data is persisted in a PostgreSQL database managed by Supabase and Drizzle ORM. Routing is handled client-side with Wouter.

**Key Features:**
- **Author Application & Management:** Multi-step NPO author application system, minor author support with guardian information, and digital contract management with PDF generation and forensic signature metadata.
- **Admin Dashboard (Consolidated):** 3-tab layout (Applicants, Calendar, Operations). Applicants tab uses 2-row card layout per user showing: Row 1 (Real Name, Pseudonym, Email, Role), Row 2 (Age, Status, LLC Sync Status, Joined Date, Action Buttons for view/edit/contract/retry sync). Tile filters work with sync status filters. Calendar tab for event management. Operations tab for metrics and operations.
- **User & Data Management:** Secure user authentication with rate limiting, GDPR Right to Erasure and Data Portability, and COPPA compliance with audit logging for minor data access.
- **Enterprise Sync:** A single-step atomic synchronization process with The Indie Quill LLC for approved applications, including cohort assignment, unique ID generation, and background worker processing with HMAC-signed requests. **Sync is deferred until contract is fully signed** to ensure Manual Ledger and Forensic Audit Trail accuracy.
- **Grant & Donor Logistics Module:** Foundation CRM with contact person management, solicitation logging to prevent double-tapping, grant allocation with cohort assignment, efficiency surplus calculation showing donors when cost optimization serves more authors than promised, and author-to-donation locking for immutable donor impact reporting with Zero-PII compliance (initial+emoji format).
- **Friendly 4 Pilot Layer:** Form Vault (/admin/vault) for standardized legal documents (Guardian Consent, Code of Conduct, Conflict of Interest, Pilot Feedback) with one-click copy. Manual Ledger (/admin/ledger) tracking $777 per-capita sponsorships, ISBN/copyright expenses, and ISBN Arbitrage Surplus ($119.25 reinvestable per author). Author spending breakdown shows sponsorship vs. spent amounts.
- **BoD Wiki:** Collaborative knowledge base for admin and board members in Training page. Features include pinned entries, category filtering (general, policies, meetings, resources, training, contacts), full-text search, and CRUD operations. Stores meeting notes, procedures, and institutional knowledge.

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
- **Schema Management:** Drizzle for schema and migrations. Production schema updates require additive-only SQL migrations via `/scripts/complete-prod-migration.sql`. Never use `db:push` on production. Key column conventions: `pseudonym` (not `pen_name`), `family_name` (not `name`), `entity_type`/`entity_id` for audit logs. All user ID references use VARCHAR(36) for UUID compatibility.

**Author Self-Service & Transparency:**
- **Consolidated Home Page (/):** Single-page landing experience optimized for donor conversion and author onboarding with 5 sections: Hero (mission statement), Identity Bridge (Legal Name vs Pseudonym visual), Chevron Path (7-phase publishing flywheel), Impact Analytics (4 key metrics side-by-side), and Unified CTA Footer (Apply + Donations). The /about route redirects to /.
- **Author Dashboard:** 4-step pipeline tracker (Applied → Under Review → Contract Ready → Signed), Download Contract button for signed agreements, Kill Switch for application rescission.
- **Kill Switch (Rescind Application):** Soft-delete pattern - sets status='rescinded', nulls PII fields (dateOfBirth, guardianName, guardianEmail, guardianPhone, personalStruggles, whyCollective), preserves pseudonym/createdAt/id for audit trail.
- **Auditor Role & Dashboard (/auditor):** Zero-PII Analytics Command Center with conversion funnel metrics, identity mode distribution, forensic health indicators - aggregate data only, no individual identifiers. Active Cohort Progress shows n/10 denominator.
- **Secure Identity Vault:** Admin-only view at /admin/vault linking Pseudonym ↔ Legal Name with LLC Sync Status and audit logging of all access.

**Core Database Schema Highlights:**
- **users:** User accounts with roles (applicant, writer, admin, board_member, auditor, student, mentor). Writers bypass training/Game Engine and sync directly to The Indie Quill LLC.
- **cohorts:** Manages author cohorts (10 authors per cohort).
- **applications:** Stores author application details, COPPA compliance fields, `public_identity_enabled` toggle, status includes 'rescinded' for soft-deleted applications.
- **contracts:** Publishing agreements with signature tracking.
- **audit_logs:** Comprehensive logging for COPPA compliance, tracking user actions on sensitive data including Secure Identity Vault access.

**Frictionless Literacy - Virtual Classroom (Phase 1):**
- **student_profiles:** Student-specific data including cohort assignment, accessibility preferences (standard, high_contrast, large_text, screen_reader), and enrollment tracking.
- **mentor_profiles:** Mentor capabilities including specialties, bio, and maximum student assignments.
- **mentor_student_assignments:** Many-to-many relationship linking mentors to their assigned students.
- **curriculum_modules:** 120-hour "Architecture of Authorship" course content with ordered lessons, duration tracking, and content types.
- **student_curriculum_progress:** Tracks per-module completion percentage, hours spent, and completion dates.
- **tabe_assessments:** TABE test scores for measuring EFL (Educational Functioning Level) gains - baseline vs. current with grade equivalents.
- **meetings:** Video session scheduling with mentors, supporting Google Meet, Zoom, Jitsi, and Daily providers.
- **meeting_attendees:** Tracks student participation in meetings.
- **student_activity_logs:** Tracks hours active and word count milestones for grant reporting.
- **drafting_documents:** "Legacy Work" manuscript storage with word count tracking.
- **wiki_entries:** BoD Wiki articles with title, content, category, author, and pin status.

**Branching Curriculum System:**
- **Persona Types:** Writer, Adult Student, Family Student - selected during application
- **VibeScribe ID:** Auto-generated xxx-xxx format ID assigned on cohort acceptance
- **Curriculum Traffic Cop:** Filters modules based on persona_type and family_role:
  - Writers see general/adult modules
  - Adult Students see literacy modules, unlock general at 120+ hours
  - Family Students see literacy/family modules filtered by adult vs child role
- **Path Types:** literacy, general, publishing
- **Audience Types:** adult, child, all

**DGLF Grant Reporting:**
- Impact Report generator in Auditor dashboard Outcomes tab
- Aggregates TABE EFL gains (baseline vs post-test per student)
- PACT time totals for family literacy sessions
- Curriculum progress metrics
- Family anthology completion status

**Student Dashboard (/student):**
- 4 key metrics: Hours Active, Word Count, Course Progress, Modules Completed
- Curriculum progress visualization with completion status per module
- TABE score display showing baseline vs. current grade level gains
- Upcoming video sessions with "Join Session" button
- Mobile-first, accessible design
- **CharacterCard Component:** RPG-style character display with dark theme (#121212), Playfair Display headers, gold accents (#d4af37). Shows level, XP progress bar, 2x3 equipment grid (6 slots), quest completion, and pulsing "Claim Reward" button when quests are claimable. Fetches live data from Game Engine via `/api/student/game-character` endpoint (student-role protected).

**Curriculum Player (/student/module/:id):**
- Full module content display with progress tracking
- Text-to-Speech (TTS) accessibility feature with play/pause/restart controls
- Mark Complete functionality for module completion
- Navigation between modules with previous/next buttons

**Drafting Suite (/student/drafts):**
- "Legacy Work" manuscript editor with auto-save (3-second debounce)
- Real-time word count tracking
- Document management (create, edit, delete)
- Text-to-Speech for proofreading
- One-Click Publish for manuscripts 500+ words (submission for review)

**Mentor Dashboard (/mentor):**
- Student roster with progress metrics (hours active, word count, course progress)
- Meeting scheduler with session type selection (one-on-one, group, review, workshop)
- Student email links for quick communication
- Mentor statistics (total students, avg progress, avg hours active, upcoming meetings)

**VibeScribe 2.0 (/vibe) - Mobile-First Voice Authoring PWA:**
- **Screen 1 - Keypad Login:** Clean numeric keypad for xxx-xxx Author ID entry, auto-submit on 6 digits, no email/password required
- **Screen 2 - Drafting Hub:** Giant recording button with hold-to-speak voice-to-text using Web Speech API, real-time family word count display, play last snippet functionality, auto-save to drafting_documents
- **Screen 3 - Challenge Mode:** Live quiz system with A/B/C/D buttons, vibration alerts when quiz triggered, 60-second countdown timer
- **PWA Features:** Standalone manifest, theme color integration, installable to home screen, works offline for voice capture
- **DGLF Evidence:** Proves PACT time (Parent and Child Together) by linking activity to Family Units via vibeScribeId
- **Database Tables:** vibe_quizzes (question, options, time_limit, is_active), vibe_quiz_answers (quiz_id, user_id, answer, answered_at)

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md):** Comprehensive technical reference including naming conventions, data flow diagrams, infrastructure map, UUID architecture, security layers, and deployment configuration.
- **[render.yaml](./render.yaml):** Infrastructure-as-Code blueprint for Render deployment with service configuration, custom domain, and environment variables.

## External Dependencies
- **GitHub:** Source code version control and repository.
- **Render:** Cloud platform for hosting production web services (frontend and backend). See `render.yaml` for deployment blueprint.
- **Supabase:** PostgreSQL database provider for development and production environments.
- **Google Calendar API:** Two-way synchronization for event management.
- **The Indie Quill LLC API:** External API for synchronizing author application and status data, requiring HMAC-SHA256 signed requests for secure integration.