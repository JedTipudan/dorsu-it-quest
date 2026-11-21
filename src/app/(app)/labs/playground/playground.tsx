'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { CheckCircle2, Circle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/misc'
import { cn } from '@/lib/utils'

type Tab = 'html' | 'css' | 'js'
interface Code { html: string; css: string; js: string }

const STARTER: Code = {
  html: `<main class="card">
  <h1>Hello, Quester!</h1>
  <p>Edit the code to complete the tasks.</p>
</main>`,
  css: `body {
  font-family: system-ui, sans-serif;
  background: #eef2ff;
  padding: 24px;
}
.card {
  background: white;
  padding: 24px;
  border-radius: 16px;
}`,
  js: `// JavaScript runs inside the preview
console.log('Ready!')`,
}

const TASKS: { id: string; text: string; check: (doc: Document, c: Code) => boolean }[] = [
  { id: 'h1', text: 'Change the <h1> so it contains the word "DOrSU".', check: (d) => /dorsu/i.test(d.querySelector('h1')?.textContent ?? '') },
  { id: 'ul', text: 'Add an unordered list (<ul>) with at least 3 items.', check: (d) => d.querySelectorAll('ul > li').length >= 3 },
  { id: 'link', text: 'Add a link (<a>) that points to https://dorsu.edu.ph', check: (d) => Boolean(d.querySelector('a[href*="dorsu.edu.ph"]')) },
  { id: 'img', text: 'Add an <img> with meaningful alt text (accessibility!).', check: (d) => [...d.querySelectorAll('img')].some((i) => (i.getAttribute('alt') ?? '').trim().length > 2) },
  { id: 'color', text: 'In CSS, give the h1 a color.', check: (_, c) => /h1[^{]*\{[^}]*(?<![-\w])color\s*:/i.test(c.css) },
  { id: 'flex', text: 'Use Flexbox (display: flex) somewhere in your CSS.', check: (_, c) => /display\s*:\s*(inline-)?flex/i.test(c.css) },
  { id: 'button', text: 'Add a <button> and make it do something on click with JavaScript.', check: (d, c) => Boolean(d.querySelector('button')) && /addEventListener\(\s*['"]click['"]|onclick/i.test(c.js + c.html) },
]

const STORAGE_KEY = 'itq-playground-v1'

function load(): Code {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...STARTER, ...JSON.parse(raw) }
  } catch {
    /* storage unavailable */
  }
  return STARTER
}

function save(code: Code) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(code))
  } catch {
    /* storage unavailable */
  }
}

export default function Playground() {
  const [code, setCode] = useState<Code>(load)
  const [tab, setTab] = useState<Tab>('html')
  const deferred = useDeferredValue(code)

  const srcDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${deferred.css}</style></head><body>${deferred.html}<script>${deferred.js.replace(/<\/script/gi, '<\\/script')}<\/script></body></html>`,
    [deferred],
  )

  const done = useMemo(() => {
    const doc = new DOMParser().parseFromString(deferred.html, 'text/html')
    return new Set(TASKS.filter((t) => { try { return t.check(doc, deferred) } catch { return false } }).map((t) => t.id))
  }, [deferred])

  const update = (key: Tab, value: string) => {
    const next = { ...code, [key]: value }
    setCode(next)
    save(next)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card flex min-h-[26rem] flex-col overflow-hidden" aria-label="Code editor">
          <div className="flex items-center justify-between border-b border-indigo-100 px-2">
            <div role="tablist" aria-label="Language" className="flex">
              {(['html', 'css', 'js'] as Tab[]).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                  className={cn('h-12 px-4 font-mono text-sm font-bold uppercase transition', tab === t ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-indigo-700')}>
                  {t}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setCode(STARTER); save(STARTER) }} aria-label="Reset code">
              <RotateCcw className="size-4" aria-hidden="true" /> Reset
            </Button>
          </div>
          <label htmlFor="editor" className="sr-only">{tab.toUpperCase()} code</label>
          <textarea
            id="editor"
            value={code[tab]}
            onChange={(e) => update(tab, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault()
                const el = e.currentTarget
                const { selectionStart: s, selectionEnd: en } = el
                const v = el.value.slice(0, s) + '  ' + el.value.slice(en)
                update(tab, v)
                requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2))
              }
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="min-h-80 flex-1 resize-none bg-[#05061a] p-4 font-mono text-sm leading-relaxed text-[#d9f99d] focus:outline-none"
          />
        </section>
        <section className="card flex min-h-[26rem] flex-col overflow-hidden" aria-label="Live preview">
          <div className="flex h-12 items-center gap-1.5 border-b border-indigo-100 px-4">
            <span className="size-3 rounded-full bg-red-400" /><span className="size-3 rounded-full bg-amber-400" /><span className="size-3 rounded-full bg-emerald-400" />
            <span className="ml-2 text-sm font-semibold text-slate-500">Preview</span>
          </div>
          <iframe title="Live preview" srcDoc={srcDoc} sandbox="allow-scripts allow-modals" className="w-full flex-1 bg-panel" />
        </section>
      </div>

      <aside className="card h-fit p-5">
        <h2 className="text-lg font-bold">Mini-tasks</h2>
        <p className="text-sm text-slate-600">{done.size} of {TASKS.length} complete</p>
        <Progress value={(done.size / TASKS.length) * 100} className="mt-2" label="Tasks complete" />
        <ul className="mt-4 space-y-2.5">
          {TASKS.map((t) => (
            <li key={t.id} className="flex gap-2.5 text-sm">
              {done.has(t.id) ? <CheckCircle2 className="size-5 shrink-0 text-emerald-500" aria-label="Done" /> : <Circle className="size-5 shrink-0 text-slate-300" aria-label="Not done" />}
              <span className={done.has(t.id) ? 'text-slate-500 line-through' : ''}>{t.text}</span>
            </li>
          ))}
        </ul>
        {done.size === TASKS.length && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 animate-pop">All tasks complete — nice work, web weaver!</p>}
      </aside>
    </div>
  )
}
