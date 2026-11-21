// End-to-end database test: runs every migration + the seed on an in-memory
// Postgres (PGlite) with a minimal Supabase auth stub, then exercises the
// RPCs and Row Level Security exactly as the app uses them.
// Usage: npm run db:test
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = fileURLToPath(new URL('../supabase/', import.meta.url))
const db = new PGlite()

// ---- Minimal Supabase environment ----
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  -- Like newer Supabase projects: NO default table/sequence grants. The migrations must grant
  -- table access explicitly, so this suite fails if they ever stop doing so.
  alter default privileges in schema public grant all on functions to anon, authenticated;
`)

for (const f of readdirSync(root + 'migrations').sort()) {
  await db.exec(readFileSync(root + 'migrations/' + f, 'utf8'))
  console.log('✓ migration', f)
}
await db.exec(readFileSync(root + 'seed.sql', 'utf8'))
await db.exec(readFileSync(root + 'seed.sql', 'utf8')) // idempotent
console.log('✓ seed (applied twice)')

let passed = 0
const ok = (name) => { passed++; console.log('  ✓', name) }

const su = async (sql, params) => (await db.query(sql, params)).rows
const as = async (uid, sql, params) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`)
  try { return (await db.query(sql, params ?? [])).rows }
  finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`) }
}
const fails = async (uid, sql, params, re) => {
  try { await as(uid, sql, params) } catch (e) {
    if (re) assert.match(e.message, re)
    return e.message
  }
  throw new Error('expected failure: ' + sql)
}

// ---- Users ----
const ids = { s1: crypto.randomUUID(), s2: crypto.randomUUID(), t: crypto.randomUUID(), a: crypto.randomUUID() }
for (const [k, id] of Object.entries(ids)) {
  await su(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`,
    [id, `${k}@dorsu.edu.ph`, { full_name: `User ${k.toUpperCase()}`, year_level: '3', section: 'BSIT 3A' }])
}
await su(`update profiles set role = 'instructor' where id = $1`, [ids.t])
await su(`update profiles set role = 'admin' where id = $1`, [ids.a])
console.log('\nProfiles & security')
const [p] = await su(`select * from profiles where id = $1`, [ids.s1])
assert.equal(p.full_name, 'User S1'); assert.equal(p.year_level, 3); assert.match(p.student_code, /^ITQ-[0-9A-F]{6}$/)
ok('signup trigger creates profile with student code')

assert.equal((await as(ids.s1, `select * from question_keys`)).length, 0)
assert.ok((await as(ids.s1, `select * from questions`)).length > 100)
ok('students can read questions but never answer keys')

assert.equal((await as(ids.t, `select * from question_keys`)).length > 100, true)
ok('instructors can read answer keys')

await fails(ids.s1, `update profiles set xp = 99999 where id = '${ids.s1}'`, null, /permission denied/)
await fails(ids.s1, `update profiles set role = 'admin' where id = '${ids.s1}'`, null, /permission denied/)
await as(ids.s1, `update profiles set display_name = 'Juan', show_on_leaderboard = false where id = '${ids.s1}'`)
assert.equal((await su(`select display_name from profiles where id = $1`, [ids.s1]))[0].display_name, 'Juan')
await su(`update profiles set show_on_leaderboard = true where id = $1`, [ids.s1])
ok('students edit only safe profile columns (no XP / role forging)')

await fails(ids.s1, `insert into attempts (user_id, mode, xp_earned) values ('${ids.s1}', 'quest', 5000)`)
ok('direct attempt inserts are blocked')

assert.equal((await as(ids.s2, `select * from profiles`)).length, 1)
ok('students cannot read other profiles')

// ---- Quest submission ----
console.log('\nQuests')
const keysFor = async (questKey) => {
  const rows = await su(`select q.id, q.kind, k.answer from questions q join question_keys k on k.question_id = q.id
    join quests qu on qu.id = q.quest_id where qu.title = $1`, [questKey])
  const correct = {}, wrong = {}
  for (const r of rows) {
    const a = r.answer
    correct[r.id] = r.kind === 'short' || r.kind === 'code' ? { value: a.accepted[0].toUpperCase() + '  ' }
      : r.kind === 'multi' ? { values: [...a.values].reverse() } : a.order ? { order: a.order } : { value: a.value }
    wrong[r.id] = { value: 'nope' }
  }
  const [{ id }] = await su(`select id from quests where title = $1`, [questKey])
  return { id, correct, wrong, n: rows.length }
}

