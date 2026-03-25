# The Indie Quill Collective

## Overview
The Indie Quill Collective is a 501(c)(3) non-profit platform supporting emerging authors from application through publishing, in partnership with The Indie Quill LLC. It integrates author management, legally compliant contract handling (including for minors), and professional publishing services. The platform also features modules for grant and donor logistics, board management, and a virtual classroom for literacy education, aiming to comprehensively nurture new literary talent. The project's vision is to foster a new generation of diverse literary voices.

## User Preferences
I prefer clear, concise explanations and a direct communication style. For coding tasks, I value modularity and well-structured code. When making changes, please prioritize security, compliance, and maintainability. Always ask for confirmation before implementing major architectural changes or significant code refactoring. I prefer an iterative development approach, with regular updates and opportunities for feedback.

## System Architecture
The application employs a client-server architecture. The frontend is developed using React 19, Vite, and TailwindCSS 3, while the backend is an Express.js server written in TypeScript. Data persistence is handled by a PostgreSQL database provided by Supabase, accessed via Drizzle ORM. Client-side navigation is managed by Wouter.

**UI/UX Decisions:**
- **Typography:** Playfair Display for headings and Inter for body text.
- **Color Scheme:** Teal and blue palette.
- **Styling:** Primarily uses standard Tailwind CSS classes.
- **Lesson Content Display:** "Folio Reveal" transition for lessons, featuring a fade-in backdrop, slide-up paper card with texture, expanding rule line, and staggered content reveal.
- **Author Path Selection:** Full-screen "Induction" modal with paper grain and custom SVG press marks for path selection.

**Technical Implementations:**
- **Security:** HTTP header protection with Helmet.js, rate limiting on critical endpoints, secure session cookies, `crypto.scrypt` for password hashing, Drizzle ORM for SQL injection prevention, COPPA audit logging, PII firewall, and role-based access control with dual-role support.
- **Author Lifecycle Management:** Multi-step application process, automated contract generation with forensic e-signatures, and PDF download.
- **Compliance:** COPPA guardian consent tracking, GDPR data export, and cascading account deletion.
- **Integrations:** Automatic HMAC-SHA256 signed syncing with The Indie Quill LLC, two-way Google Calendar synchronization, and Stripe for donations.
- **Admin Dashboard:** Comprehensive management for users, applications, cohorts, board members, grants, and financial ledgers.
- **VibeScribe Mobile App (Expo/React Native):** Native app for iOS/Android, featuring 6-digit Scribe ID login, audio recording with transcription (OpenAI Whisper), text-to-speech, and draft saving to the Workspace.
- **Curriculum System:** A 4-tier hierarchy (Curriculum > Catalog > Lesson > Task) for educational content delivery. Includes an Admin Curriculum Builder with full CRUD operations and a student-facing view of published curricula.
- **Lessons (formerly Tomes of Wisdom):** Educational content gating task access. Students must complete lessons to unlock associated tasks.
- **Scribe's Sanctum (Writer's Workspace):** A full-page editor with a three-pane layout including a task list, a TipTap rich text editor, and a word count/reading time display. Supports "Project View" for master manuscripts and "Task View" for individual writing tasks, with auto-save and voice snippet injection.
- **Card Submission Flow:** Students submit tasks with reflection, triggering a completion status update.
- **Soft Integrity Layer:** Monitors copy-paste activity during writing sessions. Submissions exceeding a 50% paste threshold are flagged for review.
- **Author Metrics System:** Replaces XP with word-count-based progression. Displays Words Spoken, Words Written, and Total Output. Features a 3x3 "Legacy Seals" badge grid awarded for curriculum milestones and word count achievements.
- **Catalog Seeding:** Initial content for "The Universal Core" and specialization catalogs ("The Novelist's Craft," "The Authority's Framework," "The Storyteller's Art," "The Poet's Voice") are seeded with lessons and tasks.
- **Author Path Selection ("The Induction"):** A modal presented upon completion of foundational lessons, allowing students to choose a specialization path (Novelist, Authority, Poet, Storyteller).
- **Email Notifications:** Automated email delivery via Resend for key events, with dynamic admin email configuration.
- **Contact Modal System:** A reusable component for user inquiries, replacing `mailto:` links, with rate-limiting and page source tracking.

## External Dependencies
- **Supabase:** PostgreSQL database and authentication services.
- **Google Calendar API:** For synchronizing calendar events.
- **The Indie Quill LLC API:** For secure synchronization of author data.
- **Stripe:** For processing donations.
- **Resend:** For transactional email delivery.
- **OpenAI:** For VibeScribe audio transcription services.
- **Render:** Cloud platform for hosting production services.