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
  NoteType, 
  NOTE_TYPES, 
  NOTES_CONFIG 
} from '../../model/note.interface';

@Component({
  selector: 'app-note-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './note-box.component.html',
})
export class NoteBoxComponent {
  
  @Input() note!: NotePreview;
  
  // Eventi per le azioni
  @Output() onEdit = new EventEmitter<number>();
  @Output() onDuplicate = new EventEmitter<number>();
  @Output() onCopy = new EventEmitter<number>();
  @Output() onDelete = new EventEmitter<number>();
  @Output() onView = new EventEmitter<number>(); // Per apertura in sola lettura

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
  onCardClick(): void {
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

    const confirmMessage = `Sei sicuro di voler eliminare la nota "${this.note.titolo}"?\n\nQuesta azione non può essere annullata.`;
    
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
      const content = `# ${this.note.titolo}\n\n${this.note.preview}\n\n---\nCategoria: ${this.note.categoria}\nData: ${this.formatDate(this.note.data_ultima_modifica)}`;
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.note.titolo.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
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
  getTypeBadgeClass(tipo: NoteType): string {
    const baseClasses = 'border';
    
    switch (tipo) {
      case 'privato':
        return `${baseClasses} bg-gray-100 text-gray-700 border-gray-300`;
      case 'pubblico':
        return `${baseClasses} bg-blue-100 text-blue-700 border-blue-300`;
      case 'condiviso':
        return `${baseClasses} bg-green-100 text-green-700 border-green-300`;
      case 'di_gruppo':
        return `${baseClasses} bg-purple-100 text-purple-700 border-purple-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700 border-gray-300`;
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
    
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  }
}