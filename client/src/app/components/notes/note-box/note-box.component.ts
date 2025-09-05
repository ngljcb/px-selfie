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
} from '../../../model/note.interface';
import { NotesService } from '../../../service/notes.service';
import { TimeMachineService } from '../../../service/time-machine.service';

@Component({
  selector: 'app-note-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './note-box.component.html',
})
export class NoteBoxComponent {
  
  @Input() note!: NoteWithDetails;

  @Output() onEdit = new EventEmitter<string>();
  @Output() onDelete = new EventEmitter<string>();
  @Output() onView = new EventEmitter<string>();

  showMenu = false;
  feedbackMessage = '';
  feedbackType: 'success' | 'error' = 'success';

  previewLength = 200;

  accessibilityTypes = [
    { value: AccessibilityType.PRIVATE, label: 'Private'},
    { value: AccessibilityType.PUBLIC, label: 'Public'},
    { value: AccessibilityType.AUTHORIZED, label: 'Authorized'},
    { value: AccessibilityType.GROUP, label: 'Group'}
  ];

  constructor(
    private elementRef: ElementRef,
    private router: Router,
    private notesService: NotesService,
    private timeMachineService: TimeMachineService
  ) {}

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.showMenu = !this.showMenu;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showMenu = false;
    }
  }

  onCardClick(event?: Event): void {
    if (event) {
      const target = event.target as HTMLElement;
      if (target.closest('button') || target.closest('.menu-container')) {
        return;
      }
    }
    this.onView.emit(this.note.id);
  }

  onEditClick(event: Event): void {
    event.stopPropagation();
    this.showMenu = false;
    this.onEdit.emit(this.note.id);
  }

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

  duplicateFromMenu(event: Event): void {
    event.stopPropagation();
    this.showMenu = false;
    
    try {
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

  private async copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      this.copyTextFallback(text);
    }
  }

  private copyTextFallback(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'absolute';
    textArea.style.left = '-999999px';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, 99999); 
    
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  }

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

  getAccessibilityLabel(type: AccessibilityType): string {
    const accessibilityType = this.accessibilityTypes.find(t => t.value === type);
    return accessibilityType?.label || 'Unknown';
  }

  getCategoryName(): string {
    return this.note.categoryDetails?.name || this.note.category || 'Uncategorized';
  }

  getGroupName(): string | null {
    return this.note.groupName || null;
  }

  formatDate(date: Date | string): string {
    const now = this.timeMachineService.getNow();
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

  isRecentlyModified(date: Date | string): boolean {
    const now = this.timeMachineService.getNow();
    const noteDate = new Date(date);
    const diffHours = (now.getTime() - noteDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  getPreviewText(): string {
    return this.note.preview || this.note.text?.substring(0, 200) || 'No content';
  }

  isContentTruncated(): boolean {
    const contentLength = this.note.contentLength || 0;
    return contentLength > this.previewLength;
  }

  getTruncatedLength(): number {
    const contentLength = this.note.contentLength || 0;
    return Math.max(0, contentLength - this.previewLength);
  }

  private showFeedback(message: string, type: 'success' | 'error'): void {
    this.feedbackMessage = message;
    this.feedbackType = type;

    setTimeout(() => {
      this.feedbackMessage = '';
    }, 3000);
  }

  canEdit(): boolean {
    return this.note.canEdit || false;
  }

  canDelete(): boolean {
    return this.note.canDelete || false;
  }

  isOwner(): boolean {
    return this.note.canDelete || false; 
  }

  getDisplayTitle(): string {
    return this.note.title || 'Untitled';
  }

  getAccessibilityDisplay(): string {
    const label = this.getAccessibilityLabel(this.note.accessibility);
    return `${label}`;
  }

  getContentLengthDisplay(): string {
    const length = this.note.contentLength || 0;
    return `${length} character${length !== 1 ? 's' : ''}`;
  }

  hasGroupInfo(): boolean {
    return this.note.accessibility === AccessibilityType.GROUP && !!this.note.groupName;
  }

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

  getNoteCardClasses(): string {
    const baseClasses = 'relative note-box bg-[var(--today-bg)] rounded-2xl shadow-sm p-4 h-full flex flex-col transition-all duration-200 hover:shadow-md hover:bg-[var(--select-bg)] group cursor-pointer';
    return baseClasses;
  }

  getLastModificationText(): string {
    if (!this.note.lastModifyAt) return '';
    return this.formatDate(this.note.lastModifyAt);
  }

  getFullModificationDate(): string {
    if (!this.note.lastModifyAt) return '';
    return new Date(this.note.lastModifyAt).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFullCreationDate(): string {
    return new Date(this.note.createdAt).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}