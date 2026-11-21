-- One-time fix for databases created with an older setup.sql on a NEW Supabase project.
-- Newer Supabase projects don't auto-grant table access to the app, which causes
-- "permission denied for table ..." errors. Safe to run more than once.
-- (The current setup.sql already includes this, so fresh setups don't need it.)

-- Give the app access to the tables (Row Level Security still controls which rows each user sees)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Re-apply the write restrictions (these writes go through server functions only)
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, display_name, year_level, section, show_on_leaderboard, avatar_seed)
  on public.profiles to authenticated;
revoke insert, update, delete on public.attempts, public.attempt_answers, public.challenge_sessions,
  public.lab_results, public.user_badges from anon, authenticated;
revoke insert, update on public.class_members from anon, authenticated;
