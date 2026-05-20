# Abitudini

Tracker personale di abitudini e benessere. Web app **100% locale**: nessun
backend, nessun account, tutti i dati restano nel tuo browser (IndexedDB).

## Caratteristiche principali

- **Oggi**: per ogni topic dai un voto da 1 a 5 in pochi tap, spunti le
  attività ripetitive e annoti le note della giornata.
- **Calendario**: vista mensile con i giorni colorati in base al punteggio
  medio. Tocca un giorno per vedere o modificare il dettaglio.
- **Dashboard**: media complessiva, grafici di andamento per topic,
  percentuale di completamento e streak delle attività, confronto periodo
  corrente vs precedente, topic più forte / più debole, focus suggerito,
  insight automatici in linguaggio naturale, riconoscimenti per le streak,
  barra di avanzamento degli obiettivi.
- **Impostazioni**: crea, modifica, riordina (drag & drop), metti in pausa
  o archivia topic; gestisci le sotto-categorie con frequenze
  configurabili (giornaliera, giorni specifici, X volte a settimana);
  cambia tema (chiaro / scuro / sistema); export / import JSON di tutti i
  dati.

## Stack tecnico

- **React 19 + TypeScript** con **Vite**
- **Tailwind CSS** per lo styling, mobile-first
- **Dexie** (IndexedDB) per la persistenza locale, con `dexie-react-hooks`
  per query reattive
- **Recharts** per i grafici
- **@dnd-kit** per il riordino drag & drop
- **react-router-dom** per la navigazione
- **date-fns** con locale italiano

## Avvio in locale

Richiede **Node.js ≥ 18**.

```bash
npm install
npm run dev
```

Apri `http://localhost:5173` nel browser. Al primo avvio l'app
pre-popola alcuni topic di esempio (Lavoro, Attività fisica, Meditazione,
Famiglia, Finanze personali) che puoi modificare o eliminare liberamente
dalla schermata Impostazioni.

## Build di produzione

```bash
npm run build
npm run preview     # serve la build da http://localhost:4173
```

I file ottimizzati vengono generati nella cartella `dist/` e possono
essere serviti da qualsiasi static host (Netlify, Vercel, Cloudflare
Pages, GitHub Pages, un semplice `nginx`, ecc.).

## Backup dei dati

- **Esporta**: Impostazioni → "Esporta JSON". Salva su disco un file
  `abitudini-backup-AAAA-MM-GG.json` con tutti i topic, sotto-categorie,
  voti, check, note e settings.
- **Importa**: Impostazioni → "Importa JSON". Sovrascrive completamente i
  dati esistenti (l'app chiede conferma).

## Struttura del progetto

```
src/
├── App.tsx                # Router + provider tema/toast + seed iniziale
├── main.tsx
├── index.css              # Tailwind + utility globali
├── types/                 # Tipi dominio (Topic, Subcategory, ratings…)
├── db/
│   ├── database.ts        # Schema Dexie / IndexedDB
│   ├── repo.ts            # Repository CRUD + export/import
│   └── seed.ts            # Topic e attività di esempio
├── lib/
│   ├── date.ts            # Utility data, periodi, weekday
│   ├── id.ts              # uid()
│   └── analytics.ts       # Aggregati, trend, streak, insight, badge
├── state/
│   ├── theme.tsx          # Provider tema chiaro/scuro/sistema
│   └── useLive.ts         # Re-export di useLiveQuery
├── components/            # UI riutilizzabile (RatingPicker, Checkbox,
│                          #   BottomNav, Header, Modal, Toast, …)
└── views/
    ├── Today.tsx          # Schermata "Oggi"
    ├── Calendar.tsx       # Calendario mensile + dettaglio giorno
    ├── Dashboard.tsx      # Analisi e insight
    └── Settings.tsx       # Gestione topic, sotto-categorie, tema, dati
```

## Modello dati

- **Topic** — nome, emoji, colore, ordine, stato (`active` / `paused` /
  `archived`), obiettivo opzionale (`goalAverage`, `goalPeriod`).
- **Subcategory** — appartiene a un topic; ha una frequenza target che
  può essere `daily`, `weekdays` (lista di giorni 0–6, dove 1 = lunedì)
  oppure `times-per-week` (numero).
- **DailyRating** — voto 1–5 per `(date, topic)`.
- **DailyCheck** — completamento per `(date, subcategory)`.
- **DailyNote** — testo libero per `date`.
- **Setting** — coppie chiave/valore per preferenze future.

I dati sono salvati in un database Dexie chiamato `abitudini-db`
(visibile da DevTools → Application → IndexedDB).
