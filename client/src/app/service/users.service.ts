import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { User } from '../model/entity/user.interface';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly apiUrl = '/api/users'; // Base API URL

  constructor(private http: HttpClient) {}

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
        catchError(this.handleError)
      );
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`)
      .pipe(
        catchError(this.handleError)
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
        catchError(this.handleError)
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
        catchError(this.handleError)
      );
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: any): Observable<never> => {
    console.error('UsersService Error:', error);
    
    let errorMessage = 'An unknown error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status) {
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid search query';
          break;
        case 401:
          errorMessage = 'Authentication required';
          break;
        case 404:
          errorMessage = 'User not found';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = `HTTP Error ${error.status}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  };
}