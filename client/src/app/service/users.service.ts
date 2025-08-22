import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { User } from '../model/entity/user.interface';
import { ErrorHandlerService } from './error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly apiUrl = '/api/users'; // Base API URL

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {}

  /**
   * Search users by username/nickname
   */
  searchUsersByUsername(query: string): Observable<User[]> {
    if (!query.trim()) {
      return new Observable(observer => observer.next([]));
    }

    const params = new HttpParams().set('search', query.trim());

    return this.http.get<User[]>(`${this.apiUrl}/search`, { params })
      .pipe(
        map(users => users.slice(0, 10)), // Limit to 10 results
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`)
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Get multiple users by IDs
   */
  getUsersByIds(userIds: string[]): Observable<User[]> {
    if (userIds.length === 0) {
      return new Observable(observer => observer.next([]));
    }

    const params = new HttpParams().set('ids', userIds.join(','));

    return this.http.get<User[]>(`${this.apiUrl}/batch`, { params })
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  /**
   * Check if username exists
   */
  checkUsernameExists(username: string): Observable<boolean> {
    const params = new HttpParams().set('username', username);

    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/exists`, { params })
      .pipe(
        map(response => response.exists),
        catchError(this.errorHandler.handleError)
      );
  }
}