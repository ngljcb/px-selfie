import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Activity } from '../model/activity.model';
import { ActivitiesListResponse } from '../model/response/activities-list-response.model';

@Injectable({ providedIn: 'root' })
export class ActivitiesService {
  private baseUrl = `${environment.API_BASE_URL}/api/activities`;

  constructor(private http: HttpClient) {}

  /**
   * Lista attività con filtri opzionali
   */
  list(params?: {
    from?: string;
    to?: string;
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Observable<ActivitiesListResponse> {
    return this.http.get<ActivitiesListResponse>(this.baseUrl, {
      params: { ...(params || {}) } as any,
      withCredentials: true
    });
  }

  /**
   * Dettaglio attività
   */
  get(id: number): Observable<Activity> {
    return this.http.get<Activity>(`${this.baseUrl}/${id}`, {
      withCredentials: true
    });
  }

  /**
   * Crea nuova attività
   */
  create(activity: Activity): Observable<Activity> {
    return this.http.post<Activity>(this.baseUrl, activity, {
      withCredentials: true
    });
  }

  /**
   * Aggiorna attività esistente
   */
  update(id: number, patch: Partial<Activity>): Observable<Activity> {
    return this.http.put<Activity>(`${this.baseUrl}/${id}`, patch, {
      withCredentials: true
    });
  }

  /**
   * Elimina attività
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, {
      withCredentials: true
    });
  }
}