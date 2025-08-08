// notes/client/components/notes-view/notes-view.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';

// Import del componente NoteBoxComponent
import { NoteBoxComponent } from '../note-box/note-box.component';

// Import modelli e servizi
import { 
  NotePreview, 
  Category, 
  NotesFilter, 
  SORT_OPTIONS, 
  AccessibilityType,
  NOTE_TYPES,
  SortType
} from '../../model/note.interface';
import { NotesNavigationService } from '../../service/notes-navigation.service';
import { NotesService } from '../../service/notes.service';

@Component({
  selector: 'app-notes-view',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    NoteBoxComponent
  ],
  templateUrl: './notes-view.component.html'
})
export class NotesViewComponent implements OnInit, OnDestroy {
  
  // Dati delle note
  allNotes: NotePreview[] = [];
  filteredNotes: NotePreview[] = [];
  categories: Category[] = [];
  totalNotes = 0;

  // Stati dell'interfaccia
  isLoading = false;
  errorMessage = '';
  showSuccessMessage = '';

  // Filtri
  searchQuery = '';
  selectedCategory = '';
  selectedType: AccessibilityType | '' = '';
  selectedSortOption = 'data-desc'; // Formato: 'sortBy-sortOrder'

  // Costanti per il template
  noteTypes = NOTE_TYPES;
  sortOptions = SORT_OPTIONS;

