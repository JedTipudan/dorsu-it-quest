import type { Metadata, Viewport } from 'next'
import { Chakra_Petch, Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import { ScrollReveal } from '@/components/fx/scroll-reveal'
import { OfflineBanner, ServiceWorkerRegister } from '@/components/pwa/pwa'
import { MOTION_BOOT_SCRIPT } from '@/lib/motion'
import { SITE_URL } from '@/lib/env'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })
const chakra = Chakra_Petch({ subsets: ['latin'], variable: '--font-chakra', weight: ['500', '600', '700'], display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL || 'http://localhost:3000'),
  // Google Search Console ownership proof (needed for Google OAuth brand verification).
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
  title: { default: 'DOrSU IT Quest — Gamified Learning for BSIT', template: '%s · DOrSU IT Quest' },
  description:
    'Level up in Networking, Programming, Database Management and Web Development with quests, simulations, badges and leaderboards. Built for BSIT students of Davao Oriental State University.',
  applicationName: 'DOrSU IT Quest',
  keywords: ['DOrSU', 'BSIT', 'gamification', 'e-learning', 'networking', 'programming', 'database', 'web development'],
  appleWebApp: { capable: true, title: 'IT Quest', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    title: 'DOrSU IT Quest',
    description: 'A gamified learning platform for DOrSU BSIT students.',
    images: ['/icons/icon-512.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#070818',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${chakra.variable}`} suppressHydrationWarning>
      <head>
        {/* Sets data-fx (effects level) before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT_SCRIPT }} />
      </head>
      <body className="font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-lime focus:px-4 focus:py-2 focus:font-bold focus:text-lime-ink">
          Skip to content
        </a>
        <OfflineBanner />
        {children}
        <Toaster theme="dark" position="top-center" richColors closeButton toastOptions={{ className: 'font-sans' }} />
        <ServiceWorkerRegister />
        <ScrollReveal />
      </body>
    </html>
  )
}
