import { NoteType } from '../note.interface';

export interface UpdateNoteRequest {
  titolo?: string;
  contenuto?: string;
  categoria?: string;
  tipo?: NoteType;
}