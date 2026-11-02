'use client';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

type ContractDocument = {
  id?: string;
  expiration_date?: string | null;
  currentStatus?: string;
  vendors?: { name?: string } | null;
};

type Props = {
  documents: ContractDocument[];
};

const STATUS_COLORS: Record<string, string> = {
  Active: '#10b981',
  'Expiring Soon': '#f59e0b',
  Expired: '#f43f5e',
};

function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );

  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }

  return date;
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}

export function ContractAnalytics({ documents }: Props) {
  const statusData = [
    {
      name: 'Active',
      value: documents.filter(
        (doc) => doc.currentStatus === 'Active'
      ).length,
    },
    {
      name: 'Expiring Soon',
      value: documents.filter(
        (doc) => doc.currentStatus === 'Expiring Soon'
      ).length,
    },
    {
      name: 'Expired',
      value: documents.filter(
        (doc) => doc.currentStatus === 'Expired'
      ).length,
    },
  ].filter((item) => item.value > 0);

  const totalWithStatus = statusData.reduce(
    (sum, item) => sum + item.value,
    0
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStarts = Array.from({ length: 6 }, (_, index) => {
    return new Date(
      today.getFullYear(),
      today.getMonth() + index,
      1
    );
  });

  const expirationData = monthStarts.map((monthStart) => {
    const nextMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      1
    );

    const count = documents.filter((doc) => {
      const expiration = parseLocalDate(doc.expiration_date);

      if (!expiration) return false;

      return (
        expiration >= today &&
        expiration >= monthStart &&
        expiration < nextMonth
      );
    }).length;

    return {
      month: formatMonth(monthStart),
      contracts: count,
    };
  });

  const hasExpirationDates = documents.some(
    (doc) => parseLocalDate(doc.expiration_date) !== null
  );

  const upcomingTotal = expirationData.reduce(
    (sum, month) => sum + month.contracts,
    0
  );

  const statusItems = [
    {
      name: 'Active',
      description: 'Outside the 30-day warning window',
    },
    {
      name: 'Expiring Soon',
      description: 'Expires within 30 days',
    },
    {
      name: 'Expired',
      description: 'Past the expiration date',
    },
  ];

  const tooltipStyle = {
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
    fontSize: 12,
  };

  return (
    <section
      aria-label="Contract analytics"
      className="grid grid-cols-1 gap-4 xl:grid-cols-2"
    >
      {/* Status distribution */}
      <article className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              Contract status
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Distribution across your current contracts
            </p>
          </div>

          <span className="shrink-0 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-slate-600 ring-1 ring-inset ring-slate-200">
            {documents.length.toLocaleString()} total
          </span>
        </div>

        {totalWithStatus === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 py-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200">
              <span aria-hidden="true" className="text-xl text-slate-400">
                ◌
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">
              No contracts to visualize yet
            </p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
              Add contracts to see their status distribution here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-center gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-2 sm:px-3 sm:py-4 lg:px-4">
            <div className="relative mx-auto h-52 w-full min-w-0 max-w-64 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} contracts`,
                      name,
                    ]}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tracking-tight tabular-nums text-slate-900">
                  {totalWithStatus.toLocaleString()}
                </span>
                <span className="mt-0.5 text-xs text-slate-500">
                  With status
                </span>
              </div>
            </div>

            <div className="min-w-0 space-y-4 px-1 pb-2 sm:space-y-3 sm:px-0">
              {statusItems.map((item) => {
                const count =
                  statusData.find(
                    (status) => status.name === item.name
                  )?.value ?? 0;

                const percentage =
                  totalWithStatus > 0
                    ? Math.round((count / totalWithStatus) * 100)
                    : 0;

                return (
                  <div key={item.name} className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: STATUS_COLORS[item.name],
                          }}
                        />
                        <span className="truncate text-sm font-medium text-slate-700">
                          {item.name}
                        </span>
                      </div>

                      <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                        {count.toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: STATUS_COLORS[item.name],
                        }}
                      />
                    </div>

                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      {percentage}% · {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </article>

      {/* Expiration timeline */}
      <article className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              Upcoming expirations
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Contracts expiring over the next six months
            </p>
          </div>

          <span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
            6 months
          </span>
        </div>

        {!hasExpirationDates ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 py-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-inset ring-blue-100">
              <span aria-hidden="true" className="text-xl text-blue-500">
                ↗
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">
              No expiration dates available
            </p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
              Add expiration dates to your contracts to see upcoming deadlines.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
              <p className="text-xs text-slate-500">
                Upcoming scheduled expirations
              </p>
              <p className="text-sm font-semibold tabular-nums text-slate-900">
                {upcomingTotal.toLocaleString()}
                <span className="ml-1 text-xs font-normal text-slate-500">
                  contracts
                </span>
              </p>
            </div>

            <div className="mt-1 h-52 min-w-0 px-2 pb-1 sm:h-56 sm:px-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={expirationData}
                  margin={{ top: 12, right: 8, left: -22, bottom: 0 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    dy={8}
                    minTickGap={4}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    width={34}
                  />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    formatter={(value) => [
                      `${value} contracts`,
                      'Expiring',
                    ]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar
                    dataKey="contracts"
                    name="Expiring"
                    fill="#3b82f6"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={34}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="border-t border-slate-100 px-4 py-3 text-[11px] leading-5 text-slate-500 sm:px-5">
              Based on recorded expiration dates. Contracts without an
              expiration date are excluded.
            </p>
          </>
        )}
      </article>
    </section>
  );
}
