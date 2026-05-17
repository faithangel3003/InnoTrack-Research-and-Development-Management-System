import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  FlaskConical,
  FolderKanban,
  LayoutDashboard,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Users,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../../components/ui/BrandMark'

const featureCards = [
  {
    title: 'Project Tracking & Monitoring Services',
    description: 'Track research progress, milestone, and performance with real-time dashboards and reports.',
    icon: BarChart3,
    accent: 'from-sky-100 to-cyan-50',
    iconColor: 'text-sky-600',
  },
  {
    title: 'Product Development Lifecycle Management',
    description: 'Manage the entire lifecycle from idea generation, design, testing, to product deployment.',
    icon: FolderKanban,
    accent: 'from-emerald-100 to-lime-50',
    iconColor: 'text-emerald-600',
  },
  {
    title: 'Research Documentation & File Management',
    description: 'Store, organize, and access all research data and documents securely in one centralized hub.',
    icon: FileText,
    accent: 'from-violet-100 to-indigo-50',
    iconColor: 'text-violet-600',
  },
  {
    title: 'Collaboration & Communication',
    description: 'Enable seamless communication, knowledge sharing, and teamwork across departments.',
    icon: Users,
    accent: 'from-amber-100 to-orange-50',
    iconColor: 'text-amber-600',
  },
  {
    title: 'Innovation Analytics & Reporting',
    description: 'Gain insights with advanced analytics, custom reports, and data-driven decision making.',
    icon: Clock3,
    accent: 'from-cyan-100 to-teal-50',
    iconColor: 'text-cyan-600',
  },
]

const highlightCards = [
  {
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security to protect your valuable research data.',
    icon: ShieldCheck,
    iconColor: 'text-sky-600',
  },
  {
    title: 'Lightning Fast',
    description: 'Optimized performance for complex R&D workflows.',
    icon: Zap,
    iconColor: 'text-blue-500',
  },
  {
    title: 'Actionable Insights',
    description: 'Make smarter decisions with real-time analytics and reporting.',
    icon: BarChart3,
    iconColor: 'text-emerald-600',
  },
]

const pricingPlans = [
  {
    name: 'Starter',
    description: 'For small R&D teams getting started',
    price: '₱999',
    features: ['Up to 35 users', 'Up to 10 projects', 'Core R&D modules', 'Full collaboration features'],
    featured: false,
  },
  {
    name: 'Professional',
    description: 'For growing teams that need more',
    price: '₱2,499',
    features: ['Up to 75 users', 'Up to 500 projects', 'All R&D modules', 'Advanced collaboration'],
    featured: true,
  },
  {
    name: 'Enterprise',
    description: 'For large organizations at scale',
    price: '₱4,999',
    features: ['Unlimited users', 'Unlimited projects', 'All R&D modules', 'Priority support'],
    featured: false,
  },
]

const statItems = [
  { label: 'R&D Teams', value: '2,500+', icon: Users },
  { label: 'Uptime', value: '99.9%', icon: ShieldCheck },
  { label: 'Rating', value: '4.9', icon: Star },
]

const dashboardMenu = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Projects', icon: FolderKanban },
  { label: 'Tasks', icon: CheckCircle2 },
  { label: 'Research', icon: Search },
  { label: 'Documents', icon: FileText },
  { label: 'Team', icon: Users },
  { label: 'Reports', icon: BarChart3 },
]

const dashboardMetrics = [
  { label: 'Active Research', value: '24', delta: '+12%', tone: 'text-emerald-500' },
  { label: 'Tasks Done', value: '156', delta: '+18%', tone: 'text-emerald-500' },
  { label: 'Researchers', value: '38', delta: '+8%', tone: 'text-emerald-500' },
  { label: 'Efficiency', value: '99.9%', delta: '+2.4%', tone: 'text-emerald-500' },
]