const fund = await keysFor('Network Fundamentals')
let [{ submit_quest_attempt: r }] = await as(ids.s1, `select submit_quest_attempt($1, $2, 120)`, [fund.id, fund.correct])
assert.equal(Number(r.percent), 100); assert.equal(r.correct, fund.n); assert.equal(r.xp_earned, 60 + 25)
assert.deepEqual(r.new_badges.map((b) => b.code).sort(), ['first-steps', 'perfectionist'])
assert.equal(r.results.length, fund.n); assert.ok(r.results[0].explanation)
ok(`all-correct quest → 100%, 85 XP, badges first-steps + perfectionist (answers normalized: case/space/multi order)`)

;[{ submit_quest_attempt: r }] = await as(ids.s1, `select submit_quest_attempt($1, $2, 120)`, [fund.id, fund.correct])
assert.equal(r.xp_earned, 0)
ok('replaying a mastered quest earns no XP (anti-farming)')

const sub = await keysFor('IP Addressing & Subnetting')
;[{ submit_quest_attempt: r }] = await as(ids.s1, `select submit_quest_attempt($1, $2, 30)`, [sub.id, sub.wrong])
assert.equal(Number(r.percent), 0); assert.equal(r.passed, false); assert.equal(r.xp_earned, 0)
assert.ok(r.results.every((x) => x.is_correct === false))
;[{ submit_quest_attempt: r }] = await as(ids.s1, `select submit_quest_attempt($1, $2, 100)`, [sub.id, sub.correct])
assert.equal(r.xp_earned, 100 + 25 + 15)
ok('wrong answers → 0%; later perfect run within half time → full XP + perfect + speed bonus')

const pre = await keysFor('Networking Pretest')
;[{ submit_quest_attempt: r }] = await as(ids.s1, `select submit_quest_attempt($1, $2, 300)`, [pre.id, pre.wrong])
assert.equal(r.is_assessment, true); assert.equal(r.results.length, 0)
await fails(ids.s1, `select submit_quest_attempt($1, $2, 300)`, [pre.id, pre.correct], /already taken/)
ok('pretest: no answer feedback leaked, only one attempt allowed')

const post = await keysFor('Networking Posttest')
await fails(ids.s1, `select submit_quest_attempt($1, $2, 300)`, [post.id, post.correct], /not found/)
ok('unpublished posttest is locked until the instructor opens it')

// ---- Challenge ----
console.log('\nDaily challenge')
const [{ start_challenge: ch }] = await as(ids.s1, `select start_challenge(null, 10)`)
assert.equal(ch.questions.length, 10); assert.ok(!('answer' in ch.questions[0]))
const chKeys = await su(`select q.id, q.kind, k.answer from questions q join question_keys k on k.question_id = q.id where q.id = any($1)`, [ch.questions.map((q) => q.id)])
const chResp = Object.fromEntries(chKeys.map((r) => [r.id, r.answer.accepted ? { value: r.answer.accepted[0] } : r.answer.values ? { values: r.answer.values } : r.answer.order ? { order: r.answer.order } : { value: r.answer.value }]))
const [{ submit_challenge: cr }] = await as(ids.s1, `select submit_challenge($1, $2, 90)`, [ch.session_id, chResp])
assert.equal(Number(cr.percent), 100); assert.equal(cr.daily_bonus, true); assert.ok(cr.xp_earned > 30)
assert.ok(cr.new_badges.some((b) => b.code === 'challenger'))
await fails(ids.s1, `select submit_challenge($1, $2, 90)`, [ch.session_id, chResp], /already submitted/)
await fails(ids.s2, `select submit_challenge($1, $2, 90)`, [ch.session_id, chResp], /not found/)
ok(`adaptive challenge (target difficulty ${ch.target_difficulty}) → daily bonus, Challenger badge, single-use session`)

