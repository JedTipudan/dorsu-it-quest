-- =====================================================================
-- DOrSU IT Quest — functions, triggers and RPCs
-- All gameplay writes go through SECURITY DEFINER functions so that
-- scoring, XP and badges can never be forged from the client.
-- =====================================================================

-- ---------- Role helpers (security definer to avoid RLS recursion) ----------
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('instructor', 'admin'))
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.is_class_owner(p_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from classes where id = p_class and (instructor_id = auth.uid()))
      or public.is_admin()
$$;

create or replace function public.is_class_member(p_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from class_members where class_id = p_class and student_id = auth.uid())
$$;

-- Can the current user see this student's data? (self, admin, or their instructor)
create or replace function public.can_view_student(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_student = auth.uid()
      or public.is_admin()
      or exists (
        select 1 from class_members cm join classes c on c.id = cm.class_id
        where cm.student_id = p_student and c.instructor_id = auth.uid()
      )
$$;

-- ---------- New user → profile ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full text := left(btrim(coalesce(v_meta ->> 'full_name', '')), 120);
  v_display text := left(btrim(coalesce(v_meta ->> 'display_name', '')), 40);
  v_code text;
begin
  if v_display = '' then
    v_display := left(coalesce(nullif(split_part(v_full, ' ', 1), ''), split_part(new.email, '@', 1), 'Quester'), 40);
  end if;
  loop
    v_code := 'ITQ-' || public.random_code(6);
    exit when not exists (select 1 from profiles where student_code = v_code);
  end loop;

  insert into public.profiles (id, email, full_name, display_name, student_code, year_level, section)
  values (
    new.id,
    new.email,
    v_full,
    v_display,
    v_code,
    case when (v_meta ->> 'year_level') ~ '^[1-4]$' then (v_meta ->> 'year_level')::smallint end,
    nullif(left(btrim(coalesce(v_meta ->> 'section', '')), 30), '')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- Survey scoring (server-side, cannot be forged) ----------
create or replace function public.score_survey()
returns trigger language plpgsql as $$
declare
  v_vals int[];
  v_len int;
  v_sum numeric := 0;
  i int;
begin
  if jsonb_typeof(new.answers) <> 'array' then
    raise exception 'answers must be an array';
  end if;
  select array_agg(value::int order by ord) into v_vals
  from jsonb_array_elements_text(new.answers) with ordinality as t(value, ord);
  v_len := coalesce(array_length(v_vals, 1), 0);

  if exists (select 1 from unnest(v_vals) v where v < 1 or v > 5) then
    raise exception 'answers must be between 1 and 5';
  end if;

  if new.instrument = 'sus' then
    if v_len <> 10 then raise exception 'SUS requires exactly 10 answers'; end if;
    for i in 1..10 loop
      if i % 2 = 1 then v_sum := v_sum + (v_vals[i] - 1);
      else v_sum := v_sum + (5 - v_vals[i]);
      end if;
    end loop;
    new.score := v_sum * 2.5;                     -- 0..100
  else
    if v_len <> 12 then raise exception 'Motivation scale requires exactly 12 answers'; end if;
    new.score := round((select avg(v) from unnest(v_vals) v), 2);   -- 1..5 weighted mean
  end if;
  new.created_at := now();
  return new;
end $$;

create trigger survey_score before insert or update on public.survey_responses
  for each row execute function public.score_survey();

-- ---------- Grading ----------
create or replace function public.normalize_answer(t text)
returns text language sql immutable as $$
  select lower(regexp_replace(btrim(coalesce(t, '')), '\s+', ' ', 'g'))
$$;

create or replace function public.grade_response(p_kind public.question_kind, p_answer jsonb, p_response jsonb)
returns boolean language plpgsql immutable as $$
begin
  if p_response is null or jsonb_typeof(p_response) <> 'object' then
    return false;
  end if;
  case p_kind
    when 'mcq', 'truefalse' then
      return coalesce((p_response ->> 'value') = (p_answer ->> 'value'), false);
    when 'multi' then
      return coalesce(
        (select array_agg(v order by v) from jsonb_array_elements_text(p_response -> 'values') v)
        = (select array_agg(v order by v) from jsonb_array_elements_text(p_answer -> 'values') v), false);
    when 'order' then
      return coalesce((p_response -> 'order') = (p_answer -> 'order'), false);
    when 'short', 'code' then
      return exists (
        select 1 from jsonb_array_elements_text(p_answer -> 'accepted') a
        where public.normalize_answer(a) = public.normalize_answer(p_response ->> 'value')
          and public.normalize_answer(p_response ->> 'value') <> ''
      );
    else
      return false;
  end case;
exception when others then
  return false;
end $$;

-- Inserts graded answers for an attempt and returns totals. Internal only.
create or replace function public._grade_and_record(p_attempt uuid, p_question_ids uuid[], p_responses jsonb)
returns table (score int, max_score int, correct int, total int)
language plpgsql security definer set search_path = public as $$
begin
  insert into attempt_answers (attempt_id, question_id, response, is_correct)
  select p_attempt, q.id, p_responses -> (q.id::text),
         public.grade_response(q.kind, k.answer, p_responses -> (q.id::text))
  from questions q
  join question_keys k on k.question_id = q.id
  where q.id = any (p_question_ids);

  return query
  select coalesce(sum(case when aa.is_correct then q.points else 0 end), 0)::int,
         coalesce(sum(q.points), 0)::int,
         (count(*) filter (where aa.is_correct))::int,
         count(*)::int
  from attempt_answers aa
  join questions q on q.id = aa.question_id
  where aa.attempt_id = p_attempt;
end $$;

-- XP + daily streak bookkeeping. Internal only.
create or replace function public._apply_activity(p_uid uuid, p_xp int)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_today date := public.manila_today();
  v_last date;
  v_streak int;
  v_new_streak int;
begin
  select last_active_date, streak into v_last, v_streak from profiles where id = p_uid for update;
  v_new_streak := case
    when v_last = v_today then greatest(v_streak, 1)
    when v_last = v_today - 1 then v_streak + 1
    else 1 end;
  update profiles
     set xp = xp + greatest(coalesce(p_xp, 0), 0),
         streak = v_new_streak,
         best_streak = greatest(best_streak, v_new_streak),
         last_active_date = v_today
   where id = p_uid;
end $$;

-- Badge rules engine. Returns newly earned badges. Internal only.
create or replace function public._award_badges(p_uid uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  b record;
  v_ok boolean;
  v_new jsonb := '[]'::jsonb;
  v_quests int; v_perfect int; v_challenges int; v_labs int; v_xp int; v_best_streak int;
begin
  select count(distinct quest_id) into v_quests from attempts where user_id = p_uid and passed and mode = 'quest';
  select count(*) into v_perfect from attempts where user_id = p_uid and percent = 100 and mode in ('quest', 'challenge');
  select count(*) into v_challenges from attempts where user_id = p_uid and mode = 'challenge';
  select count(*) into v_labs from lab_results where user_id = p_uid and correct;
  select xp, best_streak into v_xp, v_best_streak from profiles where id = p_uid;

  for b in
    select * from badges
    where id not in (select badge_id from user_badges where user_id = p_uid)
    order by sort_order
  loop
    v_ok := case b.rule_type
      when 'quests_completed' then v_quests >= b.rule_value
      when 'perfect_scores'   then v_perfect >= b.rule_value
      when 'challenges'       then v_challenges >= b.rule_value
      when 'labs'             then v_labs >= b.rule_value
      when 'xp'               then v_xp >= b.rule_value
      when 'level'            then public.level_for_xp(v_xp) >= b.rule_value
      when 'streak'           then v_best_streak >= b.rule_value
      when 'subject_complete' then (
        select count(*) > 0 and coalesce(bool_and(exists (
          select 1 from attempts a where a.user_id = p_uid and a.quest_id = q.id and a.passed)), false)
        from quests q
        where q.subject_id = b.subject_id and q.is_published and q.type in ('quiz', 'simulation', 'challenge'))
      else false
    end;

    if coalesce(v_ok, false) then
      insert into user_badges (user_id, badge_id) values (p_uid, b.id) on conflict do nothing;
      v_new := v_new || jsonb_build_array(jsonb_build_object(
        'code', b.code, 'name', b.name, 'description', b.description, 'icon', b.icon, 'tier', b.tier));
    end if;
  end loop;
  return v_new;
end $$;

-- ---------- RPC: submit a quest / assessment ----------
create or replace function public.submit_quest_attempt(p_quest_id uuid, p_responses jsonb, p_duration int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_quest quests%rowtype;
  v_attempt uuid;
  v_ids uuid[];
  g record;
  v_pct numeric;
  v_passed boolean;
  v_best_prev numeric;
  v_prev_passed boolean;
  v_xp int := 0;
  v_level_before int;
  v_level_after int;
  v_badges jsonb;
  v_assessment boolean;
  v_results jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;

  select * into v_quest from quests where id = p_quest_id;
  if not found or (not v_quest.is_published and not public.is_staff()) then
    raise exception 'Quest not found.';
  end if;

  v_assessment := v_quest.type in ('pretest', 'posttest');
  if v_assessment and exists (select 1 from attempts where user_id = v_uid and quest_id = p_quest_id) then
    raise exception 'You have already taken this assessment.';
  end if;

  select array_agg(id) into v_ids from questions where quest_id = p_quest_id;
  if v_ids is null then
    raise exception 'This quest has no questions yet.';
  end if;

  select coalesce(max(percent), 0), coalesce(bool_or(passed), false)
    into v_best_prev, v_prev_passed
  from attempts where user_id = v_uid and quest_id = p_quest_id;

  select public.level_for_xp(xp) into v_level_before from profiles where id = v_uid;

  insert into attempts (user_id, quest_id, subject_id, mode, duration_seconds)
  values (v_uid, p_quest_id, v_quest.subject_id,
          case when v_assessment then 'assessment' else 'quest' end,
          least(greatest(coalesce(p_duration, 0), 0), 86400))
  returning id into v_attempt;

  select * into g from public._grade_and_record(v_attempt, v_ids, coalesce(p_responses, '{}'::jsonb));

  v_pct := case when g.max_score > 0 then round(g.score * 100.0 / g.max_score, 2) else 0 end;
  v_passed := v_pct >= 60;

  if v_assessment then
    v_xp := 20;  -- flat participation XP; assessments are not competitive
  else
    -- XP only for improvement over your personal best → no farming by replaying
    v_xp := round(v_quest.xp_reward * greatest(v_pct - v_best_prev, 0) / 100.0)::int;
    if v_pct = 100 and v_best_prev < 100 then v_xp := v_xp + 25; end if;
    if v_passed and not v_prev_passed and v_quest.time_limit_seconds is not null
       and p_duration is not null and p_duration <= v_quest.time_limit_seconds / 2 then
      v_xp := v_xp + 15;   -- speed bonus
    end if;
  end if;

  update attempts
     set score = g.score, max_score = g.max_score, correct_count = g.correct, total_count = g.total,
         percent = v_pct, passed = v_passed, xp_earned = v_xp
   where id = v_attempt;

  perform public._apply_activity(v_uid, v_xp);
  v_badges := public._award_badges(v_uid);
  select public.level_for_xp(xp) into v_level_after from profiles where id = v_uid;

  if not v_assessment then
    select coalesce(jsonb_agg(jsonb_build_object(
             'question_id', aa.question_id,
             'is_correct', aa.is_correct,
             'answer', k.answer,
             'explanation', k.explanation) order by q.sort_order), '[]'::jsonb)
      into v_results
    from attempt_answers aa
    join questions q on q.id = aa.question_id
    join question_keys k on k.question_id = aa.question_id
    where aa.attempt_id = v_attempt;
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt,
    'score', g.score, 'max_score', g.max_score,
    'correct', g.correct, 'total', g.total,
    'percent', v_pct, 'passed', v_passed,
    'xp_earned', v_xp,
    'level_before', v_level_before, 'level_after', v_level_after,
    'new_badges', v_badges,
    'is_assessment', v_assessment,
    'results', v_results);
end $$;

-- ---------- RPC: adaptive daily challenge ----------
create or replace function public.start_challenge(p_subject_id uuid default null, p_count int default 10)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_mastery numeric;
  v_target smallint;
  v_ids uuid[];
  v_session uuid;
  v_questions jsonb;
begin
  if v_uid is null then raise exception 'You must be signed in.' using errcode = '28000'; end if;
  p_count := least(greatest(coalesce(p_count, 10), 5), 20);

  -- mastery = accuracy over the student's last 40 answers in this scope
  select avg(case when x.is_correct then 1.0 else 0.0 end) into v_mastery
  from (
    select aa.is_correct
    from attempt_answers aa
    join attempts a on a.id = aa.attempt_id
    where a.user_id = v_uid and a.mode <> 'assessment'
      and (p_subject_id is null or a.subject_id = p_subject_id)
    order by a.created_at desc
    limit 40
  ) x;

  -- Flow theory: match challenge to demonstrated skill
  v_target := case
    when v_mastery is null then 2
    when v_mastery < 0.5 then 1
    when v_mastery < 0.8 then 2
    else 3 end;

  select array_agg(id) into v_ids from (
    select q.id
    from questions q
    join quests qu on qu.id = q.quest_id
    where qu.is_published and qu.type in ('quiz', 'simulation', 'challenge')
      and (p_subject_id is null or qu.subject_id = p_subject_id)
      and exists (select 1 from question_keys k where k.question_id = q.id)
    order by abs(q.difficulty - v_target) + random() * 1.25
    limit p_count
  ) s;

  if v_ids is null then raise exception 'No questions available for this challenge yet.'; end if;

  insert into challenge_sessions (user_id, subject_id, question_ids, target_difficulty)
  values (v_uid, p_subject_id, v_ids, v_target)
  returning id into v_session;

  select jsonb_agg(jsonb_build_object(
           'id', q.id, 'kind', q.kind, 'prompt', q.prompt, 'code', q.code,
           'options', q.options, 'difficulty', q.difficulty, 'points', q.points, 'topic', q.topic)
         order by array_position(v_ids, q.id))
    into v_questions
  from questions q where q.id = any (v_ids);

  return jsonb_build_object(
    'session_id', v_session,
    'target_difficulty', v_target,
    'mastery', round(coalesce(v_mastery, 0) * 100),
    'time_limit_seconds', p_count * 30,
    'questions', v_questions);
end $$;

create or replace function public.submit_challenge(p_session_id uuid, p_responses jsonb, p_duration int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  s challenge_sessions%rowtype;
  v_attempt uuid;
  g record;
  v_pct numeric;
  v_xp int := 0;
  v_first_today boolean;
  v_level_before int;
  v_level_after int;
  v_badges jsonb;
  v_results jsonb;
  v_limit int;
begin
  if v_uid is null then raise exception 'You must be signed in.' using errcode = '28000'; end if;

  select * into s from challenge_sessions where id = p_session_id and user_id = v_uid for update;
  if not found then raise exception 'Challenge not found.'; end if;
  if s.submitted_at is not null then raise exception 'This challenge was already submitted.'; end if;

  update challenge_sessions set submitted_at = now() where id = s.id;
  v_limit := coalesce(array_length(s.question_ids, 1), 0) * 30;

  v_first_today := not exists (
    select 1 from attempts
    where user_id = v_uid and mode = 'challenge'
      and (created_at at time zone 'Asia/Manila')::date = public.manila_today());

  select public.level_for_xp(xp) into v_level_before from profiles where id = v_uid;

  insert into attempts (user_id, subject_id, mode, duration_seconds)
  values (v_uid, s.subject_id, 'challenge', least(greatest(coalesce(p_duration, 0), 0), 86400))
  returning id into v_attempt;

  select * into g from public._grade_and_record(v_attempt, s.question_ids, coalesce(p_responses, '{}'::jsonb));
  v_pct := case when g.max_score > 0 then round(g.score * 100.0 / g.max_score, 2) else 0 end;

  -- 5 XP × difficulty per correct answer
  select coalesce(sum(5 * q.difficulty), 0) into v_xp
  from attempt_answers aa join questions q on q.id = aa.question_id
  where aa.attempt_id = v_attempt and aa.is_correct;

  -- late submissions (server-side clock + 30s grace) earn nothing
  if now() > s.created_at + make_interval(secs => v_limit + 30) then
    v_xp := 0;
  elsif v_first_today then
    v_xp := v_xp + 30;           -- daily challenge bonus
  else
    v_xp := v_xp / 2;            -- practice rounds after the first of the day
  end if;

  update attempts
     set score = g.score, max_score = g.max_score, correct_count = g.correct, total_count = g.total,
         percent = v_pct, passed = v_pct >= 60, xp_earned = v_xp
   where id = v_attempt;

  perform public._apply_activity(v_uid, v_xp);
  v_badges := public._award_badges(v_uid);
  select public.level_for_xp(xp) into v_level_after from profiles where id = v_uid;

  select coalesce(jsonb_agg(jsonb_build_object(
           'question_id', aa.question_id, 'is_correct', aa.is_correct,
           'answer', k.answer, 'explanation', k.explanation)
         order by array_position(s.question_ids, aa.question_id)), '[]'::jsonb)
    into v_results
  from attempt_answers aa join question_keys k on k.question_id = aa.question_id
  where aa.attempt_id = v_attempt;

  return jsonb_build_object(
    'attempt_id', v_attempt,
    'score', g.score, 'max_score', g.max_score, 'correct', g.correct, 'total', g.total,
    'percent', v_pct, 'passed', v_pct >= 60, 'xp_earned', v_xp,
    'daily_bonus', v_first_today and v_xp > 0,
    'level_before', v_level_before, 'level_after', v_level_after,
    'new_badges', v_badges, 'is_assessment', false, 'results', v_results);
end $$;

-- ---------- RPC: Subnetting lab (verified with Postgres inet math) ----------
create or replace function public.check_subnet(
  p_ip text, p_prefix int,
  p_network text, p_broadcast text, p_first text, p_last text, p_hosts int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_net cidr;
  e_network text; e_broadcast text; e_first text; e_last text; e_hosts bigint; e_mask text;
  ok_network boolean; ok_broadcast boolean; ok_first boolean; ok_last boolean; ok_hosts boolean;
  v_all boolean;
  v_today_xp int;
  v_xp int := 0;
  v_badges jsonb := '[]'::jsonb;
begin
  if v_uid is null then raise exception 'You must be signed in.' using errcode = '28000'; end if;
  if p_prefix is null or p_prefix < 8 or p_prefix > 30 then raise exception 'Prefix must be between /8 and /30.'; end if;

  begin
    v_net := network(set_masklen(p_ip::inet, p_prefix));
  exception when others then
    raise exception 'Invalid IPv4 address.';
  end;
  if family(v_net) <> 4 then raise exception 'Only IPv4 is supported.'; end if;

  e_network   := host(v_net);
  e_broadcast := host(broadcast(v_net));
  e_first     := host(host(v_net)::inet + 1);
  e_last      := host(host(broadcast(v_net))::inet - 1);
  e_hosts     := (2 ^ (32 - p_prefix))::bigint - 2;
  e_mask      := host(netmask(v_net));

  ok_network   := btrim(coalesce(p_network, ''))   = e_network;
  ok_broadcast := btrim(coalesce(p_broadcast, '')) = e_broadcast;
  ok_first     := btrim(coalesce(p_first, ''))     = e_first;
  ok_last      := btrim(coalesce(p_last, ''))      = e_last;
  ok_hosts     := coalesce(p_hosts, -1)            = e_hosts;
  v_all := ok_network and ok_broadcast and ok_first and ok_last and ok_hosts;

  select coalesce(sum(xp_earned), 0) into v_today_xp
  from lab_results
  where user_id = v_uid and (created_at at time zone 'Asia/Manila')::date = public.manila_today();

  if v_all then v_xp := least(10, greatest(150 - v_today_xp, 0)); end if;   -- daily lab cap: 150 XP

  insert into lab_results (user_id, subject_id, lab, correct, xp_earned)
  values (v_uid, (select id from subjects where slug = 'networking'), 'subnetting', v_all, v_xp);

  perform public._apply_activity(v_uid, v_xp);
  v_badges := public._award_badges(v_uid);

  return jsonb_build_object(
    'correct', v_all, 'xp_earned', v_xp, 'new_badges', v_badges,
    'expected', jsonb_build_object('network', e_network, 'broadcast', e_broadcast,
                                   'first', e_first, 'last', e_last, 'hosts', e_hosts, 'mask', e_mask),
    'fields', jsonb_build_object('network', ok_network, 'broadcast', ok_broadcast,
                                 'first', ok_first, 'last', ok_last, 'hosts', ok_hosts));
end $$;

-- ---------- RPC: leaderboard (respects opt-out) ----------
create or replace function public.get_leaderboard(
  p_period text default 'all', p_subject uuid default null, p_class uuid default null, p_limit int default 50)
returns table (rank_no bigint, display_name text, level int, points bigint, badges bigint,
               is_me boolean, year_level smallint, section text)
language sql stable security definer set search_path = public as $$
  with scope_ok as (
    select p_class is null or public.is_class_member(p_class) or public.is_class_owner(p_class) as ok
  ),
  pts as (
    select p.id as uid,
      case when coalesce(p_period, 'all') = 'all' and p_subject is null then p.xp::bigint
      else coalesce((
        select sum(x.xp)::bigint from (
          select a.xp_earned as xp, a.subject_id, a.created_at from attempts a where a.user_id = p.id
          union all
          select l.xp_earned, l.subject_id, l.created_at from lab_results l where l.user_id = p.id
        ) x
        where (p_subject is null or x.subject_id = p_subject)
          and (p_period <> 'week'  or x.created_at >= now() - interval '7 days')
          and (p_period <> 'month' or x.created_at >= now() - interval '30 days')
      ), 0) end as points
    from profiles p, scope_ok
    where scope_ok.ok
      and p.role = 'student'
      and (p.show_on_leaderboard or p.id = auth.uid())
      and (p_class is null or exists (
            select 1 from class_members cm where cm.class_id = p_class and cm.student_id = p.id))
  ),
  ranked as (
    select uid, points, rank() over (order by points desc) as rnk
    from pts
    where points > 0 or uid = auth.uid()
  )
  select r.rnk, p.display_name, public.level_for_xp(p.xp), r.points,
         (select count(*) from user_badges ub where ub.user_id = p.id),
         p.id = auth.uid(), p.year_level, p.section
  from ranked r join profiles p on p.id = r.uid
  where r.rnk <= least(greatest(coalesce(p_limit, 50), 1), 200) or p.id = auth.uid()
  order by r.rnk, p.display_name;
$$;

-- ---------- RPC: classes ----------
create or replace function public.join_class(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  c classes%rowtype;
begin
  if v_uid is null then raise exception 'You must be signed in.' using errcode = '28000'; end if;
  select * into c from classes where join_code = upper(btrim(coalesce(p_code, '')));
  if not found then raise exception 'No class found with that code.'; end if;
  insert into class_members (class_id, student_id) values (c.id, v_uid) on conflict do nothing;
  return jsonb_build_object('id', c.id, 'name', c.name);
end $$;

create or replace function public.regenerate_join_code(p_class uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not public.is_class_owner(p_class) then raise exception 'Not allowed.'; end if;
  loop
    v_code := public.random_code(6);
    exit when not exists (select 1 from classes where join_code = v_code);
  end loop;
  update classes set join_code = v_code where id = p_class;
  return v_code;
end $$;

-- ---------- RPC: admin ----------
create or replace function public.set_user_role(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only administrators can change roles.'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then
    raise exception 'You cannot remove your own admin role.';
  end if;
  update profiles set role = p_role where id = p_user;
end $$;

-- ---------- Analytics (instructor of the class or admin only) ----------
create or replace function public.class_quest_stats(p_class uuid)
returns table (quest_id uuid, title text, quest_type public.quest_type, sort_order int,
               attempts bigint, students_attempted bigint, students_passed bigint, members bigint,
               completion_rate numeric, avg_percent numeric)
language sql stable security definer set search_path = public as $$
  with cls as (select * from classes where id = p_class and public.is_class_owner(p_class)),
  mem as (select student_id from class_members where class_id = p_class),
  n as (select count(*) as n from mem)
  select qu.id, qu.title, qu.type, qu.sort_order,
         count(a.id),
         count(distinct a.user_id),
         count(distinct a.user_id) filter (where a.passed),
         n.n,
         round(100.0 * count(distinct a.user_id) filter (where a.passed) / nullif(n.n, 0), 1),
         round(avg(a.percent), 1)
  from cls
  join quests qu on qu.subject_id = cls.subject_id and qu.is_published
  cross join n
  left join attempts a on a.quest_id = qu.id and a.user_id in (select student_id from mem)
  group by qu.id, qu.title, qu.type, qu.sort_order, n.n
  order by (qu.type in ('pretest', 'posttest')), qu.sort_order;
$$;

create or replace function public.item_analysis(p_quest uuid, p_class uuid default null)
returns table (question_id uuid, sort_order int, prompt text, kind public.question_kind, difficulty smallint,
               responses bigint, correct bigint, p_value numeric)
language sql stable security definer set search_path = public as $$
  select q.id, q.sort_order, q.prompt, q.kind, q.difficulty,
         count(aa.id),
         count(aa.id) filter (where aa.is_correct),
         round(avg(case when aa.is_correct then 1.0 else 0.0 end), 2)
  from questions q
  left join attempt_answers aa on aa.question_id = q.id
    and (p_class is null or exists (
          select 1 from attempts a join class_members cm on cm.student_id = a.user_id
          where a.id = aa.attempt_id and cm.class_id = p_class))
  where q.quest_id = p_quest
    and public.is_staff()
    and (p_class is null or public.is_class_owner(p_class))
  group by q.id
  order by q.sort_order;
$$;

create or replace function public.class_performance_trend(p_class uuid)
returns table (week date, attempts bigint, active_students bigint, avg_percent numeric)
language sql stable security definer set search_path = public as $$
  select date_trunc('week', a.created_at at time zone 'Asia/Manila')::date,
         count(*), count(distinct a.user_id), round(avg(a.percent), 1)
  from attempts a
  join class_members cm on cm.student_id = a.user_id and cm.class_id = p_class
  where public.is_class_owner(p_class)
    and a.mode in ('quest', 'challenge')
    and a.created_at >= now() - interval '12 weeks'
  group by 1
  order by 1;
$$;

create or replace function public.class_roster(p_class uuid)
returns table (student_id uuid, student_code text, full_name text, display_name text,
               year_level smallint, section text, xp int, level int, streak int, last_active_date date,
               quests_passed bigint, avg_percent numeric, pretest numeric, posttest numeric,
               sus_score numeric, motivation_mean numeric, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  with cls as (select * from classes where id = p_class and public.is_class_owner(p_class))
  select p.id, p.student_code, p.full_name, p.display_name, p.year_level, p.section,
         p.xp, public.level_for_xp(p.xp), p.streak, p.last_active_date,
         (select count(distinct a.quest_id) from attempts a join quests q on q.id = a.quest_id
           where a.user_id = p.id and a.passed and a.mode = 'quest' and q.subject_id = cls.subject_id),
         (select round(avg(a.percent), 1) from attempts a
           where a.user_id = p.id and a.mode = 'quest' and a.subject_id = cls.subject_id),
         (select a.percent from attempts a join quests q on q.id = a.quest_id
           where a.user_id = p.id and q.type = 'pretest' and q.subject_id = cls.subject_id
           order by a.created_at limit 1),
         (select a.percent from attempts a join quests q on q.id = a.quest_id
           where a.user_id = p.id and q.type = 'posttest' and q.subject_id = cls.subject_id
           order by a.created_at limit 1),
         (select s.score from survey_responses s where s.user_id = p.id and s.instrument = 'sus'),
         (select s.score from survey_responses s where s.user_id = p.id and s.instrument = 'motivation'),
         cm.joined_at
  from cls
  join class_members cm on cm.class_id = cls.id
  join profiles p on p.id = cm.student_id
  order by p.full_name;
$$;

-- Aggregated survey item means (for SUS / motivation item tables)
create or replace function public.survey_item_means(p_instrument public.instrument, p_class uuid default null)
returns table (item int, mean numeric, sd numeric, n bigint)
language sql stable security definer set search_path = public as $$
  select t.ord::int, round(avg(t.v), 2), round(coalesce(stddev_samp(t.v), 0), 2), count(*)
  from survey_responses s
  cross join lateral jsonb_array_elements_text(s.answers) with ordinality as t0(val, ord)
  cross join lateral (select t0.ord, t0.val::numeric as v) t
  where s.instrument = p_instrument
    and public.is_staff()
    and (p_class is null or (public.is_class_owner(p_class) and exists (
          select 1 from class_members cm where cm.class_id = p_class and cm.student_id = s.user_id)))
  group by t.ord
  order by t.ord;
$$;

-- ---------- Lock down internal functions ----------
revoke execute on function public._grade_and_record(uuid, uuid[], jsonb) from public, anon, authenticated;
revoke execute on function public._apply_activity(uuid, int) from public, anon, authenticated;
revoke execute on function public._award_badges(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
