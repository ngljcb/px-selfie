// notes/client/components/note-box/note-box.component.ts

import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  HostListener,
  ElementRef 
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { 
  NotePreview, 
  NOTE_TYPES, 
  NOTES_CONFIG, 
  AccessibilityType
} from '../../model/note.interface';

@Component({
  selector: 'app-note-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './note-box.component.html',
})
export class NoteBoxComponent {
  
  @Input() note!: NotePreview;
  
  // Eventi per le azioni - aggiornati per usare string invece di number
  @Output() onEdit = new EventEmitter<string>();
  @Output() onDuplicate = new EventEmitter<string>();
  @Output() onCopy = new EventEmitter<string>();
  @Output() onDelete = new EventEmitter<string>();
  @Output() onView = new EventEmitter<string>();

  // Stati componente
  showMenu = false;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' = 'success';
  
  // Costanti
  previewLength = NOTES_CONFIG.PREVIEW_LENGTH;

  constructor(private elementRef: ElementRef) {}

  // ========== GESTIONE MENU ==========

  /**
   * Toggle del menu opzioni
   */
  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.showMenu = !this.showMenu;
  }

  /**
   * Chiude il menu se si clicca fuori
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showMenu = false;
    }
  }

  // ========== AZIONI PRINCIPALI ==========

  /**
   * Gestisce il click sulla card per aprire la nota
   */
  onCardClick(event?: Event): void {
    if (event) {
      // Previeni il click se si sta cliccando su un bottone
      const target = event.target as HTMLElement;
      if (target.closest('button') || target.closest('.menu-container')) {
        return;
      }
    }
    this.onView.emit(this.note.id);
  }

  /**
   * Modifica nota
   */
  onEditClick(event: Event): void {
    event.stopPropagation();
    
    if (!this.note.isOwner) {
      this.showFeedback('Solo il proprietario può modificare questa nota', 'error');
      return;
    }
    
    this.onEdit.emit(this.note.id);
  }

  /**
   * Duplica nota
   */
  onDuplicateClick(event: Event): void {
    event.stopPropagation();
    this.onDuplicate.emit(this.note.id);
    this.showFeedback('Nota duplicata con successo!', 'success');
  }

  /**
   * Copia contenuto negli appunti
   */
  async onCopyClick(event: Event): Promise<void> {
    event.stopPropagation();
    
    try {
      // Usa l'API Clipboard se disponibile
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(this.note.preview);
      } else {
        // Fallback per browser più vecchi
        this.copyTextFallback(this.note.preview);
      }
      
      this.onCopy.emit(this.note.id);
      this.showFeedback('Contenuto copiato negli appunti!', 'success');
      
    } catch (error) {
      console.error('Errore nel copiare il contenuto:', error);
      this.showFeedback('Errore nel copiare il contenuto', 'error');
    }
  }

  /**
   * Elimina nota con conferma
   */
  onDeleteClick(event: Event): void {
    event.stopPropagation();
    
    if (!this.note.isOwner) {
      this.showFeedback('Solo il proprietario può eliminare questa nota', 'error');
      return;
    }

    const confirmMessage = `Sei sicuro di voler eliminare la nota "${this.note.title}"?\n\nQuesta azione non può essere annullata.`;
    
    if (confirm(confirmMessage)) {
      this.onDelete.emit(this.note.id);
      this.showFeedback('Nota eliminata', 'success');
    }
  }

  // ========== AZIONI MENU ==========

  /**
   * Visualizza dettagli nota
   */
  viewDetails(event: Event): void {
    event.stopPropagation();
    this.showMenu = false;
    this.onView.emit(this.note.id);
  }

  /**
   * Condividi nota
   */
  shareNote(event: Event): void {
    event.stopPropagation();
    this.showMenu = false;
    
    // TODO: Implementare condivisione
    this.showFeedback('Funzionalità condivisione in sviluppo', 'success');
  }

  /**
   * Esporta nota
   */
  exportNote(event: Event): void {
    event.stopPropagation();
    this.showMenu = false;
    
    try {
      const content = `# ${this.note.title}\n\n${this.note.preview}\n\n---\nCategoria: ${this.note.category}\nCreata: ${this.formatDate(this.note.created_at)}\nUltima modifica: ${this.formatDate(this.note.last_modify)}`;
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      link.click();
      
      URL.revokeObjectURL(url);
      this.showFeedback('Nota esportata con successo!', 'success');
      
    } catch (error) {
      console.error('Errore nell\'esportazione:', error);
      this.showFeedback('Errore nell\'esportazione', 'error');
    }
  }

  /**
   * Segnala nota
   */
  reportNote(event: Event): void {
    event.stopPropagation();
    this.showMenu = false;
    
    // TODO: Implementare sistema di segnalazioni
    this.showFeedback('Segnalazione inviata', 'success');
  }

  // ========== UTILITY METHODS ==========

  /**
   * Ottiene la classe CSS per il badge del tipo
   */
  getTypeBadgeClass(tipo: AccessibilityType): string {
    const baseClasses = 'border transition-colors';
    
    switch (tipo) {
      case 'private':
        return `${baseClasses} bg-gray-100 text-gray-700 border-gray-300`;
      case 'public':
        return `${baseClasses} bg-blue-100 text-blue-700 border-blue-300`;
      case 'authorized':
        return `${baseClasses} bg-green-100 text-green-700 border-green-300`;
      case 'group':
        return `${baseClasses} bg-purple-100 text-purple-700 border-purple-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700 border-gray-300`;
    }
  }

  /**
   * Ottiene l'etichetta per il tipo di nota
   */
  getTypeLabel(tipo: AccessibilityType): string {
    const noteType = NOTE_TYPES.find(t => t.value === tipo);
    return noteType?.label || 'Sconosciuto';
  }

  /**
   * Formatta la data in modo user-friendly
   */
  formatDate(date: Date): string {
    const now = new Date();
    const noteDate = new Date(date);
    const diffTime = now.getTime() - noteDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) {
      return 'Ora';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} min fa`;
    } else if (diffHours < 24) {
      return `${diffHours} ore fa`;
    } else if (diffDays === 1) {
      return 'Ieri';
    } else if (diffDays < 7) {
      return `${diffDays} giorni fa`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} settimana${weeks > 1 ? 'e' : ''} fa`;
    } else {
      return noteDate.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: noteDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  /**
   * Controlla se la nota è stata modificata di recente (ultime 24 ore)
   */
  isRecentlyModified(date: Date): boolean {
    const now = new Date();
    const noteDate = new Date(date);
    const diffHours = (now.getTime() - noteDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  /**
   * Calcola il tempo di lettura stimato
   */
  getReadingTime(): number {
    const wordsPerMinute = 200;
    const words = this.note.contentLength / 5; // Stima approssimativa: 5 caratteri per parola
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  }

  /**
   * Ottiene la priorità visiva della nota basata su tipo e data
   */
  getNotePriority(): 'high' | 'medium' | 'low' {
    if (this.isRecentlyModified(this.note.last_modify)) {
      return 'high';
    }
    if (this.note.accessibility === 'authorized' || this.note.accessibility === 'group') {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Mostra messaggio di feedback temporaneo
   */
  private showFeedback(message: string, type: 'success' | 'error'): void {
    this.feedbackMessage = message;
    this.feedbackType = type;
    
    // Nasconde il messaggio dopo 3 secondi
    setTimeout(() => {
      this.feedbackMessage = '';
    }, 3000);
  }

  /**
   * Fallback per copiare testo in browser senza Clipboard API
   */
  private copyTextFallback(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'absolute';
    textArea.style.left = '-999999px';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999); // Per dispositivi mobile
    
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  }

  /**
   * Condivide la nota usando l'API Web Share (se disponibile)
   */
  async shareNoteNative(): Promise<void> {
    if (navigator.share) {
      try {
        await navigator.share({
          title: this.note.title,
          text: this.note.preview,
          url: window.location.href // TODO: URL specifica della nota
        });
        this.showFeedback('Nota condivisa!', 'success');
      } catch (error) {
        console.error('Errore nella condivisione nativa:', error);
        this.showFeedback('Errore nella condivisione', 'error');
      }
    } else {
      // Fallback alla condivisione personalizzata
      this.shareNote(new Event('click'));
    }
  }
}