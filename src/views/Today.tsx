import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from '../state/useLive';
import { db } from '../db/database';
import {
  getNote,
  setCheck,
  setNote,
  setRating,
} from '../db/repo';
import { formatLong, isExpectedOn, todayISO } from '../lib/date';
import RatingPicker from '../components/RatingPicker';
import Checkbox from '../components/Checkbox';
import Header from '../components/Header';
import { useToast } from '../components/Toast';
import { computeStreak } from '../lib/analytics';

function describeFreq(freq: import('../types').FrequencyType): string {
  if (freq.kind === 'daily') return 'Tutti i giorni';
  if (freq.kind === 'times-per-week')
    return `${freq.target}× a settimana`;
  const map = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  return freq.days.map((d) => map[d]).join(' · ') || 'Giorni specifici';
}

export default function Today() {
  const today = todayISO();
  const { show } = useToast();

  const topics = useLiveQuery(
    async () => (await db.topics.toArray()).sort((a, b) => a.order - b.order),
    []
  );
  const subcategories = useLiveQuery(
    async () => (await db.subcategories.toArray()).sort((a, b) => a.order - b.order),
    []
  );
  const ratings = useLiveQuery(
    () => db.ratings.where('date').equals(today).toArray(),
    [today]
  );
  const checks = useLiveQuery(
    () => db.checks.where('date').equals(today).toArray(),
    [today]
  );
  const allChecks = useLiveQuery(() => db.checks.toArray(), []);

  const [noteText, setNoteText] = useState('');
  useEffect(() => {
    getNote(today).then((n) => setNoteText(n?.text ?? ''));
  }, [today]);

  const activeTopics = useMemo(
    () => (topics ?? []).filter((t) => t.status === 'active'),
    [topics]
  );

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

  const evaluatedCount = ratingByTopic.size;
  const totalActive = activeTopics.length;

  if (!topics || !subcategories) {
    return (
      <div className="p-8 text-center text-stone-500">Caricamento…</div>
    );
  }

  return (
    <div>
      <Header
        title="Oggi"
        subtitle={formatLong(today)}
        right={
          <span className="chip bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200">
            {evaluatedCount}/{totalActive} valutati
          </span>
        }
      />

      <div className="mx-auto max-w-2xl px-4 pb-4 space-y-4">
        {totalActive === 0 && (
          <div className="card p-6 text-center">
            <div className="text-2xl mb-2">🌱</div>
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Non hai ancora topic attivi. Vai in Impostazioni per crearne uno.
            </p>
          </div>
        )}

        {activeTopics.map((t) => {
          const subs = (subcategories ?? []).filter(
            (s) => s.topicId === t.id && s.active
          );
          const rating = ratingByTopic.get(t.id) ?? 0;
          return (
            <section key={t.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100 dark:border-stone-800">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                  style={{ backgroundColor: `${t.color}22`, color: t.color }}
                >
                  <span>{t.emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[15px] font-semibold">{t.name}</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {subs.length
                      ? `${subs.length} attività`
                      : 'Nessuna attività ripetitiva'}
                  </p>
                </div>
                <RatingPicker
                  value={rating}
                  color={t.color}
                  onChange={async (v) => {
                    await setRating(today, t.id, v);
                    if (v >= 4) show('Bel voto! 💪', 'success');
                  }}
                />
              </div>
              {subs.length > 0 && (
                <div className="space-y-2 px-3 py-3">
                  {subs.map((s) => {
                    const expected = isExpectedOn(s.frequency, today);
                    const checked = doneSubs.has(s.id);
                    const streak = allChecks
                      ? computeStreak(s, allChecks)
                      : 0;
                    const hint = `${describeFreq(s.frequency)}${
                      streak > 0 ? ` · 🔥 ${streak} di fila` : ''
                    }${!expected ? ' · non previsto oggi' : ''}`;
                    return (
                      <Checkbox
                        key={s.id}
                        checked={checked}
                        label={s.name}
                        hint={hint}
                        color={t.color}
                        onChange={async (v) => {
                          await setCheck(today, s.id, v);
                          if (v) {
                            const newStreak = streak + (checked ? 0 : 1);
                            if ([3, 7, 14, 30].includes(newStreak)) {
                              show(`🔥 Streak di ${newStreak} giorni!`, 'success');
                            }
                          }
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {totalActive > 0 && (
          <section className="card p-4">
            <label className="block text-sm font-medium mb-2">
              Note della giornata
            </label>
            <textarea
              className="input min-h-[88px] resize-y"
              placeholder="Pensieri, riflessioni, cose da ricordare…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onBlur={() => setNote(today, noteText)}
            />
          </section>
        )}
      </div>
    </div>
  );
}
