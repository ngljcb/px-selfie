// categories.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Category } from '../model/note.interface';

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private readonly apiUrl = '/api/categories'; // Base API URL
  
  // Reactive state management for predefined categories
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$ = this.categoriesSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load predefined categories on service initialization
    this.loadCategories();
  }

  // ==================== CORE OPERATIONS (READ-ONLY) ====================

  /**
   * Get all predefined categories available in the system
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}`)
      .pipe(
        tap(categories => this.categoriesSubject.next(categories)),
        catchError(this.handleError)
      );
  }

  /**
   * Get a specific category by name
   */
  getCategoryByName(name: string): Observable<Category | null> {
    return this.categories$.pipe(
      map(categories => categories.find(cat => cat.name === name) || null)
    );
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Load predefined categories from server
   */
  private loadCategories(): void {
    this.getCategories().subscribe({
      next: (categories) => {
        // Categories loaded successfully
        console.log('Categories loaded:', categories.length);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  /**
   * Get current categories from local state
   */
  getCurrentCategories(): Category[] {
    return this.categoriesSubject.value;
  }

  /**
   * Get categories formatted for dropdown/select
   */
  getCategoriesForSelect(): Observable<Array<{ value: string; label: string }>> {
    return this.categories$.pipe(
      map(categories => 
        categories.map(category => ({
          value: category.name,
          label: category.name
        }))
      )
    );
  }

  /**
   * Search categories by name
   */
  searchCategories(query: string): Observable<Category[]> {
    if (!query.trim()) {
      return this.categories$;
    }

    const lowercaseQuery = query.toLowerCase();
    
    return this.categories$.pipe(
      map(categories => 
        categories.filter(category => 
          category.name.toLowerCase().includes(lowercaseQuery)
        )
      )
    );
  }

  /**
   * Get category name by name (validation helper)
   */
  getCategoryDisplayName(name: string): string {
    const categories = this.categoriesSubject.value;
    const category = categories.find(cat => cat.name === name);
    return category?.name || 'Unknown Category';
  }

  /**
   * Check if category exists by name
   */
  categoryExists(name: string): Observable<boolean> {
    return this.categories$.pipe(
      map(categories => 
        categories.some(cat => cat.name === name)
      )
    );
  }

  /**
   * Refresh categories from server
   */
  refreshCategories(): Observable<Category[]> {
    return this.getCategories();
  }

  /**
   * Reset service state
   */
  resetState(): void {
    this.categoriesSubject.next([]);
  }

  /**
   * Get categories sorted alphabetically
   */
  getCategoriesSorted(): Observable<Category[]> {
    return this.categories$.pipe(
      map(categories => 
        [...categories].sort((a, b) => a.name.localeCompare(b.name))
      )
    );
  }

  /**
   * Check if a category name is valid (exists in predefined categories)
   */
  isValidCategoryName(name: string): boolean {
    const categories = this.categoriesSubject.value;
    return categories.some(cat => cat.name === name);
  }

  /**
   * Get first available category (fallback)
   */
  getDefaultCategory(): Observable<Category | null> {
    return this.categories$.pipe(
      map(categories => categories.length > 0 ? categories[0] : null)
    );
  }

  // ==================== ERROR HANDLING ====================

  /**
   * Handle HTTP errors
   */
  private handleError = (error: any): Observable<never> => {
    console.error('CategoriesService Error:', error);
    
    let errorMessage = 'An unknown error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status) {
      switch (error.status) {
        case 401:
          errorMessage = 'Authentication required';
          break;
        case 403:
          errorMessage = 'Access denied';
          break;
        case 404:
          errorMessage = 'Categories not found';
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