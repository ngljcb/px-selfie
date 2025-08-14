import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

type Variant = 'success' | 'error' | 'info' | 'warning';

@Component({
  selector: 'app-calendar-response',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-response.component.html'
})
export class CalendarResponseComponent {
  @Input() title = 'Notice';
  @Input() message = '';
  @Input() variant: Variant = 'info';
  @Input() buttonText = 'OK';

  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.onClose();
  }

  get iconClass() {
    switch (this.variant) {
      case 'success': return 'fa-solid fa-circle-check text-green-600';
      case 'error': return 'fa-solid fa-circle-xmark text-red-600';
      case 'warning': return 'fa-solid fa-triangle-exclamation text-yellow-500';
      default: return 'fa-solid fa-circle-info text-blue-600';
    }
  }

  get gradientClass() {
    switch (this.variant) {
      case 'success': return 'from-green-400 to-green-600';
      case 'error': return 'from-red-400 to-red-600';
      case 'warning': return 'from-yellow-400 to-yellow-600';
      default: return 'from-blue-400 to-blue-600';
    }
  }
}