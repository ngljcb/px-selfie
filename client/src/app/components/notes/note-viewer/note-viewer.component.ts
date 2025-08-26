import { Component, Input, Output, EventEmitter, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { NoteWithDetails } from '../../../model/note.interface';
import { User } from '../../../model/entity/user.interface';
import { UsersService } from '../../../service/users.service';

@Component({
  selector: 'app-note-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './note-viewer.component.html'
})
export class NoteViewerComponent implements OnInit, OnDestroy {
  
  @Input() note: NoteWithDetails | null = null;
  @Input() isOpen = false;
  
  @Output() onClose = new EventEmitter<void>();

  // User details for creator
  creatorUser: User | null = null;
  isLoadingCreator = false;

  // Subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(private usersService: UsersService) {}

  ngOnInit(): void {
    // Load creator details when note changes
    if (this.note?.creator) {
      this.loadCreatorDetails(this.note.creator);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(): void {
    // Load creator details when note input changes
    if (this.note?.creator) {
      this.loadCreatorDetails(this.note.creator);
    } else {
      this.creatorUser = null;
    }
  }

  // ========== DATA LOADING ==========

  /**
   * Load creator user details
   */
  private loadCreatorDetails(creatorId: string): void {
    if (!creatorId) return;

    this.isLoadingCreator = true;
    this.usersService.getUserById(creatorId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (user) => {
        this.creatorUser = user;
        this.isLoadingCreator = false;
      },
      error: (error) => {
        console.error('Error loading creator details:', error);
        this.creatorUser = null;
        this.isLoadingCreator = false;
      }
    });
  }

  // ========== MODAL MANAGEMENT ==========

  /**
   * Close modal
   */
  closeModal(): void {
    this.onClose.emit();
  }

  /**
   * Close modal when clicking backdrop
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  /**
   * Handle escape key to close modal
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.isOpen) {
      this.closeModal();
    }
  }

  // ========== DISPLAY HELPERS ==========

  /**
   * Get display title
   */
  getDisplayTitle(): string {
    return this.note?.title || 'Untitled';
  }

  /**
   * Get creator display name
   */
  getCreatorDisplayName(): string {
    if (this.isLoadingCreator) return 'Loading...';
    return this.creatorUser?.displayName || 'Unknown User';
  }

  /**
   * Get accessibility type label
   */
  getAccessibilityLabel(): string {
    if (!this.note?.accessibility) return '';
    
    switch (this.note.accessibility) {
      case 'private': return 'Private';
      case 'public': return 'Public';
      case 'authorized': return 'Authorized Users';
      case 'group': return 'Group';
      default: return this.note.accessibility;
    }
  }

  /**
   * Check if note is group note
   */
  isGroupNote(): boolean {
    return this.note?.accessibility === 'group' && !!(this.note?.groupName || (this.note as any)?.group_name);
  }

  /**
   * Get group display name
   */
  getGroupDisplayName(): string {
    return this.note?.groupName || (this.note as any)?.group_name || 'Unknown Group';
  }

  /**
   * Format creation date
   */
  getFormattedCreationDate(): string {
    if (!this.note?.createdAt) return '';
    
    const date = new Date(this.note.createdAt);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get formatted content (handles markdown-like formatting)
   */
  getFormattedContent(): string {
    if (!this.note?.text) return 'No content available';
    
    let html = this.note.text;

    // Basic Markdown-like formatting
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-800">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2 text-gray-800">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-3 text-gray-900">$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>');

    // Inline code
    html = html.replace(/`(.*?)`/gim, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 hover:underline">$1</a>');

    // Line breaks
    html = html.replace(/\n\n/gim, '</p><p class="mb-3">');
    html = html.replace(/\n/gim, '<br>');

    // Wrap in paragraphs if not already starting with a header
    if (html && !html.startsWith('<h')) {
      html = '<p class="mb-3">' + html + '</p>';
    }

    return html;
  }
}