// notes/client/models/note.interface.ts

/**
 * Interfaccia per la tabella utenti
 */
export interface User {
  email: string;
  password: string;
}

/**
 * Interfaccia per la tabella categoria
 */
export interface Category {
  nome: string;
}

/**
 * Enum per i tipi di nota
 */
export type NoteType = 'pubblico' | 'privato' | 'condiviso' | 'di_gruppo';

/**
 * Interfaccia completa per la tabella nota
 */
export interface Note {
  id: number;
  titolo: string;
  contenuto: string;
  data_creazione: Date;
  data_ultima_modifica: Date;
  categoria: string;
  proprietario: string; // email dell'utente
  tipo: NoteType;
}

/**
 * Interfaccia per la preview delle note (usata in notes-view)
 * Omette il contenuto completo e aggiunge campi calcolati
 */
export interface NotePreview extends Omit<Note, 'contenuto'> {
  preview: string; // Primi 200+ caratteri del contenuto
  contentLength: number; // Lunghezza totale del contenuto
  isOwner: boolean; // True se l'utente corrente è il proprietario
}

/**
 * Interfaccia per i dati del form dell'editor
 */
export interface NoteFormData {
  titolo: string;
  contenuto: string;
  categoria: string;
  tipo: NoteType;
}

/**
 * Interfaccia per i filtri applicabili alle note
 */
export interface NotesFilter {
  search?: string;
  categoria?: string;
  tipo?: NoteType;
  sortBy?: 'alfabetico' | 'data' | 'lunghezza';
}

/**
 * Interfaccia per le richieste di creazione nota
 */
export interface CreateNoteRequest {
  titolo: string;
  contenuto: string;
  categoria: string;
  tipo: NoteType;
}

/**
 * Interfaccia per le richieste di aggiornamento nota
 */
export interface UpdateNoteRequest {
  titolo?: string;
  contenuto?: string;
  categoria?: string;
  tipo?: NoteType;
}

/**
 * Interfaccia per le risposte API standard
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Interfaccia per le risposte paginaten (per future implementazioni)
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Costanti per i tipi di nota
 */
export const NOTE_TYPES: { value: NoteType; label: string; icon: string }[] = [
  { value: 'privato', label: 'Privato', icon: '🔒' },
  { value: 'pubblico', label: 'Pubblico', icon: '🌍' },
  { value: 'condiviso', label: 'Condiviso', icon: '📤' },
  { value: 'di_gruppo', label: 'Di Gruppo', icon: '👥' }
];

/**
 * Costanti per i tipi di ordinamento
 */
export const SORT_OPTIONS: { value: 'alfabetico' | 'data' | 'lunghezza'; label: string }[] = [
  { value: 'alfabetico', label: 'Alfabetico (A-Z)' },
  { value: 'data', label: 'Per Data (Più recenti)' },
  { value: 'lunghezza', label: 'Per Lunghezza' }
];

/**
 * Costanti di configurazione
 */
export const NOTES_CONFIG = {
  PREVIEW_LENGTH: 200, // Numero minimo di caratteri per la preview
  MAX_TITLE_LENGTH: 100,
  MAX_CATEGORY_LENGTH: 50,
  AUTOSAVE_DELAY: 2000 // millisecondi
} as const;