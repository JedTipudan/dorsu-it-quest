-- ONE-TIME UPGRADE: security hardening (rate limits, join-code brute-force protection, spam limits).
-- Run AFTER upgrade-daily-checkin.sql. Supabase -> SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once. (Fresh setups don't need this: setup.sql already includes it.)

-- =====================================================================
-- DOrSU IT Quest: security hardening (rate limiting / abuse prevention)
--
-- The Supabase anon key is public by design, so an attacker can skip the website and call the
-- database API directly. Limits therefore live HERE, in the database, where they cannot be bypassed:
--   * a shared fixed-window rate limiter (table + functions, no direct client access)
--   * per-user limits on every write-heavy RPC (quests, challenges, labs, class joins)
--   * class join codes: failed guesses are COUNTED (they used to roll back with the error),
--     which makes guessing other classes' codes infeasible
--   * spam limits on feedback and announcements
--   * check_rate_limit(): used by the web server for login / sign-up / password-reset limits,
--     with keys HMAC-hashed by the server so outsiders cannot lock out a specific person
-- Idempotent: safe to run on an existing database (see supabase/upgrade-security.sql).
-- =====================================================================

create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         int not null default 0
);
alter table public.rate_limits enable row level security;   -- no policies: no direct access at all
revoke all on public.rate_limits from anon, authenticated;

-- Core limiter: counts one hit for p_key in a fixed window; returns false once over the limit.
create or replace function public._rate_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_hits int;
begin
  insert into rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  -- occasional housekeeping so the table stays small
  if random() < 0.01 then delete from rate_limits where window_start < now() - interval '2 days'; end if;
  return v_hits <= p_limit;
end $$;

