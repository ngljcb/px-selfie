// notes/client/components/note-editor/note-editor.component.ts

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { 
  Note, 
  NoteFormData, 
  Category, 
  NoteType, 
  NOTE_TYPES, 
  NOTES_CONFIG 
} from '../../model/note.interface';
import { NotesNavigationService } from '../../service/notes-navigation.service';
// import { NotesClientService } from '../../services/notes-client.service'; // Da implementare

type EditorMode = 'create' | 'edit' | 'duplicate' | 'view';
type ViewMode = 'write' | 'preview' | 'split';
type AutoSaveStatus = 'saved' | 'saving' | 'error' | null;

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './note-editor.component.html'
})
export class NoteEditorComponent implements OnInit, OnDestroy {

  // Modalità editor
  mode: EditorMode = 'create';
  editorMode: ViewMode = 'preview'; // Default a preview per modalità view
  isReadOnly = false;

  // Dati della nota
  noteData: NoteFormData = {
    titolo: '',
    contenuto: '',
    categoria: '',
    tipo: 'privato'
  };

  originalNote: Note | null = null;
  noteId: number | null = null;
  
  // Stato form
  hasChanges = false;
  showValidationErrors = false;
  isSaving = false;
  isLoading = false;
  lastSaved: Date | null = null;
  autoSaveStatus: AutoSaveStatus = null;

  // Categorie e tipi
  categories: Category[] = [];
  noteTypes = NOTE_TYPES;
  newCategoryName = '';

  // Gestione auto-save
  private autoSaveSubject = new Subject<void>();
  private destroy$ = new Subject<void>();
  private initialFormState: string = '';