  // Subject per cleanup
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private navigationService: NotesNavigationService,
    private notesService: NotesService,
  ) {
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.applyFilters();
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== CARICAMENTO DATI ==========

  /**
   * Carica i dati iniziali (note e categorie)
   */
  private loadInitialData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Carica sia note che categorie in parallelo
    combineLatest([
      this.notesService.getNotes(this.buildCurrentFilter()),
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ([notesResponse]) => {
        if (notesResponse) {
          this.allNotes = notesResponse.notes;
          this.totalNotes = notesResponse.total;
          this.applyFilters();
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Errore nel caricamento dei dati:', error);
        this.errorMessage = 'Errore nel caricamento delle note';
        this.isLoading = false;
      }
    });
  }

  /**
   * Riprova il caricamento in caso di errore
   */
  retryLoadNotes(): void {
    this.loadInitialData();
  }

  // ========== GESTIONE FILTRI ==========

  /**
   * Gestisce il cambio della query di ricerca con debouncing
   */
  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  /**
   * Gestisce il cambio dei filtri
   */
  onFiltersChange(): void {
    this.applyFilters();
  }

  /**
   * Gestisce il cambio dell'ordinamento
   */
  onSortChange(): void {
    this.applyFilters();
  }

  /**
   * Applica tutti i filtri e l'ordinamento localmente
   */
  private applyFilters(): void {
    let filtered = [...this.allNotes];

    // Applica filtro ricerca
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) ||
        note.preview.toLowerCase().includes(query) ||
        (note.category && note.category.toLowerCase().includes(query))
      );
    }

    // Applica filtro categoria
    if (this.selectedCategory) {
      filtered = filtered.filter(note => note.category === this.selectedCategory);
    }

    // Applica filtro tipo
    if (this.selectedType) {
      filtered = filtered.filter(note => note.accessibility === this.selectedType);
    }

    // Applica ordinamento
    filtered = this.applySorting(filtered);

    this.filteredNotes = filtered;
  }

  /**
   * Applica l'ordinamento alle note
   */
  private applySorting(notes: NotePreview[]): NotePreview[] {
    if (!this.selectedSortOption) {
      return notes;
    }

    const [sortBy, sortOrder] = this.selectedSortOption.split('-') as [SortType, 'asc' | 'desc'];

    return [...notes].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'alfabetico':
          comparison = a.title.toLowerCase().localeCompare(b.title.toLowerCase(), 'it');
          break;
        
        case 'data':
          comparison = new Date(a.last_modify).getTime() - new Date(b.last_modify).getTime();
          break;
        
        case 'lunghezza':
          comparison = a.contentLength - b.contentLength;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Costruisce il filtro attuale per le query al server
   */
  private buildCurrentFilter(): NotesFilter {
    const [sortBy, sortOrder] = (this.selectedSortOption || 'data-desc').split('-') as [SortType, 'asc' | 'desc'];
    
    return {
      searchQuery: this.searchQuery,
      category: this.selectedCategory || undefined,
      accessibility: this.selectedType || undefined,
      sortBy,
      sortOrder
    };
  }

  /**
   * Controlla se ci sono filtri attivi
   */
  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.selectedCategory || this.selectedType);
  }

  /**
   * Pulisce la ricerca
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  /**
   * Reset tutti i filtri
   */
  clearAllFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.selectedType = '';
    this.selectedSortOption = 'data-desc';
    this.applyFilters();
  }

  // ========== AZIONI NOTE ==========

  /**
   * Naviga alla creazione di una nuova nota
   */
  createNewNote(): void {
    this.navigationService.goToCreateNote();
  }

  /**
   * Crea un nuovo gruppo - placeholder per ora
   */
  createGroup(): void {
    // TODO: Implementare modal o navigazione per creare gruppo
    console.log('Creazione gruppo - da implementare');
    this.showSuccessMessage = 'Funzionalità "Crea Gruppo" sarà disponibile a breve!';
    this.clearMessages();
  }

  /**
   * Crea una nuova categoria
   */
  createCategory(): void {
    // TODO: Implementare modal per creare categoria
    console.log('Creazione categoria - da implementare');
    this.showSuccessMessage = 'Funzionalità "Crea Categoria" sarà disponibile a breve!';
    this.clearMessages();
  }

  /**
   * Visualizza una nota in sola lettura
   */
  viewNote(noteId: string): void {
    this.navigationService.goToViewNote(noteId);
  }

  /**
   * Modifica una nota esistente
   */
  editNote(noteId: string): void {
    this.navigationService.goToEditNote(noteId);
  }

  /**
   * Duplica una nota esistente
   */
  duplicateNote(noteId: string): void {
    // to do
  }

  /**
   * Copia il contenuto di una nota negli appunti
   */
  copyNote(noteId: string): void {
    this.notesService.copyNoteContent(noteId).then(success => {
      if (success) {
        this.showSuccessMessage = 'Contenuto copiato negli appunti!';
      } else {
        this.errorMessage = 'Errore nel copiare il contenuto';
      }
      this.clearMessages();
    });
  }

  /**
   * Elimina una nota
   */
  deleteNote(noteId: string): void {
    if (!confirm('Sei sicuro di voler eliminare questa nota? L\'azione non può essere annullata.')) {
      return;
    }

    this.isLoading = true;
    
    this.notesService.deleteNote({ note_id: noteId }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.showSuccessMessage = 'Nota eliminata con successo!';
          this.loadInitialData(); // Ricarica le note
        }
        this.clearMessages();
      },
      error: (error) => {
        console.error('Errore nell\'eliminazione:', error);
        this.errorMessage = 'Errore nell\'eliminazione della nota';
        this.isLoading = false;
        this.clearMessages();
      }
    });
  }

  // ========== UTILITY METHODS ==========

  /**
   * Ottiene l'etichetta per un tipo di nota
   */
  getTypeLabel(tipo: AccessibilityType): string {
    const noteType = NOTE_TYPES.find(t => t.value === tipo);
    return noteType?.label || 'Sconosciuto';
  }

  /**
   * TrackBy function per ottimizzare il rendering della lista
   */
  trackByNoteId(index: number, note: NotePreview): string {
    return note.id;
  }

  /**
   * Ottiene l'etichetta per l'opzione di ordinamento selezionata
   */
  getSortOptionLabel(){
    // to do
  }

  /**
   * Formatta il numero di note per la visualizzazione
   */
  getNotesCountText(): string {
    const count = this.filteredNotes.length;
    const total = this.totalNotes;
    
    if (count === total) {
      return `${total} nota${total !== 1 ? 'e' : ''}`;
    } else {
      return `${count} di ${total} nota${total !== 1 ? 'e' : ''}`;
    }
  }

  /**
   * Nasconde i messaggi dopo un delay
   */
  private clearMessages(): void {
    setTimeout(() => {
      this.showSuccessMessage = '';
      this.errorMessage = '';
    }, 3000);
  }
}