import { createElement } from 'react'
import {
  Award, Binary, BookOpen, Code2, Compass, Crown, Database, Flame, Footprints, Gem, Globe,
  Medal, Network, Shield, Star, Swords, Target, Trophy, Zap, type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  network: Network, code: Code2, database: Database, globe: Globe, book: BookOpen,
  award: Award, binary: Binary, compass: Compass, crown: Crown, flame: Flame,
  footprints: Footprints, gem: Gem, medal: Medal, shield: Shield, star: Star,
  swords: Swords, target: Target, trophy: Trophy, zap: Zap,
}

export function getIcon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Award
}

export function DynamicIcon({ name, className, strokeWidth }: { name: string; className?: string; strokeWidth?: number }) {
  return createElement(getIcon(name), { className, strokeWidth, 'aria-hidden': true })
}
