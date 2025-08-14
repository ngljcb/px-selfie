import { Component, EventEmitter, Input, Output, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity } from '../../../model/activity.model';
import { ActivitiesService } from '../../../service/activities.service';
import { CalendarResponseComponent } from '../calendar-response/calendar-response.component';

type Variant = 'success' | 'error';

@Component({
  selector: 'app-calendar-delete',
  standalone: true,
  imports: [CommonModule, CalendarResponseComponent],
  templateUrl: './calendar-delete.component.html'
})
export class CalendarDeleteComponent {
  @Input() activity: Activity | null = null;

  @Output() cancel = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<number>();

  private activitiesService = inject(ActivitiesService);

  showResponse = false;
  responseTitle = '';
  responseMessage = '';
  responseVariant: Variant = 'success';
  private lastDeleteOk = false;

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    if (!this.activity?.id) return;

    this.activitiesService.delete(this.activity.id).subscribe({
      next: () => {
        this.lastDeleteOk = true;
        this.responseTitle = 'Deleted';
        this.responseMessage = 'The activity has been deleted successfully.';
        this.responseVariant = 'success';
        this.showResponse = true;
      },
      error: () => {
        this.lastDeleteOk = false;
        this.responseTitle = 'Deletion failed';
        this.responseMessage = 'An error occurred while deleting the activity.';
        this.responseVariant = 'error';
        this.showResponse = true;
      }
    });
  }

  onResponseClose(): void {
    this.showResponse = false;
    if (this.lastDeleteOk && this.activity?.id != null) {
      this.deleted.emit(this.activity.id);
      this.cancel.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.showResponse) {
      this.onResponseClose();
      return;
    }
    this.onCancel();
  }
}
