import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

// The only third parties the browser may talk to: our Supabase project, Google Sign-In and
// Cloudflare Turnstile (CAPTCHA). Everything else is blocked by the Content Security Policy.
const supabase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin
  } catch {
    return 'https://*.supabase.co'
  }
})()
const supabaseWs = supabase.replace(/^https:/, 'wss:')
const GOOGLE = 'https://accounts.google.com'
const TURNSTILE = 'https://challenges.cloudflare.com'

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is needed for Next.js' inline bootstrapping scripts; external scripts are still allow-listed.
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} ${GOOGLE}/gsi/client ${TURNSTILE}`,
  `style-src 'self' 'unsafe-inline' ${GOOGLE}/gsi/style`,
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabaseWs} ${GOOGLE}/gsi/ ${TURNSTILE} ${isDev ? 'ws: http://localhost:*' : ''}`,
  `frame-src ${GOOGLE}/gsi/ ${TURNSTILE}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  // the Google fallback sign-in posts to our server, which redirects to Supabase, then Google
  `form-action 'self' ${supabase} ${GOOGLE}`,
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].map((d) => d.replace(/\s+/g, ' ').trim()).join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Google's sign-in popup must be able to talk back to this page
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()' },
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