// ---- Subnetting lab ----
console.log('\nSubnetting lab')
const [{ check_subnet: lab }] = await as(ids.s1, `select check_subnet('192.168.10.77', 26, '192.168.10.64', '192.168.10.127', '192.168.10.65', '192.168.10.126', 62)`)
assert.equal(lab.correct, true); assert.equal(lab.xp_earned, 10)
const [{ check_subnet: lab2 }] = await as(ids.s1, `select check_subnet('10.1.2.3', 20, '10.1.0.0', '10.1.15.255', '10.1.0.1', '10.1.15.254', 4094)`)
assert.equal(lab2.correct, true)
const [{ check_subnet: lab3 }] = await as(ids.s1, `select check_subnet('172.16.5.130', 25, '172.16.5.0', '172.16.5.255', '172.16.5.129', '172.16.5.254', 126)`)
assert.equal(lab3.correct, false); assert.equal(lab3.fields.network, false); assert.equal(lab3.expected.network, '172.16.5.128')
assert.equal(lab3.expected.mask, '255.255.255.128')
ok('server-verified subnet math (/26, /20, wrong network detected)')

// ---- Classes, leaderboard, analytics ----
console.log('\nClasses & analytics')
const [{ id: netId }] = await su(`select id from subjects where slug = 'networking'`)
await fails(ids.s1, `insert into classes (name, subject_id, instructor_id) values ('Hack', $1, $2)`, [netId, ids.s1])
const [cls] = await as(ids.t, `insert into classes (name, subject_id, instructor_id, group_type) values ('BSIT 3A - Networking', $1, $2, 'experimental') returning *`, [netId, ids.t])
ok('only instructors can create classes')

await as(ids.s1, `select join_class($1)`, [cls.join_code.toLowerCase()])
await as(ids.s2, `select join_class($1)`, [cls.join_code])
await fails(ids.s1, `select join_class('ZZZZZZ')`, null, /No class/)
assert.equal((await as(ids.s1, `select * from classes`)).length, 1)
ok('students join with a (case-insensitive) code and can see their class')

assert.equal((await as(ids.t, `select * from profiles`)).length, 3) // self + 2 students
assert.equal((await as(ids.t, `select * from attempts`)).length > 0, true)
ok("instructor sees only their own students' data")

const lb = await as(ids.s2, `select * from get_leaderboard('all', null, null, 50)`)
assert.equal(lb[0].display_name, 'Juan'); assert.ok(lb.some((x) => x.is_me))
await su(`update profiles set show_on_leaderboard = false where id = $1`, [ids.s1])
const lb2 = await as(ids.s2, `select * from get_leaderboard('week', null, $1, 50)`, [cls.id])
assert.ok(!lb2.some((x) => x.display_name === 'Juan'))
const lbSelf = await as(ids.s1, `select * from get_leaderboard('all', null, null, 50)`)
assert.ok(lbSelf.some((x) => x.is_me))
ok('leaderboard ranks by XP, respects opt-out (still visible to self), class scope works')

const roster = await as(ids.t, `select * from class_roster($1)`, [cls.id])
assert.equal(roster.length, 2); assert.equal(Number(roster.find((x) => x.student_id === ids.s1).pretest), 0)
assert.equal((await as(ids.s1, `select * from class_roster($1)`, [cls.id])).length, 0)
const stats = await as(ids.t, `select * from class_quest_stats($1)`, [cls.id])
assert.equal(stats.length, 5) // 4 quests + pretest (posttest unpublished)
assert.equal(Number(stats.find((x) => x.title === 'Network Fundamentals').completion_rate), 50)
const items = await as(ids.t, `select * from item_analysis($1, $2)`, [sub.id, cls.id])
assert.equal(items.length, 8)
// p-value = share of correct responses. Daily-challenge answers count too and the challenge
// draws questions at random, so check the formula rather than a fixed number.
assert.ok(Number(items[0].responses) >= 2)
for (const it of items.filter((x) => Number(x.responses) > 0)) {
  assert.equal(Number(it.p_value), Math.round((Number(it.correct) / Number(it.responses)) * 100) / 100)
}
assert.equal((await as(ids.s1, `select * from item_analysis($1, null)`, [sub.id])).length, 0)
const trend = await as(ids.t, `select * from class_performance_trend($1)`, [cls.id])
assert.equal(trend.length, 1)
ok('roster, completion rate, item analysis (p-value), trend — and hidden from students')

