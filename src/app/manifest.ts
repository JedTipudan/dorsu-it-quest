import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'DOrSU IT Quest',
    short_name: 'IT Quest',
    description:
      'A gamified learning platform for DOrSU BSIT students — quests, challenges, badges and leaderboards for Networking, Programming, Database Management and Web Development.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#070818',
    theme_color: '#070818',
    lang: 'en-PH',
    dir: 'ltr',
    categories: ['education', 'games', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Daily Challenge', short_name: 'Challenge', url: '/challenge', icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96' }] },
      { name: 'Subjects', short_name: 'Subjects', url: '/subjects', icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96' }] },
      { name: 'Leaderboard', short_name: 'Leaderboard', url: '/leaderboard', icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96' }] },
    ],
  }
}
