// note-box.component.ts - UPDATED VERSION

import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  HostListener,
  ElementRef 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { 
  NoteWithDetails, 
  AccessibilityType,
  NOTE_CONSTANTS
} from '../../model/note.interface';
import { NotesService } from '../../service/notes.service';

@Component({
  selector: 'app-note-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './note-box.component.html',
})
export class NoteBoxComponent {
  
  @Input() note!: NoteWithDetails;
  
  // Events for actions - using string IDs
  @Output() onEdit = new EventEmitter<string>();
  @Output() onDelete = new EventEmitter<string>();
  @Output() onView = new EventEmitter<string>();

  // Component states
  showMenu = false;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' = 'success';
  
  // Constants
  previewLength = NOTE_CONSTANTS.PREVIEW_LENGTH;

  // Accessibility type definitions
  accessibilityTypes = [
    { value: AccessibilityType.PRIVATE, label: 'Private', icon: '🔒' },
    { value: AccessibilityType.PUBLIC, label: 'Public', icon: '🌐' },
    { value: AccessibilityType.AUTHORIZED, label: 'Authorized', icon: '👥' },
    { value: AccessibilityType.GROUP, label: 'Group', icon: '👨‍👩‍👧‍👦' }
  ];

  constructor(
    private elementRef: ElementRef,
    private router: Router,
    private notesService: NotesService
  ) {}

  // ========== MENU MANAGEMENT ==========

