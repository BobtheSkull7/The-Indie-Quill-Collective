# The Indie Quill Collective

## Overview
The Indie Quill Collective is a 501(c)(3) non-profit platform designed to support emerging authors from application through publishing. It integrates author management, contract handling (including provisions for minor authors), and professional publishing services with The Indie Quill LLC. The platform ensures legal compliance (COPPA, GDPR) and includes modules for grant and donor logistics, board management, and a virtual classroom for literacy education, aiming to nurture new literary talent comprehensively.

## User Preferences
I prefer clear, concise explanations and a direct communication style. For coding tasks, I value modularity and well-structured code. When making changes, please prioritize security, compliance, and maintainability. Always ask for confirmation before implementing major architectural changes or significant code refactoring. I prefer an iterative development approach, with regular updates and opportunities for feedback.

## System Architecture
The project utilizes a client-server architecture. The frontend is built with React 19, Vite, and TailwindCSS 3, while the backend uses Express.js with TypeScript. Data is managed in a PostgreSQL database provided by Supabase, accessed via Drizzle ORM. Client-side routing is handled by Wouter.

**UI/UX Decisions:**
- **Typography:** Playfair Display for headings and Inter for body text.
- **Color Scheme:** Teal and blue.
- **Styling:** Standard Tailwind CSS classes.

**Security Features:**
- **HTTP Security:** Helmet.js for HTTP header protection.
- **Rate Limiting:** `express-rate-limit` on critical endpoints.
- **Secure Sessions:** `httpOnly` and `sameSite="strict"` session cookies.
- **Password Security:** `crypto.scrypt` with random salt for hashing.
- **Database Security:** Drizzle ORM for SQL injection protection.
- **Compliance:** COPPA audit logging for minor data, PII firewall for external syncs.
- **Access Control:** Role-based guards for protected pages, supporting dual roles.
- **Signature Gate:** Enterprise sync requires all necessary contract signatures.

**Technical Implementations:**
- **Author Application & Contracts:** Multi-step application, contract generation on acceptance, forensic metadata for e-signatures, PDF download.
- **Compliance:** COPPA guardian consent tracking, GDPR data export and cascading account deletion.
- **Integrations:** Automatic syncing with The Indie Quill LLC (HMAC-SHA256 signed), Google Calendar two-way sync, Stripe for donations.
- **Admin Features:** Comprehensive dashboard for user, application, cohort, board, grant, and ledger management.
- **VibeScribe:** PWA with audio capture, AI transcription (OpenAI), and draft saving.
- **Vibe Deck Curriculum System:** Unified Curriculum > Deck > Card hierarchy. `curriculums` table (top-level paths like Professional Writer), `vibe_decks` table (lessons within a curriculum), `vibe_cards` table (individual task cards with task, qualifications, XP value). Admin Vibe Deck Builder with full CRUD, inline editing, and nested accordion UI. Student view shows published curricula and decks in grouped hierarchy with 3D flip cards (front: task, back: qualifications + XP badge). Old essence system and old module-based curriculum have been removed. "My Manuscript" tab removed from student dashboard (may return later).
- **Email Notifications:** Automated via Resend for key events.

## External Dependencies
- **Supabase:** PostgreSQL database services.
- **Google Calendar API:** For two-way event synchronization.
- **The Indie Quill LLC API:** For secure author data synchronization.
- **Stripe:** For payment processing (donations).
- **Resend:** For transactional email delivery.
- **OpenAI:** For VibeScribe audio transcription.
- **GitHub:** For source code version control.
- **Render:** Cloud platform for hosting production services.