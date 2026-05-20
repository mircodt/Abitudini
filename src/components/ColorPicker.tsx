interface Props {
  value: string;
  onChange: (v: string) => void;
}

const PALETTE = [
  '#2563eb',
  '#16a34a',
  '#9333ea',
  '#db2777',
  '#ea580c',
  '#0891b2',
  '#facc15',
  '#dc2626',
  '#14b8a6',
  '#6366f1',
  '#84cc16',
  '#78716c',
];

export default function ColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Colore ${c}`}
          onClick={() => onChange(c)}
          className={`h-9 w-9 rounded-full border-2 transition ${
            value === c
              ? 'border-stone-800 dark:border-stone-200 scale-110'
              : 'border-transparent'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}
