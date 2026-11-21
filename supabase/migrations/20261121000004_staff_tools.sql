-- =====================================================================
-- DOrSU IT Quest: staff tools (Command Center, announcements, expert review)
-- Traceability to the study (DOrSU IT Quest.docx):
--   * remediation_radar  → "item-level difficulty … guide remediation during a course"
--   * staff_watchlist    → "watched the platform for indications of discouragement
--                           among lower-ranked users"
--   * quest_reviews      → expert validation rubric: content accuracy, alignment,
--                           appropriateness of difficulty, technical quality (Objective 3)
--   * announcements      → instructors "reinforce classroom instruction"
--   * platform_pulse     → admin overview of adoption/usage
-- Idempotent: safe to run on an existing database (see supabase/upgrade-staff-tools.sql).
-- =====================================================================

-- ---------- Announcements ("mission briefings") ----------
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  class_id   uuid references public.classes (id) on delete cascade,   -- null = everyone (admins only)
  title      text not null check (char_length(title) between 3 and 100),
  body       text not null default '' check (char_length(body) <= 1000),
  tone       text not null default 'info' check (tone in ('info', 'event', 'urgent')),
  pinned     boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists announcements_class_idx on public.announcements (class_id, created_at desc);
alter table public.announcements enable row level security;

drop policy if exists "announcements: read own audience" on public.announcements;
create policy "announcements: read own audience" on public.announcements
  for select to authenticated using (
    class_id is null or public.is_class_member(class_id) or public.is_class_owner(class_id)
  );
drop policy if exists "announcements: staff post" on public.announcements;
create policy "announcements: staff post" on public.announcements
  for insert to authenticated with check (
    author_id = (select auth.uid()) and public.is_staff()
    and (case when class_id is null then public.is_admin() else public.is_class_owner(class_id) end)
  );
drop policy if exists "announcements: author or admin deletes" on public.announcements;
create policy "announcements: author or admin deletes" on public.announcements
  for delete to authenticated using (author_id = (select auth.uid()) or public.is_admin());

-- ---------- Expert validation rubric (1–5 per criterion) ----------
create table if not exists public.quest_reviews (
  quest_id       uuid not null references public.quests (id) on delete cascade,
  reviewer_id    uuid not null references public.profiles (id) on delete cascade,
  accuracy       smallint not null check (accuracy between 1 and 5),
  alignment      smallint not null check (alignment between 1 and 5),
  difficulty_fit smallint not null check (difficulty_fit between 1 and 5),
  technical      smallint not null check (technical between 1 and 5),
  comment        text not null default '' check (char_length(comment) <= 1000),
  updated_at     timestamptz not null default now(),
  primary key (quest_id, reviewer_id)
);
alter table public.quest_reviews enable row level security;

drop policy if exists "quest_reviews: staff read" on public.quest_reviews;
create policy "quest_reviews: staff read" on public.quest_reviews
  for select to authenticated using (public.is_staff());
drop policy if exists "quest_reviews: reviewer writes own" on public.quest_reviews;
create policy "quest_reviews: reviewer writes own" on public.quest_reviews
  for insert to authenticated with check (reviewer_id = (select auth.uid()) and public.is_staff());
drop policy if exists "quest_reviews: reviewer updates own" on public.quest_reviews;
create policy "quest_reviews: reviewer updates own" on public.quest_reviews
  for update to authenticated using (reviewer_id = (select auth.uid())) with check (reviewer_id = (select auth.uid()));
drop policy if exists "quest_reviews: reviewer deletes own" on public.quest_reviews;
create policy "quest_reviews: reviewer deletes own" on public.quest_reviews
  for delete to authenticated using (reviewer_id = (select auth.uid()));

grant select, insert, update, delete on public.announcements, public.quest_reviews to authenticated;
revoke all on public.announcements, public.quest_reviews from anon;

-- ---------- Students a staff member may see (admin: all; instructor: own classes) ----------
create or replace function public._my_students(p_class uuid default null)
returns table (student_id uuid, class_name text)
language sql stable security definer set search_path = public as $$
  select distinct on (cm.student_id) cm.student_id, c.name
  from class_members cm join classes c on c.id = cm.class_id
  where public.is_staff()
    and (p_class is null or c.id = p_class)
    and (c.instructor_id = auth.uid() or public.is_admin())
  union
  -- admins also see students who have not joined any class yet
  select p.id, null::text from profiles p
  where p_class is null and p.role = 'student' and public.is_admin()
    and not exists (select 1 from class_members cm where cm.student_id = p.id)
$$;

-- ---------- Encouragement watchlist ----------
create or replace function public.staff_watchlist(p_class uuid default null)
returns table (student_id uuid, student_code text, display_name text, class_name text,
               last_active_date date, attempts_14d bigint, avg_14d numeric, fails_in_row int, reasons text[])
