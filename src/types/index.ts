export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domenica, 1 = lunedì ... 6 = sabato

export type TopicStatus = 'active' | 'paused' | 'archived';

export interface Topic {
  id: string;
  name: string;
  emoji: string;
  color: string; // hex
  order: number;
  status: TopicStatus;
  createdAt: number;
  /** opzionale: obiettivo numerico sulla media voti (es. ≥ 4) */
  goalAverage?: number;
  /** opzionale: periodo a cui si riferisce l'obiettivo (mese / settimana) */
  goalPeriod?: 'week' | 'month';
}

export type FrequencyType =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: Weekday[] } // giorni specifici
  | { kind: 'times-per-week'; target: number }; // X volte a settimana

export interface Subcategory {
  id: string;
  topicId: string;
  name: string;
  frequency: FrequencyType;
  order: number;
  active: boolean;
  createdAt: number;
}

/** Voto giornaliero per un topic (1..5, 0 = non valutato) */
export interface DailyRating {
  id: string; // `${date}|${topicId}`
  date: string; // YYYY-MM-DD
  topicId: string;
  rating: number; // 1..5
  updatedAt: number;
}

/** Completamento giornaliero di una sotto-categoria */
export interface DailyCheck {
  id: string; // `${date}|${subcategoryId}`
  date: string; // YYYY-MM-DD
  subcategoryId: string;
  done: boolean;
  updatedAt: number;
}

export interface DailyNote {
  date: string; // YYYY-MM-DD, primary key
  text: string;
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: string;
}

export interface ExportPayload {
  version: 1;
  exportedAt: string;
  topics: Topic[];
  subcategories: Subcategory[];
  ratings: DailyRating[];
  checks: DailyCheck[];
  notes: DailyNote[];
  settings: Setting[];
}
