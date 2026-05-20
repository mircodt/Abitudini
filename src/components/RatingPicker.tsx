import { useEffect, useState } from 'react';

interface Props {
  value: number; // 0 = nessuno
  onChange: (v: number) => void;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
};

export default function RatingPicker({ value, onChange, color, size = 'md' }: Props) {
  const [pulse, setPulse] = useState<number | null>(null);
  useEffect(() => {
    if (pulse !== null) {
      const t = setTimeout(() => setPulse(null), 400);
      return () => clearTimeout(t);
    }
  }, [pulse]);

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            aria-label={`Voto ${n}`}
            aria-pressed={value === n}
            onClick={() => {
              setPulse(n);
              onChange(value === n ? 0 : n);
            }}
            className={`${SIZE[size]} rounded-full font-semibold border transition active:scale-90 ${
              active
                ? 'text-white border-transparent shadow-sm'
                : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
            } ${pulse === n ? 'animate-pulse-once' : ''}`}
            style={
              active
                ? { backgroundColor: color ?? '#0f172a' }
                : undefined
            }
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
