import Link from 'next/link';
import {
  ShieldCheck,
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  CalendarDays,
  Building2,
  CircleAlert,
  Clock3,
  LockKeyhole,
  ClipboardList,
  CheckCircle2,
  Activity,
  ShieldAlert,
  TrendingUp,
  ChartNoAxesCombined,
  ListChecks,
  ArrowUpRight,
  Layers3,
} from 'lucide-react';

const features = [
  {
    icon: ClipboardCheck,
    number: '01',
    title: 'Track compliance',
    description:
      'Keep obligations, requirements, owners, and progress organized in one central register.',
    points: ['Compliance register', 'Status tracking', 'Clear ownership'],
  },
  {
    icon: Building2,
    number: '02',
    title: 'Manage vendors and risk',
    description:
      'Organize vendor information and assessments so important risks are easier to identify and review.',
    points: ['Vendor records', 'Risk assessments', 'Review tracking'],
  },
  {
    icon: FileText,
    number: '03',
    title: 'Keep evidence organized',
    description:
      'Bring supporting documents and compliance records together so they are easier to find.',
    points: ['Evidence management', 'Supporting records', 'Reporting'],
  },
  {
    icon: CalendarDays,
    number: '04',
    title: 'Stay ahead of deadlines',
    description:
      'Keep licenses, permits, contracts, certifications, and upcoming reviews on your radar.',
    points: ['Renewal tracking', 'Upcoming deadlines', 'Reminders'],
  },
];

const navigation = [
  { label: 'Overview', icon: ClipboardList },
  { label: 'Compliance register', icon: ListChecks },
  { label: 'Vendor risk', icon: ShieldAlert },
  { label: 'Evidence', icon: FileText },
  { label: 'Renewals', icon: CalendarDays },
];

function ComplianceDonut() {
  return (
    <div className="relative h-[118px] w-[118px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r="43" fill="none" stroke="#29362f" strokeWidth="13" />
        <circle
          cx="60" cy="60" r="43" fill="none" stroke="#55bd86"
          strokeWidth="13" strokeDasharray="135 270" strokeLinecap="round"
        />
        <circle
          cx="60" cy="60" r="43" fill="none" stroke="#d6b36b"
          strokeWidth="13" strokeDasharray="63 270" strokeDashoffset="-141"
          strokeLinecap="round"
        />
        <circle
          cx="60" cy="60" r="43" fill="none" stroke="#de7975"
          strokeWidth="13" strokeDasharray="27 270" strokeDashoffset="-211"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[24px] font-semibold tracking-tight text-white">72%</span>
        <span className="mt-0.5 text-[9px] text-[#91a196]">Illustrative</span>
      </div>
    </div>
  );
}

function ComplianceTrend() {
  const points = '0,79 22,68 44,73 66,49 88,55 110,35 132,43 154,22 176,29 198,12';

  return (
    <svg viewBox="0 0 210 105" className="w-full" role="img" aria-label="Illustrative compliance progress trend">
      {[20, 42, 64, 86].map((y) => (
        <line key={y} x1="4" y1={y} x2="206" y2={y} stroke="#29362f" strokeWidth="1" strokeDasharray="3 4" />
      ))}
      <polygon points={`0,98 ${points} 198,98`} fill="url(#trendFill)" />
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#55bd86" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#55bd86" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke="#69cf99"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="198" cy="12" r="4" fill="#69cf99" stroke="#15221a" strokeWidth="2" />
    </svg>
  );
}

