// notes/client/components/notes-view/notes-view.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Import del componente NoteBoxComponent
import { NoteBoxComponent } from '../note-box/note-box.component'; // Aggiungi questa riga

// Import modelli e servizi
import { 
  NotePreview, 
  Category, 
  NotesFilter, 
  NOTE_TYPES, 
  SORT_OPTIONS, 
  NoteType 
} from '../../model/note.interface';
import { NotesNavigationService } from '../../service/notes-navigation.service';
// import { NotesClientService } from '../../services/notes-client.service'; // Da implementare

@Component({
  selector: 'app-notes-view',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    NoteBoxComponent // Aggiungi NoteBoxComponent qui
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

  // Filtri
  searchQuery = '';
  selectedCategory = '';
  selectedType: NoteType | '' = '';
  sortBy: 'alfabetico' | 'data' | 'lunghezza' = 'data';

  // Costanti per il template
  noteTypes = NOTE_TYPES;
  sortOptions = SORT_OPTIONS;

  // Subject per cleanup
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private navigationService: NotesNavigationService
    // private notesService: NotesClientService // Da implementare
  ) {
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300), // Aspetta 300ms dopo l'ultimo input
      distinctUntilChanged(), // Solo se il valore è cambiato
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carica i dati iniziali (note e categorie)
   */
  private loadInitialData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // TODO: Implementare chiamate al service
    // this.notesService.getAllNotes().subscribe({
    //   next: (notes) => {
    //     this.allNotes = notes;
    //     this.totalNotes = notes.length;
    //     this.applyFilters();
    //     this.isLoading = false;
    //   },
    //   error: (error) => {
    //     this.errorMessage = 'Errore nel caricamento delle note';
    //     this.isLoading = false;
    //     console.error('Error loading notes:', error);
    //   }
    // });

    // this.loadCategories();

    // Per ora simula il caricamento
    setTimeout(() => {
      this.isLoading = false;
      this.applyFilters();
    }, 1000);
  }

  /**
   * Carica le categorie disponibili
   */
  private loadCategories(): void {
    // TODO: Implementare
    // this.notesService.getAllCategories().subscribe({
    //   next: (categories) => {
    //     this.categories = categories;
    //   },
    //   error: (error) => {
    //     console.error('Error loading categories:', error);
    //   }
    // });
  }

  /**
   * Gestisce il cambio della query di ricerca con debouncing
   */
  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  /**
   * Esegue la ricerca effettiva
   */
  private performSearch(searchTerm: string): void {
    this.applyFilters();
  }

  /**
   * Gestisce il cambio dei filtri
   */
  onFiltersChange(): void {
    this.applyFilters();
  }

  /**
   * Applica tutti i filtri e l'ordinamento
   */
  private applyFilters(): void {
    let filtered = [...this.allNotes];

    // Applica filtro ricerca
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(note => 
        note.titolo.toLowerCase().includes(query) ||
        note.preview.toLowerCase().includes(query) ||
        note.categoria.toLowerCase().includes(query)
      );
    }

    // Applica filtro categoria
    if (this.selectedCategory) {
      filtered = filtered.filter(note => note.categoria === this.selectedCategory);
    }

    // Applica filtro tipo
    if (this.selectedType) {
      filtered = filtered.filter(note => note.tipo === this.selectedType);
    }

    // Applica ordinamento
    filtered = this.sortNotes(filtered, this.sortBy);

    this.filteredNotes = filtered;
  }

  /**
   * Ordina le note secondo il criterio selezionato
   */
  private sortNotes(notes: NotePreview[], sortBy: 'alfabetico' | 'data' | 'lunghezza'): NotePreview[] {
    return notes.sort((a, b) => {
      switch (sortBy) {
        case 'alfabetico':
          return a.titolo.localeCompare(b.titolo);
        
        case 'data':
          return new Date(b.data_ultima_modifica).getTime() - new Date(a.data_ultima_modifica).getTime();
        
        case 'lunghezza':
          return b.contentLength - a.contentLength;
        
        default:
          return 0;
      }
    });
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
    this.sortBy = 'data';
    this.applyFilters();
  }

  /**
   * Riprova il caricamento in caso di errore
   */
  retryLoadNotes(): void {
    this.loadInitialData();
  }

  // ========== AZIONI NOTE ==========

  /**
   * Naviga alla creazione di una nuova nota
   */
  createNewNote(): void {
    this.navigationService.goToCreateNote();
  }

  /**
   * Crea un nuovo gruppo (da implementare)
   */
  createGroup(): void {
    // TODO: Implementare logica per creare gruppo
    console.log('Creazione gruppo - da implementare');
    
    // Placeholder per ora
    alert('Funzionalità "Crea Gruppo" in arrivo!');
  }

  /**
   * Modifica una nota esistente
   */
  editNote(noteId: number): void {
    this.navigationService.goToEditNote(noteId);
  }

  /**
   * Duplica una nota esistente
   */
  duplicateNote(noteId: number): void {
    this.navigationService.goToDuplicateNote(noteId);
    
    // Oppure gestire direttamente qui:
    // this.notesService.duplicateNote(noteId).subscribe({
    //   next: () => {
    //     this.loadInitialData(); // Ricarica la lista
    //   },
    //   error: (error) => {
    //     console.error('Error duplicating note:', error);
    //   }
    // });
  }

  /**
   * Copia il contenuto di una nota negli appunti
   */
  copyNote(noteId: number): void {
    // TODO: Implementare con service
    // this.notesService.copyNoteContent(noteId).then(() => {
    //   // Mostra feedback positivo
    //   this.showSuccessMessage('Contenuto copiato negli appunti!');
    // }).catch(error => {
    //   console.error('Error copying note:', error);
    // });
    
    console.log('Copia nota ID:', noteId);
  }

  /**
   * Elimina una nota
   */
  deleteNote(noteId: number): void {
    if (confirm('Sei sicuro di voler eliminare questa nota?')) {
      // TODO: Implementare con service
      // this.notesService.deleteNote(noteId).subscribe({
      //   next: () => {
      //     this.loadInitialData(); // Ricarica la lista
      //   },
      //   error: (error) => {
      //     console.error('Error deleting note:', error);
      //   }
      // });
      
      console.log('Elimina nota ID:', noteId);
    }
  }

  /**
   * TrackBy function per ottimizzare il rendering della lista
   */
  trackByNoteId(index: number, note: NotePreview): number {
    return note.id;
  }

  /**
   * Mostra messaggio di successo (utility per future implementazioni)
   */
  private showSuccessMessage(message: string): void {
    // TODO: Implementare toast/snackbar
    console.log('Success:', message);
  }
}