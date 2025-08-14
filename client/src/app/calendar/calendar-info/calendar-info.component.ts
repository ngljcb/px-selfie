import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity } from '../../model/activity.model';
import { CalendarDeleteComponent } from '../calendar-delete/calendar-delete.component';

@Component({
  selector: 'app-calendar-info',
  standalone: true,
  imports: [CommonModule, CalendarDeleteComponent],
  templateUrl: './calendar-info.component.html',
  styleUrl: './calendar-info.component.scss'
})
export class CalendarInfoComponent {
  @Input() activity: Activity | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();
  @Output() modify = new EventEmitter<number>();

  showDeleteConfirm = false;

  onClose(): void {
    this.close.emit();
  }

  onDelete(): void {
    this.showDeleteConfirm = true;
  }

  onModify(): void {
    // if (this.activity?.id != null) this.modify.emit(this.activity.id);
  }

  onCancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  onConfirmDelete(id: number): void {
    this.showDeleteConfirm = false;
    this.delete.emit(id);
    this.close.emit();
  }
}