  constructor(
    private route: ActivatedRoute,
    private navigationService: NotesNavigationService
    // private notesService: NotesClientService // Da implementare
  ) {
    // Setup auto-save con debouncing
    this.autoSaveSubject.pipe(
      debounceTime(NOTES_CONFIG.AUTOSAVE_DELAY),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.hasChanges && this.isFormValid()) {
        this.performAutoSave();
      }
    });
  }

  ngOnInit(): void {
    this.initializeEditor();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Previene la chiusura accidentale con modifiche non salvate
   */
  @HostListener('window:beforeunload', ['$event'])
  unloadNotification(event: any): void {
    if (this.hasChanges) {
      event.returnValue = 'Hai modifiche non salvate. Sei sicuro di voler uscire?';
    }
  }

  // ========== INIZIALIZZAZIONE ==========

  /**
   * Inizializza l'editor basandosi sulla route
   */
  private initializeEditor(): void {
    this.isLoading = true;

    // Determina modalità dalla route
    this.mode = this.route.snapshot.data['mode'] || 'create';
    this.noteId = this.route.snapshot.params['id'] ? parseInt(this.route.snapshot.params['id'], 10) : null;

    switch (this.mode) {
      case 'create':
        this.initializeNewNote();
        break;
      case 'edit':
        this.loadNoteForEdit();
        break;
      case 'duplicate':
        this.loadNoteForDuplicate();
        break;
      case 'view':
        this.loadNoteForView();
        break;
    }
  }

  /**
   * Inizializza una nuova nota
   */
  private initializeNewNote(): void {
    this.noteData = {
      titolo: '',
      contenuto: '',
      categoria: '',
      tipo: 'privato'
    };
    
    this.isReadOnly = false;
    this.editorMode = 'write';
    this.setInitialFormState();
    this.isLoading = false;
  }

  /**
   * Carica nota esistente per modifica
   */
  private loadNoteForEdit(): void {
    if (!this.noteId) {
      this.navigationService.goToNotesView();
      return;
    }

    // TODO: Implementare con service
    // this.notesService.getNoteById(this.noteId).subscribe({
    //   next: (note) => {
    //     this.originalNote = note;
    //     this.noteData = {
    //       titolo: note.titolo,
    //       contenuto: note.contenuto,
    //       categoria: note.categoria,
    //       tipo: note.tipo
    //     };
    //     this.setInitialFormState();
    //     this.isLoading = false;
    //   },
    //   error: (error) => {
    //     console.error('Errore nel caricamento della nota:', error);
    //     this.navigationService.goToNotesView();
    //   }
    // });

    // Simulazione per ora
    setTimeout(() => {
      this.isReadOnly = false;
      this.editorMode = 'write';
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Carica nota esistente per duplicazione
   */
  private loadNoteForDuplicate(): void {
    if (!this.noteId) {
      this.navigationService.goToNotesView();
      return;
    }

    // TODO: Implementare con service
    // Simile a loadNoteForEdit ma con titolo modificato
    setTimeout(() => {
      this.noteData.titolo = `Copia di ${this.noteData.titolo}`;
      this.isReadOnly = false;
      this.editorMode = 'write';
      this.setInitialFormState();
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Carica nota esistente per visualizzazione sola lettura
   */
  private loadNoteForView(): void {
    if (!this.noteId) {
      this.navigationService.goToNotesView();
      return;
    }

    // TODO: Implementare con service
    // this.notesService.getNoteById(this.noteId).subscribe({
    //   next: (note) => {
    //     this.originalNote = note;
    //     this.noteData = {
    //       titolo: note.titolo,
    //       contenuto: note.contenuto,
    //       categoria: note.categoria,
    //       tipo: note.tipo
    //     };
    //     this.isReadOnly = true;
    //     this.editorMode = 'preview';
    //     this.setInitialFormState();
    //     this.isLoading = false;
    //   },
    //   error: (error) => {
    //     console.error('Errore nel caricamento della nota:', error);
    //     this.navigationService.goToNotesView();
    //   }
    // });

    // Simulazione per ora
    setTimeout(() => {
      this.isReadOnly = true;
      this.editorMode = 'preview';
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Carica le categorie disponibili
   */
  private loadCategories(): void {
    // TODO: Implementare con service
    // this.notesService.getAllCategories().subscribe({
    //   next: (categories) => {
    //     this.categories = categories;
    //   },
    //   error: (error) => {
    //     console.error('Errore nel caricamento delle categorie:', error);
    //   }
    // });
  }

  // ========== GESTIONE FORM ==========

  /**
   * Imposta lo stato iniziale del form
   */
  private setInitialFormState(): void {
    this.initialFormState = JSON.stringify(this.noteData);
    this.hasChanges = false;
  }

  /**
   * Gestisce i cambiamenti del form
   */
  onFormChange(): void {
    if (this.isReadOnly) return;
    this.checkForChanges();
    this.triggerAutoSave();
  }

  /**
   * Gestisce i cambiamenti del contenuto
   */
  onContentChange(): void {
    if (this.isReadOnly) return;
    this.checkForChanges();
    this.triggerAutoSave();
  }

  /**
   * Controlla se ci sono modifiche rispetto allo stato iniziale
   */
  private checkForChanges(): void {
    const currentState = JSON.stringify(this.noteData);
    this.hasChanges = currentState !== this.initialFormState;
  }

  /**
   * Valida il form
   */
  isFormValid(): boolean {
    return !!(
      this.noteData.titolo.trim() &&
      this.noteData.tipo &&
      this.getFinalCategory()
    );
  }

  /**
   * Ottiene la categoria finale (gestisce nuova categoria)
   */
  private getFinalCategory(): string {
    if (this.noteData.categoria === '__new__') {
      return this.newCategoryName.trim();
    }
    return this.noteData.categoria;
  }

  // ========== AUTO-SAVE ==========

  /**
   * Triggera l'auto-save
   */
  private triggerAutoSave(): void {
    if (this.isReadOnly) return;
    this.autoSaveSubject.next();
  }

  /**
   * Esegue l'auto-save
   */
  private async performAutoSave(): Promise<void> {
    if (this.mode === 'create' || this.isReadOnly) return; // Non auto-save per nuove note o sola lettura

    this.autoSaveStatus = 'saving';

    try {
      // TODO: Implementare con service
      // await this.notesService.updateNote(this.noteId!, this.noteData).toPromise();
      
      // Simulazione
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.autoSaveStatus = 'saved';
      this.lastSaved = new Date();
      
      // Reset status dopo 3 secondi
      setTimeout(() => {
        this.autoSaveStatus = null;
      }, 3000);

    } catch (error) {
      console.error('Errore nell\'auto-save:', error);
      this.autoSaveStatus = 'error';
    }
  }

  // ========== AZIONI EDITOR ==========

  /**
   * Cambia modalità di visualizzazione
   */
  setEditorMode(mode: ViewMode): void {
    this.editorMode = mode;
  }

  /**
   * Salva come bozza
   */
  async saveDraft(): Promise<void> {
    if (!this.isFormValid()) {
      this.showValidationErrors = true;
      return;
    }

    this.isSaving = true;

    try {
      const noteToSave = {
        ...this.noteData,
        categoria: this.getFinalCategory()
      };

      // TODO: Implementare con service
      // if (this.mode === 'create') {
      //   await this.notesService.createNote(noteToSave).toPromise();
      // } else {
      //   await this.notesService.updateNote(this.noteId!, noteToSave).toPromise();
      // }

      // Simulazione
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.setInitialFormState();
      this.lastSaved = new Date();

    } catch (error) {
      console.error('Errore nel salvataggio bozza:', error);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Salva e pubblica la nota
   */
  async saveNote(): Promise<void> {
    if (!this.isFormValid()) {
      this.showValidationErrors = true;
      return;
    }

    this.isSaving = true;

    try {
      const noteToSave = {
        ...this.noteData,
        categoria: this.getFinalCategory()
      };

      // Crea nuova categoria se necessario
      if (this.noteData.categoria === '__new__' && this.newCategoryName.trim()) {
        await this.createNewCategory(this.newCategoryName.trim());
      }

      // TODO: Implementare con service
      // if (this.mode === 'create' || this.mode === 'duplicate') {
      //   await this.notesService.createNote(noteToSave).toPromise();
      // } else {
      //   await this.notesService.updateNote(this.noteId!, noteToSave).toPromise();
      // }

      // Simulazione
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Torna alla vista principale
      this.navigationService.goToNotesView();

    } catch (error) {
      console.error('Errore nel salvataggio:', error);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Crea una nuova categoria
   */
  private async createNewCategory(name: string): Promise<void> {
    // TODO: Implementare con service
    // await this.notesService.createCategory(name).toPromise();
    
    // Aggiunge alla lista locale
    this.categories.push({ nome: name });
  }

  /**
   * Annulla le modifiche
   */
  discardChanges(): void {
    if (this.hasChanges) {
      const confirmMessage = 'Hai modifiche non salvate. Sei sicuro di voler annullare?';
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    this.goBack();
  }

  /**
   * Torna indietro
   */
  goBack(): void {
    this.navigationService.goBack();
  }

  // ========== UTILITY METHODS ==========

  /**
   * Ottiene il messaggio per l'auto-save
   */
  getAutoSaveMessage(): string {
    switch (this.autoSaveStatus) {
      case 'saving': return 'Salvando...';
      case 'saved': return 'Salvato automaticamente';
      case 'error': return 'Errore nel salvataggio';
      default: return '';
    }
  }

  /**
   * Ottiene il testo del pulsante salva
   */
  getSaveButtonText(): string {
    if (this.isSaving) {
      return this.mode === 'create' ? 'Creando...' : 'Salvando...';
    }
    
    switch (this.mode) {
      case 'create': return 'Crea Nota';
      case 'edit': return 'Salva Modifiche';
      case 'duplicate': return 'Duplica Nota';
      case 'view': return 'Modifica'; // In modalità view, diventa "modifica"
      default: return 'Salva';
    }
  }

  /**
   * Ottiene il messaggio di loading
   */
  getLoadingMessage(): string {
    switch (this.mode) {
      case 'edit': return 'Caricamento nota in corso...';
      case 'duplicate': return 'Preparazione duplicazione...';
      case 'view': return 'Caricamento nota...';
      default: return 'Caricamento...';
    }
  }

  /**
   * Ottiene la descrizione del tipo di nota
   */
  getTypeDescription(tipo: NoteType): string {
    const descriptions = {
      privato: 'Solo tu puoi vedere questa nota',
      pubblico: 'Visibile a tutti gli utenti',
      condiviso: 'Visibile a persone specifiche che scegli',
      di_gruppo: 'Visibile ai membri del gruppo'
    };
    return descriptions[tipo] || '';
  }

  /**
   * Conta le parole nel contenuto
   */
  getWordCount(): number {
    if (!this.noteData.contenuto.trim()) return 0;
    return this.noteData.contenuto.trim().split(/\s+/).length;
  }

  /**
   * Stima il tempo di lettura
   */
  getReadingTime(): number {
    const wordsPerMinute = 200;
    const words = this.getWordCount();
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  }

  /**
   * Genera anteprima Markdown (semplificata)
   */
  getMarkdownPreview(): string {
    if (!this.noteData.contenuto) return '';

    let html = this.noteData.contenuto;

    // Conversioni Markdown basilari
    // Titoli
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Grassetto e corsivo
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');

    // Codice inline
    html = html.replace(/`(.*?)`/gim, '<code>$1</code>');

    // Link
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Liste puntate
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Liste numerate
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');

    // Interruzioni di riga
    html = html.replace(/\n\n/gim, '</p><p>');
    html = html.replace(/\n/gim, '<br>');

    // Wrap in paragraphs
    if (html && !html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<ol')) {
      html = '<p>' + html + '</p>';
    }

    return html;
  }

  /**
   * Formatta una data
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ========== GESTIONE ERRORI ==========

  /**
   * Mostra errori di validazione
   */
  private showValidErrors(): void {
    this.showValidationErrors = true;
    
    // Scroll al primo campo con errore
    setTimeout(() => {
      const firstError = document.querySelector('.border-red-300');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  /**
   * Reset errori di validazione
   */
  private resetValidationErrors(): void {
    this.showValidationErrors = false;
  }

  // ========== METODI MODALITÀ VIEW ==========

  /**
   * Passa dalla modalità VIEW a EDIT
   */
  switchToEditMode(): void {
    if (this.noteId) {
      this.navigationService.goToEditNote(this.noteId);
    }
  }

  /**
   * Duplica nota dalla modalità VIEW
   */
  duplicateFromView(): void {
    if (this.noteId) {
      this.navigationService.goToDuplicateNote(this.noteId);
    }
  }

  /**
   * Ottiene l'icona per il tipo di nota
   */
  getTypeIcon(tipo: NoteType): string {
    const noteType = NOTE_TYPES.find(t => t.value === tipo);
    return noteType?.icon || '📝';
  }

  /**
   * Ottiene l'etichetta per il tipo di nota
   */
  getTypeLabel(tipo: NoteType): string {
    const noteType = NOTE_TYPES.find(t => t.value === tipo);
    return noteType?.label || 'Sconosciuto';
  }
}