import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';

// Import components
import { NoteBoxComponent } from '../note-box/note-box.component';
import { NoteViewerComponent } from '../note-viewer/note-viewer.component';

// Import models and services
import { 
  NoteWithDetails, 
  Category, 
  AccessibilityType,
  NoteSortType,
  NoteFilterParams,
} from '../../../model/note.interface';
import { NotesService } from '../../../service/notes.service';
import { CategoriesService } from '../../../service/categories.service';
import { GroupsService } from '../../../service/groups.service';
import { TimeMachineService } from '../../../service/time-machine.service';

// Type definitions for component
type SortOption = {
  value: string;
  label: string;
  sortBy: NoteSortType;
  sortOrder: 'asc' | 'desc';
};

@Component({
  selector: 'app-notes-view',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    NoteBoxComponent,
    NoteViewerComponent
  ],
  templateUrl: './notes-view.component.html'
})
export class NotesViewComponent implements OnInit, OnDestroy {
  
  // Notes data
  allNotes: NoteWithDetails[] = [];
  allNotesFromServer: NoteWithDetails[] = []; // Store all notes from server for time machine filtering
  filteredNotes: NoteWithDetails[] = [];
  categories: Category[] = [];
  totalNotes = 0;

  // Note viewer state
  selectedNote: NoteWithDetails | null = null;
  isViewerOpen = false;

  // UI states
  isLoading = false;
  errorMessage = '';
  showSuccessMessage = '';

  // Filters
  searchQuery = '';
  selectedCategoryName = '';
  selectedAccessibilityType: AccessibilityType | '' = '';
  selectedSortOption = 'creation_date-desc'; // Default to newest first

  // Constants for template
  accessibilityTypes = [
    { value: AccessibilityType.PRIVATE, label: 'Private'},
    { value: AccessibilityType.PUBLIC, label: 'Public'},
    { value: AccessibilityType.AUTHORIZED, label: 'Authorized'},
    { value: AccessibilityType.GROUP, label: 'Group'}
  ];

  sortOptions: SortOption[] = [
    { 
      value: 'alphabetical-asc', 
      label: 'A-Z', 
      sortBy: NoteSortType.ALPHABETICAL, 
      sortOrder: 'asc' 
    },
    { 
      value: 'alphabetical-desc', 
      label: 'Z-A', 
      sortBy: NoteSortType.ALPHABETICAL, 
      sortOrder: 'desc' 
    },
    { 
      value: 'creation_date-desc', 
      label: 'Newest First', 
      sortBy: NoteSortType.CREATION_DATE, 
      sortOrder: 'desc' 
    },
    { 
      value: 'creation_date-asc', 
      label: 'Oldest First', 
      sortBy: NoteSortType.CREATION_DATE, 
      sortOrder: 'asc' 
    },
    { 
      value: 'content_length-asc', 
      label: 'Shortest First', 
      sortBy: NoteSortType.CONTENT_LENGTH, 
      sortOrder: 'asc' 
    },
    { 
      value: 'content_length-desc', 
      label: 'Longest First', 
      sortBy: NoteSortType.CONTENT_LENGTH, 
      sortOrder: 'desc' 
    }
  ];

