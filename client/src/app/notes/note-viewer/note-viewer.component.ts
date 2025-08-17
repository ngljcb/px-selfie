// note-viewer.component.ts - SIMPLIFIED VERSION

import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoteWithDetails } from '../../model/note.interface';

@Component({
  selector: 'app-note-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './note-viewer.component.html'
})
export class NoteViewerComponent {
  
  @Input() note: NoteWithDetails | null = null;
  @Input() isOpen = false;
  
  @Output() onClose = new EventEmitter<void>();

  constructor() {}

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