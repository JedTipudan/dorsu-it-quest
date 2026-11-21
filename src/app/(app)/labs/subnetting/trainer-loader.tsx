'use client'

import dynamic from 'next/dynamic'

// Random problems are generated in the browser, so skip server rendering.
export const SubnetTrainer = dynamic(() => import('./subnet-trainer'), {
  ssr: false,
  loading: () => <div className="card h-96 animate-pulse" aria-busy="true" aria-label="Loading trainer" />,
})
