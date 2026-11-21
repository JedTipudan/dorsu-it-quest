'use client'

import dynamic from 'next/dynamic'

// Reads saved code from localStorage, so render in the browser only.
export const Playground = dynamic(() => import('./playground'), {
  ssr: false,
  loading: () => <div className="card h-[32rem] animate-pulse" aria-busy="true" aria-label="Loading playground" />,
})
