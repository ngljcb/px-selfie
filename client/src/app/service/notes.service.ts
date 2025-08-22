import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject} from 'rxjs';
import { ErrorHandlerService } from './error-handler.service';
import { map, catchError, tap } from 'rxjs/operators';
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
  private readonly apiUrl = '/api/notes'; // Base API URL
  
  // Reactive state management
  private notesSubject = new BehaviorSubject<NoteWithDetails[]>([]);
  public notes$ = this.notesSubject.asObservable();
  
  private selectedNoteSubject = new BehaviorSubject<NoteWithDetails | null>(null);
  public selectedNote$ = this.selectedNoteSubject.asObservable();

  // FIXED: Add totalNotes state management
  private totalNotesSubject = new BehaviorSubject<number>(0);
  public totalNotes$ = this.totalNotesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {}

  // ==================== CORE CRUD OPERATIONS ====================

  /**
   * Get all notes with filtering and pagination
   */
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
          // FIXED: Update both notes and total count
          if (!filters?.offset || filters.offset === 0) {
            this.notesSubject.next(response.notes);
          }
          // ALWAYS update total count regardless of pagination
          this.totalNotesSubject.next(response.total);
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Get note previews for home page display
   */
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

  /**
   * Get a single note by ID
   */
  getNoteById(id: string): Observable<NoteWithDetails> {
    return this.http.get<NoteWithDetails>(`${this.apiUrl}/${id}`)
      .pipe(
        map(note => this.enrichNoteWithMetadata(note)),
        tap(note => this.selectedNoteSubject.next(note)),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Create a new note
   */
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

  /**
   * Update an existing note
   */
  updateNote(id: string, noteData: UpdateNoteRequest): Observable<NoteWithDetails> {
    return this.http.put<NoteWithDetails>(`${this.apiUrl}/${id}`, noteData)
      .pipe(
        map(note => this.enrichNoteWithMetadata(note)),
        tap(updatedNote => {
          // Update local state
          const currentNotes = this.notesSubject.value;
          const index = currentNotes.findIndex(n => n.id === id);
          if (index !== -1) {
            currentNotes[index] = updatedNote;
            this.notesSubject.next([...currentNotes]);
          }
          // Update selected note if it's the same
          if (this.selectedNoteSubject.value?.id === id) {
            this.selectedNoteSubject.next(updatedNote);
          }
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Delete a note
   */
  deleteNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(() => {
          // FIXED: Update both notes and total count
          const currentNotes = this.notesSubject.value;
          const currentTotal = this.totalNotesSubject.value;
          
          const filteredNotes = currentNotes.filter(n => n.id !== id);
          this.notesSubject.next(filteredNotes);
          this.totalNotesSubject.next(Math.max(0, currentTotal - 1)); // Decrement total count
          
          // Clear selected note if it's the deleted one
          if (this.selectedNoteSubject.value?.id === id) {
            this.selectedNoteSubject.next(null);
          }
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  // ==================== SPECIALIZED OPERATIONS ====================

  /**
   * Duplicate an existing note
   */
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

  /**
   * Share note with specific users
   */
  shareNote(request: ShareNoteRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${request.noteId}/share`, request)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Get note permissions for current user
   */
  getNotePermissions(noteId: string): Observable<NotePermissions> {
    return this.http.get<NotePermissions>(`${this.apiUrl}/${noteId}/permissions`)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Copy note content to clipboard
   */
  copyNoteContent(note: Note): Promise<void> {
    const content = `${note.title || 'Untitled'}\n\n${note.text || ''}`;
    
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(content);
    } else {
      // Fallback for older browsers
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

  /**
   * Bulk operations on multiple notes
   */
  bulkOperation(operation: BulkNoteOperation): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/bulk`, operation)
      .pipe(
        tap(() => {
          // Refresh notes after bulk operation
          this.refreshNotes();
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  // ==================== SEARCH AND FILTERING ====================

  /**
   * Search notes by text content and title
   */
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

  /**
   * Get notes by category
   */
  getNotesByCategory(categoryName: string): Observable<NoteWithDetails[]> {
    return this.getNotes({ categoryName }).pipe(
      map(response => response.notes)
    );
  }

  /**
   * Get notes by group
   */
  getNotesByGroup(groupName: string): Observable<NoteWithDetails[]> {
    return this.getNotes({ groupName }).pipe(
      map(response => response.notes)
    );
  }

  /**
   * Get public notes
   */
  getPublicNotes(): Observable<NoteWithDetails[]> {
    return this.getNotes({ accessibility: AccessibilityType.PUBLIC }).pipe(
      map(response => response.notes)
    );
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Refresh notes from server
   */
  refreshNotes(filters?: NoteFilterParams): Observable<NotesResponse> {
    return this.getNotes(filters);
  }

  /**
   * Clear selected note
   */
  clearSelectedNote(): void {
    this.selectedNoteSubject.next(null);
  }

  /**
   * Set selected note
   */
  setSelectedNote(note: NoteWithDetails): void {
    this.selectedNoteSubject.next(note);
  }

  /**
   * Get current notes from local state
   */
  getCurrentNotes(): NoteWithDetails[] {
    return this.notesSubject.value;
  }

  /**
   * FIXED: Get current total notes count
   */
  getCurrentTotalNotes(): number {
    return this.totalNotesSubject.value;
  }

  /**
   * DEBUG: Get all current state for debugging
   */
  getDebugState(): { notes: number; total: number } {
    return {
      notes: this.notesSubject.value.length,
      total: this.totalNotesSubject.value
    };
  }

  /**
   * Check if user can edit note
   */
  canEditNote(note: Note, currentUserId: string): boolean {
    return note.creator === currentUserId;
  }

  /**
   * Check if user can delete note
   */
  canDeleteNote(note: Note, currentUserId: string): boolean {
    return note.creator === currentUserId;
  }

  /**
   * Check if user can view note
   */
  canViewNote(note: Note, currentUserId: string, userGroups: string[] = []): boolean {
    // Creator can always view
    if (note.creator === currentUserId) return true;
    
    // Public notes are viewable by everyone
    if (note.accessibility === AccessibilityType.PUBLIC) return true;
    
    // Group notes are viewable by group members
    if (note.accessibility === AccessibilityType.GROUP && note.groupName && userGroups.includes(note.groupName)) {
      return true;
    }
    
    // For authorized notes, we need to check with backend
    // This will be handled in the component by calling getNotePermissions
    return note.accessibility === AccessibilityType.AUTHORIZED;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Enrich note with computed metadata
   */
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

  /**
   * Generate preview text (first N characters)
   */
  private generatePreview(text: string): string {
    if (!text) return '';
    
    const cleanText = text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[#*_`]/g, '') // Remove markdown formatting
      .trim();
    
    if (cleanText.length <= 200) {
      return cleanText;
    }
    
    // Find the last complete word within the limit
    const truncated = cleanText.substring(0, 200);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > 200 * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  // ==================== ADVANCED FEATURES ====================

  /**
   * Get notes statistics for dashboard
   */
  getNotesStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  // ==================== SORTING UTILITIES ====================

  /**
   * Sort notes locally (for immediate UI feedback)
   */
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

  /**
   * Filter notes locally by search query
   */
  filterNotesLocally(notes: NoteWithDetails[], query: string): NoteWithDetails[] {
    if (!query.trim()) return notes;
    
    const lowercaseQuery = query.toLowerCase();
    
    return notes.filter(note => 
      (note.title?.toLowerCase().includes(lowercaseQuery))
    );
  }

  // ==================== CLIPBOARD OPERATIONS ====================

  /**
   * Paste content from clipboard
   */
  async pasteFromClipboard(): Promise<string> {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        return await navigator.clipboard.readText();
      } catch (error) {
        console.warn('Could not read from clipboard:', error);
        return '';
      }
    }
    return '';
  }

  /**
   * Copy note title and content
   */
  async copyNoteToClipboard(note: Note): Promise<boolean> {
    try {
      await this.copyNoteContent(note);
      return true;
    } catch (error) {
      console.error('Failed to copy note:', error);
      return false;
    }
  }

  // ==================== VALIDATION UTILITIES ====================

  /**
   * Validate note data before submission
   */
  validateNote(noteData: CreateNoteRequest | UpdateNoteRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Title validation
    if (noteData.title && noteData.title.length > 100) {
      errors.push(`Title cannot exceed ${100} characters`);
    }
    
    // Content validation
    if (!noteData.text || noteData.text.trim().length === 0) {
      errors.push('Note content cannot be empty');
    }
    
    // Accessibility validation
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

  // ==================== STATE MANAGEMENT ====================

  /**
   * Reset service state
   */
  resetState(): void {
    this.notesSubject.next([]);
    this.selectedNoteSubject.next(null);
    this.totalNotesSubject.next(0); // FIXED: Reset total count
  }

  /**
   * Load notes for specific view
   */
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

  /**
   * Get notes count by accessibility type
   */
  getNotesCountByAccessibility(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.apiUrl}/count-by-accessibility`)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }
}