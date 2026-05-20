import Dexie, { type Table } from 'dexie';
import type {
  Topic,
  Subcategory,
  DailyRating,
  DailyCheck,
  DailyNote,
  Setting,
} from '../types';

export class AbitudiniDB extends Dexie {
  topics!: Table<Topic, string>;
  subcategories!: Table<Subcategory, string>;
  ratings!: Table<DailyRating, string>;
  checks!: Table<DailyCheck, string>;
  notes!: Table<DailyNote, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('abitudini-db');
    this.version(1).stores({
      topics: 'id, status, order',
      subcategories: 'id, topicId, active, order',
      ratings: 'id, date, topicId, [date+topicId]',
      checks: 'id, date, subcategoryId, [date+subcategoryId]',
      notes: 'date',
      settings: 'key',
    });
  }
}

export const db = new AbitudiniDB();