// ---- Surveys ----
console.log('\nResearch instruments')
const [sus] = await as(ids.s1, `insert into survey_responses (user_id, instrument, answers) values ($1, 'sus', $2) returning score`, [ids.s1, JSON.stringify([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])])
assert.equal(Number(sus.score), 100)
const [sus2] = await as(ids.s2, `insert into survey_responses (user_id, instrument, answers, score) values ($1, 'sus', $2, 100) returning score`, [ids.s2, JSON.stringify([3, 3, 3, 3, 3, 3, 3, 3, 3, 3])])
assert.equal(Number(sus2.score), 50)
const [mot] = await as(ids.s1, `insert into survey_responses (user_id, instrument, answers) values ($1, 'motivation', $2) returning score`, [ids.s1, JSON.stringify([4, 4, 4, 4, 5, 5, 5, 5, 3, 3, 3, 3])])
assert.equal(Number(mot.score), 4)
await fails(ids.s1, `insert into survey_responses (user_id, instrument, answers) values ($1, 'motivation', '[1,2]')`, [ids.s2])
await fails(ids.s1, `insert into survey_responses (user_id, instrument, answers) values ($1, 'sus', '[9,1,5,1,5,1,5,1,5,1]')`, [ids.s1], /between 1 and 5/)
const means = await as(ids.t, `select * from survey_item_means('sus', $1)`, [cls.id])
assert.equal(means.length, 10); assert.equal(Number(means[0].mean), 4)
ok('SUS scored server-side (forged score ignored), motivation mean, validation, item means')

await as(ids.s1, `insert into feedback (user_id, rating, category, message) values ($1, 5, 'feature', 'Add more labs please!')`, [ids.s1])
assert.equal((await as(ids.t, `select * from feedback`)).length, 1)
assert.equal((await as(ids.s2, `select * from feedback`)).length, 0)
ok('feedback visible to staff, private between students')

// ---- Admin ----
console.log('\nAdmin')
await fails(ids.t, `select set_user_role($1, 'admin')`, [ids.t], /Only administrators/)
await as(ids.a, `select set_user_role($1, 'instructor')`, [ids.s2])
assert.equal((await su(`select role from profiles where id = $1`, [ids.s2]))[0].role, 'instructor')
await fails(ids.a, `select set_user_role($1, 'student')`, [ids.a], /own admin/)
await fails(ids.s1, `select _award_badges($1)`, [ids.s1], /permission denied/)
ok('role management restricted to admins; internal functions not callable')

await db.exec(`set role anon;`)
try {
  await db.query(`select * from get_leaderboard('all', null, null, 50)`)
  throw new Error('anon should not call RPCs')
} catch (e) { assert.match(e.message, /permission denied/) } finally { await db.exec('reset role;') }
await db.exec(`set role anon;`)
assert.equal((await db.query(`select * from subjects`)).rows.length, 4)
await db.exec('reset role;')
ok('logged-out visitors can read subjects but cannot call any RPC')

