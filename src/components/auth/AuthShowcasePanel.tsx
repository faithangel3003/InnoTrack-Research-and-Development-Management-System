import { ArrowLeft, LayoutDashboard, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { authGradientOverlayClass, authGradientPanelClass } from './authTheme'

export type AuthShowcaseHighlight = {
  title: string
  description: string
  icon: LucideIcon
}

type AuthShowcasePanelProps = {
  badge: string
  title: string
  description: string
  highlights: AuthShowcaseHighlight[]
  footer: ReactNode
  backTo?: string
  backLabel?: string
  brandSubtitle?: string
}

export function AuthShowcasePanel({
  badge,
  title,
  description,
  highlights,
  footer,
  backTo = '/',
  backLabel = 'Back to Home',
  brandSubtitle = 'Research and Development Management',
}: AuthShowcasePanelProps) {
  return (
    <aside className={`relative overflow-hidden px-6 py-8 text-white sm:px-10 lg:px-16 lg:py-10 ${authGradientPanelClass}`}>
      <div className={`absolute inset-0 ${authGradientOverlayClass}`} />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-4">
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </div>

        <div className="mt-10 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-lg shadow-sky-950/20 ring-1 ring-white/10">
            <LayoutDashboard className="h-7 w-7 text-sky-100" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight">InnoTrack</div>
            <div className="text-sm text-sky-100/80">{brandSubtitle}</div>
          </div>
        </div>

        <div className="mt-16 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100/20 bg-sky-200/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.28em] text-sky-100">
            {badge}
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-slate-100/82">
            {description}
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {highlights.map(({ title: itemTitle, description: itemDescription, icon: Icon }) => (
            <div key={itemTitle} className="rounded-[24px] border border-white/10 bg-white/8 px-5 py-4 shadow-[0_16px_36px_rgba(3,22,32,0.16)] backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-200/12 text-sky-100 ring-1 ring-sky-100/10">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-bold tracking-tight">{itemTitle}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-200/80">{itemDescription}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-10 text-sm text-slate-200/75">
          {footer}
        </div>
      </div>
    </aside>
  )
}