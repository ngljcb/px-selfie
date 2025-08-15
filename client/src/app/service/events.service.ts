import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Event } from '../model/event.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private baseUrl = `${environment.API_BASE_URL}/api/events`;

  constructor(private http: HttpClient) {}

  /**
   * Lista eventi dell’utente.
   * (Il backend restituisce un array di Event)
   */
  list(params?: Record<string, any>): Observable<Event[]> {
    return this.http.get<Event[]>(this.baseUrl, {
      params: { ...(params || {}) } as any,
      withCredentials: true
    });
  }

  /** Dettaglio evento */
  get(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.baseUrl}/${id}`, {
      withCredentials: true
    });
  }

  /** Crea un nuovo evento */
  create(event: Partial<Event>): Observable<Event> {
    return this.http.post<Event>(this.baseUrl, event, {
      withCredentials: true
    });
  }

  /**
   * Aggiorna un evento (PATCH lato backend)
   */
  update(id: number, patch: Partial<Event>): Observable<Event> {
    return this.http.patch<Event>(`${this.baseUrl}/${id}`, patch, {
      withCredentials: true
    });
  }

  /** Elimina un evento */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, {
      withCredentials: true
    });
  }
}
