import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import { ThemeProvider } from './state/theme';
import { ToastProvider } from './components/Toast';
import { seedIfEmpty } from './db/seed';
import Today from './views/Today';
import CalendarView from './views/Calendar';
import Dashboard from './views/Dashboard';
import Settings from './views/Settings';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedIfEmpty()
      .catch((err) => console.error('Seed error', err))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-stone-500">
        <span className="animate-pulse">Caricamento…</span>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <HashRouter>
          <div className="min-h-screen safe-bottom">
            <Routes>
              <Route path="/" element={<Today />} />
              <Route path="/calendario" element={<CalendarView />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/impostazioni" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <BottomNav />
        </HashRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
