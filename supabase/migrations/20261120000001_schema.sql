-- =====================================================================
-- DOrSU IT Quest — core schema
-- =====================================================================

-- ---------- Enums ----------
create type public.user_role     as enum ('student', 'instructor', 'admin');
create type public.quest_type    as enum ('quiz', 'simulation', 'challenge', 'pretest', 'posttest');
create type public.question_kind as enum ('mcq', 'truefalse', 'multi', 'short', 'order', 'code');
create type public.group_type    as enum ('experimental', 'control', 'none');
create type public.instrument    as enum ('sus', 'motivation');

-- ---------- Helpers ----------
create or replace function public.level_for_xp(p_xp integer)
returns integer language sql immutable as $$
  select floor(sqrt(greatest(coalesce(p_xp, 0), 0) / 100.0))::int + 1
$$;

create or replace function public.manila_today()
returns date language sql stable as $$
  select (now() at time zone 'Asia/Manila')::date
$$;

create or replace function public.random_code(p_len integer default 6)
returns text language sql volatile as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, p_len))
$$;

-- ---------- Profiles ----------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text,
  full_name           text not null default '',
  display_name        text not null default '' check (char_length(display_name) <= 40),
  student_code        text not null unique,
  role                public.user_role not null default 'student',
  year_level          smallint check (year_level between 1 and 4),
  section             text check (char_length(section) <= 30),
  xp                  integer not null default 0 check (xp >= 0),
  streak              integer not null default 0,
  best_streak         integer not null default 0,
  last_active_date    date,
  show_on_leaderboard boolean not null default true,
  avatar_seed         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------- Curriculum ----------
create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  short_name  text not null,
  description text not null default '',
  icon        text not null default 'book',
  color       text not null default '#4F46E5',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.quests (
  id                 uuid primary key default gen_random_uuid(),
  subject_id         uuid not null references public.subjects (id) on delete cascade,
  title              text not null,
  description        text not null default '',
  type               public.quest_type not null default 'quiz',
  difficulty         smallint not null default 1 check (difficulty between 1 and 3),
  xp_reward          integer not null default 50 check (xp_reward between 0 and 1000),
  time_limit_seconds integer check (time_limit_seconds is null or time_limit_seconds between 30 and 7200),
  sort_order         integer not null default 0,
  is_published       boolean not null default true,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index quests_subject_idx on public.quests (subject_id, sort_order);

-- Questions are readable by students; answers live in question_keys (staff only).
create table public.questions (
  id         uuid primary key default gen_random_uuid(),
  quest_id   uuid not null references public.quests (id) on delete cascade,
  kind       public.question_kind not null default 'mcq',
  prompt     text not null,
  code       text,
  options    jsonb not null default '[]'::jsonb,   -- [{ "id": "x1", "text": "..." }]
  topic      text,
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  points     integer not null default 10 check (points between 1 and 100),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index questions_quest_idx on public.questions (quest_id, sort_order);

-- answer formats:
--   mcq / truefalse : { "value": "<option id>" }
--   multi           : { "values": ["<id>", ...] }
--   order           : { "order":  ["<id>", ...] }   (correct sequence)
--   short / code    : { "accepted": ["text", ...] } (case/whitespace-insensitive)
create table public.question_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  answer      jsonb not null,
  explanation text not null default ''
);

-- ---------- Activity ----------
create table public.attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  quest_id         uuid references public.quests (id) on delete set null,
  subject_id       uuid references public.subjects (id) on delete set null,
  mode             text not null check (mode in ('quest', 'challenge', 'assessment')),
  score            integer not null default 0,
  max_score        integer not null default 0,
  correct_count    integer not null default 0,
  total_count      integer not null default 0,
  percent          numeric(5, 2) not null default 0,
  passed           boolean not null default false,
  xp_earned        integer not null default 0,
  duration_seconds integer not null default 0,
  created_at       timestamptz not null default now()
);
create index attempts_user_idx    on public.attempts (user_id, created_at desc);
create index attempts_quest_idx   on public.attempts (quest_id);
create index attempts_subject_idx on public.attempts (subject_id, created_at);

create table public.attempt_answers (
  id          bigint generated always as identity primary key,
  attempt_id  uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  response    jsonb,
  is_correct  boolean not null default false
);
create index attempt_answers_attempt_idx  on public.attempt_answers (attempt_id);
create index attempt_answers_question_idx on public.attempt_answers (question_id);

-- Issued adaptive challenge rounds (prevents cherry-picking questions).
create table public.challenge_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  subject_id        uuid references public.subjects (id) on delete cascade,
  question_ids      uuid[] not null,
  target_difficulty smallint not null,
  created_at        timestamptz not null default now(),
  submitted_at      timestamptz
);

create table public.lab_results (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  lab        text not null,
  correct    boolean not null,
  xp_earned  integer not null default 0,
  created_at timestamptz not null default now()
);
create index lab_results_user_idx on public.lab_results (user_id, created_at);

-- ---------- Badges ----------
create table public.badges (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text not null,
  icon        text not null default 'award',
  tier        text not null default 'bronze' check (tier in ('bronze', 'silver', 'gold')),
  rule_type   text not null check (rule_type in
                ('quests_completed', 'perfect_scores', 'challenges', 'labs', 'xp', 'level', 'streak', 'subject_complete')),
  rule_value  integer not null default 1,
  subject_id  uuid references public.subjects (id) on delete cascade,
  sort_order  integer not null default 0
);

create table public.user_badges (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  badge_id   uuid not null references public.badges (id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- ---------- Classes (sections) ----------
create table public.classes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  subject_id    uuid not null references public.subjects (id) on delete restrict,
  instructor_id uuid not null references public.profiles (id) on delete cascade,
  join_code     text not null unique default public.random_code(6),
  group_type    public.group_type not null default 'none',
  academic_year text not null default '2026-2027',
  created_at    timestamptz not null default now()
);

create table public.class_members (
  class_id   uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index class_members_student_idx on public.class_members (student_id);

-- ---------- Research instruments ----------
create table public.survey_responses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  instrument public.instrument not null,
  answers    jsonb not null,           -- array of integers 1..5
  score      numeric(6, 2),            -- computed by trigger
  created_at timestamptz not null default now(),
  unique (user_id, instrument)
);

create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  category   text not null default 'general' check (category in ('general', 'content', 'usability', 'bug', 'feature')),
  message    text not null check (char_length(message) between 3 and 2000),
  created_at timestamptz not null default now()
);
