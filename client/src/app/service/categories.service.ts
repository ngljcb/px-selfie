// categories.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { 
  Category, 
  CreateCategoryRequest,
  NOTE_CONSTANTS
} from '../model/note.interface';

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private readonly apiUrl = '/api/categories'; // Base API URL
  
  // Reactive state management for user's categories
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$ = this.categoriesSubject.asObservable();
  
  private selectedCategorySubject = new BehaviorSubject<Category | null>(null);
  public selectedCategory$ = this.selectedCategorySubject.asObservable();

  constructor(private http: HttpClient) {}

  // ==================== CORE CRUD OPERATIONS ====================

  /**
   * Get all categories created by the current user
   */
  getUserCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}`)
      .pipe(
        tap(categories => {
          // Sort categories alphabetically for consistent display
          const sortedCategories = categories.sort((a, b) => 
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
          );
          this.categoriesSubject.next(sortedCategories);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get a specific category by ID (only if created by current user)
   */
  getCategoryById(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(category => this.selectedCategorySubject.next(category)),
        catchError(this.handleError)
      );
  }

  /**
   * Create a new category
   */
  createCategory(categoryData: CreateCategoryRequest): Observable<Category> {
    // Validate before sending
    const validation = this.validateCategory(categoryData);
    if (!validation.isValid) {
      return throwError(() => new Error(validation.errors.join(', ')));
    }

    return this.http.post<Category>(`${this.apiUrl}`, categoryData)
      .pipe(
        tap(newCategory => {
          // Add to local state maintaining alphabetical order
          const currentCategories = this.categoriesSubject.value;
          const updatedCategories = [...currentCategories, newCategory]
            .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
          this.categoriesSubject.next(updatedCategories);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Update an existing category (only name can be changed)
   */
  updateCategory(id: string, categoryData: CreateCategoryRequest): Observable<Category> {
    // Validate before sending
    const validation = this.validateCategory(categoryData);
    if (!validation.isValid) {
      return throwError(() => new Error(validation.errors.join(', ')));
    }

    return this.http.put<Category>(`${this.apiUrl}/${id}`, categoryData)
      .pipe(
        tap(updatedCategory => {
          // Update local state
          const currentCategories = this.categoriesSubject.value;
          const index = currentCategories.findIndex(c => c.id === id);
          if (index !== -1) {
            currentCategories[index] = updatedCategory;
            // Re-sort after update
            const sortedCategories = currentCategories
              .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
            this.categoriesSubject.next(sortedCategories);
          }
          // Update selected category if it's the same
          if (this.selectedCategorySubject.value?.id === id) {
            this.selectedCategorySubject.next(updatedCategory);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Delete a category (only if created by current user and not in use)
   */
  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        tap(() => {
          // Remove from local state
          const currentCategories = this.categoriesSubject.value;
          const filteredCategories = currentCategories.filter(c => c.id !== id);
          this.categoriesSubject.next(filteredCategories);
          // Clear selected category if it's the deleted one
          if (this.selectedCategorySubject.value?.id === id) {
            this.selectedCategorySubject.next(null);
          }
        }),
        catchError(this.handleError)
      );
  }

  // ==================== SPECIALIZED OPERATIONS ====================

  /**
   * Check if category name already exists for current user
   */
  checkCategoryNameExists(name: string, excludeId?: string): Observable<boolean> {
    let params = new HttpParams().set('name', name);
    if (excludeId) {
      params = params.set('excludeId', excludeId);
    }

    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/check-name`, { params })
      .pipe(
        map(response => response.exists),
        catchError(this.handleError)
      );
  }

  /**
   * Get category usage statistics (how many notes use this category)
   */
  getCategoryUsage(id: string): Observable<{ noteCount: number; canDelete: boolean }> {
    return this.http.get<{ noteCount: number; canDelete: boolean }>(`${this.apiUrl}/${id}/usage`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get categories with note counts
   */
  getCategoriesWithStats(): Observable<(Category & { noteCount: number })[]> {
    return this.http.get<(Category & { noteCount: number })[]>(`${this.apiUrl}/with-stats`)
      .pipe(
        map(categories => 
          categories.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
        ),
        catchError(this.handleError)
      );
  }

  /**
   * Bulk delete categories (only empty ones)
   */
  bulkDeleteCategories(categoryIds: string[]): Observable<{ deleted: number; errors: string[] }> {
    return this.http.post<{ deleted: number; errors: string[] }>(`${this.apiUrl}/bulk-delete`, {
      categoryIds
    }).pipe(
      tap(result => {
        if (result.deleted > 0) {
          // Refresh categories after bulk delete
          this.getUserCategories().subscribe();
        }
      }),
      catchError(this.handleError)
    );
  }

  // ==================== SEARCH AND FILTERING ====================

  /**
   * Search categories by name
   */
  searchCategories(query: string): Observable<Category[]> {
    if (!query.trim()) {
      return this.categories$;
    }

    const params = new HttpParams().set('search', query);
    
    return this.http.get<Category[]>(`${this.apiUrl}/search`, { params })
      .pipe(
        map(categories => 
          categories.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
        ),
        catchError(this.handleError)
      );
  }

  /**
   * Filter categories locally (for immediate UI feedback)
   */
  filterCategoriesLocally(categories: Category[], query: string): Category[] {
    if (!query.trim()) return categories;
    
    const lowercaseQuery = query.toLowerCase();
    
    return categories.filter(category => 
      category.name.toLowerCase().includes(lowercaseQuery)
    ).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get current categories from local state
   */
  getCurrentCategories(): Category[] {
    return this.categoriesSubject.value;
  }

  /**
   * Set selected category
   */
  setSelectedCategory(category: Category): void {
    this.selectedCategorySubject.next(category);
  }

  /**
   * Clear selected category
   */
  clearSelectedCategory(): void {
    this.selectedCategorySubject.next(null);
  }

  /**
   * Refresh categories from server
   */
  refreshCategories(): Observable<Category[]> {
    return this.getUserCategories();
  }

  /**
   * Check if user owns category
   */
  isOwner(category: Category, currentUserId: string): boolean {
    return category.creator === currentUserId;
  }

  /**
   * Generate unique category name suggestion
   */
  generateUniqueName(baseName: string): Observable<string> {
    return this.checkCategoryNameExists(baseName).pipe(
      map(exists => {
        if (!exists) return baseName;
        
        // Generate incremental names
        let counter = 1;
        let newName = `${baseName} (${counter})`;
        
        // Note: This is a simple approach. For a more robust solution,
        // you might want to check multiple names in a single API call
        return newName;
      })
    );
  }

  // ==================== VALIDATION ====================

  /**
   * Validate category data before submission
   */
  validateCategory(categoryData: CreateCategoryRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Name validation
    if (!categoryData.name || categoryData.name.trim().length === 0) {
      errors.push('Category name is required');
    }
    
    if (categoryData.name && categoryData.name.trim().length > NOTE_CONSTANTS.MAX_CATEGORY_NAME_LENGTH) {
      errors.push(`Category name cannot exceed ${NOTE_CONSTANTS.MAX_CATEGORY_NAME_LENGTH} characters`);
    }
    
    // Check for invalid characters
    if (categoryData.name && !/^[a-zA-Z0-9\s\-_()]+$/.test(categoryData.name)) {
      errors.push('Category name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses');
    }
    
    // Check for reserved names
    const reservedNames = ['uncategorized', 'all', 'none', 'default'];
    if (categoryData.name && reservedNames.includes(categoryData.name.toLowerCase().trim())) {
      errors.push('This category name is reserved. Please choose a different name');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate category name in real-time (for form validation)
   */
  validateCategoryName(name: string, excludeId?: string): Observable<{ isValid: boolean; errors: string[] }> {
    const localValidation = this.validateCategory({ name });
    
    if (!localValidation.isValid) {
      return of(localValidation);
    }
    
    // Check uniqueness on server
    return this.checkCategoryNameExists(name, excludeId).pipe(
      map(exists => ({
        isValid: !exists,
        errors: exists ? ['A category with this name already exists'] : []
      })),
      catchError(() => {
        // If check fails, allow local validation to pass
        return of({ isValid: true, errors: [] });
      })
    );
  }

  // ==================== CATEGORY MANAGEMENT ====================

  /**
   * Get categories sorted by usage (most used first)
   */
  getCategoriesByUsage(): Observable<(Category & { noteCount: number })[]> {
    return this.getCategoriesWithStats().pipe(
      map(categories => 
        categories.sort((a, b) => b.noteCount - a.noteCount)
      )
    );
  }

  /**
   * Get unused categories (categories with 0 notes)
   */
  getUnusedCategories(): Observable<Category[]> {
    return this.getCategoriesWithStats().pipe(
      map(categories => 
        categories
          .filter(cat => cat.noteCount === 0)
          .map(cat => ({ id: cat.id, name: cat.name, creator: cat.creator }))
      )
    );
  }

  /**
   * Clean up unused categories
   */
  cleanupUnusedCategories(): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.apiUrl}/cleanup-unused`)
      .pipe(
        tap(result => {
          if (result.deleted > 0) {
            // Refresh categories after cleanup
            this.getUserCategories().subscribe();
          }
        }),
        catchError(this.handleError)
      );
  }

  // ==================== STATE MANAGEMENT ====================

  /**
   * Reset service state
   */
  resetState(): void {
    this.categoriesSubject.next([]);
    this.selectedCategorySubject.next(null);
  }

  /**
   * Initialize categories (call this when user logs in)
   */
  initializeCategories(): Observable<Category[]> {
    return this.getUserCategories();
  }

  /**
   * Add category to local state (useful for optimistic updates)
   */
  addCategoryToState(category: Category): void {
    const currentCategories = this.categoriesSubject.value;
    const updatedCategories = [...currentCategories, category]
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    this.categoriesSubject.next(updatedCategories);
  }

  /**
   * Remove category from local state
   */
  removeCategoryFromState(id: string): void {
    const currentCategories = this.categoriesSubject.value;
    const filteredCategories = currentCategories.filter(c => c.id !== id);
    this.categoriesSubject.next(filteredCategories);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Find category by name (case-insensitive)
   */
  findCategoryByName(name: string): Category | undefined {
    const categories = this.categoriesSubject.value;
    return categories.find(cat => 
      cat.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Get category name by ID
   */
  getCategoryName(id: string): string | undefined {
    const categories = this.categoriesSubject.value;
    const category = categories.find(cat => cat.id === id);
    return category?.name;
  }

  /**
   * Check if category can be deleted (no notes assigned)
   */
  canDeleteCategory(id: string): Observable<boolean> {
    return this.getCategoryUsage(id).pipe(
      map(usage => usage.canDelete)
    );
  }

  /**
   * Get default "uncategorized" option for UI
   */
  getUncategorizedOption(): { id: null; name: string } {
    return { id: null, name: 'Uncategorized' };
  }

  /**
   * Get categories for dropdown/select (includes uncategorized option)
   */
  getCategoriesForSelect(): Observable<Array<Category | { id: null; name: string }>> {
    return this.categories$.pipe(
      map(categories => [
        this.getUncategorizedOption(),
        ...categories
      ])
    );
  }

  // ==================== IMPORT/EXPORT ====================

  /**
   * Export categories as JSON
   */
  exportCategories(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export`, { 
      responseType: 'blob',
      headers: { 'Accept': 'application/json' }
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Import categories from JSON file
   */
  importCategories(file: File): Observable<{ imported: number; skipped: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<{ imported: number; skipped: number; errors: string[] }>(
      `${this.apiUrl}/import`, 
      formData
    ).pipe(
      tap(result => {
        if (result.imported > 0) {
          // Refresh categories after import
          this.getUserCategories().subscribe();
        }
      }),
      catchError(this.handleError)
    );
  }

  // ==================== ADVANCED FEATURES ====================

  /**
   * Merge two categories (move all notes from source to target, then delete source)
   */
  mergeCategories(sourceId: string, targetId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${sourceId}/merge/${targetId}`, {})
      .pipe(
        tap(() => {
          // Remove source category from local state
          this.removeCategoryFromState(sourceId);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get category statistics
   */
  getCategoryStats(): Observable<{
    totalCategories: number;
    mostUsedCategory: Category | null;
    averageNotesPerCategory: number;
    unusedCategories: number;
  }> {
    return this.http.get<{
      totalCategories: number;
      mostUsedCategory: Category | null;
      averageNotesPerCategory: number;
      unusedCategories: number;
    }>(`${this.apiUrl}/stats`)
      .pipe(
        catchError(this.handleError)
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
        case 400:
          errorMessage = 'Invalid category data';
          break;
        case 401:
          errorMessage = 'Authentication required';
          break;
        case 403:
          errorMessage = 'Access denied. You can only manage your own categories';
          break;
        case 404:
          errorMessage = 'Category not found';
          break;
        case 409:
          errorMessage = 'Category name already exists or category is in use';
          break;
        case 422:
          errorMessage = 'Cannot delete category that contains notes';
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

  // ==================== HELPER METHODS ====================

  /**
   * Sanitize category name
   */
  sanitizeCategoryName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, NOTE_CONSTANTS.MAX_CATEGORY_NAME_LENGTH);
  }

  /**
   * Generate category color (for UI purposes)
   */
  generateCategoryColor(categoryName: string): string {
    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      const char = categoryName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to HSL for better color distribution
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 75%)`;
  }

  /**
   * Get categories formatted for select dropdown
   */
  getFormattedCategoriesForDropdown(): Observable<Array<{ value: string | null; label: string; color?: string }>> {
    return this.categories$.pipe(
      map(categories => [
        { value: null, label: 'Uncategorized' },
        ...categories.map(cat => ({
          value: cat.id,
          label: cat.name,
          color: this.generateCategoryColor(cat.name)
        }))
      ])
    );
  }
}