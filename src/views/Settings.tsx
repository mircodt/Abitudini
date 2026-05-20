import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLiveQuery } from '../state/useLive';
import { db } from '../db/database';
import {
  createSubcategory,
  createTopic,
  deleteSubcategory,
  deleteTopic,
  exportAll,
  importAll,
  reorderSubcategories,
  reorderTopics,
  updateSubcategory,
  updateTopic,
  wipeAll,
} from '../db/repo';
import Header from '../components/Header';
import Modal from '../components/Modal';
import EmojiInput from '../components/EmojiInput';
import ColorPicker from '../components/ColorPicker';
import { useToast } from '../components/Toast';
import { useTheme } from '../state/theme';
import type {
  ExportPayload,
  FrequencyType,
  Subcategory,
  Topic,
  Weekday,
} from '../types';
import { ITALIAN_WEEKDAYS_SHORT, WEEKDAY_ORDER } from '../lib/date';

export default function Settings() {
  const topics = useLiveQuery(
    async () => (await db.topics.toArray()).sort((a, b) => a.order - b.order),
    []
  );
  const subcategories = useLiveQuery(
    async () => (await db.subcategories.toArray()).sort((a, b) => a.order - b.order),
    []
  );

  const { mode, setMode } = useTheme();
  const { show } = useToast();
  const [editingTopic, setEditingTopic] = useState<Topic | 'new' | null>(null);
  const [editingSub, setEditingSub] = useState<
    | { topicId: string; sub: Subcategory | 'new' }
    | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function onDragTopics(e: DragEndEvent) {
    const ids = (topics ?? []).map((t) => t.id);
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = ids.indexOf(String(e.active.id));
    const newIdx = ids.indexOf(String(e.over.id));
    const next = arrayMove(ids, oldIdx, newIdx);
    await reorderTopics(next);
  }

  async function onExport() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abitudini-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    show('Backup esportato', 'success');
  }

  async function onImportFile(file: File) {
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as ExportPayload;
      const ok = confirm(
        'L\'import sovrascriverà tutti i dati esistenti. Continuare?'
      );
      if (!ok) return;
      await importAll(payload);
      show('Dati importati', 'success');
    } catch (err) {
      console.error(err);
      show('Errore durante l\'import', 'error');
    }
  }

  async function onReset() {
    const ok = confirm('Cancellare TUTTI i dati? Operazione irreversibile.');
    if (!ok) return;
    await wipeAll();
    show('Tutti i dati eliminati', 'success');
  }

  return (
    <div>
      <Header title="Impostazioni" />

      <div className="mx-auto max-w-2xl px-4 pb-4 space-y-4">
        {/* Theme */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold mb-3">Tema</h2>
          <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1">
            {(['light', 'dark', 'system'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  mode === m
                    ? 'bg-white dark:bg-stone-900 shadow-sm text-stone-900 dark:text-white'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                {m === 'light' ? 'Chiaro' : m === 'dark' ? 'Scuro' : 'Sistema'}
              </button>
            ))}
          </div>
        </div>

        {/* Topics */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Topic</h2>
            <button className="btn-primary !py-1.5 !px-3 text-sm" onClick={() => setEditingTopic('new')}>
              + Nuovo
            </button>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
            Trascina per riordinare. Tocca per modificare.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragTopics}>
            <SortableContext
              items={(topics ?? []).map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {(topics ?? []).map((t) => {
                  const subs = (subcategories ?? []).filter((s) => s.topicId === t.id);
                  return (
                    <SortableTopicRow
                      key={t.id}
                      topic={t}
                      subs={subs}
                      onEdit={() => setEditingTopic(t)}
                      onAddSub={() => setEditingSub({ topicId: t.id, sub: 'new' })}
                      onEditSub={(sub) => setEditingSub({ topicId: t.id, sub })}
                    />
                  );
                })}
                {topics?.length === 0 && (
                  <li className="text-sm text-stone-500 dark:text-stone-400 text-center py-6">
                    Nessun topic. Aggiungine uno per iniziare.
                  </li>
                )}
              </ul>
            </SortableContext>
          </DndContext>
        </div>

        {/* Data */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold mb-3">Dati</h2>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary" onClick={onExport}>
              ⬇️ Esporta JSON
            </button>
            <label className="btn-secondary cursor-pointer">
              ⬆️ Importa JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportFile(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <button
            className="btn mt-3 w-full bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 hover:bg-rose-100"
            onClick={onReset}
          >
            Cancella tutti i dati
          </button>
        </div>

        <p className="text-center text-[11px] text-stone-500 dark:text-stone-400 pb-4">
          Tutti i dati sono salvati localmente nel tuo browser (IndexedDB).
        </p>
      </div>

      {editingTopic && (
        <TopicEditor
          topic={editingTopic === 'new' ? null : editingTopic}
          onClose={() => setEditingTopic(null)}
        />
      )}
      {editingSub && (
        <SubcategoryEditor
          topicId={editingSub.topicId}
          sub={editingSub.sub === 'new' ? null : editingSub.sub}
          onClose={() => setEditingSub(null)}
        />
      )}
    </div>
  );
}

function SortableTopicRow({
  topic,
  subs,
  onEdit,
  onAddSub,
  onEditSub,
}: {
  topic: Topic;
  subs: Subcategory[];
  onEdit: () => void;
  onAddSub: () => void;
  onEditSub: (s: Subcategory) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: topic.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900"
    >
      <div className="flex items-center gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-stone-400 dark:text-stone-500 px-1"
          aria-label="Trascina"
        >
          ⋮⋮
        </button>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
          style={{ backgroundColor: `${topic.color}22`, color: topic.color }}
        >
          {topic.emoji}
        </div>
        <button onClick={onEdit} className="flex-1 min-w-0 text-left">
          <div className="text-sm font-semibold truncate">{topic.name}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
            {topic.status === 'archived'
              ? 'Archiviato'
              : topic.status === 'paused'
                ? 'In pausa'
                : `${subs.filter((s) => s.active).length} attività attive`}
          </div>
        </button>
        <button onClick={onEdit} className="btn-ghost h-8 w-8 !p-0" aria-label="Modifica">
          ✎
        </button>
      </div>
      {topic.status === 'active' && (
        <div className="border-t border-stone-100 dark:border-stone-800 px-3 py-2 space-y-1">
          {subs.length === 0 && (
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Nessuna sotto-categoria.
            </p>
          )}
          {subs.map((s) => (
            <button
              key={s.id}
              onClick={() => onEditSub(s)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              <span className={`truncate ${!s.active ? 'text-stone-400 line-through' : ''}`}>
                {s.name}
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400 ml-2 shrink-0">
                {describeFreq(s.frequency)}
              </span>
            </button>
          ))}
          <button
            onClick={onAddSub}
            className="w-full rounded-lg border border-dashed border-stone-300 dark:border-stone-600 px-2 py-2 text-xs text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800"
          >
            + Aggiungi attività
          </button>
        </div>
      )}
    </li>
  );
}

function describeFreq(f: FrequencyType): string {
  if (f.kind === 'daily') return 'Ogni giorno';
  if (f.kind === 'times-per-week') return `${f.target}×/sett`;
  return f.days.map((d) => ITALIAN_WEEKDAYS_SHORT[d]).join(' · ') || 'Specifici';
}

// ---------- Topic editor ----------

function TopicEditor({ topic, onClose }: { topic: Topic | null; onClose: () => void }) {
  const isNew = !topic;
  const [name, setName] = useState(topic?.name ?? '');
  const [emoji, setEmoji] = useState(topic?.emoji ?? '✨');
  const [color, setColor] = useState(topic?.color ?? '#2563eb');
  const [status, setStatus] = useState<Topic['status']>(topic?.status ?? 'active');
  const [goalAvg, setGoalAvg] = useState<string>(topic?.goalAverage?.toString() ?? '');
  const [goalPeriod, setGoalPeriod] = useState<'week' | 'month'>(
    topic?.goalPeriod ?? 'month'
  );
  const { show } = useToast();

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      show('Inserisci un nome', 'error');
      return;
    }
    const goalAverage = goalAvg ? Number(goalAvg) : undefined;
    if (isNew) {
      await createTopic({
        name: trimmed,
        emoji: emoji || '✨',
        color,
        status,
        goalAverage: goalAverage && goalAverage > 0 ? goalAverage : undefined,
        goalPeriod: goalAverage ? goalPeriod : undefined,
      });
    } else {
      await updateTopic(topic!.id, {
        name: trimmed,
        emoji,
        color,
        status,
        goalAverage: goalAverage && goalAverage > 0 ? goalAverage : undefined,
        goalPeriod: goalAverage ? goalPeriod : undefined,
      });
    }
    onClose();
  }

  async function remove() {
    if (!topic) return;
    const ok = confirm(`Eliminare il topic "${topic.name}" e tutto il suo storico?`);
    if (!ok) return;
    await deleteTopic(topic.id);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Nuovo topic' : 'Modifica topic'}
      footer={
        <div className="flex gap-2">
          {!isNew && (
            <button className="btn-ghost text-rose-600" onClick={remove}>
              Elimina
            </button>
          )}
          <div className="flex-1" />
          <button className="btn-secondary" onClick={onClose}>
            Annulla
          </button>
          <button className="btn-primary" onClick={save}>
            Salva
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nome</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Lavoro"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Emoji</label>
          <EmojiInput value={emoji} onChange={setEmoji} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Colore</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Stato</label>
          <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1">
            {(['active', 'paused', 'archived'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  status === s
                    ? 'bg-white dark:bg-stone-900 shadow-sm text-stone-900 dark:text-white'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                {s === 'active' ? 'Attivo' : s === 'paused' ? 'In pausa' : 'Archiviato'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Obiettivo (opzionale): media voti ≥
          </label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type="number"
              min="1"
              max="5"
              step="0.1"
              placeholder="es. 4"
              value={goalAvg}
              onChange={(e) => setGoalAvg(e.target.value)}
            />
            <select
              className="input w-32"
              value={goalPeriod}
              onChange={(e) => setGoalPeriod(e.target.value as 'week' | 'month')}
            >
              <option value="week">Settimana</option>
              <option value="month">Mese</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Subcategory editor ----------

function SubcategoryEditor({
  topicId,
  sub,
  onClose,
}: {
  topicId: string;
  sub: Subcategory | null;
  onClose: () => void;
}) {
  const isNew = !sub;
  const [name, setName] = useState(sub?.name ?? '');
  const [kind, setKind] = useState<FrequencyType['kind']>(sub?.frequency.kind ?? 'daily');
  const [days, setDays] = useState<Weekday[]>(
    sub?.frequency.kind === 'weekdays' ? sub.frequency.days : [1, 3, 5]
  );
  const [target, setTarget] = useState<number>(
    sub?.frequency.kind === 'times-per-week' ? sub.frequency.target : 3
  );
  const [active, setActive] = useState<boolean>(sub?.active ?? true);
  const { show } = useToast();

  const frequency: FrequencyType = useMemo(() => {
    if (kind === 'daily') return { kind: 'daily' };
    if (kind === 'weekdays') return { kind: 'weekdays', days: [...days].sort() as Weekday[] };
    return { kind: 'times-per-week', target };
  }, [kind, days, target]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      show('Inserisci un nome', 'error');
      return;
    }
    if (kind === 'weekdays' && days.length === 0) {
      show('Scegli almeno un giorno', 'error');
      return;
    }
    if (isNew) {
      await createSubcategory({ topicId, name: trimmed, frequency, active });
    } else {
      await updateSubcategory(sub!.id, { name: trimmed, frequency, active });
    }
    onClose();
  }

  async function remove() {
    if (!sub) return;
    const ok = confirm(`Eliminare "${sub.name}" e tutto il suo storico?`);
    if (!ok) return;
    await deleteSubcategory(sub.id);
    onClose();
  }

  function toggleDay(d: Weekday) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Nuova attività' : 'Modifica attività'}
      footer={
        <div className="flex gap-2">
          {!isNew && (
            <button className="btn-ghost text-rose-600" onClick={remove}>
              Elimina
            </button>
          )}
          <div className="flex-1" />
          <button className="btn-secondary" onClick={onClose}>
            Annulla
          </button>
          <button className="btn-primary" onClick={save}>
            Salva
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nome</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Allenamento"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Frequenza</label>
          <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1">
            {(['daily', 'weekdays', 'times-per-week'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
                  kind === k
                    ? 'bg-white dark:bg-stone-900 shadow-sm text-stone-900 dark:text-white'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                {k === 'daily'
                  ? 'Ogni giorno'
                  : k === 'weekdays'
                    ? 'Giorni specifici'
                    : 'X/settimana'}
              </button>
            ))}
          </div>
        </div>

        {kind === 'weekdays' && (
          <div className="flex gap-1.5">
            {WEEKDAY_ORDER.map((d) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
                  days.includes(d)
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                {ITALIAN_WEEKDAYS_SHORT[d]}
              </button>
            ))}
          </div>
        )}

        {kind === 'times-per-week' && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Volte a settimana</label>
            <input
              className="input"
              type="number"
              min={1}
              max={7}
              value={target}
              onChange={(e) => setTarget(Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4"
          />
          <span>Attiva (mostra nella vista Oggi)</span>
        </label>

        {!isNew && (
          <ReorderSubsHint topicId={topicId} />
        )}
      </div>
    </Modal>
  );
}

function ReorderSubsHint({ topicId }: { topicId: string }) {
  const subs = useLiveQuery(
    async () =>
      (await db.subcategories.where('topicId').equals(topicId).toArray()).sort(
        (a, b) => a.order - b.order
      ),
    [topicId]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function onDrag(e: DragEndEvent) {
    if (!subs || !e.over || e.active.id === e.over.id) return;
    const ids = subs.map((s) => s.id);
    const oldIdx = ids.indexOf(String(e.active.id));
    const newIdx = ids.indexOf(String(e.over.id));
    const next = arrayMove(ids, oldIdx, newIdx);
    await reorderSubcategories(topicId, next);
  }

  if (!subs || subs.length < 2) return null;

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">Ordine delle attività</label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDrag}>
        <SortableContext items={subs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1">
            {subs.map((s) => (
              <SortableSubRow key={s.id} sub={s} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableSubRow({ sub }: { sub: Subcategory }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sub.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="flex items-center gap-2 rounded-lg border border-stone-200 dark:border-stone-700 px-2 py-1.5 text-sm"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-stone-400 px-1">
        ⋮⋮
      </button>
      <span className="truncate flex-1">{sub.name}</span>
    </li>
  );
}