function VendorRiskBars() {
  const rows = [
    { label: 'Low', value: 72, count: '12', color: '#55bd86' },
    { label: 'Medium', value: 48, count: '8', color: '#d6b36b' },
    { label: 'High', value: 24, count: '4', color: '#de7975' },
  ];

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1.5 flex items-center justify-between text-[10px]">
            <span className="text-[#b5c1b8]">{row.label} risk</span>
            <span className="text-[#e3eae4]">{row.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#29362f]">
            <div
              className="h-full rounded-full"
              style={{ width: `${row.value}%`, backgroundColor: row.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[720px] lg:ml-auto">
      <div className="pointer-events-none absolute -inset-6 rounded-[32px] bg-[#b8d9c3]/45 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-[#29362f] bg-[#111a15] p-1.5 shadow-[0_30px_90px_-28px_rgba(19,49,31,0.4)] sm:rounded-[20px] sm:p-2">
        <div className="flex h-10 items-center justify-between px-2 sm:px-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#e17f75]" />
            <span className="h-2 w-2 rounded-full bg-[#d8b66b]" />
            <span className="h-2 w-2 rounded-full bg-[#65ad86]" />
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-1.5 sm:px-3">
            <LockKeyhole className="h-2.5 w-2.5 text-[#819287]" />
            <span className="text-[9px] text-[#a0afa4] sm:text-[10px]">
              ComplianceTracker
            </span>
          </div>
          <span className="w-8" />
        </div>

        <div className="grid grid-cols-[42px_minmax(0,1fr)] overflow-hidden rounded-xl border border-white/[0.07] sm:grid-cols-[138px_minmax(0,1fr)]">
          <aside className="border-r border-white/[0.07] bg-[#121b16] px-1.5 py-3 sm:px-2.5 sm:py-4">
            <div className="mb-5 flex items-center justify-center gap-2 sm:justify-start sm:px-1">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#176c4c] text-white">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="hidden text-[10px] font-semibold text-white sm:block">
                ComplianceTracker
              </span>
            </div>

            <p className="mb-2 hidden px-2 text-[8px] font-bold tracking-[0.15em] text-[#738278] sm:block">
              WORKSPACE
            </p>

            <div className="space-y-1">
              {navigation.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    title={item.label}
                    className={`flex items-center justify-center gap-2 rounded-md px-1.5 py-2.5 sm:justify-start sm:px-2 ${
                      index === 0
                        ? 'bg-[#1b3b2a] text-[#8bd1a5]'
                        : 'text-[#87968b]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden truncate text-[9px] font-medium sm:block">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 hidden border-t border-white/[0.07] pt-4 sm:block">
              <p className="px-2 text-[8px] font-bold tracking-[0.13em] text-[#738278]">
                YOUR RECORDS
              </p>
              <div className="mt-3 space-y-3 px-2 text-[9px] text-[#87968b]">
                <div className="flex items-center gap-2">
                  <Layers3 className="h-3.5 w-3.5" />
                  Registers
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Renewals
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 bg-[#0f1712] p-2.5 sm:p-4 lg:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[8px] font-semibold tracking-[0.13em] text-[#7f9384] sm:text-[9px]">
                  WORKSPACE OVERVIEW
                </p>
                <h2 className="mt-1.5 text-[15px] font-semibold tracking-tight text-white sm:text-[21px]">
                  Compliance overview
                </h2>
                <p className="mt-1 text-[9px] text-[#89998d] sm:text-[11px]">
                  A clearer view of your compliance activities
                </p>
              </div>
              <span className="hidden items-center gap-1.5 rounded-md border border-white/[0.08] px-2 py-1.5 text-[9px] text-[#a7b4aa] sm:flex">
                <Activity className="h-3 w-3" />
                Sample overview
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-1.5 sm:mt-5 sm:gap-2.5">
              {[
                { label: 'Obligations', value: '—', icon: ClipboardCheck, tone: 'text-[#70c995]' },
                { label: 'Need attention', value: '—', icon: CircleAlert, tone: 'text-[#dfb96b]' },
                { label: 'Vendors', value: '—', icon: Building2, tone: 'text-[#80c7e1]' },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="min-w-0 rounded-lg border border-white/[0.08] bg-[#17221b] p-2 sm:p-3">
                    <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${metric.tone}`} />
                    <p className="mt-2 truncate text-[8px] text-[#9ba99e] sm:text-[10px]">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-[18px] font-semibold leading-none text-white sm:text-[23px]">
                      {metric.value}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
              <div className="rounded-lg border border-white/[0.08] bg-[#151f19] p-2.5 sm:p-3">
                <div className="flex items-center justify-between gap-1">
                  <div>
                    <h3 className="text-[10px] font-semibold text-[#e7eee8] sm:text-[11px]">
                      Compliance status
                    </h3>
                    <p className="mt-1 text-[8px] text-[#819287] sm:text-[9px]">
                      Illustrative breakdown
                    </p>
                  </div>
                  <span className="rounded border border-white/[0.07] px-1.5 py-1 text-[8px] text-[#91a196]">
                    Status
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-around gap-2">
                  <ComplianceDonut />
                  <div className="space-y-2.5">
                    {[
                      { label: 'On track', color: '#55bd86' },
                      { label: 'In progress', color: '#d6b36b' },
                      { label: 'Overdue', color: '#de7975' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-[9px] text-[#b1beb4]">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-[#151f19] p-2.5 sm:p-3">
                <div className="flex items-center justify-between gap-1">
                  <div>
                    <h3 className="text-[10px] font-semibold text-[#e7eee8] sm:text-[11px]">
                      Progress over time
                    </h3>
                    <p className="mt-1 text-[8px] text-[#819287] sm:text-[9px]">
                      Illustrative trend
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-[#6bca94]" />
                </div>
                <div className="mt-4">
                  <ComplianceTrend />
                </div>
                <div className="mt-1 flex justify-between text-[8px] text-[#809085]">
                  <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span>
                </div>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
              <div className="rounded-lg border border-white/[0.08] bg-[#151f19] p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-semibold text-[#e7eee8] sm:text-[11px]">
                    Vendor risk
                  </h3>
                  <ShieldAlert className="h-3.5 w-3.5 text-[#9ab6a1]" />
                </div>
                <p className="mt-1 text-[8px] text-[#819287]">Illustrative assessment mix</p>
                <div className="mt-4">
                  <VendorRiskBars />
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-[#151f19] p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-semibold text-[#e7eee8] sm:text-[11px]">
                    Upcoming deadlines
                  </h3>
                  <CalendarDays className="h-3.5 w-3.5 text-[#9ab6a1]" />
                </div>
                <p className="mt-1 text-[8px] text-[#819287]">Example items to monitor</p>

                <div className="mt-3 space-y-3">
                  {[
                    { title: 'License renewal', subtitle: 'Renewal date', badge: 'Upcoming', tone: 'text-[#dfc17d] bg-[#41351f]' },
                    { title: 'Vendor review', subtitle: 'Assessment follow-up', badge: 'Review', tone: 'text-[#91c7dc] bg-[#203540]' },
                    { title: 'Evidence review', subtitle: 'Supporting records', badge: 'Records', tone: 'text-[#8fd0a6] bg-[#1c3929]' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-[#a4b5a8]">
                        <Clock3 className="h-3 w-3" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[9px] font-medium text-[#dfe8e0]">{item.title}</p>
                        <p className="mt-0.5 truncate text-[8px] text-[#819287]">{item.subtitle}</p>
                      </div>
                      <span className={`shrink-0 rounded px-1.5 py-1 text-[8px] ${item.tone}`}>
                        {item.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-[8px] text-[#718278]">
              <LockKeyhole className="h-3 w-3" />
              Illustrative dashboard · Not live account data
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fafbf9] text-[#19251d]">
      <header className="border-b border-[#e8ece7] bg-white">
        <div className="mx-auto flex h-[68px] max-w-[1320px] items-center justify-between px-5 sm:h-[76px] sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#176c4c] text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="text-[18px] font-bold tracking-[-0.055em] text-[#1b2920]">
              Compliance<span className="text-[#217c55]">Tracker</span>
            </span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-7">
            <Link href="/signin" className="text-sm font-medium text-[#48564c] transition hover:text-[#176c4c]">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#176c4c] px-3.5 text-sm font-semibold text-white transition hover:bg-[#10583c] sm:px-5"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_78%_25%,rgba(47,139,86,0.09),transparent_45%)]" />

        <div className="relative mx-auto grid max-w-[1320px] items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[0.78fr_1.22fr] lg:gap-10 lg:px-12 lg:pb-24 lg:pt-20">
          <div className="mx-auto w-full max-w-[500px] lg:mx-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dce9df] bg-white px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-[#276a4e] shadow-sm sm:text-[11px]">
              <span className="h-2 w-2 rounded-full bg-[#2b8b5c]" />
              COMPLIANCE, MADE CLEARER
            </div>

            <h1 className="mt-6 text-[42px] font-semibold leading-[1.08] tracking-[-0.065em] text-[#1a271e] sm:mt-7 sm:text-[54px] lg:text-[62px] xl:text-[68px]">
              Know where your
              <span className="block text-[#21784f]">compliance</span>
              stands.
            </h1>

            <p className="mt-5 max-w-[440px] text-[15px] leading-7 text-[#69766d] sm:mt-6 sm:text-[17px] sm:leading-8">
              Track compliance obligations, manage vendors and risks, organize
              evidence, and stay ahead of important deadlines—all in one place.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link
                href="/signup"
                className="group inline-flex min-h-[49px] items-center justify-center gap-2 rounded-lg bg-[#176c4c] px-5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(23,108,76,0.16)] transition hover:-translate-y-0.5 hover:bg-[#10583c]"
              >
                Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/signin"
                className="inline-flex min-h-[49px] items-center justify-center rounded-lg border border-[#dfe5df] bg-white px-5 text-sm font-semibold text-[#344339] transition hover:border-[#b7d0bf] hover:bg-[#f5f8f5]"
              >
                Sign in to your workspace
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2.5 text-[11px] font-medium text-[#657268] sm:mt-7 sm:gap-x-5 sm:text-xs">
              {['Track obligations', 'Monitor risks', 'Manage renewals'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#23805a]" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3 border-t border-[#e4e9e3] pt-5 sm:mt-9">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e7f2e9] text-[#24764e]">
                <ChartNoAxesCombined className="h-[18px] w-[18px]" />
              </span>
              <div>
                <p className="text-xs font-semibold text-[#34443a]">Your compliance, at a glance</p>
                <p className="mt-1 text-[11px] text-[#7b887e]">Activities, risks, evidence, and deadlines</p>
              </div>
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <section className="border-y border-[#e5eae4] bg-white">
        <div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-x-5 gap-y-7 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-4 lg:px-12">
          {[
            { icon: ClipboardCheck, title: 'Compliance register', text: 'Track obligations and status' },
            { icon: Building2, title: 'Vendor risk', text: 'Organize vendor assessments' },
            { icon: FileText, title: 'Evidence', text: 'Keep supporting records close' },
            { icon: CalendarDays, title: 'Renewals', text: 'Keep important dates visible' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e0ebe1] bg-[#f0f6f0] text-[#26764f]">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[#304034] sm:text-sm">{item.title}</p>
                  <p className="mt-1 text-[10px] leading-4 text-[#7b887e] sm:text-xs">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-[#fafbf9]">
        <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="max-w-[650px]">
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#247451] sm:text-[11px]">
              ONE ORGANIZED WORKSPACE
            </p>
            <h2 className="mt-4 text-[31px] font-semibold leading-tight tracking-[-0.055em] text-[#1b2820] sm:text-[40px] lg:text-[46px]">
              Everything important,
              <br className="hidden sm:block" /> easier to keep track of.
            </h2>
            <p className="mt-4 max-w-[600px] text-sm leading-7 text-[#707d73] sm:text-[15px]">
              Bring essential compliance activities together, see what needs
              attention, and make it easier to follow up on the things that matter.
            </p>
          </div>

          <div className="mt-9 grid gap-4 sm:mt-12 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.number}
                  className="group rounded-2xl border border-[#e3e9e2] bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#c2d8c7] hover:shadow-[0_15px_35px_-25px_rgba(26,74,43,0.22)] sm:p-7 lg:p-8"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf5ee] text-[#24764f]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-medium tracking-widest text-[#a1ada3]">
                      {feature.number}
                    </span>
                  </div>

                  <h3 className="mt-5 text-[18px] font-semibold tracking-tight text-[#26352a] sm:text-xl">
                    {feature.title}
                  </h3>
                  <p className="mt-2 max-w-[470px] text-[13px] leading-6 text-[#748076] sm:text-sm sm:leading-7">
                    {feature.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {feature.points.map((point) => (
                      <span key={point} className="rounded-md border border-[#e7ece6] bg-[#fafcf9] px-2.5 py-1.5 text-[10px] font-medium text-[#65756a]">
                        {point}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-[#277650]">
                    Part of your workspace
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
        <div className="relative mx-auto max-w-[1230px] overflow-hidden rounded-2xl bg-[#14291d] px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
          <div className="pointer-events-none absolute -right-16 -top-32 h-72 w-72 rounded-full bg-[#368d5b]/20 blur-3xl" />

          <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div className="max-w-[640px]">
              <p className="text-[10px] font-bold tracking-[0.16em] text-[#9ed0ad]">
                GET STARTED
              </p>
              <h2 className="mt-4 text-[30px] font-semibold leading-tight tracking-[-0.05em] text-white sm:text-[38px] lg:text-[44px]">
                Bring your compliance
                <br className="hidden sm:block" /> work into focus.
              </h2>
              <p className="mt-3 max-w-[510px] text-sm leading-7 text-[#b7c8ba] sm:text-[15px]">
                Organize obligations, risks, evidence, and deadlines in one workspace.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-[#173b28] transition hover:bg-[#eaf3ec]"
              >
                Create your account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/signin"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e5eae5] bg-white">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#176c4c] text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold tracking-[-0.04em] text-[#24342a]">
              Compliance<span className="text-[#217c55]">Tracker</span>
            </span>
          </Link>
          <span className="text-xs text-[#78847b] sm:text-sm">
            Track compliance, vendors, risks, and renewals.
          </span>
          <span className="text-xs text-[#8a958c]">
            © {new Date().getFullYear()} ComplianceTracker
          </span>
        </div>
      </footer>
    </main>
  );
}
