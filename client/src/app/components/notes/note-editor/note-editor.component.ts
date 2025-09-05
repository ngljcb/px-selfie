import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';

import { 
  CreateNoteRequest, 
  UpdateNoteRequest,
  AccessibilityType, 
  Category,
  Group,
} from '../../../model/note.interface';
import { User } from '../../../model/entity/user.interface';
import { NotesService } from '../../../service/notes.service';
import { CategoriesService } from '../../../service/categories.service';
import { GroupsService } from '../../../service/groups.service';
import { UsersService } from '../../../service/users.service';
import { AuthService } from '../../../service/auth.service';
import { TimeMachineService } from '../../../service/time-machine.service';

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

  isEditMode = false;
  noteId: string | null = null;
  currentUserId: string | null = null;

  timeMachineDate: Date | null = null;

  noteData: NoteFormData = {
    title: '',
    content: '',
    categoryName: '',
    accessibility: AccessibilityType.PRIVATE,
    groupName: '',
    authorizedUserIds: []
  };

  hasChanges = false;
  showValidationErrors = false;
  isSaving = false;
  isLoading = false;

  categories: Category[] = [];
  groups: Group[] = [];

  userSearchQuery = '';
  userSearchResults: User[] = [];
  selectedUsers: SelectedUser[] = [];
  isSearchingUsers = false;
  userSearchError = '';

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
    private authService: AuthService,
    private timeMachineService: TimeMachineService 
  ) {
    this.userSearchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.performUserSearch(query);
    });
  }

  ngOnInit(): void {
    // Check if we're in edit mode
    this.noteId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.noteId;

    const queryParams = this.route.snapshot.queryParams;
    if (queryParams['timeMachineDate']) {
      this.timeMachineDate = new Date(queryParams['timeMachineDate']);
    } else {
      this.timeMachineDate = this.timeMachineService.getNow();
    }

    this.getCurrentUserId();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification(event: any): void {
    if (this.hasChanges) {
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  }

  private getCurrentUserId(): void {
    this.authService.me().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        this.initializeEditor();
        this.loadSupportingData();
      },
      error: (error) => {
        console.error('Error getting current user:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  private initializeEditor(): void {
    this.isLoading = true;

    if (this.isEditMode && this.noteId) {
      this.loadNoteForEditing(this.noteId);
    } else {
      const queryParams = this.route.snapshot.queryParams;
      const isDuplicate = queryParams['duplicate'] === 'true';

      if (isDuplicate) {
        this.initializeNoteFromDuplicate(queryParams);
      } else {
        this.initializeNewNote();
      }
    }
  }

private loadNoteForEditing(noteId: string): void {
  this.notesService.getNoteById(noteId).pipe(
    takeUntil(this.destroy$)
  ).subscribe({
    next: (note) => {
      console.log('Note loaded for editing:', note); // DEBUG
      
      // Prova entrambe le proprietà per compatibilità
      const authorizedUsers = note.authorizedUsers || note.authorizedUsers || [];
      const authorizedUserIds = authorizedUsers.map(authUser => authUser.userId);
      
      console.log('Authorized users:', authorizedUsers); // DEBUG
      console.log('Group name:', note.groupName); // DEBUG
      
      this.noteData = {
        title: note.title || '',
        content: note.text || '',
        categoryName: note.category || '',
        accessibility: note.accessibility,
        groupName: note.groupName || '', // Ora dovrebbe funzionare
        authorizedUserIds: authorizedUserIds
      };

      // Load authorized users details if any
      if (authorizedUserIds.length > 0) {
        this.loadAuthorizedUsers(authorizedUserIds);
      } else {
        this.selectedUsers = [];
      }

      this.setInitialFormState();
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Error loading note for editing:', error);
      this.router.navigate(['/notes']);
    }
  });
}

  private loadAuthorizedUsers(userIds: string[]): void {
    this.usersService.getUsersByIds(userIds).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (users) => {
        this.selectedUsers = users.map(user => ({
          id: user.id,
          displayName: user.displayName || user.email || user.id,
          email: user.email
        }));
      },
      error: (error) => {
        console.error('Error loading authorized users:', error);
        this.selectedUsers = [];
      }
    });
  }

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

  private initializeNoteFromDuplicate(queryParams: any): void {
    const originalTitle = queryParams['title'] || '';
    const duplicatedTitle = originalTitle ? `Copy of ${originalTitle}` : '';

    this.noteData = {
      title: duplicatedTitle,
      content: queryParams['content'] || '',
      categoryName: queryParams['category'] || '',
      accessibility: queryParams['accessibility'] || AccessibilityType.PRIVATE,
      groupName: queryParams['groupName'] || '',
      authorizedUserIds: [] 
    };
    
    this.selectedUsers = []; 
    this.setInitialFormState();
    this.isLoading = false;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

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

  onUserSearchInput(): void {
    this.userSearchSubject.next(this.userSearchQuery);
  }

  private performUserSearch(query: string): void {
    if (!query.trim()) {
      this.userSearchResults = [];
      return;
    }

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
        this.userSearchResults = users.filter(user => 
          user.id !== this.currentUserId && 
          !this.selectedUsers.some(selected => selected.id === user.id) 
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

  addUserToAuthorized(user: User): void {
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

    this.userSearchResults = this.userSearchResults.filter(u => u.id !== user.id);

    this.userSearchQuery = '';
    this.userSearchResults = [];
    
    this.onFormChange();
  }

  removeUserFromAuthorized(userId: string): void {
    this.selectedUsers = this.selectedUsers.filter(user => user.id !== userId);
    this.noteData.authorizedUserIds = this.noteData.authorizedUserIds.filter(id => id !== userId);
    this.onFormChange();
  }

  clearUserSearch(): void {
    this.userSearchQuery = '';
    this.userSearchResults = [];
    this.userSearchError = '';
  }

  private setInitialFormState(): void {
    this.initialFormState = JSON.stringify({
      ...this.noteData,
      selectedUsers: this.selectedUsers
    });
    this.hasChanges = false;
  }

  onFormChange(): void {
    this.checkForChanges();
  }

  onContentChange(): void {
    this.checkForChanges();
  }

  onAccessibilityChange(): void {
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

  private checkForChanges(): void {
    const currentState = JSON.stringify({
      ...this.noteData,
      selectedUsers: this.selectedUsers
    });
    this.hasChanges = currentState !== this.initialFormState;
  }

  isFormValid(): boolean {
    return !!(
      this.noteData.title.trim() &&
      this.noteData.content.trim() &&
      this.isAccessibilityValid()
    );
  }

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

  private getFinalCategoryName(): string | undefined {
    return this.noteData.categoryName || undefined;
  }

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
        authorizedUserIds: this.noteData.authorizedUserIds.length > 0 ? this.noteData.authorizedUserIds : undefined,
        createdAt: this.timeMachineDate || undefined, 
        lastModifyAt: this.timeMachineDate || undefined
      };

      const createdNote = await this.notesService.createNote(createRequest).toPromise();
      
      if (createdNote) {
        console.log('Note created successfully:', createdNote.id);
        this.setInitialFormState();
        this.router.navigate(['/notes']);
      }

    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      this.isSaving = false;
    }
  }

async updateNote(): Promise<void> {
  if (!this.isFormValid() || !this.noteId) {
    this.showValidationErrors = true;
    this.scrollToFirstError();
    return;
  }

  this.isSaving = true;

  try {
    const currentTime = this.timeMachineService.getNow();

    const updateRequest: UpdateNoteRequest = {
      title: this.noteData.title,
      text: this.noteData.content,
      category: this.getFinalCategoryName(),
      accessibility: this.noteData.accessibility,
      groupName: this.noteData.groupName || undefined,
      authorizedUserIds: this.noteData.authorizedUserIds.length > 0 ? this.noteData.authorizedUserIds : undefined,
      lastModifyAt: currentTime  
    };

    const updatedNote = await this.notesService.updateNote(this.noteId, updateRequest).toPromise();
    
    if (updatedNote) {
      console.log('Note updated successfully:', updatedNote.id);
      this.setInitialFormState();
      this.router.navigate(['/notes']);
    }

  } catch (error) {
    console.error('Error updating note:', error);
  } finally {
    this.isSaving = false;
  }
}

  async saveNote(): Promise<void> {
    if (this.isEditMode) {
      await this.updateNote();
    } else {
      await this.createNote();
    }
  }

  goBack(): void {
    this.router.navigate(['/notes']);
  }

  getSaveButtonText(): string {
    if (this.isSaving) {
      return this.isEditMode ? 'Updating...' : 'Creating...';
    }
    return this.isEditMode ? 'Update Note' : 'Create Note';
  }

  getPageTitle(): string {
    return this.isEditMode ? 'Edit Note' : 'Create Note';
  }

  getLoadingMessage(): string {
    return this.isEditMode ? 'Loading note...' : 'Loading...';
  }

  getCreationDateDisplay(): string {
    if (!this.timeMachineDate) {
      return 'Now';
    }

    const isTimeMachineActive = this.timeMachineService.isActive();
    const dateStr = this.timeMachineDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return isTimeMachineActive ? `${dateStr} (Time Machine)` : dateStr;
  }

  isTimeMachineActive(): boolean {
    return this.timeMachineService.isActive();
  }

  getAccessibilityDescription(type: AccessibilityType): string {
    const accessibilityType = this.accessibilityTypes.find(t => t.value === type);
    return accessibilityType?.description || '';
  }

  getMarkdownPreview(): string {
    if (!this.noteData.content) return '<p class="text-gray-400">No content to preview</p>';

    let html = this.noteData.content;

    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-3">$1</h1>');

    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>');

    html = html.replace(/`(.*?)`/gim, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 hover:underline">$1</a>');

    html = html.replace(/^\- (.+$)/gim, '<li class="ml-4">• $1</li>');
    html = html.replace(/^\d+\. (.+$)/gim, '<li class="ml-4">$1</li>');

    html = html.replace(/\n\n/gim, '</p><p class="mb-3">');
    html = html.replace(/\n/gim, '<br>');

    if (html && !html.startsWith('<h') && !html.startsWith('<li')) {
      html = '<p class="mb-3">' + html + '</p>';
    }

    return html;
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      const firstError = document.querySelector('.border-red-300');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

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

  getCategoryDisplayName(categoryName: string): string {
    const category = this.categories.find(c => c.name === categoryName);
    return category?.name || 'Unknown';
  }

  getGroupDisplayName(groupName: string): string {
    const group = this.groups.find(g => g.name === groupName);
    return group ? group.name : groupName;
  }

  getUserDisplayText(user: User): string {
    if (user.displayName) {
      return user.email ? `${user.displayName} (${user.email})` : user.displayName;
    }
    return user.email || user.id;
  }

  hasUserSearchResults(): boolean {
    return this.userSearchResults.length > 0;
  }

  hasSelectedUsers(): boolean {
    return this.selectedUsers.length > 0;
  }

  getSelectedUsersCountText(): string {
    const count = this.selectedUsers.length;
    return `${count} user${count !== 1 ? 's' : ''} selected`;
  }

  getAuthorizedUsersHelperText(): string {
    return 'Search and select users who should have access to this note. You are automatically included and do not need to add yourself.';
  }
}