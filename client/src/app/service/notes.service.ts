// notes/client/service/notes.service.ts

import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Observable, from, map, catchError, throwError, BehaviorSubject } from 'rxjs';
import { 
  Note, 
  NotePreview, 
  CreateNoteDto, 
  UpdateNoteDto, 
  DeleteNoteDto,
  DuplicateNoteDto,
  NotesFilter,
  NotesResponse,
  NotesListResponse,
  SortType,
  NOTES_CONFIG 
} from '../model/note.interface';

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private supabase: SupabaseClient;
  private notesSubject = new BehaviorSubject<NotePreview[]>([]);
  public notes$ = this.notesSubject.asObservable();

  constructor() {
    this.supabase = createClient(
      'YOUR_SUPABASE_URL', // Sostituire con la tua URL
      'YOUR_SUPABASE_ANON_KEY' // Sostituire con la tua chiave
    );
  }

  // ========== OPERAZIONI CRUD ==========

  /**
   * Recupera tutte le note dell'utente corrente con filtri
   */
  getNotes(filters?: NotesFilter): Observable<NotesListResponse> {
    return from(this.fetchNotesFromDB(filters)).pipe(
      map(data => {
        const notes = this.convertToNotePreviews(data);
        const filteredNotes = this.applyFilters(notes, filters);
        
        // Aggiorna il subject
        this.notesSubject.next(filteredNotes);
        
        return {
          notes: filteredNotes,
          total: filteredNotes.length,
          page: 1,
          pageSize: filteredNotes.length,
          hasMore: false
        };
      }),
      catchError(error => {
        console.error('Errore nel recupero delle note:', error);
        return throwError(() => new Error('Impossibile recuperare le note'));
      })
    );
  }

  /**
   * Recupera una singola nota per ID
   */
  getNoteById(id: string): Observable<NotesResponse<Note>> {
    return from(
      this.supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return {
          data: this.convertDBNoteToNote(data),
          error: null,
          success: true
        };
      }),
      catchError(error => {
        console.error('Errore nel recupero della nota:', error);
        return throwError(() => new Error('Nota non trovata'));
      })
    );
  }

  /**
   * Crea una nuova nota
   */
  createNote(noteData: CreateNoteDto): Observable<NotesResponse<Note>> {
    const noteToCreate = {
      title: noteData.title.trim(),
      text: noteData.text,
      category: noteData.category || null,
      accessibility: noteData.accessibility,
      group_name: noteData.group_name || null
    };

    return from(
      this.supabase
        .from('notes')
        .insert([noteToCreate])
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        
        const newNote = this.convertDBNoteToNote(data);
        this.refreshNotes(); // Aggiorna la lista
        
        return {
          data: newNote,
          error: null,
          success: true
        };
      }),
      catchError(error => {
        console.error('Errore nella creazione della nota:', error);
        return throwError(() => new Error('Impossibile creare la nota'));
      })
    );
  }

  /**
   * Aggiorna una nota esistente
   */
  updateNote(id: string, noteData: UpdateNoteDto): Observable<NotesResponse<Note>> {
    const updateData: any = {
      last_modify: new Date().toISOString()
    };

    if (noteData.title !== undefined) updateData.title = noteData.title.trim();
    if (noteData.text !== undefined) updateData.text = noteData.text;
    if (noteData.category !== undefined) updateData.category = noteData.category || null;
    if (noteData.accessibility !== undefined) updateData.accessibility = noteData.accessibility;
    if (noteData.group_name !== undefined) updateData.group_name = noteData.group_name || null;

    return from(
      this.supabase
        .from('notes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        
        const updatedNote = this.convertDBNoteToNote(data);
        this.refreshNotes(); // Aggiorna la lista
        
        return {
          data: updatedNote,
          error: null,
          success: true
        };
      }),
      catchError(error => {
        console.error('Errore nell\'aggiornamento della nota:', error);
        return throwError(() => new Error('Impossibile aggiornare la nota'));
      })
    );
  }

  /**
   * Elimina una nota
   */
  deleteNote(deleteData: DeleteNoteDto): Observable<NotesResponse<boolean>> {
    return from(
      this.supabase
        .from('notes')
        .delete()
        .eq('id', deleteData.note_id)
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
        
        this.refreshNotes(); // Aggiorna la lista
        
        return {
          data: true,
          error: null,
          success: true
        };
      }),
      catchError(error => {
        console.error('Errore nell\'eliminazione della nota:', error);
        return throwError(() => new Error('Impossibile eliminare la nota'));
      })
    );
  }

  /**
   * Duplica una nota esistente
   */
  duplicateNote(){
    //to do
  }

  // ========== UTILITY METHODS ==========

  /**
   * Copia il contenuto di una nota negli appunti
   */
  async copyNoteContent(noteId: string): Promise<boolean> {
    try {
      const response = await this.getNoteById(noteId).toPromise();
      if (!response?.success || !response.data) {
        return false;
      }
      
      const content = `${response.data.title}\n\n${response.data.text}`;
      return await this.copyToClipboard(content);
    } catch (error) {
      console.error('Errore nel copiare il contenuto:', error);
      return false;
    }
  }

  /**
   * Valida i dati di una nota
   */
  validateNote(title: string, text: string, category?: string): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    
    if (!title || title.trim().length === 0) {
      errors[0] = 'Il titolo è obbligatorio';
    } else if (title.length > NOTES_CONFIG.MAX_TITLE_LENGTH) {
      errors[0] = `Il titolo non può superare ${NOTES_CONFIG.MAX_TITLE_LENGTH} caratteri`;
    }
    
    if (category && category.length > NOTES_CONFIG.MAX_CATEGORY_LENGTH) {
      errors[2] = `La categoria non può superare ${NOTES_CONFIG.MAX_CATEGORY_LENGTH} caratteri`;
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // ========== PRIVATE METHODS ==========

  private async fetchNotesFromDB(filters?: NotesFilter): Promise<any[]> {
    let query = this.supabase
      .from('notes')
      .select('*')
      .eq('creator', (await this.supabase.auth.getUser()).data.user?.id);

    // Applica filtri a livello DB dove possibile
    if (filters?.category && filters.category !== '') {
      query = query.eq('category', filters.category);
    }
    
    if (filters?.accessibility) {
      query = query.eq('accessibility', filters.accessibility);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data || [];
  }

  private convertDBNoteToNote(dbNote: any): Note {
    return {
      id: dbNote.id,
      creator: dbNote.creator,
      title: dbNote.title || '',
      text: dbNote.text || '',
      created_at: new Date(dbNote.created_at),
      last_modify: new Date(dbNote.last_modify),
      category: dbNote.category,
      accessibility: dbNote.accessibility,
      group_name: dbNote.group_name
    };
  }

  private convertToNotePreviews(dbNotes: any[]): NotePreview[] {
    return dbNotes.map(dbNote => {
      const note = this.convertDBNoteToNote(dbNote);
      return {
        id: note.id,
        title: note.title || 'Nota senza titolo',
        preview: this.truncateText(note.text, NOTES_CONFIG.PREVIEW_LENGTH),
        category: note.category,
        accessibility: note.accessibility,
        created_at: note.created_at,
        last_modify: note.last_modify,
        creator: note.creator,
        group_name: note.group_name,
        contentLength: note.text?.length || 0,
        isOwner: true // Dato che prendiamo solo le note dell'utente corrente
      };
    });
  }

  private applyFilters(notes: NotePreview[], filters?: NotesFilter): NotePreview[] {
    if (!filters) return this.sortNotes(notes, 'data', 'desc'); // Default: più recente
    
    let filteredNotes = [...notes];
    
    // Filtro ricerca testuale
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      filteredNotes = filteredNotes.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.preview.toLowerCase().includes(query) ||
        (note.category && note.category.toLowerCase().includes(query))
      );
    }
    
    return this.sortNotes(filteredNotes, filters.sortBy, filters.sortOrder);
  }

  private sortNotes(notes: NotePreview[], sortBy: SortType, sortOrder: 'asc' | 'desc' = 'desc'): NotePreview[] {
    return [...notes].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'alfabetico':
          // Ordinamento alfabetico per titolo
          comparison = a.title.toLowerCase().localeCompare(b.title.toLowerCase(), 'it');
          break;
          
        case 'data':
          // Ordinamento per data di ultima modifica
          comparison = new Date(a.last_modify).getTime() - new Date(b.last_modify).getTime();
          break;
          
        case 'lunghezza':
          // Ordinamento per lunghezza del contenuto
          comparison = a.contentLength - b.contentLength;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private truncateText(text: string | null, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  private generateDuplicateTitle(originalTitle: string): string {
    const copyPrefix = 'Copia di ';
    
    if (originalTitle.startsWith(copyPrefix)) {
      const match = originalTitle.match(/^Copia di (.+?)( \((\d+)\))?$/);
      if (match) {
        const baseTitle = match[1];
        const currentNumber = match[3] ? parseInt(match[3]) : 1;
        return `Copia di ${baseTitle} (${currentNumber + 1})`;
      }
    }
    
    return `${copyPrefix}${originalTitle}`;
  }

  private async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback per browser più vecchi
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        textArea.style.opacity = '0';
        
        document.body.appendChild(textArea);
        textArea.select();
        textArea.setSelectionRange(0, 99999);
        
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      }
    } catch (error) {
      console.error('Errore nel copiare il testo:', error);
      return false;
    }
  }

  private refreshNotes(): void {
    // Ricarica le note correnti mantenendo gli eventuali filtri attivi
    this.getNotes().subscribe();
  }
}