language sql stable security definer set search_path = public as $$
  with s as (select * from public._my_students(p_class)),
  stats as (
    select p.id, p.student_code, p.display_name, s.class_name, p.last_active_date,
      (select count(*) from attempts a where a.user_id = p.id and a.mode <> 'assessment'
         and a.created_at >= now() - interval '14 days') as n14,
      (select round(avg(a.percent), 1) from attempts a where a.user_id = p.id and a.mode <> 'assessment'
         and a.created_at >= now() - interval '14 days') as avg14,
      (select count(*) from (
         select a.passed, sum(case when a.passed then 1 else 0 end) over (order by a.created_at desc) as seen_pass
         from attempts a where a.user_id = p.id and a.mode = 'quest'
       ) t where not t.passed and t.seen_pass = 0)::int as fails
    from s join profiles p on p.id = s.student_id
    where p.role = 'student'
  )
  select id, student_code, display_name, class_name, last_active_date, n14, avg14, fails,
    array_remove(array[
      case when last_active_date is null then 'Never played'
           when last_active_date < public.manila_today() - 7 then 'Inactive 7+ days' end,
      case when n14 >= 2 and avg14 < 50 then 'Low scores' end,
      case when fails >= 3 then 'Failed 3 in a row' end
    ], null)
  from stats
  where last_active_date is null or last_active_date < public.manila_today() - 7
     or (n14 >= 2 and avg14 < 50) or fails >= 3
  order by (n14 >= 2 and avg14 < 50) desc, fails desc, last_active_date nulls first
  limit 200
$$;

-- ---------- Remediation radar: hardest items among the students I can see ----------
create or replace function public.remediation_radar(p_class uuid default null, p_limit int default 10)
returns table (question_id uuid, quest_id uuid, quest_title text, subject_name text, subject_color text,
               prompt text, kind public.question_kind, responses bigint, correct bigint, p_value numeric)
language sql stable security definer set search_path = public as $$
  with s as (select student_id from public._my_students(p_class))
  select q.id, qu.id, qu.title, sub.name, sub.color, q.prompt, q.kind,
         count(*), count(*) filter (where aa.is_correct),
         round(avg(case when aa.is_correct then 1.0 else 0.0 end), 2)
  from attempt_answers aa
  join attempts a on a.id = aa.attempt_id
  join s on s.student_id = a.user_id
  join questions q on q.id = aa.question_id
  join quests qu on qu.id = q.quest_id
  join subjects sub on sub.id = qu.subject_id
  where public.is_staff() and qu.type not in ('pretest', 'posttest')
  group by q.id, qu.id, qu.title, sub.name, sub.color, q.prompt, q.kind
  having count(*) >= 3
  order by 10 asc, 8 desc
  limit greatest(1, least(p_limit, 50))
$$;

-- ---------- Admin: platform pulse ----------
create or replace function public.platform_pulse()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Only administrators can view the platform pulse'; end if;
  select jsonb_build_object(
    'students',    (select count(*) from profiles where role = 'student'),
    'instructors', (select count(*) from profiles where role = 'instructor'),
    'admins',      (select count(*) from profiles where role = 'admin'),
    'new_7d',      (select count(*) from profiles where created_at >= now() - interval '7 days'),
    'active_today',(select count(*) from profiles where last_active_date = public.manila_today()),
    'active_7d',   (select count(*) from profiles where last_active_date >= public.manila_today() - 6),
    'attempts_7d', (select count(*) from attempts where created_at >= now() - interval '7 days'),
    'avg_7d',      (select round(avg(percent), 1) from attempts where created_at >= now() - interval '7 days' and mode <> 'assessment'),
    'classes',     (select count(*) from classes),
    'quests_live', (select count(*) from quests where is_published),
    'quests_draft',(select count(*) from quests where not is_published),
    'questions',   (select count(*) from questions),
    'badges_awarded', (select count(*) from user_badges),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'attempts', coalesce(n, 0), 'players', coalesce(u, 0)) order by d), '[]'::jsonb)
      from generate_series(public.manila_today() - 13, public.manila_today(), interval '1 day') d
      left join (
        select (created_at at time zone 'Asia/Manila')::date as day, count(*) n, count(distinct user_id) u
        from attempts where created_at >= now() - interval '15 days' group by 1
      ) x on x.day = d::date
    ),
    'subjects', (
      select coalesce(jsonb_agg(jsonb_build_object('name', s.name, 'color', s.color, 'attempts', coalesce(t.n, 0), 'avg', t.avg) order by s.sort_order), '[]'::jsonb)
      from subjects s
      left join (
        select subject_id, count(*) n, round(avg(percent), 1) avg from attempts
        where mode <> 'assessment' and created_at >= now() - interval '30 days' group by subject_id
      ) t on t.subject_id = s.id
    )
  ) into r;
  return r;
end $$;

revoke execute on function public._my_students(uuid) from public, anon, authenticated;
revoke execute on function public.staff_watchlist(uuid) from public, anon;
revoke execute on function public.remediation_radar(uuid, int) from public, anon;
revoke execute on function public.platform_pulse() from public, anon;
grant execute on function public.staff_watchlist(uuid) to authenticated;
grant execute on function public.remediation_radar(uuid, int) to authenticated;
grant execute on function public.platform_pulse() to authenticated;
