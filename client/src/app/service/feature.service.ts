import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Feature {
  title: string;
  description: string;
  link: string;
  iconClass: string;
}

@Injectable({
  providedIn: 'root'
})
export class FeatureService {

  constructor(private http: HttpClient) {}

  getFeatures(): Observable<Feature[]> {
    return this.http.get<Feature[]>(`${environment.API_BASE_URL}/api/features`, {
      withCredentials: true
    });
  }
}