// ---- Staff tools (Command Center) ----
console.log('\nStaff tools')
const s3 = crypto.randomUUID() // a student in no class, who never played
await su(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 's3@dorsu.edu.ph', '{"full_name":"User S3"}')`, [s3])

await as(ids.t, `insert into announcements (author_id, class_id, title, body, tone) values ($1, $2, 'Quiz on Friday', 'Review subnetting', 'event')`, [ids.t, cls.id])
await fails(ids.t, `insert into announcements (author_id, title) values ($1, 'Everyone!')`, [ids.t], /row-level security/)
await as(ids.a, `insert into announcements (author_id, title, tone) values ($1, 'Welcome to Season 1', 'info')`, [ids.a])
await fails(ids.s1, `insert into announcements (author_id, class_id, title) values ($1, $2, 'Hacked')`, [ids.s1, cls.id], /row-level security/)
assert.equal((await as(ids.s1, `select * from announcements`)).length, 2) // class + global
assert.equal((await as(s3, `select * from announcements`)).length, 1)     // global only
ok('announcements: instructors post to own class, only admins post to everyone, students see their audience')

const wlT = await as(ids.t, `select * from staff_watchlist(null)`)
assert.ok(!wlT.some((r) => r.student_id === s3), 'instructor must not see students outside own classes')
const wlA = await as(ids.a, `select * from staff_watchlist(null)`)
const s3row = wlA.find((r) => r.student_id === s3)
assert.ok(s3row && s3row.reasons.includes('Never played'))
assert.equal((await as(ids.s1, `select * from staff_watchlist(null)`)).length, 0)
ok('encouragement watchlist flags at-risk students, scoped to the viewer')

// The radar ignores items with < 3 responses. Quest items have 2 here (the 3rd depends on the
// random daily-challenge draw), so record one more wrong answer to make the check deterministic.
const [qa] = await su(`select aa.question_id, a.quest_id from attempt_answers aa join attempts a on a.id = aa.attempt_id
  join quests q on q.id = a.quest_id where a.user_id = $1 and a.mode = 'quest' and q.type = 'quiz' limit 1`, [ids.s1])
const [extra] = await su(`insert into attempts (user_id, quest_id, mode) values ($1, $2, 'quest') returning id`, [ids.s1, qa.quest_id])
await su(`insert into attempt_answers (attempt_id, question_id, is_correct) values ($1, $2, false)`, [extra.id, qa.question_id])
const radar = await as(ids.t, `select * from remediation_radar(null, 10)`)
assert.ok(radar.length > 0 && radar.every((r) => Number(r.responses) >= 3 && Number(r.p_value) >= 0 && Number(r.p_value) <= 1))
for (let i = 1; i < radar.length; i++) assert.ok(Number(radar[i - 1].p_value) <= Number(radar[i].p_value), 'hardest first')
assert.equal((await as(ids.s1, `select * from remediation_radar(null, 10)`)).length, 0)
ok('remediation radar ranks hardest items (lowest p-value first), staff only')

const [{ platform_pulse: pulse }] = await as(ids.a, `select platform_pulse()`)
assert.ok(Number(pulse.students) >= 2 && pulse.daily.length === 14 && pulse.subjects.length === 4)
await fails(ids.t, `select platform_pulse()`, null, /Only administrators/)
ok('platform pulse (14-day activity, per-subject health) is admin-only')

const [anyQuest] = await su(`select id from quests limit 1`)
await as(ids.t, `insert into quest_reviews (quest_id, reviewer_id, accuracy, alignment, difficulty_fit, technical) values ($1, $2, 5, 4, 4, 5)`, [anyQuest.id, ids.t])
await as(ids.t, `update quest_reviews set comment = 'Good items' where quest_id = $1 and reviewer_id = $2`, [anyQuest.id, ids.t])
await fails(ids.s1, `insert into quest_reviews (quest_id, reviewer_id, accuracy, alignment, difficulty_fit, technical) values ($1, $2, 1, 1, 1, 1)`, [anyQuest.id, ids.s1], /row-level security/)
assert.equal((await as(ids.a, `select * from quest_reviews`)).length, 1)
assert.equal((await as(ids.s1, `select * from quest_reviews`)).length, 0)
ok('expert validation rubric: staff rate quests, students can neither rate nor read reviews')

// ---- Daily check-in, Daily Byte, cosmetics ----
console.log('\nDaily check-in')
const [{ claim_daily_checkin: c1 }] = await as(s3, `select claim_daily_checkin()`)
assert.equal(c1.claimed_now, true); assert.equal(c1.cycle_day, 1); assert.equal(c1.xp, 10)
assert.ok(c1.byte && ['mcq', 'truefalse'].includes(c1.byte.kind) && !('answer' in c1.byte), 'byte question sent without its answer')
let [s3p] = await su(`select xp, last_active_date, streak from profiles where id = $1`, [s3])
assert.equal(s3p.xp, 10); assert.equal(s3p.last_active_date, null) // attendance alone is not learning activity
const [{ claim_daily_checkin: c1b }] = await as(s3, `select claim_daily_checkin()`)
assert.equal(c1b.claimed_now, false)
assert.equal((await su(`select xp from profiles where id = $1`, [s3]))[0].xp, 10)
ok('check-in: once per day, +10 XP on day 1, no streak credit for just clicking')

const [{ answer: byteKey }] = await su(`select answer from question_keys where question_id = $1`, [c1.byte.id])
const [{ answer_daily_byte: b1 }] = await as(s3, `select answer_daily_byte($1)`, [byteKey])
assert.equal(b1.correct, true); assert.equal(b1.bonus_xp, 10)
;[s3p] = await su(`select xp, last_active_date, streak from profiles where id = $1`, [s3])
assert.equal(s3p.xp, 20); assert.ok(s3p.last_active_date !== null); assert.equal(s3p.streak, 1)
await fails(s3, `select answer_daily_byte('{"value":"x"}')`, null, /already answered/)
ok('Daily Byte: correct answer doubles the XP, counts as learning activity, one try only')

const s4 = crypto.randomUUID()
await su(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 's4@dorsu.edu.ph', '{"full_name":"User S4"}')`, [s4])
await su(`insert into daily_checkins (user_id, day, cycle_day, xp)
  select $1, manila_today() - g, 7 - g, checkin_reward(7 - g) from generate_series(1, 6) g`, [s4])
