import { useState } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const QUICK = [
  '💼',
  '🏃',
  '🧘',
  '👨‍👩‍👧',
  '💰',
  '📚',
  '🍎',
  '😴',
  '🎨',
  '🎯',
  '🧠',
  '❤️',
  '🌱',
  '🛌',
  '🎵',
  '☕',
  '🚴',
  '🥗',
  '📝',
  '🧹',
];

export default function EmojiInput({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="h-11 w-11 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-2xl"
          aria-label="Scegli emoji"
        >
          {value || '🙂'}
        </button>
        <input
          className="input flex-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Emoji"
          maxLength={4}
        />
      </div>
      {open && (
        <div className="absolute z-10 mt-2 grid grid-cols-8 gap-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-2 shadow-lg">
          {QUICK.map((e) => (
            <button
              key={e}
              type="button"
              className="h-9 w-9 rounded-lg text-xl hover:bg-stone-100 dark:hover:bg-stone-800"
              onClick={() => {
                onChange(e);
                setOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
