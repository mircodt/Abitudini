import { db } from './database';
import { uid } from '../lib/id';
import type {
  DailyCheck,
  DailyNote,
  DailyRating,
  ExportPayload,
  Subcategory,
  Topic,
} from '../types';

// ---------- Topics ----------

export async function listTopics(includeArchived = true): Promise<Topic[]> {
  const all = await db.topics.toArray();
  const filtered = includeArchived ? all : all.filter((t) => t.status !== 'archived');
  return filtered.sort((a, b) => a.order - b.order);
}

export async function createTopic(
  data: Omit<Topic, 'id' | 'order' | 'createdAt' | 'status'> & { status?: Topic['status'] }
): Promise<Topic> {
  const order = await db.topics.count();
  const topic: Topic = {
    id: uid(),
    order,
    status: data.status ?? 'active',
    createdAt: Date.now(),
    ...data,
  };
  await db.topics.add(topic);
  return topic;
}

export async function updateTopic(id: string, patch: Partial<Topic>): Promise<void> {
  await db.topics.update(id, patch);
}

export async function reorderTopics(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.topics, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.topics.update(orderedIds[i], { order: i });
    }
  });
}

export async function deleteTopic(id: string): Promise<void> {
  await db.transaction(
    'rw',
    db.topics,
    db.subcategories,
    db.ratings,
    db.checks,
    async () => {
      const subs = await db.subcategories.where('topicId').equals(id).toArray();
      const subIds = subs.map((s) => s.id);
      await db.topics.delete(id);
      await db.subcategories.where('topicId').equals(id).delete();
      await db.ratings.where('topicId').equals(id).delete();
      if (subIds.length) {
        await db.checks.where('subcategoryId').anyOf(subIds).delete();
      }
    }
  );
}

// ---------- Subcategories ----------

export async function listSubcategories(topicId?: string): Promise<Subcategory[]> {
  const all = topicId
    ? await db.subcategories.where('topicId').equals(topicId).toArray()
    : await db.subcategories.toArray();
  return all.sort((a, b) => a.order - b.order);
}

export async function createSubcategory(
  data: Omit<Subcategory, 'id' | 'order' | 'createdAt' | 'active'> & {
    active?: boolean;
  }
): Promise<Subcategory> {
  const siblings = await db.subcategories.where('topicId').equals(data.topicId).count();
  const sub: Subcategory = {
    id: uid(),
    order: siblings,
    active: data.active ?? true,
    createdAt: Date.now(),
    ...data,
  };
  await db.subcategories.add(sub);
  return sub;
}

export async function updateSubcategory(
  id: string,
  patch: Partial<Subcategory>
): Promise<void> {
  await db.subcategories.update(id, patch);
}

export async function reorderSubcategories(
  topicId: string,
  orderedIds: string[]
): Promise<void> {
  await db.transaction('rw', db.subcategories, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.subcategories.update(orderedIds[i], { order: i, topicId });
    }
  });
}

export async function deleteSubcategory(id: string): Promise<void> {
  await db.transaction('rw', db.subcategories, db.checks, async () => {
    await db.subcategories.delete(id);
    await db.checks.where('subcategoryId').equals(id).delete();
  });
}

// ---------- Daily ratings ----------

function ratingId(date: string, topicId: string): string {
  return `${date}|${topicId}`;
}

export async function setRating(
  date: string,
  topicId: string,
  rating: number
): Promise<void> {
  const id = ratingId(date, topicId);
  if (rating <= 0) {
    await db.ratings.delete(id);
    return;
  }
  const item: DailyRating = {
    id,
    date,
    topicId,
    rating,
    updatedAt: Date.now(),
  };
  await db.ratings.put(item);
}

export async function getRatingsForDate(date: string): Promise<DailyRating[]> {
  return db.ratings.where('date').equals(date).toArray();
}

export async function getRatingsRange(
  startISO: string,
  endISO: string
): Promise<DailyRating[]> {
  return db.ratings.where('date').between(startISO, endISO, true, true).toArray();
}

// ---------- Daily checks ----------

function checkId(date: string, subcategoryId: string): string {
  return `${date}|${subcategoryId}`;
}

export async function setCheck(
  date: string,
  subcategoryId: string,
  done: boolean
): Promise<void> {
  const id = checkId(date, subcategoryId);
  if (!done) {
    await db.checks.delete(id);
    return;
  }
  const item: DailyCheck = {
    id,
    date,
    subcategoryId,
    done: true,
    updatedAt: Date.now(),
  };
  await db.checks.put(item);
}

export async function getChecksForDate(date: string): Promise<DailyCheck[]> {
  return db.checks.where('date').equals(date).toArray();
}

export async function getChecksRange(
  startISO: string,
  endISO: string
): Promise<DailyCheck[]> {
  return db.checks.where('date').between(startISO, endISO, true, true).toArray();
}

// ---------- Notes ----------

export async function getNote(date: string): Promise<DailyNote | undefined> {
  return db.notes.get(date);
}

export async function setNote(date: string, text: string): Promise<void> {
  if (!text.trim()) {
    await db.notes.delete(date);
    return;
  }
  await db.notes.put({ date, text, updatedAt: Date.now() });
}

// ---------- Settings ----------

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await db.settings.get(key);
  return row?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}

// ---------- Export / Import ----------

export async function exportAll(): Promise<ExportPayload> {
  const [topics, subcategories, ratings, checks, notes, settings] = await Promise.all([
    db.topics.toArray(),
    db.subcategories.toArray(),
    db.ratings.toArray(),
    db.checks.toArray(),
    db.notes.toArray(),
    db.settings.toArray(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    topics,
    subcategories,
    ratings,
    checks,
    notes,
    settings,
  };
}

export async function importAll(payload: ExportPayload): Promise<void> {
  if (!payload || payload.version !== 1) {
    throw new Error('Formato di import non valido o versione non supportata.');
  }
  const tables = [
    db.topics,
    db.subcategories,
    db.ratings,
    db.checks,
    db.notes,
    db.settings,
  ];
  await db.transaction('rw', tables, async () => {
    await Promise.all([
      db.topics.clear(),
      db.subcategories.clear(),
      db.ratings.clear(),
      db.checks.clear(),
      db.notes.clear(),
      db.settings.clear(),
    ]);
    await db.topics.bulkAdd(payload.topics ?? []);
    await db.subcategories.bulkAdd(payload.subcategories ?? []);
    await db.ratings.bulkAdd(payload.ratings ?? []);
    await db.checks.bulkAdd(payload.checks ?? []);
    await db.notes.bulkAdd(payload.notes ?? []);
    await db.settings.bulkAdd(payload.settings ?? []);
  });
}

export async function wipeAll(): Promise<void> {
  const tables = [
    db.topics,
    db.subcategories,
    db.ratings,
    db.checks,
    db.notes,
    db.settings,
  ];
  await db.transaction('rw', tables, async () => {
    await Promise.all([
      db.topics.clear(),
      db.subcategories.clear(),
      db.ratings.clear(),
      db.checks.clear(),
      db.notes.clear(),
      db.settings.clear(),
    ]);
  });
}
