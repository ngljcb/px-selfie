// note-editor.component.ts - CREATE ONLY VERSION

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';

import { 
  CreateNoteRequest, 
  Category, 
  AccessibilityType, 
  Group,
  User,
  NOTE_CONSTANTS 
} from '../../../model/note.interface';
import { NotesService } from '../../../service/notes.service';
import { CategoriesService } from '../../../service/categories.service';
import { GroupsService } from '../../../service/groups.service';
import { UsersService } from '../../../service/users.service';
import { AuthService } from '../../../service/auth.service';

interface NoteFormData {
  title: string;
  content: string;
  categoryName: string;
  accessibility: AccessibilityType;
  groupName: string;
  authorizedUserIds: string[];
}

interface SelectedUser {
  id: string;
  displayName: string;
  email?: string;
}

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './note-editor.component.html'
})
export class NoteEditorComponent implements OnInit, OnDestroy {

  // Current user ID to filter from search
  currentUserId: string | null = null;

  // Note data
  noteData: NoteFormData = {
    title: '',
    content: '',
    categoryName: '',
    accessibility: AccessibilityType.PRIVATE,
    groupName: '',
    authorizedUserIds: []
  };
  
  // Form state
  hasChanges = false;
  showValidationErrors = false;
  isSaving = false;
  isLoading = false;

  // Categories and groups
  categories: Category[] = [];
  groups: Group[] = [];

  // User search and selection
  userSearchQuery = '';
  userSearchResults: User[] = [];
  selectedUsers: SelectedUser[] = [];
  isSearchingUsers = false;
  userSearchError = '';

  // Constants for template
  accessibilityTypes = [
    { 
      value: AccessibilityType.PRIVATE, 
      label: 'Private', 
      description: 'Only you can see this note',
    },
    { 
      value: AccessibilityType.PUBLIC, 
      label: 'Public', 
      description: 'Visible to all users',
    },
    { 
      value: AccessibilityType.AUTHORIZED, 
      label: 'Authorized', 
      description: 'Visible to specific people you choose (you are automatically included)',
    },
    { 
      value: AccessibilityType.GROUP, 
      label: 'Group', 
      description: 'Visible to group members',
    }
  ];

