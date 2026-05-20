import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { subDays, subMonths, subWeeks } from 'date-fns';
import { useLiveQuery } from '../state/useLive';
import { db } from '../db/database';
import Header from '../components/Header';
import {
  aggregateRatingsByTopic,
  aggregateSubcategoryStats,
  compareTopicsBetween,
  computeBadges,
  computeGoalProgress,
  computeStreak,
  generateInsights,
  getPeriodRange,
  getPreviousPeriodRange,
  overallAverage,
  suggestFocusTopic,
  topicTrend,
  type Period,
} from '../lib/analytics';
import { formatShort, toISODate } from '../lib/date';
import type { Topic } from '../types';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Giorno' },
  { id: 'week', label: 'Settimana' },
  { id: 'month', label: 'Mese' },
];

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('week');

  const topics = useLiveQuery(
    async () => (await db.topics.toArray()).sort((a, b) => a.order - b.order),
    []
  );
  const subcategories = useLiveQuery(
    async () => (await db.subcategories.toArray()).sort((a, b) => a.order - b.order),
    []
  );

  const range = useMemo(() => getPeriodRange(period), [period]);
  const prevRange = useMemo(() => getPreviousPeriodRange(period), [period]);

  const longRange = useMemo(() => {
    // ~4 settimane / 4 mesi indietro per i trend lunghi
    const now = new Date();
    const startDate =
      period === 'month' ? subMonths(now, 4) : period === 'week' ? subWeeks(now, 4) : subDays(now, 7);
    return { startISO: toISODate(startDate), endISO: toISODate(now) };
  }, [period]);

  const currentRatings = useLiveQuery(
    () =>
      db.ratings
        .where('date')
        .between(toISODate(range.start), toISODate(range.end), true, true)
        .toArray(),
    [toISODate(range.start), toISODate(range.end)]
  );
  const prevRatings = useLiveQuery(
    () =>
      db.ratings
        .where('date')
        .between(toISODate(prevRange.start), toISODate(prevRange.end), true, true)
        .toArray(),
    [toISODate(prevRange.start), toISODate(prevRange.end)]
  );
  const longRatings = useLiveQuery(
    () =>
      db.ratings
        .where('date')
        .between(longRange.startISO, longRange.endISO, true, true)
        .toArray(),
    [longRange.startISO, longRange.endISO]
  );
  const currentChecks = useLiveQuery(
    () =>
      db.checks
        .where('date')
        .between(toISODate(range.start), toISODate(range.end), true, true)
        .toArray(),
    [toISODate(range.start), toISODate(range.end)]
  );
  const allChecks = useLiveQuery(() => db.checks.toArray(), []);

  if (!topics || !subcategories) {
    return <div className="p-8 text-center text-stone-500">Caricamento…</div>;
  }

  const activeTopics = topics.filter((t) => t.status === 'active');
  const activeSubs = subcategories.filter((s) => s.active);
  const cur = currentRatings ?? [];
  const prev = prevRatings ?? [];
  const long = longRatings ?? [];
  const checks = currentChecks ?? [];

  const overall = overallAverage(cur);
  const prevOverall = overallAverage(prev);
  const overallDelta = overall - prevOverall;

  const ids = activeTopics.map((t) => t.id);
  const aggCur = aggregateRatingsByTopic(cur, ids);
  const comparisons = compareTopicsBetween(activeTopics, cur, prev);

  // Topic più forte / debole (solo con almeno un voto)
  const ranked = activeTopics
    .map((t) => ({ t, a: aggCur[t.id].averages, n: aggCur[t.id].ratingsCount }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.a - a.a);
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];

  const insights = generateInsights({
    topics: activeTopics,
    subcategories: activeSubs,
    ratingsCurrent: cur,
    ratingsPrevious: prev,
    ratingsLong: long,
    checks,
    isoDays: range.days,
    period,
  });

  const badges = computeBadges(activeSubs, allChecks ?? []);
  const focus = suggestFocusTopic(activeTopics, cur);

  return (
    <div>
      <Header title="Dashboard" subtitle="Analisi e progressi" />

      <div className="mx-auto max-w-2xl px-4 pb-4 space-y-4">
        {/* Period toggle */}
        <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                period === p.id
                  ? 'bg-white dark:bg-stone-900 shadow-sm text-stone-900 dark:text-white'
                  : 'text-stone-600 dark:text-stone-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Overall summary */}
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Media complessiva
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {overall ? overall.toFixed(2) : '–'}
              </p>
            </div>
            <DeltaBadge delta={overallDelta} />
          </div>
          {strongest && weakest && strongest.t.id !== weakest.t.id && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
                <div className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Più forte
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span>{strongest.t.emoji}</span>
                  <span className="text-sm font-semibold truncate">
                    {strongest.t.name}
                  </span>
                </div>
                <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5 tabular-nums">
                  Media {strongest.a.toFixed(2)}
                </div>
              </div>
              <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 p-3">
                <div className="text-[11px] uppercase tracking-wide text-rose-700 dark:text-rose-300">
                  Più debole
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span>{weakest.t.emoji}</span>
                  <span className="text-sm font-semibold truncate">
                    {weakest.t.name}
                  </span>
                </div>
                <div className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 tabular-nums">
                  Media {weakest.a.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Focus suggerito */}
        {focus && period !== 'day' && (
          <div
            className="card p-4 border-l-4"
            style={{ borderLeftColor: focus.color }}
          >
            <div className="text-[11px] uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Focus suggerito
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xl">{focus.emoji}</span>
              <div>
                <div className="text-sm font-semibold">{focus.name}</div>
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  Concentrati qui per migliorare il prossimo periodo.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3">Insight</h3>
            <ul className="space-y-2">
              {insights.map((i) => (
                <li
                  key={i.id}
                  className={`flex items-start gap-3 rounded-xl p-3 text-sm ${
                    i.tone === 'positive'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100'
                      : i.tone === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100'
                        : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200'
                  }`}
                >
                  <span className="text-lg leading-none">{i.emoji}</span>
                  <span className="flex-1">{i.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Per-topic detail */}
        {activeTopics.map((t) => {
          const trend = topicTrend(t.id, long, computeDaysList(long, range.days));
          const cmp = comparisons.find((c) => c.topicId === t.id);
          const goal = computeGoalProgress(t, cur);
          const subs = activeSubs.filter((s) => s.topicId === t.id);
          return (
            <div key={t.id} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: `${t.color}22`, color: t.color }}
                >
                  {t.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold truncate">{t.name}</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Media {aggCur[t.id].averages ? aggCur[t.id].averages.toFixed(2) : '–'} ·{' '}
                    {aggCur[t.id].ratingsCount} voti
                  </p>
                </div>
                {cmp && <DeltaBadge delta={cmp.delta} />}
              </div>

              {trend.length > 0 && (
                <div className="h-32 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trend.map((p) => ({
                        date: formatShort(p.date),
                        value: p.value || null,
                      }))}
                      margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id={`grad-${t.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={t.color} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={t.color} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[0, 5]}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        ticks={[0, 1, 2, 3, 4, 5]}
                      />
                      <Tooltip
                        cursor={{ stroke: t.color, strokeWidth: 1 }}
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 8,
                          border: '1px solid #e5e5e5',
                        }}
                        formatter={(v) => [v == null ? '–' : String(v), t.name]}
                      />
                      {t.goalAverage && (
                        <ReferenceLine
                          y={t.goalAverage}
                          stroke={t.color}
                          strokeDasharray="4 4"
                          strokeOpacity={0.6}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={t.color}
                        strokeWidth={2}
                        fill={`url(#grad-${t.id})`}
                        connectNulls
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {goal && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-300 mb-1">
                    <span>Obiettivo: media ≥ {goal.target.toFixed(1)}</span>
                    <span className="tabular-nums">{goal.current.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(goal.progress * 100)}%`,
                        backgroundColor: t.color,
                      }}
                    />
                  </div>
                </div>
              )}

              {subs.length > 0 && (
                <div className="mt-3 space-y-2">
                  {subs.map((s) => {
                    const stats = aggregateSubcategoryStats(s, checks, range.days);
                    const streak = computeStreak(s, allChecks ?? []);
                    return (
                      <div key={s.id} className="rounded-lg bg-stone-50 dark:bg-stone-800 p-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate">{s.name}</span>
                          <span className="tabular-nums text-stone-500 dark:text-stone-400 text-xs">
                            {stats.done}/{stats.expected}
                            {streak > 0 && <span className="ml-2">🔥 {streak}</span>}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round(stats.completion * 100)}%`,
                              backgroundColor: t.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Topic comparison bars */}
        {activeTopics.length > 0 && cur.length > 0 && (
          <TopicComparisonChart topics={activeTopics} averagesByTopic={aggCur} />
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3">Riconoscimenti</h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-full bg-stone-100 dark:bg-stone-800 px-3 py-1.5 text-xs"
                  title={b.description}
                >
                  <span className="text-base">{b.emoji}</span>
                  <span className="font-medium">{b.title}</span>
                  <span className="text-stone-500 dark:text-stone-400 truncate max-w-[140px]">
                    · {b.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 0.05) {
    return (
      <span className="chip bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
        = stabile
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={`chip ${
        positive
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
      }`}
    >
      {positive ? '▲' : '▼'} {Math.abs(delta).toFixed(2)}
    </span>
  );
}

function TopicComparisonChart({
  topics,
  averagesByTopic,
}: {
  topics: Topic[];
  averagesByTopic: Record<string, { averages: number }>;
}) {
  const data = topics.map((t) => ({
    name: t.name,
    value: Number((averagesByTopic[t.id]?.averages ?? 0).toFixed(2)),
    color: t.color,
  }));
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold mb-3">Confronto topic</h3>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="truncate">{d.name}</span>
              <span className="tabular-nums text-stone-500 dark:text-stone-400">
                {d.value ? d.value.toFixed(2) : '–'}
              </span>
            </div>
            <div className="h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(d.value / 5) * 100}%`,
                  backgroundColor: d.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {/* keeps Cell import used for tree-shaking warnings */}
      <span hidden>{Cell.name}</span>
    </div>
  );
}

/** Estrae la lista dei giorni del range "lungo" da usare per i grafici di trend.
 *  Per period=day mostriamo solo gli ultimi 7 giorni, altrimenti il range fornito. */
function computeDaysList(_long: { date: string }[], currentDays: string[]): string[] {
  // Usiamo i giorni del periodo corrente + giorni del periodo lungo, ordinati.
  // In pratica, mostriamo solo i giorni del periodo corrente per evitare grafici confusi.
  return currentDays;
}
