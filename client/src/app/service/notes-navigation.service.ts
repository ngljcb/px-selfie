// notes/client/services/notes-navigation.service.ts

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class NotesNavigationService {

  constructor(
    private router: Router,
    private location: Location
  ) {}

  /**
   * Naviga alla vista principale delle note
   */
  goToNotesView(): void {
    this.router.navigate(['/notes']);
  }

  /**
   * Naviga alla creazione di una nuova nota
   */
  goToCreateNote(): void {
    this.router.navigate(['/notes/new']);
  }

  /**
   * Naviga alla modifica di una nota esistente
   */
  goToEditNote(noteId: number): void {
    this.router.navigate(['/notes', noteId, 'edit']);
  }

  /**
   * Naviga alla duplicazione di una nota esistente
   */
  goToDuplicateNote(noteId: number): void {
    this.router.navigate(['/notes', noteId, 'duplicate']);
  }

  /**
   * Torna alla pagina precedente
   */
  goBack(): void {
    this.location.back();
  }

  /**
   * Controlla se siamo nella sezione notes
   */
  isInNotesSection(): boolean {
    return this.router.url.startsWith('/notes');
  }

  /**
   * Ottiene la modalità corrente dell'editor basata sulla route
   */
  getCurrentEditorMode(): 'create' | 'edit' | 'duplicate' | null {
    const url = this.router.url;
    
    if (url === '/notes/new') {
      return 'create';
    } else if (url.includes('/edit')) {
      return 'edit';
    } else if (url.includes('/duplicate')) {
      return 'duplicate';
    }
    
    return null;
  }

  /**
   * Estrae l'ID della nota dalla route corrente
   */
  getCurrentNoteId(): number | null {
    const url = this.router.url;
    const segments = url.split('/');
    
    // Pattern: /notes/:id/edit o /notes/:id/duplicate
    if (segments.length >= 3 && segments[1] === 'notes') {
      const idSegment = segments[2];
      const noteId = parseInt(idSegment, 10);
      
      return !isNaN(noteId) ? noteId : null;
    }
    
    return null;
  }
}