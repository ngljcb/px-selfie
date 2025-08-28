import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';

import { NoteBoxComponent } from '../note-box/note-box.component';
import { NoteViewerComponent } from '../note-viewer/note-viewer.component';

import { 
  NoteWithDetails, 
  Category, 
  AccessibilityType,
  NoteSortType,
  NoteFilterParams,
  SORT_OPTIONS
} from '../../../model/note.interface';
import { NotesService } from '../../../service/notes.service';
import { CategoriesService } from '../../../service/categories.service';
import { TimeMachineService } from '../../../service/time-machine.service';

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

  allNotes: NoteWithDetails[] = [];
  allNotesFromServer: NoteWithDetails[] = []; 
  filteredNotes: NoteWithDetails[] = [];
  categories: Category[] = [];
  totalNotes = 0;

  selectedNote: NoteWithDetails | null = null;
  isViewerOpen = false;

  isLoading = false;
  errorMessage = '';
  showSuccessMessage = '';

  searchQuery = '';
  selectedCategoryName = '';
  selectedAccessibilityType: AccessibilityType | '' = '';
  selectedSortOption = 'creation_date-desc'; 

  sortOptions = SORT_OPTIONS;

  accessibilityTypes = [
    { value: AccessibilityType.PRIVATE, label: 'Private'},
    { value: AccessibilityType.PUBLIC, label: 'Public'},
    { value: AccessibilityType.AUTHORIZED, label: 'Authorized'},
    { value: AccessibilityType.GROUP, label: 'Group'}
  ];

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private notesService: NotesService,
    private categoriesService: CategoriesService,
    private timeMachineService: TimeMachineService, 
    private router: Router
  ) {

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
    
    this.notesService.notes$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(notes => {
      this.allNotesFromServer = notes; 
      this.filterNotesByTimeMachine(); 
    });

    this.notesService.totalNotes$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(total => {
      this.totalNotes = total;
    });

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

  private loadInitialData(): void {
    this.isLoading = true;
    this.errorMessage = '';

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

  private filterNotesByTimeMachine(): void {
    if (!this.allNotesFromServer.length) {
      this.allNotes = [];
      this.applyFilters();
      return;
    }

    const currentTime = this.timeMachineService.getNow();

    const filteredNotes = this.allNotesFromServer.filter(note => {
      if (!note.createdAt) {

        return true;
      }
      
      const noteCreationDate = new Date(note.createdAt);
      return noteCreationDate <= currentTime;
    });

    this.allNotes = filteredNotes;
    this.applyFilters();
  }

  retryLoadNotes(): void {
    this.loadInitialData();
  }

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

  closeNoteViewer(): void {
    this.isViewerOpen = false;
    this.selectedNote = null;
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  onFiltersChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.allNotes]; 
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(note => 
        (note.title?.toLowerCase().includes(query))
      );
    }

    if (this.selectedCategoryName) {
      filtered = filtered.filter(note => note.category === this.selectedCategoryName);
    }

    if (this.selectedAccessibilityType) {
      filtered = filtered.filter(note => note.accessibility === this.selectedAccessibilityType);
    }

    filtered = this.applySorting(filtered);

    this.filteredNotes = filtered;
  }

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

  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.selectedCategoryName || this.selectedAccessibilityType);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.selectedCategoryName = '';
    this.selectedAccessibilityType = '';
    this.selectedSortOption = 'creation_date-desc';
    this.applyFilters();
  }

  createNewNote(): void {
    const currentTime = this.timeMachineService.getNow();
    
    this.router.navigate(['/notes/create'], {
      queryParams: {
        timeMachineDate: currentTime.toISOString() 
      }
    });
  }

  createGroup(): void {
    this.router.navigate(['/groups']);
  }

  editNote(noteId: string): void {
    this.router.navigate(['/notes', noteId, 'edit']);
  }

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

  getAccessibilityTypeLabel(type: AccessibilityType): string {
    const accessibilityType = this.accessibilityTypes.find(t => t.value === type);
    return accessibilityType?.label || 'Unknown';
  }

  trackByNoteId(index: number, note: NoteWithDetails): string {
    return note.id;
  }

  getSortOptionLabel(): string {
    const selectedOption = this.sortOptions.find(opt => opt.value === this.selectedSortOption);
    return selectedOption?.label || 'Newest First';
  }

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

  getCategoryName(categoryName: string | null): string {
    if (!categoryName) return 'Uncategorized';
    const category = this.categories.find(c => c.name === categoryName);
    return category?.name || 'Unknown Category';
  }

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

  private clearMessages(): void {
    setTimeout(() => {
      this.showSuccessMessage = '';
      this.errorMessage = '';
    }, 3000);
  }

  refreshData(): void {
    console.log('Refreshing data...');
    this.loadInitialData();
  }

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

  debugUpdateTotal(): void {
    console.log('Forcing total notes update...');
    this.notesService.refreshNotes().subscribe();
  }

  isTimeMachineActive(): boolean {
    return this.timeMachineService.isActive();
  }

  getCurrentTimeMachineDate(): string {
    const currentTime = this.timeMachineService.getNow();
    return currentTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

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

    if (this.isTimeMachineActive()) {
      filters.push(`Time: Before ${this.getCurrentTimeMachineDate()}`);
    }
    
    return filters.join(', ');
  }

  getSearchPlaceholder(): string {
    return 'Search in note titles...';
  }

  hasNoNotes(): boolean {
    return !this.isLoading && !this.errorMessage && this.totalNotes === 0;
  }

  hasNoFilterResults(): boolean {
    return !this.isLoading && !this.errorMessage && this.filteredNotes.length === 0 && this.allNotes.length > 0;
  }

  hasNoTimeMachineResults(): boolean {
    return !this.isLoading && !this.errorMessage && this.allNotes.length === 0 && this.totalNotes > 0;
  }

  hasResults(): boolean {
    return !this.isLoading && !this.errorMessage && this.filteredNotes.length > 0;
  }
}