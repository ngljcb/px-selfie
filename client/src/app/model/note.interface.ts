// notes/client/model/note.interface.ts

// Enum per i tipi di accessibilità (corrispondente all'enum del DB)
export type AccessibilityType = 'private' | 'public' | 'authorized' | 'group';

// Enum per i tipi di ordinamento
export type SortType = 'alfabetico' | 'data' | 'lunghezza';

// Configurazione costanti per le note
export const NOTES_CONFIG = {
  PREVIEW_LENGTH: 200, // Minimo 200 caratteri come da specifiche
  AUTOSAVE_DELAY: 2000, // Delay per auto-save in ms
  MAX_TITLE_LENGTH: 100,
  MAX_CATEGORY_LENGTH: 50
} as const;

// Opzioni per l'ordinamento delle note
export const SORT_OPTIONS = [
  { value: 'alfabetico' as const, label: 'Ordine Alfabetico' },
  { value: 'data' as const, label: 'Data Modifica' },
  { value: 'lunghezza' as const, label: 'Lunghezza Contenuto' }
] as const;

// Opzioni per i tipi di accessibilità
export const NOTE_TYPES = [
  { value: 'private' as const, label: 'Privata'},
  { value: 'public' as const, label: 'Pubblica'},
  { value: 'authorized' as const, label: 'Condivisa'},
  { value: 'group' as const, label: 'Di Gruppo'}
] as const;

// Interfaccia principale per una nota (corrispondente alla tabella DB)
export interface Note {
  id: string;
  creator: string;
  title: string;
  text: string;
  created_at: Date;
  last_modify: Date;
  category: string | null;
  accessibility: AccessibilityType;
  group_name: string | null;
}

// Interfaccia per l'anteprima delle note (usata nella lista)
export interface NotePreview {
  id: string;
  title: string;
  preview: string; // Primi N caratteri del testo
  category: string | null;
  accessibility: AccessibilityType;
  created_at: Date;
  last_modify: Date;
  creator: string;
  group_name: string | null;
  contentLength: number; // Lunghezza totale del contenuto per ordinamento
  isOwner: boolean; // Se l'utente corrente è il proprietario
}

// Interfaccia per i dati del form di creazione/modifica nota
export interface NoteFormData {
  title: string;
  text: string;
  category: string | null;
  accessibility: AccessibilityType;
  group_name?: string | null;
}

// Interfaccia per i filtri delle note
export interface NotesFilter {
  searchQuery?: string;
  category?: string;
  accessibility?: AccessibilityType;
  sortBy: SortType;
  sortOrder: 'asc' | 'desc';
}

// Interfaccia per le categorie
export interface Category {
  name: string;
}

// Interfaccia per i gruppi
export interface Group {
  name: string;
  creator: string | null;
}

// Interfaccia per gli utenti autorizzati ad accedere a una nota
export interface NoteAuthorizedUser {
  id: string;
  note_id: string;
  user_id: string;
  granted_at: Date;
}

// DTO per la creazione di una nuova nota
export interface CreateNoteDto {
  title: string;
  text: string;
  category: string;
  accessibility: AccessibilityType;
  group_name: string;
}

// DTO per l'aggiornamento di una nota
export interface UpdateNoteDto {
  title?: string;
  text?: string;
  category?: string;
  accessibility?: AccessibilityType;
  group_name?: string;
}

// DTO per la duplicazione di una nota
export interface DuplicateNoteDto {
  original_note_id: string;
  new_title?: string;
}

// DTO per l'eliminazione di una nota
export interface DeleteNoteDto {
  note_id: string;
}

// Response type per le operazioni sulle note
export interface NotesResponse<T = any> {
  data: T;
  error: string | null;
  success: boolean;
}

// Response type per la lista paginata di note
export interface NotesListResponse {
  notes: NotePreview[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Interfaccia per le statistiche delle note (opzionale, per dashboard)
export interface NotesStats {
  totalNotes: number;
  notesByCategory: Record<string, number>;
  notesByAccessibility: Record<AccessibilityType, number>;
  averageNoteLength: number;
  lastCreated: Date | null;
  lastModified: Date | null;
}

// Utility types per la gestione dello stato
export type NoteLoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface NotesState {
  notes: NotePreview[];
  categories: Category[];
  groups: Group[];
  currentNote: Note | null;
  filters: NotesFilter;
  loading: NoteLoadingState;
  error: string | null;
  totalNotes: number;
}

// Interfaccia per l'editor delle note
export interface NoteEditorState {
  mode: 'create' | 'edit' | 'view' | 'duplicate';
  isReadOnly: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  autoSaveEnabled: boolean;
}