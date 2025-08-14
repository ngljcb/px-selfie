import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity } from '../../../model/activity.model';
import { CalendarDeleteComponent } from '../calendar-delete/calendar-delete.component';
import { CalendarModifyComponent } from '../calendar-modify/calendar-modify.component';

@Component({
  selector: 'app-calendar-info',
  standalone: true,
  imports: [CommonModule, CalendarDeleteComponent, CalendarModifyComponent],
  templateUrl: './calendar-info.component.html',
  styleUrl: './calendar-info.component.scss'
})
export class CalendarInfoComponent {
  @Input() activity: Activity | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() delete = new EventEmitter<number>();
  @Output() modify = new EventEmitter<number>();

  showDeleteConfirm = false;
  showModify = false;

  onClose(): void {
    this.close.emit();
  }

  onDelete(): void {
    this.showDeleteConfirm = true;
  }
  onCancelDelete(): void {
    this.showDeleteConfirm = false;
  }
  onConfirmDelete(id: number): void {
    this.showDeleteConfirm = false;
    this.delete.emit(id);
    this.close.emit();
  }

  onModify(): void {
    this.showModify = true;
  }
  onCancelModify(): void {
    this.showModify = false;
  }
  onSaved(activity: Activity): void {
    this.showModify = false;
    if (activity?.id != null) {
      this.modify.emit(activity.id);
    }
    this.close.emit();
  }
}
