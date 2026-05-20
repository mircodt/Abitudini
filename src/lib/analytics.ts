import { addDays, subDays, subMonths, subWeeks } from 'date-fns';
import type {
  DailyCheck,
  DailyRating,
  FrequencyType,
  Subcategory,
  Topic,
} from '../types';
import {
  daysBetween,
  getMonthRange,
  getWeekRange,
  isExpectedOn,
  toISODate,
  weekdayOf,
} from './date';

export type Period = 'day' | 'week' | 'month';

export interface PeriodRange {
  start: Date;
  end: Date;
  days: string[]; // ISO
}

export function getPeriodRange(period: Period, anchor: Date = new Date()): PeriodRange {
  if (period === 'day') {
    const iso = toISODate(anchor);
    return { start: anchor, end: anchor, days: [iso] };
  }
  const range = period === 'week' ? getWeekRange(anchor) : getMonthRange(anchor);
  return { start: range.start, end: range.end, days: daysBetween(range.start, range.end) };
}

export function getPreviousPeriodRange(
  period: Period,
  anchor: Date = new Date()
): PeriodRange {
  if (period === 'day') {
    const prev = subDays(anchor, 1);
    return { start: prev, end: prev, days: [toISODate(prev)] };
  }
  const prevAnchor = period === 'week' ? subWeeks(anchor, 1) : subMonths(anchor, 1);
  return getPeriodRange(period, prevAnchor);
}

export interface TopicAggregate {
  topicId: string;
  averages: number; // 0 se nessun voto
  ratingsCount: number;
  daysWithRating: number;
}

/** Calcola media voti per topic nel range */
export function aggregateRatingsByTopic(
  ratings: DailyRating[],
  topicIds: string[]
): Record<string, TopicAggregate> {
  const acc: Record<string, { total: number; count: number; days: Set<string> }> = {};
  for (const id of topicIds) acc[id] = { total: 0, count: 0, days: new Set() };

  for (const r of ratings) {
    if (!acc[r.topicId]) continue;
    acc[r.topicId].total += r.rating;
    acc[r.topicId].count += 1;
    acc[r.topicId].days.add(r.date);
  }

  const result: Record<string, TopicAggregate> = {};
  for (const id of topicIds) {
    const a = acc[id];
    result[id] = {
      topicId: id,
      averages: a.count > 0 ? a.total / a.count : 0,
      ratingsCount: a.count,
      daysWithRating: a.days.size,
    };
  }
  return result;
}

/** Media complessiva dei voti dati nel periodo */
export function overallAverage(ratings: DailyRating[]): number {
  if (!ratings.length) return 0;
  const tot = ratings.reduce((s, r) => s + r.rating, 0);
  return tot / ratings.length;
}

/** Numero di giorni "attesi" per una sub-categoria su un range di giorni ISO */
export function expectedDaysCount(
  frequency: FrequencyType,
  isoDays: string[]
): number {
  if (frequency.kind === 'daily') return isoDays.length;
  if (frequency.kind === 'weekdays') {
    return isoDays.filter((d) => frequency.days.includes(weekdayOf(d))).length;
  }
  // X volte a settimana: scaliamo il target sul numero di settimane del range
  const weeks = Math.max(1, isoDays.length / 7);
  return Math.round(frequency.target * weeks);
}

export interface SubcategoryStats {
  subcategoryId: string;
  done: number;
  expected: number;
  completion: number; // 0..1
}

export function aggregateSubcategoryStats(
  subcategory: Subcategory,
  checks: DailyCheck[],
  isoDays: string[]
): SubcategoryStats {
  const doneSet = new Set(
    checks.filter((c) => c.subcategoryId === subcategory.id && c.done).map((c) => c.date)
  );
  let done = 0;
  for (const d of isoDays) if (doneSet.has(d)) done++;
  const expected = Math.max(1, expectedDaysCount(subcategory.frequency, isoDays));
  return {
    subcategoryId: subcategory.id,
    done,
    expected,
    completion: Math.min(1, done / expected),
  };
}

/** Calcola streak corrente (giorni consecutivi rispettando la frequenza, terminanti oggi o ieri) */
export function computeStreak(
  subcategory: Subcategory,
  checks: DailyCheck[],
  reference: Date = new Date()
): number {
  const checkSet = new Set(
    checks.filter((c) => c.subcategoryId === subcategory.id && c.done).map((c) => c.date)
  );
  // Streak: iteriamo all'indietro dal giorno di riferimento. Se il giorno è "atteso" e non spuntato → break. Se non è atteso → salta.
  let streak = 0;
  let day = reference;
  // Consenti che la streak parta da ieri se oggi non è ancora marcato
  let tolerated = !checkSet.has(toISODate(day)) && isExpectedOn(subcategory.frequency, toISODate(day));
  while (true) {
    const iso = toISODate(day);
    const expected = isExpectedOn(subcategory.frequency, iso);
    if (!expected) {
      // Giorno non atteso → non spezza la streak, ma non la incrementa
      day = subDays(day, 1);
      if (streak === 0 && day < subDays(reference, 366)) break;
      continue;
    }
    if (checkSet.has(iso)) {
      streak++;
      tolerated = false;
      day = subDays(day, 1);
    } else {
      if (tolerated) {
        tolerated = false;
        day = subDays(day, 1);
        continue;
      }
      break;
    }
    if (day < subDays(reference, 730)) break;
  }
  return streak;
}

