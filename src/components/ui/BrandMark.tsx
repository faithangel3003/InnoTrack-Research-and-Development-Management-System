import { useState } from 'react'
import { classNames } from '../../utils/classNames'

type BrandMarkProps = {
  title?: string
  subtitle?: string
  initials?: string
  logoPath?: string
  showText?: boolean
  badgeClassName?: string
  imageClassName?: string
  titleClassName?: string
  subtitleClassName?: string
  fallbackClassName?: string
  className?: string
}

const defaultLogoPath = '/branding/logo.png'

export function BrandMark({
  title = 'InnoTrack',
  subtitle,
  initials = 'IT',
  logoPath = defaultLogoPath,
  showText = true,
  badgeClassName,
  imageClassName,
  titleClassName,
  subtitleClassName,
  fallbackClassName,
  className,
}: BrandMarkProps) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <div className={classNames('flex items-center gap-3 overflow-hidden', className)}>
      <div className={classNames('flex shrink-0 items-center justify-center overflow-hidden', badgeClassName)}>
        {imageFailed ? (
          <span className={classNames('font-bold uppercase tracking-[0.2em]', fallbackClassName)}>{initials}</span>
        ) : (
          <img
            src={logoPath}
            alt={`${title} logo`}
            className={classNames('h-full w-full object-contain p-1', imageClassName)}
            onError={() => setImageFailed(true)}
          />
        )}
      </div>

      {showText ? (
        <div className="min-w-0">
          <p className={classNames('truncate text-lg font-semibold text-slate-900', titleClassName)}>{title}</p>
          {subtitle ? <p className={classNames('truncate text-xs text-slate-400', subtitleClassName)}>{subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  )
}