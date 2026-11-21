import type { Metadata } from 'next'
import { BarChart3, Download, FlaskConical, Info } from 'lucide-react'
import { PrePostChart } from '@/components/instructor/charts'
import { buttonClass } from '@/components/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, EmptyState, PageHeader, Pill } from '@/components/ui/misc'
import { requireStaff } from '@/lib/auth'
import { MOTIVATION_ITEMS, SUS_ITEMS } from '@/lib/instruments'
import {
  correlationLabel, effectSizeLabel, fmt, fmtP, independentTTest, likertLabel, mean, pairedTTest, pearson, sd, susLabel, type TTest,
} from '@/lib/stats'
import type { ClassRow } from '@/lib/types'
import { num } from '@/lib/utils'

export const metadata: Metadata = { title: 'Research results' }

interface Roster { student_code: string; quests_passed: number; pretest: number | null; posttest: number | null; sus_score: number | null; motivation_mean: number | null }

function Sig({ p }: { p: number | undefined }) {
  if (p === undefined || !Number.isFinite(p)) return <Pill tone="slate">n/a</Pill>
  return p < 0.05 ? <Pill tone="emerald">Significant</Pill> : <Pill tone="slate">Not significant</Pill>
}

function TRow({ label, t }: { label: string; t: TTest | null }) {
  return (
    <tr>
      <td className="font-semibold">{label}</td>
      <td className="text-right">{t ? t.n : '—'}</td>
      <td className="text-right">{t ? fmt(t.meanDiff) : '—'}</td>
      <td className="text-right">{t ? fmt(t.t, 3) : '—'}</td>
      <td className="text-right">{t ? t.df : '—'}</td>
      <td className="text-right font-mono">{t ? fmtP(t.p) : '—'}</td>
      <td className="text-right">{t ? `${fmt(t.d)} (${effectSizeLabel(t.d)})` : '—'}</td>
      <td><Sig p={t?.p} /></td>
    </tr>
  )
}

