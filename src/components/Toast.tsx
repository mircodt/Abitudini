import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

interface Ctx {
  show: (message: string, tone?: ToastItem['tone']) => void;
}

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const t = setTimeout(() => {
      setItems((prev) => prev.slice(1));
    }, 2400);
    return () => clearTimeout(t);
  }, [items]);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 sm:bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-full px-4 py-2 text-sm shadow-lg animate-slide-up ${
              t.tone === 'success'
                ? 'bg-emerald-600 text-white'
                : t.tone === 'error'
                  ? 'bg-rose-600 text-white'
                  : 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast deve essere usato dentro ToastProvider');
  return ctx;
}
