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
- **VibeScribe Mobile App:** Native iOS/Android app built with Expo/React Native in `apps/mobile/`. Monorepo structure. Features: 6-digit Scribe ID keypad login, giant record button with audio capture (expo-av), OpenAI Whisper transcription via `/api/vibe/transcribe`, text-to-speech playback (expo-speech), "Send to Workspace" saves drafts via `/api/vibe/save-draft`, transcript history via `/api/vibe/history`. Dark theme (navy/teal). No embedded API keys - uses Scribe ID-based auth. Expo Go QR code on port 8080.
- **Curriculum System (rebranded):** 4-tier hierarchy: Curriculum > Catalog > Lesson > Task. UI labels use Catalog/Lesson/Task; database tables retain original names (`vibe_decks`, `tomes`, `vibe_cards`). `curriculums` table (role-based paths: Published Writer, Adult Student, Family of Students), `vibe_decks` table (catalogs within a curriculum), `tomes` table (lessons within a catalog - id, deck_id, title, content, order_index), `vibe_cards` table (individual tasks within a lesson - references tome_id, not deck_id; includes `task_type` column: 'writing'|'speaking'|'comprehension', default 'writing'). Admin Curriculum Builder with full CRUD at all 4 levels, inline editing, and nested accordion UI. Student view shows published curricula with expandable catalogs > lessons > tasks. Currently empty - ready for fresh content seeding.
- **Lessons (formerly Tomes of Wisdom):** Lesson-level educational content that gates task access. Each lesson is a separate entity under a catalog with its own title and content. Students must complete each lesson individually to unlock its tasks. Scroll modal features parchment texture, center-out unrolling animation, CSS dowel bars, EB Garamond serif typography with ornate drop cap, ink-blue backdrop, and candlelight flicker animation. Tables: `tomes` (deck_id, title, content, order_index), `tome_absorptions` (user_id VARCHAR, tome_id, absorbed_at).
- **Scribe's Sanctum (Workspace):** Full-page writer's workspace at `/student/workspace`. Three-pane layout: left sidebar (Task List + VibeScribe Inspiration Feed), center (TipTap rich text editor), bottom (word count + reading time). Two modes: "Project View" (Master Manuscript - the book) and "Task View" (individual Vibe Card writing). Full Word-style toolbar: Bold, Italic, Underline, Strikethrough, H1/H2/H3, Bullet/Ordered Lists, Blockquote, Text Alignment (left/center/right), Undo/Redo. Master Manuscript stored as TipTap JSON in JSONB column. "Move to Master Manuscript" button appends task content to master. Voice snippet injection at cursor position. Reference modal for viewing card instructions while writing. Auto-save every 2 seconds. Transcript polling every 10 seconds. Tables: `master_manuscripts` (user_id UNIQUE, title, content JSONB, word_count), `vibescribe_transcripts` (user_id, vibescribe_id, content, source_type, is_used). API: `POST /api/integration/vibescribe` (API key auth for VibeScribe voice app), `GET /api/student/vibescribe-transcripts`, `GET/PUT /api/student/master-manuscript`, `GET /api/student/workspace-cards`.
- **Manuscript Editor (Legacy):** TipTap-based rich text editor modal opens from "Start Writing" button on Vibe Card back. Auto-saves drafts every 2 seconds. Tables: `manuscripts` (user_id VARCHAR, card_id, content, word_count).
- **Card Submission Flow:** Self-report submission with brief reflection. Student writes manuscript, clicks "Submit for Review," provides reflection text. Card visually changes to completed state (green). Tables: `card_submissions` (user_id VARCHAR, card_id, manuscript_id, reflection, xp_earned, status, paste_count INTEGER, is_flagged_for_review BOOLEAN).
- **Soft Integrity Layer:** Tracks copy-paste behavior during manuscript writing sessions. TipTap's handlePaste captures pasted character count. On submission, if pasted characters exceed 50% of total manuscript content, `is_flagged_for_review` is auto-set to true. Admin Submissions tab shows all submissions with integrity badges (flagged/clear). AI review utility in `server/services/integrity-context.ts` provides prompt context for flagged submissions.
- **Author Metrics System (replaced XP):** Word-count-based progression replaces the old RPG/XP system. `AuthorScorecard` component in right sidebar shows Words Spoken (VibeScribe transcripts), Words Written (manuscripts + master manuscripts), and Total Output. 3x3 "Legacy Seals" badge grid: Foundations (Catalog 01 complete), Voice (1K spoken), Ink (1K written), Specialist (path chosen), 5K Club, 10K Club, Structure Master (Lesson 03), The Finisher (all catalogs), The Published Scribe (program complete). Badges auto-evaluate on each `/api/student/author-metrics` fetch. `game_characters` table extended with `author_path` (VARCHAR) and `badges` (JSONB). Old game-engine.ts file retained but awardXP() no longer called from submission/absorption flows. XP removed from all student-facing UI.
- **Author Path Selection:** After completing Catalog 01, students choose a specialization path via `POST /api/student/author-path`. Options: Novelist (Fiction), Authority (Non-Fiction), Poet (Verse), Storyteller (Short Stories). Stored in `game_characters.author_path`. Path determines which add-on catalogs unlock.
- **Community Page ("Fellowship of the Quill"):** Static three-column page at `/student/community` celebrating the literary ecosystem. Column 1: The Masters of Craft (literary citations — Campbell, Snyder, Strunk & White, McKee, Weiland). Column 2: Our Pillars (donor wall with "Support Our Mission" link to /donations). Column 3: The Author Advisory (invited mentors with "Join the Advisory" mailto button). Parchment/plaque aesthetic with Playfair Display headings, EB Garamond body text, responsive grid (3-col desktop, 1-col mobile). "Back to Scribe Space" footer link. Auth-gated (student role).
- **Email Notifications:** Automated via Resend for key events. Admin email is dynamically configurable via `system_settings` table (key: `admin_email`), cached 60s with fallback to `jon@theindiequill.com`. Admin can update via Operations > Email Settings in dashboard. All emails (CC, failure alerts, mentor contacts) use dynamic lookup. "Contact your mentor" button on Student Dashboard sends messages to admin email via `/api/contact-mentor`.

## Important Accounts
- **Apple Review Demo Account:** Scribe ID `123-456` (Buildathon Tester, buildathon.tester@theindiequill.org, role: student). This is the permanent demo account for Apple's App Store review team. Do not delete or modify this user.

## App Store Compliance Notes
- **Issue 90725 (SDK Version):** Starting April 28, 2026, all iOS and iPadOS apps must be built with the iOS 26 SDK or later (included in Xcode 26 or later) to be uploaded to App Store Connect or submitted for distribution. Current builds use iOS 18.2 SDK — must upgrade before that deadline.

## External Dependencies
- **Supabase:** PostgreSQL database services.
- **Google Calendar API:** For two-way event synchronization.
- **The Indie Quill LLC API:** For secure author data synchronization.
- **Stripe:** For payment processing (donations).
- **Resend:** For transactional email delivery.
- **OpenAI:** For VibeScribe audio transcription.
- **GitHub:** For source code version control.
- **Render:** Cloud platform for hosting production services.