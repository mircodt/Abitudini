interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  color?: string;
}

export default function Checkbox({ checked, onChange, label, hint, color }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
        checked
          ? 'border-transparent bg-stone-50 dark:bg-stone-800'
          : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800'
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
          checked
            ? 'border-transparent text-white'
            : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900'
        }`}
        style={checked ? { backgroundColor: color ?? '#0f172a' } : undefined}
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-pop-in">
            <path
              d="M5 12.5l4 4 10-10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span
          className={`block truncate text-[15px] ${
            checked ? 'line-through text-stone-500 dark:text-stone-400' : ''
          }`}
        >
          {label}
        </span>
        {hint && (
          <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{hint}</span>
        )}
      </span>
    </button>
  );
}
