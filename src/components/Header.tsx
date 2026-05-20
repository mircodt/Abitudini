import { useTheme } from '../state/theme';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export default function Header({ title, subtitle, right }: Props) {
  const { resolved, setMode } = useTheme();
  return (
    <header className="sticky top-0 z-30 bg-bg/85 dark:bg-bg-dark/85 backdrop-blur safe-top">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-stone-500 dark:text-stone-400">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          <button
            type="button"
            aria-label="Cambia tema"
            onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')}
            className="btn-ghost h-9 w-9 !p-0"
            title="Cambia tema"
          >
            {resolved === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
}