  // Subject for cleanup
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private notesService: NotesService,
    private categoriesService: CategoriesService,
    private groupsService: GroupsService,
    private timeMachineService: TimeMachineService, // UPDATED: Added TimeMachineService
    private router: Router
  ) {
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.applyFilters();
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    
    // Subscribe to reactive state changes
    this.notesService.notes$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(notes => {
      this.allNotesFromServer = notes; // Store all notes from server
      this.filterNotesByTimeMachine(); // Apply time machine filtering
    });

    // Subscribe to total notes count changes
    this.notesService.totalNotes$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(total => {
      this.totalNotes = total;
    });

    // UPDATED: Subscribe to time machine changes to filter notes by creation date
    this.timeMachineService.virtualNow$().pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.filterNotesByTimeMachine();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== DATA LOADING ==========

  /**
   * Load initial data (notes and categories)
   */
  private loadInitialData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Load both notes and categories in parallel
    combineLatest([
      this.notesService.getNotes(this.buildCurrentFilter()),
      this.categoriesService.getCategories()
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ([notesResponse, categories]) => {
        this.categories = categories;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.errorMessage = 'Error loading notes. Please try again.';
        this.isLoading = false;
      }
    });
  }

  /**
   * UPDATED: Filter notes based on time machine date
   */
  private filterNotesByTimeMachine(): void {
    if (!this.allNotesFromServer.length) {
      this.allNotes = [];
      this.applyFilters();
      return;
    }

    // Get current time from time machine (could be virtual)
    const currentTime = this.timeMachineService.getNow();
    
    // Filter notes: only show notes created before or at the current time machine date
    const filteredNotes = this.allNotesFromServer.filter(note => {
      if (!note.createdAt) {
        // If no creation date, assume it was created "now" for safety
        return true;
      }
      
      const noteCreationDate = new Date(note.createdAt);
      return noteCreationDate <= currentTime;
    });

    this.allNotes = filteredNotes;
    this.applyFilters();
  }

  /**
   * Retry loading in case of error
   */
  retryLoadNotes(): void {
    this.loadInitialData();
  }

  // ========== NOTE VIEWER MANAGEMENT ==========

  /**
   * View note in modal
   */
  viewNote(noteId: string): void {
    this.notesService.getNoteById(noteId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (note) => {
        this.selectedNote = note;
        this.isViewerOpen = true;
      },
      error: (error) => {
        console.error('Error loading note:', error);
        this.errorMessage = 'Error loading note details';
        this.clearMessages();
      }
    });
  }

  /**
   * Close note viewer
   */
  closeNoteViewer(): void {
    this.isViewerOpen = false;
    this.selectedNote = null;
  }

  // ========== FILTER MANAGEMENT ==========

  /**
   * Handle search input change with debouncing
   */
  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  /**
   * Handle filter changes
   */
  onFiltersChange(): void {
    this.applyFilters();
  }

  /**
   * Handle sort option change
   */
  onSortChange(): void {
    this.applyFilters();
  }

  /**
   * Apply all filters and sorting locally - UPDATED to search only in title
   */
  private applyFilters(): void {
    let filtered = [...this.allNotes]; // Use time machine filtered notes

    // Apply search filter - UPDATED: search only in title
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(note => 
        (note.title?.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (this.selectedCategoryName) {
      filtered = filtered.filter(note => note.category === this.selectedCategoryName);
    }

    // Apply accessibility type filter
    if (this.selectedAccessibilityType) {
      filtered = filtered.filter(note => note.accessibility === this.selectedAccessibilityType);
    }

    // Apply sorting
    filtered = this.applySorting(filtered);

    this.filteredNotes = filtered;
  }

  /**
   * Apply sorting to notes
   */
  private applySorting(notes: NoteWithDetails[]): NoteWithDetails[] {
    if (!this.selectedSortOption) {
      return notes;
    }

    const selectedOption = this.sortOptions.find(opt => opt.value === this.selectedSortOption);
    if (!selectedOption) {
      return notes;
    }

    return this.notesService.sortNotesLocally(notes, selectedOption.sortBy, selectedOption.sortOrder);
  }

  /**
   * Build current filter for server queries
   */
  private buildCurrentFilter(): NoteFilterParams {
    const selectedOption = this.sortOptions.find(opt => opt.value === this.selectedSortOption);
    
    return {
      searchQuery: this.searchQuery || undefined,
      categoryName: this.selectedCategoryName || undefined,
      accessibility: this.selectedAccessibilityType || undefined,
      sortBy: selectedOption?.sortBy || NoteSortType.CREATION_DATE,
      sortOrder: selectedOption?.sortOrder || 'desc',
      limit: 50
    };
  }

  /**
   * Check if there are active filters
   */
  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.selectedCategoryName || this.selectedAccessibilityType);
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  /**
   * Reset all filters
   */
  clearAllFilters(): void {
    this.searchQuery = '';
    this.selectedCategoryName = '';
    this.selectedAccessibilityType = '';
    this.selectedSortOption = 'creation_date-desc';
    this.applyFilters();
  }

  // ========== NOTE ACTIONS ==========

  /**
   * Navigate to create new note - UPDATED with Time Machine integration
   */
  createNewNote(): void {
    // Get current time from time machine for the new note
    const currentTime = this.timeMachineService.getNow();
    
    this.router.navigate(['/notes/create'], {
      queryParams: {
        timeMachineDate: currentTime.toISOString() // Pass time machine date as query param
      }
    });
  }

  /**
   * Create a new group
   */
  createGroup(): void {
    this.router.navigate(['/groups']);
  }

  /**
   * Edit an existing note
   */
  editNote(noteId: string): void {
    this.router.navigate(['/notes', noteId, 'edit']);
  }

  /**
   * Delete a note
   */
  deleteNote(noteId: string): void {
    const note = this.allNotes.find(n => n.id === noteId);
    if (!note) return;

    this.isLoading = true;
    
    this.notesService.deleteNote(noteId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.showSuccessMessage = 'Note deleted successfully!';
        this.isLoading = false;
        this.clearMessages();
        // Close viewer if the deleted note was being viewed
        if (this.selectedNote?.id === noteId) {
          this.closeNoteViewer();
        }
      },
      error: (error) => {
        console.error('Error deleting note:', error);
        this.errorMessage = 'Error deleting note';
        this.isLoading = false;
        this.clearMessages();
      }
    });
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get label for accessibility type
   */
  getAccessibilityTypeLabel(type: AccessibilityType): string {
    const accessibilityType = this.accessibilityTypes.find(t => t.value === type);
    return accessibilityType?.label || 'Unknown';
  }

  /**
   * TrackBy function to optimize list rendering
   */
  trackByNoteId(index: number, note: NoteWithDetails): string {
    return note.id;
  }

  /**
   * Get label for selected sort option
   */
  getSortOptionLabel(): string {
    const selectedOption = this.sortOptions.find(opt => opt.value === this.selectedSortOption);
    return selectedOption?.label || 'Newest First';
  }

  /**
   * Format notes count for display - UPDATED to show time machine filtering info
   */
  getNotesCountText(): string {
    const count = this.filteredNotes.length;
    const timeFilteredCount = this.allNotes.length;
    const total = this.totalNotes;
    
    if (this.isTimeMachineActive() && timeFilteredCount < total) {
      if (count === timeFilteredCount) {
        return `${timeFilteredCount} of ${total} note${total !== 1 ? 's' : ''} (filtered by time machine date)`;
      } else {
        return `${count} of ${timeFilteredCount} note${timeFilteredCount !== 1 ? 's' : ''} (${total} total, filtered by time machine)`;
      }
    } else {
      if (count === total) {
        return `${total} note${total !== 1 ? 's' : ''}`;
      } else {
        return `${count} of ${total} note${total !== 1 ? 's' : ''}`;
      }
    }
  }

  /**
   * Get category name by name
   */
  getCategoryName(categoryName: string | null): string {
    if (!categoryName) return 'Uncategorized';
    const category = this.categories.find(c => c.name === categoryName);
    return category?.name || 'Unknown Category';
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    const now = new Date();
    const noteDate = new Date(date);
    const diffTime = now.getTime() - noteDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      return noteDate.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: noteDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  /**
   * Hide messages after delay
   */
  private clearMessages(): void {
    setTimeout(() => {
      this.showSuccessMessage = '';
      this.errorMessage = '';
    }, 3000);
  }

  // ========== NAVIGATION HELPERS ==========

  /**
   * Refresh data from server
   */
  refreshData(): void {
    console.log('Refreshing data...');
    this.loadInitialData();
  }

  /**
   * Force refresh with debug info
   */
  forceRefresh(): void {
    console.log('Current component state:', {
      allNotesFromServer: this.allNotesFromServer.length,
      allNotes: this.allNotes.length,
      filteredNotes: this.filteredNotes.length,
      totalNotes: this.totalNotes,
      isLoading: this.isLoading,
      errorMessage: this.errorMessage,
      isTimeMachineActive: this.isTimeMachineActive()
    });
    this.notesService.refreshNotes().subscribe(response => {
      console.log('Force refresh response:', response);
    });
  }

  /**
   * Debug: Force update totals
   */
  debugUpdateTotal(): void {
    console.log('Forcing total notes update...');
    this.notesService.refreshNotes().subscribe();
  }

  // ========== TIME MACHINE HELPERS ==========

  /**
   * UPDATED: Check if time machine is active (for debugging/display)
   */
  isTimeMachineActive(): boolean {
    return this.timeMachineService.isActive();
  }

  /**
   * UPDATED: Get current time from time machine for display purposes
   */
  getCurrentTimeMachineDate(): string {
    const currentTime = this.timeMachineService.getNow();
    return currentTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * UPDATED: Get filtered notes count message with time machine info
   */
  getNotesCountMessage(): string {
    const visibleCount = this.filteredNotes.length;
    const timeFilteredCount = this.allNotes.length;
    const totalCount = this.totalNotes;
    
    if (this.isTimeMachineActive() && timeFilteredCount < totalCount) {
      return `Showing ${visibleCount} of ${timeFilteredCount} notes (${totalCount} total, filtered by time machine date)`;
    } else {
      return `${visibleCount} note${visibleCount !== 1 ? 's' : ''} available`;
    }
  }

  // ========== FILTER UTILITIES ==========

  /**
   * Get filter summary text
   */
  getFilterSummary(): string {
    const filters: string[] = [];
    
    if (this.searchQuery) {
      filters.push(`Search: "${this.searchQuery}"`);
    }
    
    if (this.selectedCategoryName) {
      const categoryName = this.getCategoryName(this.selectedCategoryName);
      filters.push(`Category: ${categoryName}`);
    }
    
    if (this.selectedAccessibilityType) {
      const typeName = this.getAccessibilityTypeLabel(this.selectedAccessibilityType);
      filters.push(`Type: ${typeName}`);
    }

    // UPDATED: Add time machine filter info
    if (this.isTimeMachineActive()) {
      filters.push(`Time: Before ${this.getCurrentTimeMachineDate()}`);
    }
    
    return filters.join(', ');
  }

  /**
   * Get placeholder text for search input - UPDATED to reflect title-only search
   */
  getSearchPlaceholder(): string {
    return 'Search in note titles...';
  }

  /**
   * Check if there are no notes at all
   */
  hasNoNotes(): boolean {
    return !this.isLoading && !this.errorMessage && this.totalNotes === 0;
  }

  /**
   * Check if filters are active but no results
   */
  hasNoFilterResults(): boolean {
    return !this.isLoading && !this.errorMessage && this.filteredNotes.length === 0 && this.allNotes.length > 0;
  }

  /**
   * UPDATED: Check if time machine filtering is hiding notes
   */
  hasNoTimeMachineResults(): boolean {
    return !this.isLoading && !this.errorMessage && this.allNotes.length === 0 && this.totalNotes > 0;
  }

  /**
   * Check if there are results to display
   */
  hasResults(): boolean {
    return !this.isLoading && !this.errorMessage && this.filteredNotes.length > 0;
  }
}