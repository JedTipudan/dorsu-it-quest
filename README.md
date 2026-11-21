<div align="center">

<img src="public/icons/icon-192.png" alt="DOrSU IT Quest logo" width="96" height="96" />

# DOrSU IT Quest

A gamified learning platform for BSIT students of Davao Oriental State University.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)

</div>

## About

DOrSU IT Quest turns the core BSIT subjects (Networking, Programming, Database Management and Web Development) into quests with XP, ranks, badges and leaderboards. Instructors get a Command Center with analytics and built-in research tools: pretest/posttest, SUS and a motivation scale.

## Features

**Players (students)**
- Quest lines with quizzes, simulations and timed boss fights, plus a 3-2-1-GO countdown and Victory/Level-up screens
- XP, Iron → Legend rank tiers, badges, streaks and leaderboards (with alias / opt-out)
- **Daily check-in**: a 7-day Supply Drop track, a Daily Byte review question that doubles your XP, and exclusive titles and frames
- Adaptive Daily Challenge, plus labs: Subnetting Trainer and Web Playground
- **Sign in with Google** or with email

**Instructors and admins**
- **Command Center**: Encouragement Watchlist (students at risk) and Remediation Radar (most-missed questions)
- **Quest Forge**: a visual quest builder with a live phone preview and an expert-validation rubric
- Briefings (announcements), class analytics, research statistics and anonymous CSV export
- **Admin HQ**: platform pulse, 14-day activity, user roles and the confidential code–identity key

**Platform**: dark "arena" theme with animations (Effects switch: Auto / Full / Off), installable PWA, works on phones, tablets and desktops.

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Row Level Security) · Vercel

## Getting Started

**Requirements:** Node.js 20.9+ and a free [Supabase](https://supabase.com) project.

```bash
git clone https://github.com/<your-username>/dorsu-it-quest.git
cd dorsu-it-quest
npm install
cp .env.example .env.local   # then add your Supabase URL and anon key
npm run dev                  # http://localhost:3000
```

Database: in the Supabase **SQL Editor**, run `supabase/setup.sql` once.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Full step-by-step guide** covering the database, Google sign-in, the first admin and Vercel deployment: open [`SETUP-GUIDE.html`](SETUP-GUIDE.html) in your browser.

### SQL files

| File | When to run it |
|---|---|
| `supabase/setup.sql` | Once, on a **new** Supabase project (creates everything) |
| `supabase/create-admin.sql` | To create or promote an admin account |
| `supabase/fix-permissions.sql` | Only for databases created before 21 Nov 2026 that show "permission denied" |
| `supabase/upgrade-staff-tools.sql` → `supabase/upgrade-daily-checkin.sql` | Only for databases created before these features existed (run in this order) |

## Deployment

Import the repository on [Vercel](https://vercel.com), add the three environment variables (set `NEXT_PUBLIC_SITE_URL` to your Vercel URL) and deploy. Then add `https://<your-app>.vercel.app/auth/callback` to Supabase **Authentication → URL Configuration → Redirect URLs**. The app runs in Vercel's Singapore region (`vercel.json`), close to the database.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript checks |
| `npm run db:test` | Run the database test suite (33 checks: grading, anti-cheat, privacy, check-ins) |
| `npm run db:seed` | Regenerate the seed SQL from `supabase/content/curriculum.mjs` |

## Authors

Developed by BSIT students of Davao Oriental State University as a capstone project.
