import { useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { format } from 'date-fns';
import { useLiveQuery } from '../state/useLive';
import { db } from '../db/database';
import {
  daysBetween,
  formatLong,
  toISODate,
} from '../lib/date';
import Header from '../components/Header';
import Modal from '../components/Modal';
import RatingPicker from '../components/RatingPicker';
import Checkbox from '../components/Checkbox';
import { dailyAverages } from '../lib/analytics';
import { getNote, setCheck, setNote, setRating } from '../db/repo';

function colorForScore(score: number): string {
  if (score <= 0) return 'transparent';
  if (score < 1.6) return '#fca5a5';
  if (score < 2.6) return '#fcd34d';
  if (score < 3.6) return '#fde68a';
  if (score < 4.4) return '#bbf7d0';
  return '#86efac';
}

export default function CalendarView() {
  const [anchor, setAnchor] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = useMemo(() => daysBetween(gridStart, gridEnd), [gridStart, gridEnd]);

  const ratings = useLiveQuery(
    () =>
      db.ratings
        .where('date')
        .between(toISODate(gridStart), toISODate(gridEnd), true, true)
        .toArray(),
    [toISODate(gridStart), toISODate(gridEnd)]
  );

  const averages = useMemo(() => dailyAverages(ratings ?? []), [ratings]);

  const monthLabel = format(anchor, 'LLLL yyyy', { locale: it });

  return (
    <div>
      <Header title="Calendario" subtitle="Storico delle giornate" />
      <div className="mx-auto max-w-2xl px-4 pb-4 space-y-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              className="btn-ghost h-9 w-9 !p-0"
              onClick={() => setAnchor((d) => subMonths(d, 1))}
              aria-label="Mese precedente"
            >
              ←
            </button>
            <div className="text-sm font-semibold capitalize">{monthLabel}</div>
            <button
              className="btn-ghost h-9 w-9 !p-0"
              onClick={() => setAnchor((d) => addMonths(d, 1))}
              aria-label="Mese successivo"
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-stone-500 dark:text-stone-400 mb-1">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((iso) => {
              const d = new Date(iso + 'T00:00:00');
              const inMonth = isSameMonth(d, anchor);
              const avg = averages.get(iso) ?? 0;
              const isToday = iso === toISODate(new Date());
              return (
                <button
                  key={iso}
                  className={`relative aspect-square rounded-lg text-sm transition active:scale-95 ${
                    inMonth
                      ? 'text-stone-800 dark:text-stone-100'
                      : 'text-stone-300 dark:text-stone-600'
                  } ${
                    isToday
                      ? 'ring-2 ring-stone-900 dark:ring-white'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                  style={{
                    backgroundColor: avg > 0 ? colorForScore(avg) : undefined,
                    color: avg > 0 ? '#1c1917' : undefined,
                  }}
                  onClick={() => setSelected(iso)}
                >
                  <span className="absolute inset-0 flex items-center justify-center font-medium">
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
            <span>Voto medio:</span>
            {[
              { c: '#fca5a5', l: '<1.6' },
              { c: '#fcd34d', l: '1.6–2.5' },
              { c: '#fde68a', l: '2.6–3.5' },
              { c: '#bbf7d0', l: '3.6–4.4' },
              { c: '#86efac', l: '≥4.4' },
            ].map((it) => (
              <span key={it.l} className="inline-flex items-center gap-1">
                <span
                  className="h-3 w-3 rounded"
                  style={{ backgroundColor: it.c }}
                />
                {it.l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <DayDetailModal
          date={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function DayDetailModal({ date, onClose }: { date: string; onClose: () => void }) {
  const topics = useLiveQuery(
    async () => (await db.topics.toArray()).sort((a, b) => a.order - b.order),
    []
  );
  const subcategories = useLiveQuery(
    async () => (await db.subcategories.toArray()).sort((a, b) => a.order - b.order),
    []
  );
  const ratings = useLiveQuery(
    () => db.ratings.where('date').equals(date).toArray(),
    [date]
  );
  const checks = useLiveQuery(
    () => db.checks.where('date').equals(date).toArray(),
    [date]
  );
  const [noteText, setNoteText] = useState('');
  useEffect(() => {
    getNote(date).then((n) => setNoteText(n?.text ?? ''));
  }, [date]);

  const ratingByTopic = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of ratings ?? []) m.set(r.topicId, r.rating);
    return m;
  }, [ratings]);
  const doneSubs = useMemo(() => {
    const s = new Set<string>();
    for (const c of checks ?? []) if (c.done) s.add(c.subcategoryId);
    return s;
  }, [checks]);

  return (
    <Modal open onClose={onClose} title={formatLong(date)}>
      <div className="space-y-4">
        {(topics ?? [])
          .filter((t) => t.status === 'active')
          .map((t) => {
            const subs = (subcategories ?? []).filter(
              (s) => s.topicId === t.id && s.active
            );
            return (
              <div key={t.id} className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{t.emoji}</span>
                  <h3 className="text-sm font-semibold flex-1">{t.name}</h3>
                  <RatingPicker
                    size="sm"
                    color={t.color}
                    value={ratingByTopic.get(t.id) ?? 0}
                    onChange={(v) => setRating(date, t.id, v)}
                  />
                </div>
                {subs.length > 0 && (
                  <div className="space-y-1.5">
                    {subs.map((s) => (
                      <Checkbox
                        key={s.id}
                        label={s.name}
                        checked={doneSubs.has(s.id)}
                        color={t.color}
                        onChange={(v) => setCheck(date, s.id, v)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        <div>
          <label className="block text-sm font-medium mb-2">Note</label>
          <textarea
            className="input min-h-[80px]"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={() => setNote(date, noteText)}
          />
        </div>
      </div>
    </Modal>
  );
}
