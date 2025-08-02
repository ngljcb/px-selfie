import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  register(email: string, username: string, password: string): Observable<any> {
    return this.http.post(`${environment.API_BASE_URL}/api/auth/register`, {
      email,
      username,
      password
    }, { withCredentials: true });
  }
}
