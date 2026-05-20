import { db } from './database';
import { uid } from '../lib/id';
import type { Subcategory, Topic } from '../types';

interface SeedTopic {
  name: string;
  emoji: string;
  color: string;
  subs: { name: string; freq: Subcategory['frequency'] }[];
}

const SEED: SeedTopic[] = [
  {
    name: 'Lavoro',
    emoji: '💼',
    color: '#2563eb',
    subs: [
      { name: 'Sessione deep work', freq: { kind: 'weekdays', days: [1, 2, 3, 4, 5] } },
      { name: 'Inbox a zero', freq: { kind: 'weekdays', days: [1, 2, 3, 4, 5] } },
      { name: 'Pianificare il giorno dopo', freq: { kind: 'weekdays', days: [1, 2, 3, 4, 5] } },
    ],
  },
  {
    name: 'Attività fisica',
    emoji: '🏃',
    color: '#16a34a',
    subs: [
      { name: 'Allenamento', freq: { kind: 'times-per-week', target: 3 } },
      { name: '10.000 passi', freq: { kind: 'daily' } },
      { name: 'Stretching', freq: { kind: 'daily' } },
    ],
  },
  {
    name: 'Meditazione',
    emoji: '🧘',
    color: '#9333ea',
    subs: [
      { name: 'Meditazione mattina', freq: { kind: 'daily' } },
      { name: 'Respirazione serale', freq: { kind: 'daily' } },
    ],
  },
  {
    name: 'Famiglia',
    emoji: '👨‍👩‍👧',
    color: '#db2777',
    subs: [
      { name: 'Tempo di qualità senza telefono', freq: { kind: 'daily' } },
      { name: 'Chiamata/messaggio a un familiare', freq: { kind: 'times-per-week', target: 3 } },
    ],
  },
  {
    name: 'Finanze personali',
    emoji: '💰',
    color: '#ea580c',
    subs: [
      { name: 'Registrare le spese', freq: { kind: 'daily' } },
      { name: 'Nessuna spesa superflua', freq: { kind: 'daily' } },
    ],
  },
];

/** Inserisce i topic di esempio solo se il DB è vuoto */
export async function seedIfEmpty(): Promise<void> {
  const count = await db.topics.count();
  if (count > 0) return;

  const now = Date.now();
  const topics: Topic[] = [];
  const subs: Subcategory[] = [];

  SEED.forEach((t, ti) => {
    const topicId = uid();
    topics.push({
      id: topicId,
      name: t.name,
      emoji: t.emoji,
      color: t.color,
      order: ti,
      status: 'active',
      createdAt: now,
    });
    t.subs.forEach((s, si) => {
      subs.push({
        id: uid(),
        topicId,
        name: s.name,
        frequency: s.freq,
        order: si,
        active: true,
        createdAt: now,
      });
    });
  });

  await db.transaction('rw', db.topics, db.subcategories, async () => {
    await db.topics.bulkAdd(topics);
    await db.subcategories.bulkAdd(subs);
  });
}