  /**
   * Toggle options menu
   */
  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.showMenu = !this.showMenu;
  }

  /**
   * Close menu if clicked outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showMenu = false;
    }
  }

  // ========== MAIN ACTIONS ==========

  /**
   * Handle card click to open note viewer
   */
  onCardClick(event?: Event): void {
    if (event) {
      // Prevent click if clicking on a button
      const target = event.target as HTMLElement;
      if (target.closest('button') || target.closest('.menu-container')) {
        return;
      }
    }
    this.onView.emit(this.note.id);
  }

  // ========== MENU ACTIONS ==========

  /**
   * Copy content to clipboard from menu
   */
  async onCopyClick(event: Event): Promise<void> {
    event.stopPropagation();
    this.showMenu = false;
    
    try {
      const contentToCopy = this.note.text || this.note.preview || '';
      await this.copyToClipboard(contentToCopy);
      this.showFeedback('Content copied to clipboard!', 'success');
      
    } catch (error) {
      console.error('Error copying content:', error);
      this.showFeedback('Error copying content', 'error');
    }
  }

  /**
   * Duplicate note from menu
   */
  duplicateFromMenu(event: Event): void {
    event.stopPropagation();
    this.showMenu = false;
    
    try {
      // Navigate to create new note with duplicated data as query parameters
      this.router.navigate(['/notes/create'], {
        queryParams: {
          duplicate: 'true',
          title: this.note.title || '',
          content: this.note.text || '',
          category: this.note.category || '',
          accessibility: this.note.accessibility,
          groupName: this.note.groupName || ''
        }
      });
      
    } catch (error) {
      console.error('Error duplicating note:', error);
      this.showFeedback('Error duplicating note', 'error');
    }
  }

  /**
   * Delete note with confirmation from menu
   */
  onDeleteClick(event: Event): void {
    event.stopPropagation();
    this.showMenu = false;
    
    if (!this.note.canDelete) {
      this.showFeedback('Only the owner can delete this note', 'error');
      return;
    }

    const confirmMessage = `Are you sure you want to delete "${this.note.title || 'Untitled'}"?\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.onDelete.emit(this.note.id);
      this.showFeedback('Note deleted', 'success');
    }
  }

  // ========== UTILITY METHODS ==========

  /**
   * Copy text to clipboard with fallback
   */
  private async copyToClipboard(text: string): Promise<void> {
    // Use Clipboard API if available
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      this.copyTextFallback(text);
    }
  }

  /**
   * Fallback for copying text in browsers without Clipboard API
   */
  private copyTextFallback(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'absolute';
    textArea.style.left = '-999999px';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999); // For mobile devices
    
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  }

  /**
   * Get CSS class for accessibility type badge
   */
  getAccessibilityBadgeClass(type: AccessibilityType): string {
    const baseClasses = 'border transition-colors';
    
    switch (type) {
      case AccessibilityType.PRIVATE:
        return `${baseClasses} bg-gray-100 text-gray-700 border-gray-300`;
      case AccessibilityType.PUBLIC:
        return `${baseClasses} bg-blue-100 text-blue-700 border-blue-300`;
      case AccessibilityType.AUTHORIZED:
        return `${baseClasses} bg-green-100 text-green-700 border-green-300`;
      case AccessibilityType.GROUP:
        return `${baseClasses} bg-purple-100 text-purple-700 border-purple-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700 border-gray-300`;
    }
  }

  /**
   * Get label for accessibility type
   */
  getAccessibilityLabel(type: AccessibilityType): string {
    const accessibilityType = this.accessibilityTypes.find(t => t.value === type);
    return accessibilityType?.label || 'Unknown';
  }

  /**
   * Get icon for accessibility type
   */
  getAccessibilityIcon(type: AccessibilityType): string {
    const accessibilityType = this.accessibilityTypes.find(t => t.value === type);
    return accessibilityType?.icon || '🔒';
  }

  /**
   * Get category name
   */
  getCategoryName(): string {
    return this.note.categoryDetails?.name || 'Uncategorized';
  }

  /**
   * Get group name if applicable
   */
  getGroupName(): string | null {
    return this.note.groupName || null;
  }

  /**
   * Format date in user-friendly way
   */
  formatDate(date: Date | string): string {
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
   * Check if note was recently modified (last 24 hours)
   */
  isRecentlyModified(date: Date | string): boolean {
    const now = new Date();
    const noteDate = new Date(date);
    const diffHours = (now.getTime() - noteDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  /**
   * Get preview text (ensuring it exists)
   */
  getPreviewText(): string {
    return this.note.preview || this.note.text?.substring(0, NOTE_CONSTANTS.PREVIEW_LENGTH) || 'No content';
  }

  /**
   * Check if content is truncated
   */
  isContentTruncated(): boolean {
    const contentLength = this.note.contentLength || 0;
    return contentLength > this.previewLength;
  }

  /**
   * Get truncated content length
   */
  getTruncatedLength(): number {
    const contentLength = this.note.contentLength || 0;
    return Math.max(0, contentLength - this.previewLength);
  }

  /**
   * Show temporary feedback message
   */
  private showFeedback(message: string, type: 'success' | 'error'): void {
    this.feedbackMessage = message;
    this.feedbackType = type;
    
    // Hide message after 3 seconds
    setTimeout(() => {
      this.feedbackMessage = '';
    }, 3000);
  }

  // ========== ACCESS CONTROL ==========

  /**
   * Check if current user can edit note
   */
  canEdit(): boolean {
    return this.note.canEdit || false;
  }

  /**
   * Check if current user can delete note
   */
  canDelete(): boolean {
    return this.note.canDelete || false;
  }

  /**
   * Check if note is owned by current user
   */
  isOwner(): boolean {
    return this.note.canDelete || false; // Assuming only owners can delete
  }

  // ========== DISPLAY HELPERS ==========

  /**
   * Get display title (fallback to 'Untitled')
   */
  getDisplayTitle(): string {
    return this.note.title || 'Untitled';
  }

  /**
   * Get accessibility display text (without icon)
   */
  getAccessibilityDisplay(): string {
    const label = this.getAccessibilityLabel(this.note.accessibility);
    return `${label}`;
  }

  /**
   * Get content length display
   */
  getContentLengthDisplay(): string {
    const length = this.note.contentLength || 0;
    return `${length} character${length !== 1 ? 's' : ''}`;
  }

  /**
   * Check if note has group information
   */
  hasGroupInfo(): boolean {
    return this.note.accessibility === AccessibilityType.GROUP && !!this.note.groupName;
  }

  /**
   * Get additional info text
   */
  getAdditionalInfo(): string {
    const parts: string[] = [];
    
    if (this.hasGroupInfo()) {
      parts.push(`Group: ${this.note.groupName}`);
    }
    
    if (this.note.authorizedUsers && this.note.authorizedUsers.length > 0) {
      parts.push(`Shared with ${this.note.authorizedUsers.length} user${this.note.authorizedUsers.length > 1 ? 's' : ''}`);
    }
    
    return parts.join(' • ');
  }

  /**
   * Get note card CSS classes based on state
   */
  getNoteCardClasses(): string {
    // UPDATED: Changed to lighter yellow background
    const baseClasses = 'relative note-box bg-yellow-100 rounded-2xl shadow-sm p-4 h-full flex flex-col transition-all duration-200 hover:shadow-md hover:bg-yellow-200 group cursor-pointer';
    
    if (this.isRecentlyModified(this.note.lastModify)) {
      return `${baseClasses} ring-2 ring-blue-200`;
    }
    
    return baseClasses;
  }
}