export default async function ResearchPage({ searchParams }: { searchParams: Promise<{ exp?: string; ctrl?: string }> }) {
  const sp = await searchParams
  const { supabase, profile } = await requireStaff()
  const q = supabase.from('classes').select('*, subjects(name)').order('created_at', { ascending: false })
  const { data: classesData } = profile.role === 'admin' ? await q : await q.eq('instructor_id', profile.id)
  const classes = (classesData ?? []) as (ClassRow & { subjects: { name: string } | null })[]

  if (classes.length === 0) {
    return (
      <>
        <PageHeader title="Research results" icon={BarChart3} />
        <EmptyState icon={FlaskConical} title="No classes yet" description="Create an experimental and a control class first. Results appear once students take the pretest and posttest." />
      </>
    )
  }

  const expId = classes.find((c) => c.id === sp.exp)?.id ?? classes.find((c) => c.group_type === 'experimental')?.id ?? classes[0].id
  const ctrlId = classes.find((c) => c.id === sp.ctrl)?.id ?? classes.find((c) => c.group_type === 'control' && c.id !== expId)?.id ?? ''
  const exp = classes.find((c) => c.id === expId)!
  const ctrl = classes.find((c) => c.id === ctrlId)

  const [{ data: expRoster }, { data: ctrlRoster }, { data: susItems }, { data: motItems }] = await Promise.all([
    supabase.rpc('class_roster', { p_class: expId }),
    ctrlId ? supabase.rpc('class_roster', { p_class: ctrlId }) : Promise.resolve({ data: [] }),
    supabase.rpc('survey_item_means', { p_instrument: 'sus', p_class: expId }),
    supabase.rpc('survey_item_means', { p_instrument: 'motivation', p_class: expId }),
  ])

  const paired = (rows: Roster[]) => rows.filter((r) => r.pretest !== null && r.posttest !== null).map((r) => ({ pre: num(r.pretest), post: num(r.posttest), quests: num(r.quests_passed) }))
  const E = paired((expRoster ?? []) as Roster[])
  const C = paired((ctrlRoster ?? []) as Roster[])
  const ePre = E.map((x) => x.pre), ePost = E.map((x) => x.post), eGain = E.map((x) => x.post - x.pre)
  const cPre = C.map((x) => x.pre), cPost = C.map((x) => x.post), cGain = C.map((x) => x.post - x.pre)

  const pairedE = pairedTTest(ePre, ePost)
  const pairedC = pairedTTest(cPre, cPost)
  const baseline = independentTTest(ePre, cPre)
  const gainTest = independentTTest(eGain, cGain)
  const r = pearson(E.map((x) => x.quests), ePost)

  const sus = ((expRoster ?? []) as Roster[]).map((x) => x.sus_score).filter((v): v is number => v !== null).map(Number)
  const susMean = mean(sus)
  const susInfo = Number.isFinite(susMean) ? susLabel(susMean) : null
  const motivation = ((motItems ?? []) as { item: number; mean: number; sd: number; n: number }[]).map((m) => ({ ...m, mean: num(m.mean), sd: num(m.sd) }))
  const motOverall = mean(motivation.map((m) => m.mean))
  const dimensions = [...new Set(MOTIVATION_ITEMS.map((i) => i.dimension))].map((d) => {
    const ms = motivation.filter((m) => MOTIVATION_ITEMS[m.item - 1]?.dimension === d).map((m) => m.mean)
    return { d, mean: mean(ms) }
  })

  const desc = (label: string, pre: number[], post: number[], gain: number[]) => (
    <tr>
      <td className="font-semibold">{label}</td>
      <td className="text-right">{pre.length}</td>
      <td className="text-right">{fmt(mean(pre))} ({fmt(sd(pre))})</td>
      <td className="text-right">{fmt(mean(post))} ({fmt(sd(post))})</td>
      <td className="text-right font-semibold">{fmt(mean(gain))} ({fmt(sd(gain))})</td>
    </tr>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Research results"
        description="Quasi-experimental pretest–posttest nonequivalent control group design. Scores are percentages; statistics computed at α = 0.05."
        icon={BarChart3}
      />

      <Card>
        <CardBody>
          <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label htmlFor="exp" className="mb-1.5 block text-sm font-semibold">Experimental group</label>
              <select id="exp" name="exp" defaultValue={expId} className="h-11 w-full rounded-xl border-2 border-indigo-100 bg-panel px-3">
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.subjects?.name}{c.group_type !== 'none' ? ` (${c.group_type})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ctrl" className="mb-1.5 block text-sm font-semibold">Control group</label>
              <select id="ctrl" name="ctrl" defaultValue={ctrlId} className="h-11 w-full rounded-xl border-2 border-indigo-100 bg-panel px-3">
                <option value="">— None —</option>
                {classes.filter((c) => c.id !== expId).map((c) => <option key={c.id} value={c.id}>{c.name} — {c.subjects?.name}{c.group_type !== 'none' ? ` (${c.group_type})` : ''}</option>)}
              </select>
            </div>
            <button type="submit" className={buttonClass('primary', 'md')}>Analyze</button>
          </form>
          {ctrl && ctrl.subject_id !== exp.subject_id && <Alert tone="warning" className="mt-3">The two classes cover different subjects, so their pre/posttests differ. Compare classes taking the same subject.</Alert>}
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Descriptive statistics — M (SD)</CardTitle></CardHeader>
          <CardBody className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Group</th><th className="text-right">n</th><th className="text-right">Pretest</th><th className="text-right">Posttest</th><th className="text-right">Gain</th></tr></thead>
              <tbody>
                {desc(`Experimental · ${exp.name}`, ePre, ePost, eGain)}
                {ctrl && desc(`Control · ${ctrl.name}`, cPre, cPost, cGain)}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-500">Only students with both a pretest and a posttest are included (paired cases).</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pretest vs posttest means</CardTitle></CardHeader>
          <CardBody>
            <PrePostChart data={[
              { group: 'Experimental', pretest: ePre.length ? mean(ePre) : null, posttest: ePost.length ? mean(ePost) : null },
              ...(ctrl ? [{ group: 'Control', pretest: cPre.length ? mean(cPre) : null, posttest: cPost.length ? mean(cPost) : null }] : []),
            ]} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Inferential statistics</CardTitle></CardHeader>
        <CardBody className="overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Test</th><th className="text-right">N</th><th className="text-right">Mean diff.</th><th className="text-right">t</th><th className="text-right">df</th><th className="text-right">p</th><th className="text-right">Cohen&apos;s d</th><th>Decision</th></tr></thead>
            <tbody>
              <TRow label="Baseline equivalence — pretest (independent t)" t={baseline} />
              <TRow label="Experimental: pre → post (paired t)" t={pairedE} />
              <TRow label="Control: pre → post (paired t)" t={pairedC} />
              <TRow label="Gain scores: experimental vs control (independent t)" t={gainTest} />
            </tbody>
          </table>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-indigo-50 p-4 text-sm">
              <p className="font-bold">Quest completion ↔ posttest (Pearson r, experimental)</p>
              {r ? <p className="mt-1">r = <strong>{fmt(r.r, 3)}</strong>, n = {r.n}, p = {fmtP(r.p)} — {correlationLabel(r.r)} {r.r >= 0 ? 'positive' : 'negative'} correlation</p> : <p className="mt-1 text-slate-600">Needs at least 3 paired cases with varied scores.</p>}
            </div>
            <div className="flex gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              <Info className="size-4 shrink-0 translate-y-0.5" aria-hidden="true" />
              <p>Baseline: a non-significant pretest difference supports group equivalence. Check normality (Shapiro–Wilk) in SPSS/JASP using the CSV export before reporting parametric results. Effect sizes: 0.20 small, 0.50 medium, 0.80 large.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`/instructor/classes/${expId}/export`} className={buttonClass('outline', 'sm')}><Download className="size-4" aria-hidden="true" /> Experimental CSV</a>
            {ctrl && <a href={`/instructor/classes/${ctrlId}/export`} className={buttonClass('outline', 'sm')}><Download className="size-4" aria-hidden="true" /> Control CSV</a>}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>System Usability Scale</CardTitle></CardHeader>
          <CardBody>
            {sus.length === 0 ? <p className="text-sm text-slate-600">No SUS responses from this class yet.</p> : (
              <>
                <div className="flex flex-wrap items-end gap-4">
                  <p className="font-display text-5xl font-bold text-indigo-700">{fmt(susMean, 1)}</p>
                  <div className="pb-1.5">
                    <p className="font-bold">{susInfo?.adjective} · Grade {susInfo?.grade}</p>
                    <p className="text-sm text-slate-600">SD {fmt(sd(sus), 1)} · n = {sus.length} · {susInfo?.acceptable ? 'Above the 68 benchmark (acceptable)' : 'Below the 68 benchmark'}</p>
                  </div>
                </div>
                <table className="table-base mt-4">
                  <thead><tr><th>#</th><th>Item</th><th className="text-right">Mean</th></tr></thead>
                  <tbody>
                    {((susItems ?? []) as { item: number; mean: number }[]).map((m) => (
                      <tr key={m.item}><td>{m.item}</td><td className="text-xs">{SUS_ITEMS[m.item - 1]}</td><td className="text-right font-semibold">{fmt(num(m.mean))}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-slate-500">Odd items are positive, even items negative; the overall score already accounts for this (Brooke, 1996).</p>
              </>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Motivation & engagement</CardTitle></CardHeader>
          <CardBody>
            {motivation.length === 0 ? <p className="text-sm text-slate-600">No motivation survey responses from this class yet.</p> : (
              <>
                <div className="flex flex-wrap items-end gap-4">
                  <p className="font-display text-5xl font-bold text-indigo-700">{fmt(motOverall)}</p>
                  <p className="pb-1.5 font-bold">{likertLabel(motOverall)} <span className="font-normal text-slate-600">· overall weighted mean</span></p>
                </div>
                <table className="table-base mt-4">
                  <thead><tr><th>Dimension</th><th className="text-right">WM</th><th>Interpretation</th></tr></thead>
                  <tbody>
                    {dimensions.map((d) => (
                      <tr key={d.d}><td className="font-semibold">{d.d}</td><td className="text-right">{fmt(d.mean)}</td><td>{Number.isFinite(d.mean) ? likertLabel(d.mean) : '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
                <details className="mt-3 text-sm">
                  <summary className="font-semibold text-indigo-700">Item-level means</summary>
                  <table className="table-base mt-2">
                    <tbody>
                      {motivation.map((m) => (
                        <tr key={m.item}><td>{m.item}</td><td className="text-xs">{MOTIVATION_ITEMS[m.item - 1]?.text}</td><td className="text-right">{fmt(m.mean)} ({fmt(m.sd)})</td></tr>
                      ))}
                    </tbody>
                  </table>
                </details>
                <p className="mt-2 text-xs text-slate-500">Scale: 4.21–5.00 Strongly Agree · 3.41–4.20 Agree · 2.61–3.40 Neutral · 1.81–2.60 Disagree · 1.00–1.80 Strongly Disagree</p>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