export interface TopicTrendPoint {
  date: string;
  value: number; // 0..5
}

/** Serie temporale media voti per topic (un punto per giorno; 0 se nessun voto) */
export function topicTrend(
  topicId: string,
  ratings: DailyRating[],
  isoDays: string[]
): TopicTrendPoint[] {
  const byDate = new Map<string, number>();
  for (const r of ratings) {
    if (r.topicId !== topicId) continue;
    byDate.set(r.date, r.rating);
  }
  return isoDays.map((d) => ({ date: d, value: byDate.get(d) ?? 0 }));
}

/** Punteggio medio per ogni giorno (media dei topic valutati quel giorno) */
export function dailyAverages(ratings: DailyRating[]): Map<string, number> {
  const acc = new Map<string, { total: number; count: number }>();
  for (const r of ratings) {
    const a = acc.get(r.date) ?? { total: 0, count: 0 };
    a.total += r.rating;
    a.count += 1;
    acc.set(r.date, a);
  }
  const out = new Map<string, number>();
  for (const [k, v] of acc) out.set(k, v.count ? v.total / v.count : 0);
  return out;
}

/** Tendenza tra periodo corrente e precedente, per topic */
export interface TopicComparison {
  topicId: string;
  current: number;
  previous: number;
  delta: number;
}

export function compareTopicsBetween(
  topics: Topic[],
  current: DailyRating[],
  previous: DailyRating[]
): TopicComparison[] {
  const ids = topics.map((t) => t.id);
  const cur = aggregateRatingsByTopic(current, ids);
  const prev = aggregateRatingsByTopic(previous, ids);
  return ids.map((id) => ({
    topicId: id,
    current: cur[id].averages,
    previous: prev[id].averages,
    delta: (cur[id].averages || 0) - (prev[id].averages || 0),
  }));
}

// ---------- Insights in linguaggio naturale ----------

export interface Insight {
  id: string;
  tone: 'positive' | 'warning' | 'neutral';
  emoji: string;
  text: string;
}

export function generateInsights(args: {
  topics: Topic[];
  subcategories: Subcategory[];
  ratingsCurrent: DailyRating[];
  ratingsPrevious: DailyRating[];
  ratingsLong: DailyRating[]; // ultime ~4 settimane per trend
  checks: DailyCheck[];
  isoDays: string[]; // giorni del periodo corrente
  period: Period;
}): Insight[] {
  const {
    topics,
    subcategories,
    ratingsCurrent,
    ratingsPrevious,
    ratingsLong,
    checks,
    isoDays,
    period,
  } = args;

  const insights: Insight[] = [];
  const activeTopics = topics.filter((t) => t.status === 'active');
  const ids = activeTopics.map((t) => t.id);
  const curAgg = aggregateRatingsByTopic(ratingsCurrent, ids);
  const prevAgg = aggregateRatingsByTopic(ratingsPrevious, ids);

  const periodLabel = period === 'week' ? 'questa settimana' : period === 'month' ? 'questo mese' : 'oggi';
  const prevPeriodLabel =
    period === 'week' ? 'la scorsa settimana' : period === 'month' ? 'lo scorso mese' : 'ieri';

  // Confronti per topic
  for (const t of activeTopics) {
    const cur = curAgg[t.id].averages;
    const prev = prevAgg[t.id].averages;
    if (cur > 0 && prev > 0) {
      const delta = cur - prev;
      if (Math.abs(delta) >= 0.3) {
        insights.push({
          id: `cmp-${t.id}`,
          tone: delta > 0 ? 'positive' : 'warning',
          emoji: delta > 0 ? '📈' : '📉',
          text: `${t.name} ${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${periodLabel} rispetto a ${prevPeriodLabel}.`,
        });
      }
    }
  }

  // Sub-categorie sotto target
  for (const s of subcategories) {
    const topic = topics.find((t) => t.id === s.topicId);
    if (!topic || topic.status !== 'active' || !s.active) continue;
    const stats = aggregateSubcategoryStats(s, checks, isoDays);
    if (stats.expected >= 2 && stats.completion < 0.5) {
      insights.push({
        id: `sub-${s.id}`,
        tone: 'warning',
        emoji: '⚠️',
        text: `${s.name}: ${stats.done}/${stats.expected} ${periodLabel}, sotto il target.`,
      });
    }
    if (stats.expected >= 3 && stats.completion >= 1) {
      insights.push({
        id: `sub-ok-${s.id}`,
        tone: 'positive',
        emoji: '✅',
        text: `${s.name}: target raggiunto (${stats.done}/${stats.expected}).`,
      });
    }
  }

  // Trend lungo (ultime ~4 settimane) per topic: in calo o in salita
  if (period !== 'day') {
    const longTrendByTopic = new Map<string, number[]>();
    // ratingsLong contiene già il range giusto: lo splittiamo in 4 sotto-periodi
    const buckets = 4;
    const allDays = Array.from(new Set(ratingsLong.map((r) => r.date))).sort();
    if (allDays.length >= buckets) {
      const bucketSize = Math.floor(allDays.length / buckets);
      for (const t of activeTopics) {
        const arr: number[] = [];
        for (let i = 0; i < buckets; i++) {
          const from = i * bucketSize;
          const to = i === buckets - 1 ? allDays.length : from + bucketSize;
          const bucketDays = new Set(allDays.slice(from, to));
          const subset = ratingsLong.filter(
            (r) => r.topicId === t.id && bucketDays.has(r.date)
          );
          const avg = subset.length ? subset.reduce((s, r) => s + r.rating, 0) / subset.length : 0;
          arr.push(avg);
        }
        longTrendByTopic.set(t.id, arr);
      }
      // Se gli ultimi 3 bucket sono in calo monotono
      for (const t of activeTopics) {
        const arr = longTrendByTopic.get(t.id) ?? [];
        if (arr.length >= 3 && arr.every((v) => v > 0)) {
          if (arr[arr.length - 3] > arr[arr.length - 2] && arr[arr.length - 2] > arr[arr.length - 1]) {
            insights.push({
              id: `trend-down-${t.id}`,
              tone: 'warning',
              emoji: '📉',
              text: `${t.name} è in calo da 3 ${period === 'week' ? 'settimane' : 'mesi'}.`,
            });
          }
          if (arr[arr.length - 3] < arr[arr.length - 2] && arr[arr.length - 2] < arr[arr.length - 1]) {
            insights.push({
              id: `trend-up-${t.id}`,
              tone: 'positive',
              emoji: '🚀',
              text: `${t.name} è in crescita da 3 ${period === 'week' ? 'settimane' : 'mesi'}.`,
            });
          }
        }
      }
    }
  }

  // Topic non valutato
  for (const t of activeTopics) {
    if (curAgg[t.id].ratingsCount === 0 && isoDays.length >= 3) {
      insights.push({
        id: `none-${t.id}`,
        tone: 'neutral',
        emoji: '💭',
        text: `Nessun voto per ${t.name} ${periodLabel}.`,
      });
    }
  }

  // Ordina: warning prima, poi positive, poi neutral
  const order = { warning: 0, positive: 1, neutral: 2 } as const;
  return insights.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 8);
}

