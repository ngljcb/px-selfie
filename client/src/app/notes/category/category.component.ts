// category.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { CategoriesService } from '../../service/categories.service';
import { Category, CreateCategoryRequest } from '../../model/note.interface';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category.component.html'
})
export class CategoryComponent implements OnInit, OnDestroy {

  // Categories data
  categories: Category[] = [];

  // UI states
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Create category form
  showCreateForm = false;
  newCategoryName = '';
  creatingCategory = false;

  // Subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private categoriesService: CategoriesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== DATA LOADING ==========

  /**
   * Load user's categories
   */
  private loadCategories(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.categoriesService.getUserCategories().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (categories) => {
        this.categories = categories;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.errorMessage = 'Error loading categories. Please try again.';
        this.isLoading = false;
      }
    });
  }

  // ========== NAVIGATION ==========

  /**
   * Go back to notes view
   */
  goBackToNotes(): void {
    this.router.navigate(['/notes']);
  }

  /**
   * View notes in this category
   */
  viewCategoryNotes(category: Category): void {
    this.router.navigate(['/notes'], { queryParams: { category: category.id } });
  }

  // ========== CATEGORY CREATION ==========

  /**
   * Show create category form
   */
  showCreateCategoryForm(): void {
    this.showCreateForm = true;
    this.newCategoryName = '';
  }

  /**
   * Hide create category form
   */
  hideCreateCategoryForm(): void {
    this.showCreateForm = false;
    this.newCategoryName = '';
  }

  /**
   * Create new category
   */
  createCategory(): void {
    if (!this.newCategoryName.trim()) {
      return;
    }

    this.creatingCategory = true;

    const createRequest: CreateCategoryRequest = {
      name: this.newCategoryName.trim()
    };

    this.categoriesService.createCategory(createRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (newCategory) => {
        this.categories.unshift(newCategory); // Add to top of list
        this.categories = [...this.categories].sort((a, b) => 
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        ); // Re-sort alphabetically
        this.successMessage = `Category "${newCategory.name}" created successfully!`;
        this.hideCreateCategoryForm();
        this.clearMessages();
        this.creatingCategory = false;
      },
      error: (error) => {
        console.error('Error creating category:', error);
        this.errorMessage = 'Error creating category. Please try again.';
        this.clearMessages();
        this.creatingCategory = false;
      }
    });
  }

  /**
   * Validate category name
   */
  isCategoryNameValid(): boolean {
    return this.newCategoryName.trim().length >= 2;
  }

  // ========== CATEGORY ACTIONS ==========

  /**
   * Delete a category
   */
  deleteCategory(category: Category): void {
    const confirmMessage = `Are you sure you want to delete the category "${category.name}"?\n\nThis action cannot be undone. Notes in this category will become uncategorized.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    this.categoriesService.deleteCategory(category.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // Remove from local state
        this.categories = this.categories.filter(c => c.id !== category.id);
        this.successMessage = `Category "${category.name}" deleted successfully!`;
        this.clearMessages();
      },
      error: (error) => {
        console.error('Error deleting category:', error);
        this.errorMessage = 'Error deleting category. It may be in use by existing notes.';
        this.clearMessages();
      }
    });
  }

  /**
   * Edit category name
   */
  editCategory(category: Category): void {
    const newName = prompt(`Edit category name:`, category.name);
    
    if (!newName || newName.trim() === category.name) {
      return;
    }

    if (newName.trim().length < 2) {
      this.errorMessage = 'Category name must be at least 2 characters long.';
      this.clearMessages();
      return;
    }

    this.categoriesService.updateCategory(category.id, { name: newName.trim() }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (updatedCategory) => {
        // Update local state
        const index = this.categories.findIndex(c => c.id === category.id);
        if (index !== -1) {
          this.categories[index] = updatedCategory;
          // Re-sort alphabetically
          this.categories = [...this.categories].sort((a, b) => 
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
          );
        }
        this.successMessage = `Category renamed to "${updatedCategory.name}" successfully!`;
        this.clearMessages();
      },
      error: (error) => {
        console.error('Error updating category:', error);
        this.errorMessage = 'Error updating category. Name may already exist.';
        this.clearMessages();
      }
    });
  }

  // ========== HELPER METHODS ==========

  /**
   * Get category usage count (placeholder - would need API call)
   */
  getCategoryUsageCount(category: Category): number {
    // This would typically come from the API with category stats
    // For now, return 0 as placeholder
    return 0;
  }

  /**
   * Clear success/error messages after delay
   */
  private clearMessages(): void {
    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 3000);
  }

  /**
   * Track by function for ngFor optimization
   */
  trackByCategoryId(index: number, category: Category): string {
    return category.id;
  }

  /**
   * Check if there are no categories
   */
  hasNoCategories(): boolean {
    return !this.isLoading && this.categories.length === 0;
  }

  /**
   * Generate category color for visual distinction
   */
  generateCategoryColor(categoryName: string): string {
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      const char = categoryName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 60%, 70%)`;
  }

  /**
   * Get total categories count
   */
  getTotalCategoriesCount(): number {
    return this.categories.length;
  }

  /**
   * Format date for display (if category has creation date)
   */
  formatDate(date: Date | undefined): string {
    if (!date) return '';
    
    const now = new Date();
    const categoryDate = new Date(date);
    const diffDays = Math.floor((now.getTime() - categoryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return categoryDate.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: categoryDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  /**
   * Get category display with note count
   */
  getCategoryDisplayText(category: Category): string {
    const noteCount = this.getCategoryUsageCount(category);
    return `${category.name} (${noteCount} note${noteCount !== 1 ? 's' : ''})`;
  }

  /**
   * Check if category can be deleted
   */
  canDeleteCategory(category: Category): boolean {
    // Category can be deleted if it has no notes
    // This would typically come from API with usage stats
    return this.getCategoryUsageCount(category) === 0;
  }

  /**
   * Get category stats for display
   */
  getCategoryStats(): { total: number; inUse: number; empty: number } {
    const total = this.categories.length;
    const inUse = this.categories.filter(cat => this.getCategoryUsageCount(cat) > 0).length;
    const empty = total - inUse;
    
    return { total, inUse, empty };
  }
}