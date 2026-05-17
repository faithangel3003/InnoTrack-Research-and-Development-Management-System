type SkeletonCardProps = {
  className?: string
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />
}