  // User search management
  private userSearchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private initialFormState: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private notesService: NotesService,
    private categoriesService: CategoriesService,
    private groupsService: GroupsService,
    private usersService: UsersService,
    private authService: AuthService
  ) {
    // Setup user search with debouncing
    this.userSearchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.performUserSearch(query);
    });
  }

  ngOnInit(): void {
    // Get current user ID from auth service
    this.getCurrentUserId();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Prevent accidental close with unsaved changes
   */
  @HostListener('window:beforeunload', ['$event'])
  unloadNotification(event: any): void {
    if (this.hasChanges) {
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  }

  // ========== INITIALIZATION ==========

  /**
   * Get current user ID from auth service
   */
  private getCurrentUserId(): void {
    this.authService.me().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        // Now that we have the user ID, initialize the editor
        this.initializeEditor();
        this.loadSupportingData();
      },
      error: (error) => {
        console.error('Error getting current user:', error);
        // Redirect to login if auth fails
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Initialize editor for creating new note
   */
  private initializeEditor(): void {
    this.isLoading = true;

    // Check for duplicate parameters
    const queryParams = this.route.snapshot.queryParams;
    const isDuplicate = queryParams['duplicate'] === 'true';

    if (isDuplicate) {
      this.initializeNoteFromDuplicate(queryParams);
    } else {
      this.initializeNewNote();
    }
  }

  /**
   * Initialize new note
   */
  private initializeNewNote(): void {
    this.noteData = {
      title: '',
      content: '',
      categoryName: '',
      accessibility: AccessibilityType.PRIVATE,
      groupName: '',
      authorizedUserIds: []
    };
    
    this.selectedUsers = [];
    this.setInitialFormState();
    this.isLoading = false;
  }

  /**
   * Initialize new note from duplicate parameters
   */
  private initializeNoteFromDuplicate(queryParams: any): void {
    // Get the original title and add "Copy of" prefix
    const originalTitle = queryParams['title'] || '';
    const duplicatedTitle = originalTitle ? `Copy of ${originalTitle}` : '';

    this.noteData = {
      title: duplicatedTitle,
      content: queryParams['content'] || '',
      categoryName: queryParams['category'] || '',
      accessibility: queryParams['accessibility'] || AccessibilityType.PRIVATE,
      groupName: queryParams['groupName'] || '',
      authorizedUserIds: [] // Reset authorized users for new note
    };
    
    this.selectedUsers = []; // Reset selected users for security
    this.setInitialFormState();
    this.isLoading = false;
    
    // Clear query parameters from URL after loading
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  /**
   * Load supporting data (categories and groups)
   */
  private loadSupportingData(): void {
    combineLatest([
      this.categoriesService.getCategories(),
      this.groupsService.getUserGroups()
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ([categories, groups]) => {
        this.categories = categories;
        this.groups = groups;
      },
      error: (error) => {
        console.error('Error loading supporting data:', error);
      }
    });
  }

  // ========== USER SEARCH AND MANAGEMENT ==========

  /**
   * Handle user search input
   */
  onUserSearchInput(): void {
    this.userSearchSubject.next(this.userSearchQuery);
  }

  /**
   * Perform user search excluding current user
   */
  private performUserSearch(query: string): void {
    if (!query.trim()) {
      this.userSearchResults = [];
      return;
    }

    // Don't search if we don't have current user ID yet
    if (!this.currentUserId) {
      this.userSearchError = 'Please wait while we load your profile...';
      return;
    }

    this.isSearchingUsers = true;
    this.userSearchError = '';

    this.usersService.searchUsersByUsername(query).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (users) => {
        // Filter out current user and already selected users
        this.userSearchResults = users.filter(user => 
          user.id !== this.currentUserId && // Exclude current user
          !this.selectedUsers.some(selected => selected.id === user.id) // Exclude already selected
        );
        this.isSearchingUsers = false;
      },
      error: (error) => {
        console.error('Error searching users:', error);
        this.userSearchError = 'Error searching users. Please try again.';
        this.userSearchResults = [];
        this.isSearchingUsers = false;
      }
    });
  }

  /**
   * Add user to authorized list
   */
  addUserToAuthorized(user: User): void {
    // Double-check that we're not adding current user
    if (user.id === this.currentUserId) {
      this.userSearchError = 'You cannot add yourself as an authorized user. You automatically have access to your own notes.';
      setTimeout(() => this.userSearchError = '', 4000);
      return;
    }

    const selectedUser: SelectedUser = {
      id: user.id,
      displayName: user.displayName || user.email || user.id,
      email: user.email
    };

    this.selectedUsers.push(selectedUser);
    this.noteData.authorizedUserIds.push(user.id);
    
    // Remove from search results
    this.userSearchResults = this.userSearchResults.filter(u => u.id !== user.id);
    
    // Clear search
    this.userSearchQuery = '';
    this.userSearchResults = [];
    
    this.onFormChange();
  }

  /**
   * Remove user from authorized list
   */
  removeUserFromAuthorized(userId: string): void {
    this.selectedUsers = this.selectedUsers.filter(user => user.id !== userId);
    this.noteData.authorizedUserIds = this.noteData.authorizedUserIds.filter(id => id !== userId);
    this.onFormChange();
  }

  /**
   * Clear user search
   */
  clearUserSearch(): void {
    this.userSearchQuery = '';
    this.userSearchResults = [];
    this.userSearchError = '';
  }

  // ========== FORM MANAGEMENT ==========

  /**
   * Set initial form state
   */
  private setInitialFormState(): void {
    this.initialFormState = JSON.stringify({
      ...this.noteData,
      selectedUsers: this.selectedUsers
    });
    this.hasChanges = false;
  }

  /**
   * Handle form changes
   */
  onFormChange(): void {
    this.checkForChanges();
  }

  /**
   * Handle content changes
   */
  onContentChange(): void {
    this.checkForChanges();
  }

  /**
   * Handle accessibility type change
   */
  onAccessibilityChange(): void {
    // Reset related fields when changing accessibility type
    if (this.noteData.accessibility !== AccessibilityType.GROUP) {
      this.noteData.groupName = '';
    }
    if (this.noteData.accessibility !== AccessibilityType.AUTHORIZED) {
      this.noteData.authorizedUserIds = [];
      this.selectedUsers = [];
      this.clearUserSearch();
    }
    this.onFormChange();
  }

  /**
   * Check for changes compared to initial state
   */
  private checkForChanges(): void {
    const currentState = JSON.stringify({
      ...this.noteData,
      selectedUsers: this.selectedUsers
    });
    this.hasChanges = currentState !== this.initialFormState;
  }

  /**
   * Validate form
   */
  isFormValid(): boolean {
    return !!(
      this.noteData.title.trim() &&
      this.noteData.content.trim() &&
      this.isAccessibilityValid()
    );
  }

  /**
   * Validate accessibility-specific requirements
   */
  private isAccessibilityValid(): boolean {
    switch (this.noteData.accessibility) {
      case AccessibilityType.GROUP:
        return !!this.noteData.groupName;
      case AccessibilityType.AUTHORIZED:
        return this.noteData.authorizedUserIds.length > 0;
      default:
        return true;
    }
  }

  /**
   * Get final category (handles empty category)
   */
  private getFinalCategoryName(): string | undefined {
    return this.noteData.categoryName || undefined;
  }

  // ========== EDITOR ACTIONS ==========

  /**
   * Create note
   */
  async createNote(): Promise<void> {
    if (!this.isFormValid()) {
      this.showValidationErrors = true;
      this.scrollToFirstError();
      return;
    }

    this.isSaving = true;

    try {
      const createRequest: CreateNoteRequest = {
        title: this.noteData.title,
        text: this.noteData.content,
        category: this.getFinalCategoryName(),
        accessibility: this.noteData.accessibility,
        groupName: this.noteData.groupName || undefined,
        authorizedUserIds: this.noteData.authorizedUserIds.length > 0 ? this.noteData.authorizedUserIds : undefined
      };

      const createdNote = await this.notesService.createNote(createRequest).toPromise();
      
      if (createdNote) {
        console.log('Note created successfully:', createdNote.id);
        // Clear form state to prevent unsaved changes warning
        this.setInitialFormState();
        // Navigate back to notes list
        this.router.navigate(['/notes']);
      }

    } catch (error) {
      console.error('Error creating note:', error);
      // Don't navigate on error, let user try again
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Discard changes
   */
  discardChanges(): void {
    if (this.hasChanges) {
      const confirmMessage = 'You have unsaved changes. Are you sure you want to discard them?';
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    this.goBack();
  }

  /**
   * Go back
   */
  goBack(): void {
    this.router.navigate(['/notes']);
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get save button text
   */
  getSaveButtonText(): string {
    return this.isSaving ? 'Creating...' : 'Create Note';
  }

  /**
   * Get loading message
   */
  getLoadingMessage(): string {
    return 'Loading...';
  }

  /**
   * Get accessibility type description
   */
  getAccessibilityDescription(type: AccessibilityType): string {
    const accessibilityType = this.accessibilityTypes.find(t => t.value === type);
    return accessibilityType?.description || '';
  }

  /**
   * Generate Markdown preview (simplified)
   */
  getMarkdownPreview(): string {
    if (!this.noteData.content) return '<p class="text-gray-400">No content to preview</p>';

    let html = this.noteData.content;

    // Basic Markdown conversions
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-3">$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>');

    // Inline code
    html = html.replace(/`(.*?)`/gim, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 hover:underline">$1</a>');

    // Lists
    html = html.replace(/^\- (.+$)/gim, '<li class="ml-4">• $1</li>');
    html = html.replace(/^\d+\. (.+$)/gim, '<li class="ml-4">$1</li>');

    // Line breaks
    html = html.replace(/\n\n/gim, '</p><p class="mb-3">');
    html = html.replace(/\n/gim, '<br>');

    // Wrap in paragraphs
    if (html && !html.startsWith('<h') && !html.startsWith('<li')) {
      html = '<p class="mb-3">' + html + '</p>';
    }

    return html;
  }

  // ========== VALIDATION HELPERS ==========

  /**
   * Scroll to first error field
   */
  private scrollToFirstError(): void {
    // Scroll to first field with error
    setTimeout(() => {
      const firstError = document.querySelector('.border-red-300');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  /**
   * Get validation errors
   */
  getValidationErrors(): string[] {
    const errors: string[] = [];
    
    if (!this.noteData.title.trim()) {
      errors.push('Title is required');
    }
    
    if (!this.noteData.content.trim()) {
      errors.push('Content is required');
    }
    
    if (this.noteData.accessibility === AccessibilityType.GROUP && !this.noteData.groupName) {
      errors.push('Group selection is required for group notes');
    }
    
    if (this.noteData.accessibility === AccessibilityType.AUTHORIZED && this.noteData.authorizedUserIds.length === 0) {
      errors.push('At least one authorized user is required');
    }
    
    return errors;
  }

  // ========== CATEGORY AND GROUP HELPERS ==========

  /**
   * Get category display name
   */
  getCategoryDisplayName(categoryName: string): string {
    const category = this.categories.find(c => c.name === categoryName);
    return category?.name || 'Unknown';
  }

  /**
   * Get group display name
   */
  getGroupDisplayName(groupName: string): string {
    const group = this.groups.find(g => g.name === groupName);
    return group ? group.name : groupName;
  }

  // ========== USER SEARCH HELPERS ==========

  /**
   * Get user display text for search results
   */
  getUserDisplayText(user: User): string {
    if (user.displayName) {
      return user.email ? `${user.displayName} (${user.email})` : user.displayName;
    }
    return user.email || user.id;
  }

  /**
   * Check if user search has results
   */
  hasUserSearchResults(): boolean {
    return this.userSearchResults.length > 0;
  }

  /**
   * Check if any users are selected
   */
  hasSelectedUsers(): boolean {
    return this.selectedUsers.length > 0;
  }

  /**
   * Get selected users count text
   */
  getSelectedUsersCountText(): string {
    const count = this.selectedUsers.length;
    return `${count} user${count !== 1 ? 's' : ''} selected`;
  }

    /**
   * Get helper text for authorized users section
   */
  getAuthorizedUsersHelperText(): string {
    return 'Search and select users who should have access to this note. You are automatically included and do not need to add yourself.';
  }
}