-- Per-user throttle for RPCs: raises a friendly error when exceeded.
create or replace function public._throttle(p_action text, p_limit int, p_window_seconds int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;   -- logged-out callers are already denied by grants
  if not public._rate_hit('u:' || auth.uid() || ':' || p_action, p_limit, p_window_seconds) then
    raise exception 'Too many requests. Please slow down and try again in a few minutes.' using errcode = 'P0429';
  end if;
end $$;

-- For the web server (login, sign-up, password reset). Keys arrive HMAC-hashed by the server
-- ("srv:" + 64 hex chars) so nobody can target someone else's key; limits are bounded.
create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_key !~ '^srv:[0-9a-f]{64}$' then raise exception 'Invalid rate-limit key'; end if;
  return public._rate_hit(p_key, greatest(1, least(p_limit, 1000)), greatest(1, least(p_window_seconds, 86400)));
end $$;

-- ---------- Wrap existing RPCs with per-user limits ----------
-- The original implementations are renamed to *_impl (not callable by clients) and the public
-- name becomes a thin wrapper. Guarded so the upgrade can be run more than once.
do $$
begin
  if to_regprocedure('public._submit_quest_attempt_impl(uuid, jsonb, integer)') is null then
    alter function public.submit_quest_attempt(uuid, jsonb, integer) rename to _submit_quest_attempt_impl;
  end if;
  if to_regprocedure('public._start_challenge_impl(uuid, integer)') is null then
    alter function public.start_challenge(uuid, integer) rename to _start_challenge_impl;
  end if;
  if to_regprocedure('public._submit_challenge_impl(uuid, jsonb, integer)') is null then
    alter function public.submit_challenge(uuid, jsonb, integer) rename to _submit_challenge_impl;
  end if;
  if to_regprocedure('public._check_subnet_impl(text, integer, text, text, text, text, integer)') is null then
    alter function public.check_subnet(text, integer, text, text, text, text, integer) rename to _check_subnet_impl;
  end if;
  if to_regprocedure('public._join_class_impl(text)') is null then
    alter function public.join_class(text) rename to _join_class_impl;
  end if;
end $$;

create or replace function public.submit_quest_attempt(p_quest_id uuid, p_responses jsonb, p_duration int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._throttle('quest_submit', 60, 3600);          -- 60 quest submissions / hour
  return public._submit_quest_attempt_impl(p_quest_id, p_responses, p_duration);
end $$;

create or replace function public.start_challenge(p_subject_id uuid default null, p_count int default 10)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._throttle('challenge_start', 30, 3600);       -- 30 challenge rounds / hour
  return public._start_challenge_impl(p_subject_id, p_count);
end $$;

create or replace function public.submit_challenge(p_session_id uuid, p_responses jsonb, p_duration int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._throttle('challenge_submit', 30, 3600);
  return public._submit_challenge_impl(p_session_id, p_responses, p_duration);
end $$;

create or replace function public.check_subnet(
  p_ip text, p_prefix int, p_network text, p_broadcast text, p_first text, p_last text, p_hosts int)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._throttle('subnet', 300, 3600);               -- fast drilling is fine, scripts are not
  return public._check_subnet_impl(p_ip, p_prefix, p_network, p_broadcast, p_first, p_last, p_hosts);
end $$;

-- Every guess counts (including wrong codes), because a miss RETURNS an error instead of raising,
-- so the counter is not rolled back. 15 guesses / hour makes code guessing infeasible.
create or replace function public.join_class(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'You must be signed in.' using errcode = '28000'; end if;
  if not public._rate_hit('u:' || auth.uid() || ':join_class', 15, 3600) then
    return jsonb_build_object('error', 'Too many join attempts. Please wait an hour, or ask your instructor for the code.');
  end if;
  if not exists (select 1 from classes where join_code = upper(btrim(coalesce(p_code, '')))) then
    return jsonb_build_object('error', 'No class found with that code.');
  end if;
  return public._join_class_impl(p_code);
end $$;

-- ---------- Spam limits on user-generated rows ----------
create or replace function public._throttle_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- TG_ARGV: action name, limit, window seconds
  perform public._throttle(tg_argv[0], tg_argv[1]::int, tg_argv[2]::int);
  return new;
end $$;

drop trigger if exists feedback_throttle on public.feedback;
create trigger feedback_throttle before insert on public.feedback
  for each row execute function public._throttle_insert('feedback', '10', '3600');
drop trigger if exists announcements_throttle on public.announcements;
create trigger announcements_throttle before insert on public.announcements
  for each row execute function public._throttle_insert('announcement', '30', '3600');

-- ---------- Privileges ----------
revoke execute on function public._rate_hit(text, int, int) from public, anon, authenticated;
revoke execute on function public._throttle(text, int, int) from public, anon, authenticated;
revoke execute on function public._throttle_insert() from public, anon, authenticated;
revoke execute on function public._submit_quest_attempt_impl(uuid, jsonb, integer) from public, anon, authenticated;
revoke execute on function public._start_challenge_impl(uuid, integer) from public, anon, authenticated;
revoke execute on function public._submit_challenge_impl(uuid, jsonb, integer) from public, anon, authenticated;
revoke execute on function public._check_subnet_impl(text, integer, text, text, text, text, integer) from public, anon, authenticated;
revoke execute on function public._join_class_impl(text) from public, anon, authenticated;

revoke execute on function public.submit_quest_attempt(uuid, jsonb, integer) from public, anon;
revoke execute on function public.start_challenge(uuid, integer) from public, anon;
revoke execute on function public.submit_challenge(uuid, jsonb, integer) from public, anon;
revoke execute on function public.check_subnet(text, integer, text, text, text, text, integer) from public, anon;
revoke execute on function public.join_class(text) from public, anon;
grant execute on function public.submit_quest_attempt(uuid, jsonb, integer) to authenticated;
grant execute on function public.start_challenge(uuid, integer) to authenticated;
grant execute on function public.submit_challenge(uuid, jsonb, integer) to authenticated;
grant execute on function public.check_subnet(text, integer, text, text, text, text, integer) to authenticated;
grant execute on function public.join_class(text) to authenticated;

-- Login / sign-up happen BEFORE the user is signed in, so the server calls this as anon.
revoke execute on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;
