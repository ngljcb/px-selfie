import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable} from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { User } from '../model/entity/user.interface';
import { ErrorHandlerService } from './error-handler.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = `${environment.API_BASE_URL}/api/users`; 

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {}

  searchUsersByUsername(query: string): Observable<User[]> {
    if (!query.trim()) {
      return new Observable(observer => observer.next([]));
    }

    const params = new HttpParams().set('search', query.trim());

    return this.http.get<User[]>(`${this.apiUrl}/search`, { 
      params,
      withCredentials: true
    })
      .pipe(
        map(users => users.slice(0, 10)),
        catchError(this.errorHandler.handleError)
      );
  }

  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`, {
      withCredentials: true
    })
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  getUsersByIds(userIds: string[]): Observable<User[]> {
    if (userIds.length === 0) {
      return new Observable(observer => observer.next([]));
    }

    const params = new HttpParams().set('ids', userIds.join(','));

    return this.http.get<User[]>(`${this.apiUrl}/batch`, { 
      params,
      withCredentials: true
    })
      .pipe(
        catchError(this.errorHandler.handleError)
      );
  }

  checkUsernameExists(username: string): Observable<boolean> {
    const params = new HttpParams().set('username', username);

    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/exists`, { 
      params,
      withCredentials: true
    })
      .pipe(
        map(response => response.exists),
        catchError(this.errorHandler.handleError)
      );
  }
}