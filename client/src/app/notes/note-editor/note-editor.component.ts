// note-editor.component.ts

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';

import { 
  NoteWithDetails, 
  CreateNoteRequest, 
  UpdateNoteRequest, 
  Category, 
  AccessibilityType, 
  Group,
  NOTE_CONSTANTS 
} from '../../model/note.interface';
import { NotesService } from '../../service/notes.service';
import { CategoriesService } from '../../service/categories.service';
import { GroupsService } from '../../service/groups.service';

type EditorMode = 'create' | 'edit';
type AutoSaveStatus = 'saved' | 'saving' | 'error' | null;

interface NoteFormData {
  title: string;
  content: string;
  categoryId: string;
  accessibility: AccessibilityType;
  groupName: string;
  authorizedUserIds: string[];
}

@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './note-editor.component.html'
})
export class NoteEditorComponent implements OnInit, OnDestroy {

  // Editor modes (only create and edit)
  mode: EditorMode = 'create';

  // Note data
  noteData: NoteFormData = {
    title: '',
    content: '',
    categoryId: '',
    accessibility: AccessibilityType.PRIVATE,
    groupName: '',
    authorizedUserIds: []
  };

  originalNote: NoteWithDetails | null = null;
  noteId: string | null = null;
  
  // Form state
  hasChanges = false;
  showValidationErrors = false;
  isSaving = false;
  isLoading = false;
  lastSaved: Date | null = null;
  autoSaveStatus: AutoSaveStatus = null;

