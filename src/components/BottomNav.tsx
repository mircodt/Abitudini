import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', label: 'Oggi', icon: '✓' },
  { to: '/calendario', label: 'Calendario', icon: '📅' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/impostazioni', label: 'Impostazioni', icon: '⚙️' },
];

export default function BottomNav() {
  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 dark:border-border-dark bg-white/95 dark:bg-surface-dark/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-between">
        {ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition ${
                isActive
                  ? 'text-stone-900 dark:text-white'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
              }`
            }
          >
            <span aria-hidden className="text-lg leading-none">
              {it.icon}
            </span>
            <span>{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
