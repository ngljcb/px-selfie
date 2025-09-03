import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Grade } from '../model/entity/grade.model';
import { GradesListResponse } from '../model/response/grades-list-response.model';

@Injectable({ providedIn: 'root' })
export class GradesService {
  private baseUrl = `${environment.API_BASE_URL}/api/grades`;

  constructor(private http: HttpClient) {}

  /**
   * Lista i grade con filtri/paginazione opzionali
   */
  list(params?: {
    year?: string;
    search?: string;     // match su course_name
    from?: string;       // ISO date/time (per "date" gte)
    to?: string;         // ISO date/time (per "date" lte)
    min_grade?: number;
    max_grade?: number;
    limit?: number;
    offset?: number;
  }): Observable<GradesListResponse> {
    return this.http.get<GradesListResponse>(this.baseUrl, {
      params: { ...(params || {}) } as any,
      withCredentials: true,
    });
  }

  /** Dettaglio di un grade */
  get(id: number): Observable<Grade> {
    return this.http.get<Grade>(`${this.baseUrl}/${id}`, { withCredentials: true });
  }

  /** Crea un nuovo grade */
  create(grade: Omit<Grade, 'id' | 'user_id' | 'created_at'>): Observable<Grade> {
    return this.http.post<Grade>(this.baseUrl, grade, { withCredentials: true });
  }

  /** Aggiorna un grade esistente */
  update(id: number, patch: Partial<Omit<Grade, 'id' | 'user_id' | 'created_at'>>): Observable<Grade> {
    return this.http.patch<Grade>(`${this.baseUrl}/${id}`, patch, { withCredentials: true });
  }

  /** Elimina un grade */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { withCredentials: true });
  }
}