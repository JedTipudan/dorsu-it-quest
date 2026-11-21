title: DOrSU IT Quest 
is a gamified learning platform for BSIT students at Davao Oriental State University that turns major subjects — like Networking, Programming, Database Management, and Web Development — into interactive quests with points, badges, and leaderboards. Instead of relying on plain lectures, students complete quizzes, simulations, and challenges per subject to review lessons in a more engaging way, while professors gain a supplementary tool to reinforce classroom teaching and track student performance.

---

# Implementation Plan

Source of truth for the requirements: `DOrSU IT Quest.docx` (research proposal for the final defense).
Every feature below traces back to a section of that document.

## 1. Tech stack (deployment-first)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, React 19, TypeScript, Server Actions) | One codebase for UI + server logic, first-class on Vercel |
| Styling | **Tailwind CSS v4** + custom components, `lucide-react` icons | Fast responsive mobile-first UI |
| Database / Auth | **Supabase** (Postgres + Auth + Row Level Security) | Hosted DB, free tier, secure by default |
| Charts | `recharts` | Instructor dashboards |
| PWA | Web App Manifest + custom Service Worker (`public/sw.js`) + offline page | Installable on phones/laptops, works on flaky campus Wi-Fi (Research Locale) |
| Hosting | **Vercel** (app) + **Supabase Cloud** (DB) | Zero-ops deployment; nothing depends on localhost |

## 2. Roles

- **Student**: plays quests, challenges, labs, earns XP/badges, sees leaderboard, takes pre/posttest + surveys.
- **Instructor (IT Faculty)**: manages classes (join codes, experimental/control group), authors quests & questions, views analytics (completion, item difficulty, trends, pre/post results, SUS, motivation).
- **Admin**: everything an instructor can do + role management.

## 3. Feature map (Objectives → Features)

**Objective 1 – Core subjects & competencies**
- 4 seeded subjects: Networking, Programming, Database Management, Web Development.
- Each subject → quest line (ordered quests, unlocked progressively).

**Objective 2 – Gamified platform**
- Quest types: `quiz`, `simulation`, `challenge`, plus `pretest` / `posttest` assessments.
- Question kinds: multiple choice, true/false, multi-select, short answer / numeric, ordering (simulations: OSI encapsulation, TCP handshake, SQL clause order), code-output tracing.
- **Server-side grading** (Postgres RPC). Answer keys live in a separate table students can never read.
- Instant feedback: correct/incorrect + explanation per item after submit.
- **Points (XP)**, **Levels** (`level = floor(sqrt(xp/100)) + 1`), **Badges** (auto-awarded by rules), **Daily streaks**.
- **Leaderboards**: overall / per subject / per class, weekly or all-time.
- **Daily Challenge**: timed round, adaptive difficulty based on the student's mastery (flow theory).
- **Labs (simulations)**: Subnetting Trainer (server-verified with Postgres `inet` functions) and Web Playground (live HTML/CSS/JS sandbox).
- **Progress tracking**: per-subject mastery bars, attempt history.

**Objective 3 – Usability / functionality evaluation**
- Built-in **System Usability Scale** (10 items, standard 0–100 scoring, adjective rating).
- Built-in **Motivation & Engagement Scale** (Likert, weighted mean + verbal interpretation).

**Objective 4 – Effect on learning performance**
- Pretest / posttest per class; instructor research page computes means, gain, paired t-test and Cohen's d, experimental vs control comparison, CSV export (student codes only).
- Correlation of quest completion vs posttest (Pearson r).

**Objective 5 – Recommendations**
- Feedback/suggestion form; instructor feedback inbox.

**Ethics (Data Privacy Act, RA 10173)**
- Display name (alias) + **opt-out of public leaderboard**.
- Alphanumeric student codes in exports, never names.
- RLS: students only see their own data; instructors only see their own classes.

## 4. Database (Supabase / Postgres)

`profiles, subjects, quests, questions, question_keys, attempts, attempt_answers, badges, user_badges, classes, class_members, survey_responses, feedback, lab_results`
RPCs: `submit_attempt`, `get_challenge_questions`, `check_subnet`, `get_leaderboard`, `award_badges`, analytics functions.
Files: `supabase/migrations/*.sql`, `supabase/seed.sql`.

## 5. Folder structure

```
src/
  app/                 routes (marketing, auth, student app, instructor, admin)
  components/          ui/, layout/, game/, instructor/, pwa/
  lib/                 supabase clients, gamification, stats, types, validation
  proxy.ts             session refresh + route protection
supabase/              migrations + seed
public/                manifest icons, service worker
```

## 6. Milestones

1. Plan + scaffold (Next 16, Tailwind 4, Supabase clients) ✅
2. Database schema, RLS, RPCs, seed content ✅
3. Auth (register / login / logout / profile) ✅
4. Student experience: dashboard, subjects, quests, player, results, badges, leaderboard, challenge, labs ✅
5. Instructor: classes, content authoring, analytics, research (pre/post, SUS, motivation), feedback ✅
6. Admin: user roles ✅
7. PWA: manifest, icons, service worker, offline page, install prompt ✅
8. Responsive QA (375 / 768 / 1024 / 1440), production build ✅
9. README + deployment guide (Supabase + Vercel) ✅
