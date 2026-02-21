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
- **Vibe Deck Curriculum System:** Unified Curriculum > Deck > Card hierarchy. `curriculums` table (top-level paths like Professional Writer), `vibe_decks` table (lessons within a curriculum), `vibe_cards` table (individual task cards with task, qualifications, XP value). Admin Vibe Deck Builder with full CRUD, inline editing, and nested accordion UI. Student view shows published curricula and decks in grouped hierarchy with 3D flip cards (front: task, back: qualifications + XP badge). Old essence system and old module-based curriculum have been removed.
- **Tomes of Wisdom:** Deck-level educational content that gates card access. Admin writes tome title/content per deck. Student sees locked/blurred cards until they open the scroll modal and click "Absorb Wisdom." Scroll modal features parchment texture, center-out unrolling animation, CSS dowel bars, EB Garamond serif typography with ornate drop cap, ink-blue backdrop, and candlelight flicker animation. Tables: `tome_absorptions` (user_id VARCHAR, deck_id, absorbed_at).
- **Scribe's Sanctum (Workspace):** Full-page writer's workspace at `/student/workspace`. Three-pane layout: left sidebar (Task List + VibeScribe Inspiration Feed), center (TipTap rich text editor), bottom (word count + reading time). Two modes: "Project View" (Master Manuscript - the book) and "Task View" (individual Vibe Card writing). Full Word-style toolbar: Bold, Italic, Underline, Strikethrough, H1/H2/H3, Bullet/Ordered Lists, Blockquote, Text Alignment (left/center/right), Undo/Redo. Master Manuscript stored as TipTap JSON in JSONB column. "Move to Master Manuscript" button appends task content to master. Voice snippet injection at cursor position. Reference modal for viewing card instructions while writing. Auto-save every 2 seconds. Transcript polling every 10 seconds. Tables: `master_manuscripts` (user_id UNIQUE, title, content JSONB, word_count), `vibescribe_transcripts` (user_id, vibescribe_id, content, source_type, is_used). API: `POST /api/integration/vibescribe` (API key auth for VibeScribe voice app), `GET /api/student/vibescribe-transcripts`, `GET/PUT /api/student/master-manuscript`, `GET /api/student/workspace-cards`.
- **Manuscript Editor (Legacy):** TipTap-based rich text editor modal opens from "Start Writing" button on Vibe Card back. Auto-saves drafts every 2 seconds. Tables: `manuscripts` (user_id VARCHAR, card_id, content, word_count).
- **Card Submission Flow:** Self-report submission with brief reflection. Student writes manuscript, clicks "Submit for Review," provides reflection text, and earns XP. Card visually changes to completed state (green). Tables: `card_submissions` (user_id VARCHAR, card_id, manuscript_id, reflection, xp_earned, status).
- **Native Game Engine:** Fully native RPG progression system stored in `game_characters` table (xp, level, active_title, unlocked_titles JSONB, equipped_items JSONB, unlocked_items JSONB). 24-level progression curve with milestone item rewards (Traveler's Satchel at L5, Golden Quill at L9, etc.) and title unlocks per level. `awardXP()` service in `server/services/game-engine.ts` handles XP grants, level-up detection, and reward unlocks. XP flows automatically: card submissions award card's xp_value, tome absorptions award 25 XP bonus. CharacterCard component displays paper doll inventory, level, XP progress bar, unlocked titles/items. Auto-creates game character on first dashboard load. External Game Engine API (curriculum-import-tool) has been deprecated.
- **Email Notifications:** Automated via Resend for key events.

## Important Accounts
- **Apple Review Demo Account:** Scribe ID `123-456` (Buildathon Tester, buildathon.tester@theindiequill.org, role: student). This is the permanent demo account for Apple's App Store review team. Do not delete or modify this user.

## External Dependencies
- **Supabase:** PostgreSQL database services.
- **Google Calendar API:** For two-way event synchronization.
- **The Indie Quill LLC API:** For secure author data synchronization.
- **Stripe:** For payment processing (donations).
- **Resend:** For transactional email delivery.
- **OpenAI:** For VibeScribe audio transcription.
- **GitHub:** For source code version control.
- **Render:** Cloud platform for hosting production services.