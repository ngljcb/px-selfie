import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject} from 'rxjs';
import { ErrorHandlerService } from './error-handler.service';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { 
  Note, 
  NoteWithDetails, 
  CreateNoteRequest, 
  UpdateNoteRequest, 
  NoteFilterParams,
  NotesResponse,
  DuplicateNoteRequest,
  NotePreview,
  ShareNoteRequest,
  NotePermissions,
  BulkNoteOperation,
  NoteSortType,
  AccessibilityType
} from '../model/note.interface';

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private readonly apiUrl = `${environment.API_BASE_URL}/api/notes`; 

  private notesSubject = new BehaviorSubject<NoteWithDetails[]>([]);
  public notes$ = this.notesSubject.asObservable();
  
  private selectedNoteSubject = new BehaviorSubject<NoteWithDetails | null>(null);
  public selectedNote$ = this.selectedNoteSubject.asObservable();

  private totalNotesSubject = new BehaviorSubject<number>(0);
  public totalNotes$ = this.totalNotesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {}

  getNotes(filters?: NoteFilterParams): Observable<NotesResponse> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.searchQuery) params = params.set('search', filters.searchQuery);
      if (filters.categoryName) params = params.set('category', filters.categoryName);
      if (filters.accessibility) params = params.set('accessibility', filters.accessibility);
      if (filters.groupName) params = params.set('group', filters.groupName);
      if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
      if (filters.limit) params = params.set('limit', filters.limit.toString());
      if (filters.offset) params = params.set('offset', filters.offset.toString());
    }

    return this.http.get<NotesResponse>(`${this.apiUrl}`, { params })
      .pipe(
        map(response => ({
          ...response,
          notes: response.notes.map(note => this.enrichNoteWithMetadata(note))
        })),
        tap(response => {
          if (!filters?.offset || filters.offset === 0) {
            this.notesSubject.next(response.notes);
          }
          this.totalNotesSubject.next(response.total);
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  getNotePreviews(sortBy: NoteSortType.CREATION_DATE): Observable<NotePreview[]> {
    const params = new HttpParams()
      .set('preview', 'true')
      .set('sortBy', sortBy)
      .set('limit', '50');

    return this.http.get<NotePreview[]>(`${this.apiUrl}/previews`, { params })
      .pipe(
        map(previews => previews.map(preview => ({
          ...preview,
          preview: this.generatePreview(preview.preview)
        }))),
        catchError(this.errorHandler.handleError)
      );
  }

  getNoteById(id: string): Observable<NoteWithDetails> {
    return this.http.get<NoteWithDetails>(`${this.apiUrl}/${id}`)
      .pipe(
        map(note => this.enrichNoteWithMetadata(note)),
        tap(note => this.selectedNoteSubject.next(note)),
        catchError(this.errorHandler.handleError)
      );
  }

  createNote(noteData: CreateNoteRequest): Observable<NoteWithDetails> {
    return this.http.post<NoteWithDetails>(`${this.apiUrl}`, noteData)
      .pipe(
        map(note => this.enrichNoteWithMetadata(note)),
        tap(newNote => {
          // FIXED: Update local state correctly
          const currentNotes = this.notesSubject.value;
          const currentTotal = this.totalNotesSubject.value;
          
          this.notesSubject.next([newNote, ...currentNotes]);
          this.totalNotesSubject.next(currentTotal + 1);
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  updateNote(id: string, noteData: UpdateNoteRequest): Observable<NoteWithDetails> {
    return this.http.put<NoteWithDetails>(`${this.apiUrl}/${id}`, noteData)
      .pipe(
        map(note => this.enrichNoteWithMetadata(note)),
        tap(updatedNote => {
          const currentNotes = this.notesSubject.value;
          const index = currentNotes.findIndex(n => n.id === id);
          if (index !== -1) {
            currentNotes[index] = updatedNote;
            this.notesSubject.next([...currentNotes]);
          }
          if (this.selectedNoteSubject.value?.id === id) {
            this.selectedNoteSubject.next(updatedNote);
          }
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  deleteNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(() => {

          const currentNotes = this.notesSubject.value;
          const currentTotal = this.totalNotesSubject.value;
          
          const filteredNotes = currentNotes.filter(n => n.id !== id);
          this.notesSubject.next(filteredNotes);
          this.totalNotesSubject.next(Math.max(0, currentTotal - 1)); 

          if (this.selectedNoteSubject.value?.id === id) {
            this.selectedNoteSubject.next(null);
          }
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  duplicateNote(request: DuplicateNoteRequest): Observable<NoteWithDetails> {
    return this.http.post<NoteWithDetails>(`${this.apiUrl}/${request.sourceNoteId}/duplicate`, request)
      .pipe(
        map(note => this.enrichNoteWithMetadata(note)),
        tap(duplicatedNote => {
          // FIXED: Update local state correctly
          const currentNotes = this.notesSubject.value;
          const currentTotal = this.totalNotesSubject.value;
          
          this.notesSubject.next([duplicatedNote, ...currentNotes]);
          this.totalNotesSubject.next(currentTotal + 1); // Increment total count
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  shareNote(request: ShareNoteRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${request.noteId}/share`, request)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  getNotePermissions(noteId: string): Observable<NotePermissions> {
    return this.http.get<NotePermissions>(`${this.apiUrl}/${noteId}/permissions`)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  copyNoteContent(note: Note): Promise<void> {
    const content = `${note.title || 'Untitled'}\n\n${note.text || ''}`;
    
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(content);
    } else {
      return new Promise((resolve, reject) => {
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          textArea.remove();
          resolve();
        } catch (error) {
          textArea.remove();
          reject(error);
        }
      });
    }
  }

  bulkOperation(operation: BulkNoteOperation): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/bulk`, operation)
      .pipe(
        tap(() => {
          this.refreshNotes();
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  searchNotes(query: string, filters?: Omit<NoteFilterParams, 'searchQuery'>): Observable<NoteWithDetails[]> {
    const searchFilters: NoteFilterParams = { 
      ...filters, 
      searchQuery: query,
      limit: filters?.limit || 50
    };
    
    return this.getNotes(searchFilters).pipe(
      map(response => response.notes)
    );
  }

  getNotesByCategory(categoryName: string): Observable<NoteWithDetails[]> {
    return this.getNotes({ categoryName }).pipe(
      map(response => response.notes)
    );
  }

  getNotesByGroup(groupName: string): Observable<NoteWithDetails[]> {
    return this.getNotes({ groupName }).pipe(
      map(response => response.notes)
    );
  }

  getPublicNotes(): Observable<NoteWithDetails[]> {
    return this.getNotes({ accessibility: AccessibilityType.PUBLIC }).pipe(
      map(response => response.notes)
    );
  }

  refreshNotes(filters?: NoteFilterParams): Observable<NotesResponse> {
    return this.getNotes(filters);
  }

  clearSelectedNote(): void {
    this.selectedNoteSubject.next(null);
  }

  setSelectedNote(note: NoteWithDetails): void {
    this.selectedNoteSubject.next(note);
  }

  getCurrentNotes(): NoteWithDetails[] {
    return this.notesSubject.value;
  }

  getCurrentTotalNotes(): number {
    return this.totalNotesSubject.value;
  }

  canEditNote(note: Note, currentUserId: string): boolean {
    return note.creator === currentUserId;
  }

  canDeleteNote(note: Note, currentUserId: string): boolean {
    return note.creator === currentUserId;
  }

  canViewNote(note: Note, currentUserId: string, userGroups: string[] = []): boolean {

    if (note.creator === currentUserId) return true;

    if (note.accessibility === AccessibilityType.PUBLIC) return true;

    if (note.accessibility === AccessibilityType.GROUP && note.groupName && userGroups.includes(note.groupName)) {
      return true;
    }

    return note.accessibility === AccessibilityType.AUTHORIZED;
  }

  private enrichNoteWithMetadata(note: NoteWithDetails): NoteWithDetails {
    const preview = this.generatePreview(note.text || '');
    const contentLength = (note.text || '').length;
    
    return {
      ...note,
      preview,
      contentLength,
      createdAt: new Date(note.createdAt),
    };
  }

  private generatePreview(text: string): string {
    if (!text) return '';
    
    const cleanText = text
      .replace(/<[^>]*>/g, '') 
      .replace(/[#*_`]/g, '')
      .trim();
    
    if (cleanText.length <= 200) {
      return cleanText;
    }

    const truncated = cleanText.substring(0, 200);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > 200 * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  getNotesStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  sortNotesLocally(notes: NoteWithDetails[], sortBy: NoteSortType, order: 'asc' | 'desc' = 'desc'): NoteWithDetails[] {
    return [...notes].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case NoteSortType.ALPHABETICAL:
          const titleA = (a.title || 'Untitled').toLowerCase();
          const titleB = (b.title || 'Untitled').toLowerCase();
          comparison = titleA.localeCompare(titleB);
          break;
          
        case NoteSortType.CREATION_DATE:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
          
        case NoteSortType.CONTENT_LENGTH:
          comparison = (a.contentLength || 0) - (b.contentLength || 0);
          break;
          
        default:
          comparison = 0;
      }
      
      return order === 'asc' ? comparison : -comparison;
    });
  }

  filterNotesLocally(notes: NoteWithDetails[], query: string): NoteWithDetails[] {
    if (!query.trim()) return notes;
    
    const lowercaseQuery = query.toLowerCase();
    
    return notes.filter(note => 
      (note.title?.toLowerCase().includes(lowercaseQuery))
    );
  }

  async copyNoteToClipboard(note: Note): Promise<boolean> {
    try {
      await this.copyNoteContent(note);
      return true;
    } catch (error) {
      console.error('Failed to copy note:', error);
      return false;
    }
  }

  validateNote(noteData: CreateNoteRequest | UpdateNoteRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (noteData.title && noteData.title.length > 100) {
      errors.push(`Title cannot exceed ${100} characters`);
    }

    if (!noteData.text || noteData.text.trim().length === 0) {
      errors.push('Note content cannot be empty');
    }

    if (noteData.accessibility === AccessibilityType.GROUP && !noteData.groupName) {
      errors.push('Group name is required for group notes');
    }
    
    if (noteData.accessibility === AccessibilityType.AUTHORIZED && (!noteData.authorizedUserIds || noteData.authorizedUserIds.length === 0)) {
      errors.push('At least one authorized user is required for authorized notes');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  resetState(): void {
    this.notesSubject.next([]);
    this.selectedNoteSubject.next(null);
    this.totalNotesSubject.next(0); 
  }

  loadNotesForView(viewType: 'home' | 'list' | 'category' | 'group', identifier?: string): Observable<NoteWithDetails[]> {
    let filters: NoteFilterParams = {};
    
    switch (viewType) {
      case 'home':
        filters = { 
          sortBy: NoteSortType.CREATION_DATE,
          limit: 20 
        };
        break;
      case 'category':
        filters = { categoryName: identifier };
        break;
      case 'group':
        filters = { groupName: identifier };
        break;
      case 'list':
      default:
        filters = { 
          sortBy: NoteSortType.CREATION_DATE,
          limit: 20
        };
    }
    
    return this.getNotes(filters).pipe(
      map(response => response.notes)
    );
  }

  getNotesCountByAccessibility(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.apiUrl}/count-by-accessibility`)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }
}