/** Suggerisce il topic su cui concentrarsi nel prossimo periodo */
export function suggestFocusTopic(
  topics: Topic[],
  ratings: DailyRating[]
): Topic | undefined {
  const active = topics.filter((t) => t.status === 'active');
  if (!active.length) return undefined;
  const ids = active.map((t) => t.id);
  const agg = aggregateRatingsByTopic(ratings, ids);
  // Considera solo quelli con almeno un voto, scegli quello con media più bassa
  const candidates = active
    .map((t) => ({ topic: t, avg: agg[t.id].averages, count: agg[t.id].ratingsCount }))
    .filter((c) => c.count > 0);
  if (!candidates.length) {
    // se nessuno è stato votato, prendi il primo
    return active[0];
  }
  candidates.sort((a, b) => a.avg - b.avg);
  return candidates[0].topic;
}

// ---------- Badge ----------

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

export function computeBadges(
  subcategories: Subcategory[],
  checks: DailyCheck[]
): Badge[] {
  const badges: Badge[] = [];
  const thresholds = [3, 7, 14, 30, 60, 100];
  const labels: Record<number, string> = {
    3: 'Tre giorni di fila',
    7: 'Settimana piena',
    14: 'Due settimane',
    30: 'Trenta giorni',
    60: 'Due mesi',
    100: 'Cento giorni',
  };
  const emojis: Record<number, string> = {
    3: '🌱',
    7: '🔥',
    14: '⚡',
    30: '🏆',
    60: '💎',
    100: '👑',
  };
  for (const s of subcategories) {
    if (!s.active) continue;
    const streak = computeStreak(s, checks);
    const reached = thresholds.filter((t) => streak >= t).pop();
    if (reached) {
      badges.push({
        id: `badge-${s.id}-${reached}`,
        emoji: emojis[reached],
        title: labels[reached],
        description: `${s.name}: streak di ${streak} giorni`,
      });
    }
  }
  return badges.sort((a, b) => b.title.localeCompare(a.title));
}

/** Avanzamento di un obiettivo (media voti) */
export function computeGoalProgress(
  topic: Topic,
  ratings: DailyRating[]
): { current: number; target: number; progress: number } | undefined {
  if (!topic.goalAverage) return undefined;
  const subset = ratings.filter((r) => r.topicId === topic.id);
  if (!subset.length) return { current: 0, target: topic.goalAverage, progress: 0 };
  const avg = subset.reduce((s, r) => s + r.rating, 0) / subset.length;
  return {
    current: avg,
    target: topic.goalAverage,
    progress: Math.max(0, Math.min(1, avg / topic.goalAverage)),
  };
}

export { addDays };
