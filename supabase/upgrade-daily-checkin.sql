-- ONE-TIME UPGRADE: Daily Check-in (Supply Drop), Daily Byte and exclusive cosmetics.
-- Run AFTER upgrade-staff-tools.sql. Supabase -> SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once. (Fresh setups don't need this: setup.sql already includes it.)

-- =====================================================================
-- DOrSU IT Quest: Daily Check-in ("Supply Drop"), Daily Byte and cosmetics
-- Design notes (traceable to DOrSU IT Quest.docx):
--   * A 7-day reward track that advances per check-in and does NOT reset on missed days:
--     the study's locale has sporadic connectivity and shared devices, so absence isn't punished.
--   * Checking in alone grants XP but does NOT count as learning activity (streak / last_active).
--     The Daily Byte, one review question from the player's weakest subject (flow theory),
--     does, and doubles the day's XP when answered correctly: attendance stays tied to practice.
--   * Exclusive cosmetics (titles, emblem frames) are competence/identity signals (SDT, Gee 2003),
--     cosmetic only, granted server-side so they cannot be forged.
-- Idempotent: safe to run on an existing database (see supabase/upgrade-daily-checkin.sql).
-- =====================================================================

-- ---------- Cosmetics catalogue ----------
create table if not exists public.cosmetics (
  code        text primary key,
  kind        text not null check (kind in ('title', 'frame')),
  name        text not null,
  description text not null default '',
  rarity      text not null default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary')),
  unlock_type text not null check (unlock_type in ('checkins', 'byte', 'crate')),
  threshold   int not null default 0,
  sort_order  int not null default 0
);

insert into public.cosmetics (code, kind, name, description, rarity, unlock_type, threshold, sort_order) values
  ('title_regular',   'title', 'The Regular',            'Check in on 3 days',                     'common',    'checkins', 3,  10),
  ('title_week',      'title', 'Week Warrior',           'Check in on 7 days',                     'rare',      'checkins', 7,  11),
  ('title_fortnight', 'title', 'Fortnight Grinder',      'Check in on 14 days',                    'rare',      'checkins', 14, 12),
  ('title_perfect',   'title', 'Perfect Attendance',     'Check in on 30 days',                    'epic',      'checkins', 30, 13),
  ('title_legend',    'title', 'Campus Legend',          'Check in on 60 days',                    'legendary', 'checkins', 60, 14),
  ('title_byte',      'title', 'Byte-Sized Genius',      'Answer 10 Daily Bytes correctly',        'epic',      'byte',     10, 20),
  ('title_packet',    'title', 'Packet Whisperer',       'Found in a Supply Crate',                'rare',      'crate',    0,  30),
  ('title_query',     'title', 'Query Royalty',          'Found in a Supply Crate',                'rare',      'crate',    0,  31),
  ('title_nullhunt',  'title', 'Null Pointer Hunter',    'Found in a Supply Crate',                'rare',      'crate',    0,  32),
  ('title_stack',     'title', 'Stack Overflow Survivor','Found in a Supply Crate',                'epic',      'crate',    0,  33),
  ('title_404',       'title', '404: Sleep Not Found',   'Found in a Supply Crate',                'epic',      'crate',    0,  34),
  ('title_root',      'title', 'Root Access',            'Found in a Supply Crate',                'legendary', 'crate',    0,  35),
  ('frame_neon',      'frame', 'Neon Circuit',           'Check in on 7 days',                     'rare',      'checkins', 7,  50),
  ('frame_gold',      'frame', 'Gold Standard',          'Check in on 30 days',                    'epic',      'checkins', 30, 51),
  ('frame_aurora',    'frame', 'Aurora',                 'Check in on 60 days',                    'legendary', 'checkins', 60, 52),
  ('frame_scholar',   'frame', 'Scholar''s Halo',        'Answer 25 Daily Bytes correctly',        'legendary', 'byte',     25, 60),
  ('frame_lime',      'frame', 'Toxic Lime',             'Found in a Supply Crate',                'rare',      'crate',    0,  70),
  ('frame_signal',    'frame', 'Hot Signal',             'Found in a Supply Crate',                'rare',      'crate',    0,  71),
  ('frame_matrix',    'frame', 'Matrix Rain',            'Found in a Supply Crate',                'epic',      'crate',    0,  72)
on conflict (code) do update set
  kind = excluded.kind, name = excluded.name, description = excluded.description, rarity = excluded.rarity,
  unlock_type = excluded.unlock_type, threshold = excluded.threshold, sort_order = excluded.sort_order;

create table if not exists public.user_cosmetics (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  code        text not null references public.cosmetics (code) on delete cascade,
  source      text not null default 'milestone',
  unlocked_at timestamptz not null default now(),
  primary key (user_id, code)
);

alter table public.profiles add column if not exists equipped_title text references public.cosmetics (code) on delete set null;
alter table public.profiles add column if not exists equipped_frame text references public.cosmetics (code) on delete set null;

-- ---------- Check-ins ----------
create table if not exists public.daily_checkins (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  day              date not null,                     -- Asia/Manila calendar day
  cycle_day        smallint not null check (cycle_day between 1 and 7),
  xp               int not null default 0,
  crate_code       text references public.cosmetics (code) on delete set null,
  byte_question_id uuid references public.questions (id) on delete set null,
  byte_correct     boolean,                           -- null = not answered yet
  byte_xp          int not null default 0,
  created_at       timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists daily_checkins_day_idx on public.daily_checkins (day);

alter table public.cosmetics enable row level security;
alter table public.user_cosmetics enable row level security;
alter table public.daily_checkins enable row level security;

drop policy if exists "cosmetics: everyone reads" on public.cosmetics;
create policy "cosmetics: everyone reads" on public.cosmetics for select to authenticated using (true);
drop policy if exists "user_cosmetics: read self / instructor" on public.user_cosmetics;
create policy "user_cosmetics: read self / instructor" on public.user_cosmetics
  for select to authenticated using (public.can_view_student(user_id));
drop policy if exists "daily_checkins: read self / instructor" on public.daily_checkins;
create policy "daily_checkins: read self / instructor" on public.daily_checkins
  for select to authenticated using (public.can_view_student(user_id));

-- Writes happen only through the functions below.
grant select on public.cosmetics, public.user_cosmetics, public.daily_checkins to authenticated;
revoke insert, update, delete on public.cosmetics, public.user_cosmetics, public.daily_checkins from anon, authenticated;
revoke all on public.cosmetics, public.user_cosmetics, public.daily_checkins from anon;

-- Reward per position on the 7-day track.
create or replace function public.checkin_reward(p_cycle_day int)
returns int language sql immutable as $$
  select (array[10, 15, 20, 25, 30, 40, 75])[greatest(1, least(7, p_cycle_day))]
$$;

-- Unlock every milestone cosmetic the player now qualifies for. Internal only.
create or replace function public._unlock_milestones(p_uid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_checkins int;
  v_bytes int;
  v_new jsonb;
begin
  select count(*) into v_checkins from daily_checkins where user_id = p_uid;
  select count(*) into v_bytes from daily_checkins where user_id = p_uid and byte_correct;
  with ins as (
    insert into user_cosmetics (user_id, code, source)
    select p_uid, c.code, c.unlock_type from cosmetics c
    where ((c.unlock_type = 'checkins' and v_checkins >= c.threshold) or (c.unlock_type = 'byte' and v_bytes >= c.threshold))
      and not exists (select 1 from user_cosmetics u where u.user_id = p_uid and u.code = c.code)
    returning code
  )
  select coalesce(jsonb_agg(jsonb_build_object('code', c.code, 'kind', c.kind, 'name', c.name, 'rarity', c.rarity) order by c.sort_order), '[]'::jsonb)
    into v_new from ins join cosmetics c on c.code = ins.code;
  return v_new;
end $$;

-- Today's state for the current player (safe to call any time).
create or replace function public.checkin_status()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.manila_today();
  v_row daily_checkins;
  v_total int;
  v_streak int := 0;
  v_best int := 0;
  v_run int := 0;
  v_prev date;
  d record;
  v_byte jsonb := null;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select * into v_row from daily_checkins where user_id = v_uid and day = v_today;
  select count(*) into v_total from daily_checkins where user_id = v_uid;

  -- current streak (consecutive days ending today or yesterday) and best streak
  for d in select day from daily_checkins where user_id = v_uid order by day loop
    v_run := case when v_prev = d.day - 1 then v_run + 1 else 1 end;
    v_best := greatest(v_best, v_run);
    v_prev := d.day;
  end loop;
  if v_prev is not null and v_prev >= v_today - 1 then v_streak := v_run; end if;

  if v_row.byte_question_id is not null and v_row.byte_correct is null then
    select jsonb_build_object('id', q.id, 'kind', q.kind, 'prompt', q.prompt, 'code', q.code, 'options', q.options,
                              'topic', q.topic, 'difficulty', q.difficulty, 'points', q.points, 'subject', s.name, 'color', s.color)
      into v_byte
    from questions q join quests qu on qu.id = q.quest_id join subjects s on s.id = qu.subject_id
    where q.id = v_row.byte_question_id;
  end if;

  return jsonb_build_object(
    'today', v_today,
    'claimed', v_row.user_id is not null,
    'cycle_day', coalesce(v_row.cycle_day, (v_total % 7) + 1),
    'xp_today', coalesce(v_row.xp, 0) + coalesce(v_row.byte_xp, 0),
    'byte_state', case when v_row.user_id is null then 'locked'
                       when v_row.byte_question_id is null then 'none'
                       when v_row.byte_correct is null then 'open'
                       when v_row.byte_correct then 'correct' else 'wrong' end,
    'byte', v_byte,
    'total', v_total,
    'streak', v_streak,
    'best_streak', v_best,
    'rewards', to_jsonb(array[10, 15, 20, 25, 30, 40, 75]),
    'days', coalesce((select jsonb_agg(day order by day) from daily_checkins where user_id = v_uid and day >= v_today - 41), '[]'::jsonb)
  );
end $$;

-- Claim today's Supply Drop. Idempotent per Manila day.
create or replace function public.claim_daily_checkin()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.manila_today();
  v_total int;
  v_cycle int;
  v_xp int;
  v_crate cosmetics;
  v_weak uuid;
  v_q uuid;
  v_badges jsonb;
  v_unlocked jsonb;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from daily_checkins where user_id = v_uid and day = v_today) then
    return public.checkin_status() || jsonb_build_object('claimed_now', false);
  end if;

  select count(*) into v_total from daily_checkins where user_id = v_uid;
  v_cycle := (v_total % 7) + 1;
  v_xp := public.checkin_reward(v_cycle);

  -- Day 7: Supply Crate with a random exclusive the player doesn't own yet (else bonus XP).
  if v_cycle = 7 then
    select * into v_crate from cosmetics c
    where c.unlock_type = 'crate' and not exists (select 1 from user_cosmetics u where u.user_id = v_uid and u.code = c.code)
    order by random() limit 1;
    if v_crate.code is null then v_xp := v_xp + 25; end if;
  end if;

  -- Daily Byte: an MCQ/True-False item from the player's weakest subject, not seen in 14 days.
  select a.subject_id into v_weak from attempts a
  where a.user_id = v_uid and a.mode <> 'assessment' and a.subject_id is not null
  group by a.subject_id order by avg(a.percent) asc limit 1;

  select q.id into v_q from questions q join quests qu on qu.id = q.quest_id
  where qu.is_published and qu.type in ('quiz', 'simulation', 'challenge') and q.kind in ('mcq', 'truefalse')
    and (v_weak is null or qu.subject_id = v_weak)
    and q.id not in (select byte_question_id from daily_checkins where user_id = v_uid and byte_question_id is not null and day > v_today - 14)
  order by random() limit 1;
  if v_q is null then
    select q.id into v_q from questions q join quests qu on qu.id = q.quest_id
    where qu.is_published and qu.type in ('quiz', 'simulation', 'challenge') and q.kind in ('mcq', 'truefalse')
    order by random() limit 1;
  end if;

  insert into daily_checkins (user_id, day, cycle_day, xp, crate_code, byte_question_id)
  values (v_uid, v_today, v_cycle, v_xp, v_crate.code, v_q);
  if v_crate.code is not null then
    insert into user_cosmetics (user_id, code, source) values (v_uid, v_crate.code, 'crate') on conflict do nothing;
  end if;

  -- XP only: checking in is attendance, not learning activity, so streak/last_active are untouched.
  update profiles set xp = xp + v_xp where id = v_uid;
  v_badges := public._award_badges(v_uid);
  v_unlocked := public._unlock_milestones(v_uid);

  return public.checkin_status() || jsonb_build_object(
    'claimed_now', true,
    'xp', v_xp,
    'crate', case when v_crate.code is null then null
                  else jsonb_build_object('code', v_crate.code, 'kind', v_crate.kind, 'name', v_crate.name, 'rarity', v_crate.rarity) end,
    'unlocked', v_unlocked,
    'new_badges', v_badges
  );
end $$;

-- Answer today's Daily Byte. Correct = the day's XP is doubled. Counts as learning activity.
create or replace function public.answer_daily_byte(p_response jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.manila_today();
  v_row daily_checkins;
  v_kind question_kind;
  v_answer jsonb;
  v_expl text;
  v_ok boolean;
  v_bonus int;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select * into v_row from daily_checkins where user_id = v_uid and day = v_today for update;
  if v_row.user_id is null then raise exception 'Check in first to unlock today''s Daily Byte'; end if;
  if v_row.byte_question_id is null then raise exception 'No Daily Byte today'; end if;
  if v_row.byte_correct is not null then raise exception 'You already answered today''s Daily Byte'; end if;

  select q.kind, k.answer, k.explanation into v_kind, v_answer, v_expl
  from questions q join question_keys k on k.question_id = q.id where q.id = v_row.byte_question_id;
  v_ok := public.grade_response(v_kind, v_answer, p_response);
  v_bonus := case when v_ok then v_row.xp else 0 end;

  update daily_checkins set byte_correct = v_ok, byte_xp = v_bonus where user_id = v_uid and day = v_today;
  perform public._apply_activity(v_uid, v_bonus);   -- practising counts toward the learning streak

  return jsonb_build_object(
    'correct', v_ok,
    'bonus_xp', v_bonus,
    'answer', v_answer,
    'explanation', v_expl,
    'unlocked', public._unlock_milestones(v_uid),
    'new_badges', public._award_badges(v_uid)
  );
end $$;

-- Equip (or clear with null) an owned title/frame.
create or replace function public.equip_cosmetic(p_kind text, p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if p_kind not in ('title', 'frame') then raise exception 'Unknown cosmetic type'; end if;
  if p_code is not null and not exists (
    select 1 from user_cosmetics u join cosmetics c on c.code = u.code
    where u.user_id = v_uid and u.code = p_code and c.kind = p_kind
  ) then
    raise exception 'You have not unlocked that %', p_kind;
  end if;
  if p_kind = 'title' then
    update profiles set equipped_title = p_code where id = v_uid;
  else
    update profiles set equipped_frame = p_code where id = v_uid;
  end if;
end $$;

revoke execute on function public._unlock_milestones(uuid) from public, anon, authenticated;
revoke execute on function public.checkin_status() from public, anon;
revoke execute on function public.claim_daily_checkin() from public, anon;
revoke execute on function public.answer_daily_byte(jsonb) from public, anon;
revoke execute on function public.equip_cosmetic(text, text) from public, anon;
grant execute on function public.checkin_status() to authenticated;
grant execute on function public.claim_daily_checkin() to authenticated;
grant execute on function public.answer_daily_byte(jsonb) to authenticated;
grant execute on function public.equip_cosmetic(text, text) to authenticated;
grant execute on function public.checkin_reward(int) to authenticated;
