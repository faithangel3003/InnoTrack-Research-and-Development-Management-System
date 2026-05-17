type ReportCardProps = {
  title: string
  description: string
  icon: React.ReactNode
  iconBg: string
  children: React.ReactNode
}

export function ReportCard({ title, description, icon, iconBg, children }: ReportCardProps) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}>{icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}