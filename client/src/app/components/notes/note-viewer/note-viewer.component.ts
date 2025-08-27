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

  creatorUser: User | null = null;
  isLoadingCreator = false;

  private destroy$ = new Subject<void>();

  constructor(private usersService: UsersService) {}

  ngOnInit(): void {

    if (this.note?.creator) {
      this.loadCreatorDetails(this.note.creator);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(): void {

    if (this.note?.creator) {
      this.loadCreatorDetails(this.note.creator);
    } else {
      this.creatorUser = null;
    }
  }

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

  closeModal(): void {
    this.onClose.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.isOpen) {
      this.closeModal();
    }
  }

  getDisplayTitle(): string {
    return this.note?.title || 'Untitled';
  }

  getCreatorDisplayName(): string {
    if (this.isLoadingCreator) return 'Loading...';
    return this.creatorUser?.displayName || 'Unknown User';
  }

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

  isGroupNote(): boolean {
    return this.note?.accessibility === 'group' && !!(this.note?.groupName || (this.note as any)?.group_name);
  }

  getGroupDisplayName(): string {
    return this.note?.groupName || (this.note as any)?.group_name || 'Unknown Group';
  }

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

  getFormattedContent(): string {
    if (!this.note?.text) return 'No content available';
    
    let html = this.note.text;

    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-800">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2 text-gray-800">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-3 text-gray-900">$1</h1>');

    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>');

    html = html.replace(/`(.*?)`/gim, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener" class="text-blue-600 hover:underline">$1</a>');

    html = html.replace(/\n\n/gim, '</p><p class="mb-3">');
    html = html.replace(/\n/gim, '<br>');

    if (html && !html.startsWith('<h')) {
      html = '<p class="mb-3">' + html + '</p>';
    }

    return html;
  }
}