const [{ claim_daily_checkin: c7 }] = await as(s4, `select claim_daily_checkin()`)
assert.equal(c7.cycle_day, 7); assert.equal(c7.xp, 75); assert.ok(c7.crate?.code, 'day 7 drops a crate cosmetic')
assert.equal(c7.streak, 7); assert.equal(c7.total, 7)
const got = c7.unlocked.map((u) => u.code)
assert.ok(got.includes('title_regular') && got.includes('title_week') && got.includes('frame_neon'))
ok('day 7 supply crate + attendance milestones (3 and 7 days) unlock exclusives')

await as(s4, `select equip_cosmetic('title', 'title_week')`)
await as(s4, `select equip_cosmetic('frame', 'frame_neon')`)
assert.deepEqual(await su(`select equipped_title, equipped_frame from profiles where id = $1`, [s4]), [{ equipped_title: 'title_week', equipped_frame: 'frame_neon' }])
await fails(s4, `select equip_cosmetic('title', 'title_legend')`, null, /not unlocked/)
await fails(s4, `select equip_cosmetic('frame', 'title_week')`, null, /not unlocked/)
await fails(s4, `update profiles set equipped_title = 'title_root' where id = $1`, [s4], /permission denied/)
await fails(s4, `insert into daily_checkins (user_id, day, cycle_day, xp) values ($1, manila_today() + 1, 1, 9999)`, [s4], /permission denied/)
await fails(s4, `insert into user_cosmetics (user_id, code) values ($1, 'title_root')`, [s4], /permission denied/)
ok('cosmetics: equip only what you own; no forging check-ins, XP or unlocks')

await as(ids.s1, `select claim_daily_checkin()`)
assert.equal((await as(s4, `select * from daily_checkins where user_id <> $1`, [s4])).length, 0)
assert.equal((await as(ids.t, `select * from daily_checkins where user_id = $1`, [ids.s1])).length, 1)
assert.equal((await as(ids.t, `select * from daily_checkins where user_id = $1`, [s4])).length, 0)
ok('attendance privacy: students see only their own; instructors see their class')

const { COSMETICS } = await import(new URL('../src/lib/cosmetics.ts', import.meta.url))
const dbCodes = (await su(`select code, kind, rarity from cosmetics order by code`)).map((r) => `${r.code}:${r.kind}:${r.rarity}`)
const tsCodes = Object.entries(COSMETICS).map(([code, c]) => `${code}:${c.kind}:${c.rarity}`).sort()
assert.deepEqual(tsCodes, dbCodes)
ok('cosmetics catalogue in the app matches the database')

const [{ xp }] = await su(`select xp from profiles where id = $1`, [ids.s1])
console.log(`\nAll ${passed} checks passed. (student XP after run: ${xp})`)
