import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Category } from '../model/note.interface';
import { ErrorHandlerService } from './error-handler.service';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private apiUrl = `${environment.API_BASE_URL}/api/categories`;
  
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$ = this.categoriesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {
    this.loadCategories();
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}`, {
      withCredentials: true
    })
      .pipe(
        tap(categories => this.categoriesSubject.next(categories)),
        catchError(this.errorHandler.handleError)
      );
  }

  private loadCategories(): void {
    this.getCategories().subscribe({
      next: (categories) => {
        console.log('Categories loaded:', categories.length);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }
}