const chartHeights = [32, 18, 24, 34, 26, 54, 30, 28, 46, 24, 58]

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f8fc] text-slate-900">
      <div className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(circle_at_top_left,_rgba(80,161,255,0.16),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(36,211,167,0.10),_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#f4f8fc_65%,_#f4f8fc_100%)]" />
        <div className="absolute left-[-120px] top-[140px] -z-10 h-72 w-72 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="absolute right-[-120px] top-[220px] -z-10 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />

        <div className="mx-auto max-w-[1220px] px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pb-24">
          <header className="rounded-[28px] border border-white/70 bg-white/90 px-5 py-3 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur md:px-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <BrandMark
                badgeClassName="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/25"
                fallbackClassName="text-xs text-white"
                titleClassName="text-lg font-extrabold tracking-tight text-slate-800"
              />

              <nav className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-slate-700 md:gap-6">
                <a className="transition hover:text-sky-600" href="#top">Home</a>
                <a className="transition hover:text-sky-600" href="#features">R&D Features</a>
                <a className="transition hover:text-sky-600" href="#pricing">Pricing</a>
                <a className="transition hover:text-sky-600" href="#contact">Contact</a>
              </nav>

              <div className="flex items-center gap-3 self-center lg:self-auto">
                <Link className="text-sm font-semibold text-slate-700 transition hover:text-sky-600" to="/login">
                  Log In
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:translate-y-[-1px]"
                  to="/signup"
                >
                  Sign Up
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </header>

          <main id="top" className="pt-8 lg:pt-10">
            <section className="grid gap-10 md:grid-cols-[0.92fr_1.08fr] md:items-start lg:items-center">
              <div className="max-w-xl pt-4 lg:pt-0">
                <h1 className="text-[2.7rem] font-black leading-[0.98] tracking-[-0.04em] text-slate-900 sm:text-[3.5rem] lg:text-[4.2rem]">
                  <span className="block">Innovate.</span>
                  <span className="block text-sky-500">Track.</span>
                  <span className="block text-emerald-400">Collaborate.</span>
                </h1>

                <p className="mt-6 max-w-lg text-[15px] leading-7 text-slate-600 sm:text-base">
                  A Research & Development ERP that helps teams manage innovation, streamline product development,
                  and collaborate in real time using InnoTrack.
                </p>

                <div className="mt-5 space-y-3 text-sm text-slate-700">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <p>From idea generation to product launch, gain full visibility and control over your R&D lifecycle.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <p>Centralize teams, research records, product milestones, and analytics in one secure workspace.</p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-700 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(14,116,218,0.24)] transition hover:translate-y-[-1px]"
                    to="/signup"
                  >
                    Start Innovating
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
                    href="#features"
                  >
                    Explore Features
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>

                <div className="mt-10 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
                  {statItems.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-lg font-extrabold tracking-tight text-slate-900">{value}</div>
                        <div className="text-xs font-medium text-slate-500">{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative lg:pl-2">
                <div className="absolute -left-8 top-10 h-36 w-36 rounded-full bg-sky-200/30 blur-3xl" />
                <div className="absolute -right-2 bottom-6 h-28 w-28 rounded-full bg-emerald-200/35 blur-3xl" />

                <div className="relative rounded-[30px] border border-white/80 bg-white/90 p-4 shadow-[0_32px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-5">
                  <div className="rounded-[26px] border border-slate-100 bg-[#f8fbff] p-4 shadow-inner shadow-sky-50/70 sm:p-5">
                    <div className="mb-4 flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                      </div>
                      <div className="text-xs font-bold text-slate-500">R&amp;D Dashboard</div>
                      <div className="h-2.5 w-8 rounded-full bg-slate-100" />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
                      <aside className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-sky-50 px-3 py-2 text-slate-700">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white">
                            <FlaskConical className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-500">Workspace</div>
                            <div className="text-sm font-bold">Innovation Lab</div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          {dashboardMenu.map(({ label, icon: Icon, active }) => (
                            <div
                              key={label}
                              className={[
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                                active ? 'bg-sky-50 text-sky-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                              ].join(' ')}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{label}</span>
                            </div>
                          ))}
                        </div>
                      </aside>

                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {dashboardMetrics.map(({ label, value, delta, tone }) => (
                            <div key={label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div>
                              <div className="mt-2 text-[1.75rem] font-black leading-none tracking-tight text-slate-900">{value}</div>
                              <div className={`mt-2 text-xs font-semibold ${tone}`}>{delta} vs last month</div>
                            </div>
                          ))}
                        </div>

                        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
                          <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-bold text-slate-900">Research Progress</div>
                                <div className="text-xs text-slate-400">Monthly tracking</div>
                              </div>
                              <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Jun 71%</div>
                            </div>
                            <div className="mt-6 flex h-[160px] items-end justify-between gap-2 rounded-2xl bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] px-2 pb-3 pt-4">
                              {chartHeights.map((height, index) => (
                                <div key={`${height}-${index}`} className="flex flex-1 flex-col items-center justify-end gap-2">
                                  <div
                                    className={[
                                      'w-full rounded-full bg-slate-200/90',
                                      index === 5 ? 'bg-gradient-to-t from-emerald-400 to-lime-300 shadow-lg shadow-emerald-300/30' : 'bg-gradient-to-t from-sky-200 to-slate-100',
                                    ].join(' ')}
                                    style={{ height: `${height * 2.1}px` }}
                                  />
                                  <span className="text-[10px] font-medium text-slate-400">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Dec'][index]}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm">
                              <div className="text-sm font-bold text-slate-900">Recent Activity</div>
                              <div className="mt-4 space-y-3">
                                {[
                                  'Prototype testing completed just now',
                                  'Research paper uploaded 2 hrs ago',
                                  'Task “Data Analysis” completed 4 hrs ago',
                                ].map((entry) => (
                                  <div key={entry} className="rounded-2xl bg-slate-50 px-3 py-2.5 text-xs font-medium leading-5 text-slate-600">
                                    {entry}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="ml-auto flex max-w-[255px] items-center gap-3 rounded-[22px] border border-white/80 bg-white px-4 py-3 shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                <CheckCircle2 className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900">Research milestone achieved</div>
                                <div className="text-xs text-slate-500">Prototype testing completed</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="features" className="pt-20">
              <div className="text-center">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-sky-500">R&amp;D Features</div>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-900 sm:text-[2.35rem]">
                  Powerful tools for every stage of innovation
                </h2>
              </div>

              <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                {featureCards.map(({ title, description, icon: Icon, accent, iconColor }) => (
                  <article
                    key={title}
                    className="group rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)]"
                  >
                    <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accent}`}>
                      <Icon className={`h-6 w-6 ${iconColor}`} />
                    </div>
                    <h3 className="mt-5 text-[1.02rem] font-extrabold leading-6 text-slate-900">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
                  </article>
                ))}
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-3">
                {highlightCards.map(({ title, description, icon: Icon, iconColor }) => (
                  <div key={title} className="flex items-start gap-4 rounded-[24px] border border-white/80 bg-white/85 px-5 py-4 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                      <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>
                    <div>
                      <div className="text-base font-extrabold text-slate-900">{title}</div>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="pricing" className="pt-20">
              <div className="text-center">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-sky-500">Pricing</div>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-900 sm:text-[2.35rem]">
                  Simple pricing, powerful results
                </h2>
              </div>

              <div className="mt-10 grid gap-6 lg:grid-cols-3">
                {pricingPlans.map(({ name, description, price, features, featured }) => (
                  <article
                    key={name}
                    className={[
                      'relative rounded-[28px] border bg-white px-6 pb-6 pt-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]',
                      featured ? 'border-sky-300 shadow-[0_24px_60px_rgba(14,116,218,0.16)] ring-1 ring-sky-200' : 'border-white/80',
                    ].join(' ')}
                  >
                    {featured ? (
                      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-600 px-4 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white">
                        Popular
                      </div>
                    ) : null}

                    <div className="text-2xl font-extrabold tracking-tight text-slate-900">{name}</div>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>

                    <div className="mt-5 flex items-end gap-2">
                      <div className="text-[2.2rem] font-black leading-none tracking-tight text-slate-900">{price}</div>
                      <div className="pb-1 text-sm text-slate-500">/ month</div>
                    </div>

                    <div className="mt-6 space-y-3">
                      {features.map((feature) => (
                        <div key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Link
                      className={[
                        'mt-8 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition',
                        featured
                          ? 'bg-gradient-to-r from-sky-700 to-cyan-500 text-white shadow-lg shadow-sky-500/20 hover:translate-y-[-1px]'
                          : 'border border-sky-200 bg-white text-sky-700 hover:bg-sky-50',
                      ].join(' ')}
                      to="/signup"
                    >
                      Subscribe Now
                    </Link>
                  </article>
                ))}
              </div>
            </section>

            <section id="contact" className="pt-20">
              <div className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,_#14395d_0%,_#0f2f4b_45%,_#0a2340_100%)] px-6 py-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:px-8 lg:px-10">
                <div className="grid gap-8 lg:grid-cols-[1.2fr_0.9fr_auto] lg:items-center">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                      <FlaskConical className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[1.7rem] font-black tracking-[-0.03em]">Ready to accelerate innovation?</div>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">
                        Start managing your research and development projects with clarity, collaboration, and control using InnoTrack.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-cyan-200" />
                      <span>support@innotrack.com</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-cyan-200" />
                      <span>+63 912 345 6789</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-cyan-200" />
                      <span>Davao City, Philippines</span>
                    </div>
                  </div>

                  <div>
                    <Link
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:translate-y-[-1px]"
                      to="/signup"
                    >
                      Start Now
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}