  // Categories and groups
  categories: Category[] = [];
  groups: Group[] = [];

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
      description: 'Visible to specific people you choose',
    },
    { 
      value: AccessibilityType.GROUP, 
      label: 'Group', 
      description: 'Visible to group members',
    }
  ];

  // Auto-save management
  private autoSaveSubject = new Subject<void>();
  private destroy$ = new Subject<void>();
  private initialFormState: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private notesService: NotesService,
    private categoriesService: CategoriesService,
    private groupsService: GroupsService
  ) {
    // Setup auto-save with debouncing
    this.autoSaveSubject.pipe(
      debounceTime(3000), // 3 seconds delay
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.hasChanges && this.isFormValid() && this.mode === 'edit') {
        this.performAutoSave();
      }
    });
  }

  ngOnInit(): void {
    this.initializeEditor();
    this.loadSupportingData();
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
   * Initialize editor based on route
   */
  private initializeEditor(): void {
    this.isLoading = true;

    // Get note ID from route
    this.noteId = this.route.snapshot.params['id'] || null;

    if (this.noteId) {
      this.mode = 'edit';
      this.loadNoteForEdit();
    } else {
      this.mode = 'create';
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
      categoryId: '',
      accessibility: AccessibilityType.PRIVATE,
      groupName: '',
      authorizedUserIds: []
    };
    
    this.setInitialFormState();
    this.isLoading = false;
  }

  /**
   * Load existing note for editing
   */
  private loadNoteForEdit(): void {
    if (!this.noteId) {
      this.router.navigate(['/notes']);
      return;
    }

    this.notesService.getNoteById(this.noteId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (note) => {
        this.originalNote = note;
        this.noteData = {
          title: note.title || '',
          content: note.text || '',
          categoryId: note.category || '',
          accessibility: note.accessibility,
          groupName: note.groupName || '',
          authorizedUserIds: note.authorizedUsers?.map(u => u.userId) || []
        };
        this.setInitialFormState();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading note:', error);
        this.router.navigate(['/notes']);
      }
    });
  }

  /**
   * Load supporting data (categories and groups)
   */
  private loadSupportingData(): void {
    combineLatest([
      this.categoriesService.getUserCategories(),
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

  // ========== FORM MANAGEMENT ==========

  /**
   * Set initial form state
   */
  private setInitialFormState(): void {
    this.initialFormState = JSON.stringify(this.noteData);
    this.hasChanges = false;
  }

  /**
   * Handle form changes
   */
  onFormChange(): void {
    this.checkForChanges();
    this.triggerAutoSave();
  }

  /**
   * Handle content changes
   */
  onContentChange(): void {
    this.checkForChanges();
    this.triggerAutoSave();
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
    }
    this.onFormChange();
  }

  /**
   * Check for changes compared to initial state
   */
  private checkForChanges(): void {
    const currentState = JSON.stringify(this.noteData);
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
  private getFinalCategoryId(): string | undefined {
    return this.noteData.categoryId || undefined;
  }

  // ========== AUTO-SAVE ==========

  /**
   * Trigger auto-save
   */
  private triggerAutoSave(): void {
    this.autoSaveSubject.next();
  }

  /**
   * Perform auto-save
   */
  private async performAutoSave(): Promise<void> {
    if (this.mode !== 'edit' || !this.noteId) return;

    this.autoSaveStatus = 'saving';

    try {
      const updateRequest: UpdateNoteRequest = {
        title: this.noteData.title,
        text: this.noteData.content,
        category: this.getFinalCategoryId(),
        accessibility: this.noteData.accessibility,
        groupName: this.noteData.groupName || undefined,
        authorizedUserIds: this.noteData.authorizedUserIds.length > 0 ? this.noteData.authorizedUserIds : undefined
      };

      await this.notesService.updateNote(this.noteId, updateRequest).toPromise();
      
      this.autoSaveStatus = 'saved';
      this.lastSaved = new Date();
      this.setInitialFormState(); // Update baseline after successful save
      
      // Reset status after 3 seconds
      setTimeout(() => {
        this.autoSaveStatus = null;
      }, 3000);

    } catch (error) {
      console.error('Error in auto-save:', error);
      this.autoSaveStatus = 'error';
    }
  }

  // ========== EDITOR ACTIONS ==========

  /**
   * Save and finish note
   */
  async saveNote(): Promise<void> {
    if (!this.isFormValid()) {
      this.showValidationErrors = true;
      this.scrollToFirstError();
      return;
    }

    this.isSaving = true;

    try {
      if (this.mode === 'create') {
        const createRequest: CreateNoteRequest = {
          title: this.noteData.title,
          text: this.noteData.content,
          category: this.getFinalCategoryId(),
          accessibility: this.noteData.accessibility,
          groupName: this.noteData.groupName || undefined,
          authorizedUserIds: this.noteData.authorizedUserIds.length > 0 ? this.noteData.authorizedUserIds : undefined
        };

        const createdNote = await this.notesService.createNote(createRequest).toPromise();
        if (createdNote) {
          this.noteId = createdNote.id;
        }
      } else if (this.noteId) {
        const updateRequest: UpdateNoteRequest = {
          title: this.noteData.title,
          text: this.noteData.content,
          category: this.getFinalCategoryId(),
          accessibility: this.noteData.accessibility,
          groupName: this.noteData.groupName || undefined,
          authorizedUserIds: this.noteData.authorizedUserIds.length > 0 ? this.noteData.authorizedUserIds : undefined
        };

        await this.notesService.updateNote(this.noteId, updateRequest).toPromise();
      }

      this.setInitialFormState();
      this.lastSaved = new Date();
      this.router.navigate(['/notes']);

    } catch (error) {
      console.error('Error saving note:', error);
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
   * Get auto-save status message
   */
  getAutoSaveMessage(): string {
    switch (this.autoSaveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Auto-saved';
      case 'error': return 'Save failed';
      default: return '';
    }
  }

  /**
   * Get save button text
   */
  getSaveButtonText(): string {
    if (this.isSaving) {
      return this.mode === 'create' ? 'Creating...' : 'Saving...';
    }
    
    return this.mode === 'create' ? 'Create Note' : 'Save Changes';
  }

  /**
   * Get loading message
   */
  getLoadingMessage(): string {
    return this.mode === 'edit' ? 'Loading note...' : 'Loading...';
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

  /**
   * Format date
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
   * Get category name by ID
   */
  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  }

  /**
   * Get group display name
   */
  getGroupDisplayName(groupName: string): string {
    const group = this.groups.find(g => g.name === groupName);
    return group ? group.name : groupName;
  }
}