# The Indie Quill Collective

## Overview
The Indie Quill Collective is a 501(c)(3) non-profit organization platform designed to support emerging authors of all ages. The platform handles author application intake, contract management (with special provisions for minor authors), and integrates with The Indie Quill LLC for professional publishing services.

## Current State
- **Status**: MVP Complete
- **Last Updated**: December 2024

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
- **users** - User accounts with role (applicant/admin)
- **applications** - Author applications with book/manuscript details
- **contracts** - Publishing agreements with signature tracking
- **publishingUpdates** - Publishing status from The Indie Quill LLC

## User Roles
- **applicant** - Default role for new users, can submit applications
- **admin** - Can review applications, accept/reject, view all data

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

## Running Locally
```bash
npm run dev          # Start development server
npm run db:push      # Push schema to database
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)

## Integration with The Indie Quill LLC
Once applications are accepted and contracts are signed:
1. Author record is migrated to "migrated" status
2. Publishing updates are created to track progress
3. The Indie Quill LLC handles actual publishing services

## Notes
- All text styling uses standard Tailwind classes
- Playfair Display font for headings, Inter for body text
- Teal and blue color scheme for branding
