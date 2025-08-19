import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const STORAGE_KEY = 'virtual_now';

@Injectable({
  providedIn: 'root'
})
export class TimeMachineService {
  private virtualNowSubject: BehaviorSubject<Date | null>;
  private realAnchorMs: number | null = null;
  private virtualAnchorMs: number | null = null;

  constructor() {
    const loaded = this.loadVirtualNow();
    // set anchors first, then create the subject (subscribers will see a consistent state)
    if (loaded) {
      this.realAnchorMs = Date.now();
      this.virtualAnchorMs = loaded.getTime();
    }
    this.virtualNowSubject = new BehaviorSubject<Date | null>(loaded);
  }

  /**
   * Ottieni l'orario corrente simulato (se attivo) o reale.
   */
  getNow(): Date {
    if (this.virtualAnchorMs != null && this.realAnchorMs != null) {
      const elapsed = Date.now() - this.realAnchorMs;
      return new Date(this.virtualAnchorMs + elapsed);
    }
    return new Date();
  }

  /**
   * Ritorna la data virtuale attualmente impostata, o null se disattiva.
   */
  getVirtualNow(): Date | null {
    return this.virtualNowSubject.value;
  }

  /**
   * Imposta una nuova data virtuale.
   * (Aggiorna prima gli anchor, POI notifica i subscriber — evita il bug del "today" invertito)
   */
  setVirtualNow(date: Date): void {
    this.realAnchorMs = Date.now();
    this.virtualAnchorMs = date.getTime();
    localStorage.setItem(STORAGE_KEY, date.toISOString());
    this.virtualNowSubject.next(date);
  }

  /**
   * Disattiva il Time Machine (torna alla data reale).
   * (Pulisci prima gli anchor, POI notifica i subscriber)
   */
  reset(): void {
    this.realAnchorMs = null;
    this.virtualAnchorMs = null;
    localStorage.removeItem(STORAGE_KEY);
    this.virtualNowSubject.next(null);
  }

  /**
   * Observable per ascoltare i cambiamenti di stato.
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

  /**
   * True se il time-machine è attivo.
   */
  isActive(): boolean {
    return this.virtualAnchorMs != null && this.realAnchorMs != null;
  }
}
