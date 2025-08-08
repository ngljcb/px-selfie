import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const STORAGE_KEY = 'virtual_now';

@Injectable({
  providedIn: 'root'
})
export class TimeMachineService {
  private virtualNowSubject = new BehaviorSubject<Date | null>(this.loadVirtualNow());

  constructor() {}

  /**
   * Ottieni l'orario corrente simulato (se attivo) o reale.
   */
  getNow(): Date {
    const virtual = this.virtualNowSubject.value;
    return virtual ? new Date(virtual) : new Date();
  }

  /**
   * Ritorna la data virtuale attualmente impostata, o null se disattiva.
   */
  getVirtualNow(): Date | null {
    return this.virtualNowSubject.value;
  }

  /**
   * Imposta una nuova data virtuale.
   */
  setVirtualNow(date: Date): void {
    this.virtualNowSubject.next(date);
    localStorage.setItem(STORAGE_KEY, date.toISOString());
  }

  /**
   * Disattiva il Time Machine (torna alla data reale).
   */
  reset(): void {
    this.virtualNowSubject.next(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Observable per ascoltare i cambiamenti di stato (opzionale nei componenti).
   */
  virtualNow$() {
    return this.virtualNowSubject.asObservable();
  }

  /**
   * Carica da localStorage all'avvio.
   */
  private loadVirtualNow(): Date | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Date(stored) : null;
  }
}