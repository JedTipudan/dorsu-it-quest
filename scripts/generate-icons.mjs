// Generates the app logo + all PWA icon sizes. Usage: npm run icons
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pub = fileURLToPath(new URL('../public/icons/', import.meta.url))
const app = fileURLToPath(new URL('../src/app/', import.meta.url))
mkdirSync(pub, { recursive: true })

function star(cx, cy, outer, inner) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI / 180) * (-90 + i * 36)
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

// scale < 1 shrinks the artwork into the maskable safe zone
function logo({ rounded = true, scale = 1 } = {}) {
  const t = `translate(${256 - 256 * scale} ${256 - 256 * scale}) scale(${scale})`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366F1"/><stop offset="1" stop-color="#3730A3"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  <g transform="${t}">
    <path d="M256 84 L398 134 V250 C398 344 338 404 256 436 C174 404 114 344 114 250 V134 Z" fill="#ffffff" fill-opacity="0.13"/>
    <path d="M200 190 L140 256 L200 322" stroke="#fff" stroke-width="36" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M312 190 L372 256 L312 322" stroke="#fff" stroke-width="36" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <polygon points="${star(256, 262, 58, 25)}" fill="#F97316" stroke="#FDBA74" stroke-width="6" stroke-linejoin="round"/>
  </g>
</svg>`
}

const svg = logo()
writeFileSync(pub + 'logo.svg', svg)
writeFileSync(app + 'icon.svg', svg)

const square = Buffer.from(logo({ rounded: false }))
const maskable = Buffer.from(logo({ rounded: false, scale: 0.78 }))
const rounded = Buffer.from(svg)

await sharp(rounded).resize(192, 192).png().toFile(pub + 'icon-192.png')
await sharp(rounded).resize(512, 512).png().toFile(pub + 'icon-512.png')
await sharp(maskable).resize(512, 512).png().toFile(pub + 'maskable-512.png')
await sharp(maskable).resize(192, 192).png().toFile(pub + 'maskable-192.png')
await sharp(square).resize(180, 180).png().toFile(app + 'apple-icon.png')
await sharp(rounded).resize(96, 96).png().toFile(pub + 'shortcut-96.png')
console.log('icons generated')
