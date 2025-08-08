// notes/client/service/notes-navigation.service.ts

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

  // ========== NAVIGAZIONE NOTE ==========

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
   * Naviga alla visualizzazione di una nota specifica
   */
  goToViewNote(noteId: string): void {
    // Per ora reindirizza alla modifica, ma potremmo aggiungere una route view specifica
    this.router.navigate(['/notes', noteId, 'edit']);
  }

  /**
   * Naviga alla modifica di una nota
   */
  goToEditNote(noteId: string): void {
    this.router.navigate(['/notes', noteId, 'edit']);
  }

  /**
   * Naviga alla duplicazione di una nota
   */
  goToDuplicateNote(noteId: string): void {
    this.router.navigate(['/notes', noteId, 'duplicate']);
  }

  /**
   * Torna alla pagina precedente
   */
  goBack(): void {
    this.location.back();
  }

  /**
   * Naviga alla home
   */
  goToHome(): void {
    this.router.navigate(['/']);
  }

  // ========== UTILITY METHODS ==========

  /**
   * Verifica se siamo attualmente nella vista note
   */
  isOnNotesView(): boolean {
    return this.router.url.startsWith('/notes');
  }

  /**
   * Ottiene l'URL corrente
   */
  getCurrentUrl(): string {
    return this.router.url;
  }

  /**
   * Naviga con parametri di query
   */
  navigateWithQuery(route: string[], queryParams: any): void {
    this.router.navigate(route, { queryParams });
  }
}