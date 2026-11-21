'use client'

import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

// Violet + lime: high-contrast pair on the dark arena background (distinct in hue and lightness).
const SERIES_1 = '#8268ff'
const SERIES_2 = '#c4ff3d'
const GRID = '#23275a'
const AXIS = '#959cc8'
const tick = { fill: AXIS, fontSize: 12 }

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: '1px solid #3a3f8a', background: '#0e1029', color: '#dde0f5', boxShadow: '0 12px 32px -14px rgb(0 0 0 / 0.8)', fontSize: 13 },
  labelStyle: { fontWeight: 700, color: '#ffffff' },
  cursor: { fill: 'rgb(130 104 255 / 0.12)' },
}

function Empty({ text }: { text: string }) {
  return <div className="grid h-64 place-items-center rounded-xl bg-indigo-50/50 text-sm text-slate-500">{text}</div>
}

/** Completion rate per quest (single series → no legend; the title names it). */
export function CompletionChart({ data }: { data: { name: string; completion: number; average: number | null }[] }) {
  if (!data.length) return <Empty text="No quests yet." />
  return (
    <div className="h-72 w-full" role="img" aria-label="Bar chart of completion rate per quest">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={{ stroke: GRID }} interval={0} tickFormatter={(v: string) => (v.length > 12 ? v.slice(0, 11) + '…' : v)} />
          <YAxis domain={[0, 100]} tick={tick} tickLine={false} axisLine={false} unit="%" />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'Completion rate']} />
          <Bar dataKey="completion" name="Completion rate" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Weekly average score (single series line, crosshair tooltip). */
export function TrendChart({ data }: { data: { week: string; average: number; attempts: number }[] }) {
  if (!data.length) return <Empty text="No activity in the last 12 weeks." />
  return (
    <div className="h-72 w-full" role="img" aria-label="Line chart of weekly average score">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="week" tick={tick} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis domain={[0, 100]} tick={tick} tickLine={false} axisLine={false} unit="%" />
          <Tooltip {...tooltipStyle} cursor={{ stroke: '#8268ff', strokeWidth: 1 }}
            formatter={(v, _n, p) => [`${v}% (${(p?.payload as { attempts: number })?.attempts ?? 0} attempts)`, 'Average score']} />
          <Line type="monotone" dataKey="average" stroke={SERIES_1} strokeWidth={2} dot={{ r: 4, fill: SERIES_1, stroke: '#0e1029', strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Pretest vs posttest means per group (two series → legend). */
export function PrePostChart({ data }: { data: { group: string; pretest: number | null; posttest: number | null }[] }) {
  if (!data.some((d) => d.pretest !== null || d.posttest !== null)) return <Empty text="No assessment data yet." />
  return (
    <div className="h-72 w-full" role="img" aria-label="Grouped bar chart of pretest and posttest mean scores by group">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="group" tick={tick} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis domain={[0, 100]} tick={tick} tickLine={false} axisLine={false} unit="%" />
          <Tooltip {...tooltipStyle} formatter={(v, n) => [v === null || v === undefined ? '—' : `${Number(v).toFixed(2)}%`, n]} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 13, color: '#c5cae9' }} />
          <Bar dataKey="pretest" name="Pretest mean" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={56} />
          <Bar dataKey="posttest" name="Posttest mean" fill={SERIES_2} radius={[4, 4, 0, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
