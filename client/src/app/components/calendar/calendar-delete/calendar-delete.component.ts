import { Component, EventEmitter, Input, Output, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity } from '../../../model/activity.model';
import { ActivitiesService } from '../../../service/activities.service';
import { CalendarResponseComponent } from '../calendar-response/calendar-response.component';
import { EventsService } from '../../../service/events.service';
import { Event as AppEvent } from '../../../model/event.model';

type Variant = 'success' | 'error';

@Component({
  selector: 'app-calendar-delete',
  standalone: true,
  imports: [CommonModule, CalendarResponseComponent],
  templateUrl: './calendar-delete.component.html'
})
export class CalendarDeleteComponent {
  @Input() activity: Activity | null = null;
  @Input() calendarEvent: AppEvent | null = null;

  @Output() cancel = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<number>();

  private activitiesService = inject(ActivitiesService);
  private eventsService = inject(EventsService);

  showResponse = false;
  responseTitle = '';
  responseMessage = '';
  responseVariant: Variant = 'success';
  private lastDeleteOk = false;

  isEvent(): boolean {
    return !this.activity && !!this.calendarEvent;
  }

  displayTitle(): string {
    return this.isEvent()
      ? (this.calendarEvent?.title || 'this event')
      : (this.activity?.title || 'this activity');
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    if (this.calendarEvent?.id) {
      this.eventsService.delete(this.calendarEvent.id).subscribe({
        next: () => {
          this.lastDeleteOk = true;
          this.responseTitle = 'Deleted';
          this.responseMessage = 'The event has been deleted successfully.';
          this.responseVariant = 'success';
          this.showResponse = true;
          this.deleted.emit(this.calendarEvent!.id);
        },
        error: () => {
          this.lastDeleteOk = false;
          this.responseTitle = 'Deletion failed';
          this.responseMessage = 'An error occurred while deleting the event.';
          this.responseVariant = 'error';
          this.showResponse = true;
        }
      });
      return;
    } 

    if (this.activity?.id) {
      this.activitiesService.delete(this.activity.id).subscribe({
        next: () => {
          this.lastDeleteOk = true;
          this.responseTitle = 'Deleted';
          this.responseMessage = 'The activity has been deleted successfully.';
          this.responseVariant = 'success';
          this.showResponse = true;
          this.deleted.emit(this.activity!.id);
        },
        error: () => {
          this.lastDeleteOk = false;
          this.responseTitle = 'Deletion failed';
          this.responseMessage = 'An error occurred while deleting the activity.';
          this.responseVariant = 'error';
          this.showResponse = true;
        }
      });
      return;
    } 

    // Fallback: nothing to delete
    this.lastDeleteOk = false;
    this.responseTitle = 'Deletion failed';
    this.responseMessage = 'Missing identifier.';
    this.responseVariant = 'error';
    this.showResponse = true;
  }

  onResponseClose(): void {
    this.showResponse = false;
    this.cancel.emit();
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
