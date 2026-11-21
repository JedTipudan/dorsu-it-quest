-- =====================================================================
-- DOrSU IT Quest — Row Level Security (Data Privacy Act / RA 10173)
-- =====================================================================

alter table public.profiles           enable row level security;
alter table public.subjects           enable row level security;
alter table public.quests             enable row level security;
alter table public.questions          enable row level security;
alter table public.question_keys      enable row level security;
alter table public.attempts           enable row level security;
alter table public.attempt_answers    enable row level security;
alter table public.challenge_sessions enable row level security;
alter table public.lab_results        enable row level security;
alter table public.badges             enable row level security;
alter table public.user_badges        enable row level security;
alter table public.classes            enable row level security;
alter table public.class_members      enable row level security;
alter table public.survey_responses   enable row level security;
alter table public.feedback           enable row level security;

-- ---------- table privileges ----------
-- Newer Supabase projects no longer auto-grant table access to the API roles, so grant it
-- explicitly. This is safe: RLS above decides which ROWS each user sees, and the revokes
-- further down remove write access wherever writes must go through RPCs only.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant usage on schema public to service_role';
    execute 'grant all on all tables in schema public to service_role';
    execute 'grant all on all sequences in schema public to service_role';
  end if;
end $$;

-- ---------- profiles ----------
create policy "profiles: read self, own students, admin" on public.profiles
  for select to authenticated using (public.can_view_student(id));
create policy "profiles: update self" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Students may only edit harmless columns; role/xp/streak are changed by RPCs only.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, display_name, year_level, section, show_on_leaderboard, avatar_seed)
  on public.profiles to authenticated;

-- ---------- curriculum (public read, staff write) ----------
create policy "subjects: everyone reads" on public.subjects
  for select to anon, authenticated using (true);
create policy "subjects: admin writes" on public.subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "quests: read published or staff" on public.quests
  for select to authenticated using (is_published or public.is_staff());
create policy "quests: staff insert" on public.quests
  for insert to authenticated with check (public.is_staff());
create policy "quests: staff update" on public.quests
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "quests: staff delete" on public.quests
  for delete to authenticated using (public.is_staff());

create policy "questions: read when quest visible" on public.questions
  for select to authenticated using (
    public.is_staff() or exists (select 1 from public.quests q where q.id = quest_id and q.is_published));
create policy "questions: staff insert" on public.questions
  for insert to authenticated with check (public.is_staff());
create policy "questions: staff update" on public.questions
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "questions: staff delete" on public.questions
  for delete to authenticated using (public.is_staff());

create policy "question_keys: staff only" on public.question_keys
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- activity (read-only to clients; written by RPCs) ----------
create policy "attempts: read self / instructor / admin" on public.attempts
  for select to authenticated using (public.can_view_student(user_id));

create policy "attempt_answers: read via attempt" on public.attempt_answers
  for select to authenticated using (
    exists (select 1 from public.attempts a where a.id = attempt_id and public.can_view_student(a.user_id)));

create policy "challenge_sessions: read self" on public.challenge_sessions
  for select to authenticated using (user_id = (select auth.uid()));

create policy "lab_results: read self / instructor" on public.lab_results
  for select to authenticated using (public.can_view_student(user_id));

revoke insert, update, delete on public.attempts, public.attempt_answers, public.challenge_sessions,
  public.lab_results, public.user_badges from anon, authenticated;

-- ---------- badges ----------
create policy "badges: everyone reads" on public.badges
  for select to anon, authenticated using (true);
create policy "badges: admin writes" on public.badges
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "user_badges: read self / instructor" on public.user_badges
  for select to authenticated using (public.can_view_student(user_id));

-- ---------- classes ----------
create policy "classes: owner, member or admin reads" on public.classes
  for select to authenticated using (
    instructor_id = (select auth.uid()) or public.is_admin() or public.is_class_member(id));
create policy "classes: staff creates own" on public.classes
  for insert to authenticated with check (public.is_staff() and instructor_id = (select auth.uid()));
create policy "classes: owner updates" on public.classes
  for update to authenticated using (public.is_class_owner(id)) with check (public.is_class_owner(id));
create policy "classes: owner deletes" on public.classes
  for delete to authenticated using (public.is_class_owner(id));

create policy "class_members: self or owner reads" on public.class_members
  for select to authenticated using (student_id = (select auth.uid()) or public.is_class_owner(class_id));
create policy "class_members: self leaves or owner removes" on public.class_members
  for delete to authenticated using (student_id = (select auth.uid()) or public.is_class_owner(class_id));
revoke insert, update on public.class_members from anon, authenticated;   -- join via join_class()

-- ---------- surveys & feedback ----------
create policy "survey: insert own" on public.survey_responses
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "survey: update own" on public.survey_responses
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "survey: read own or staff" on public.survey_responses
  for select to authenticated using (user_id = (select auth.uid()) or public.is_staff());

create policy "feedback: insert own" on public.feedback
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "feedback: read own or staff" on public.feedback
  for select to authenticated using (user_id = (select auth.uid()) or public.is_staff());
create policy "feedback: admin deletes" on public.feedback
  for delete to authenticated using (public.is_admin());

-- ---------- RPCs are for signed-in users only ----------
-- Supabase grants EXECUTE to anon by default; logged-out visitors get nothing.
-- (anon also inherits PUBLIC's default EXECUTE, so revoke both, then grant back.)
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on all functions in schema public to service_role';
  end if;
end $$;
alter default privileges in schema public revoke execute on functions from public, anon;

-- Internal helpers stay locked even for signed-in users.
revoke execute on function public._grade_and_record(uuid, uuid[], jsonb) from authenticated;
revoke execute on function public._apply_activity(uuid, int) from authenticated;
revoke execute on function public._award_badges(uuid) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
