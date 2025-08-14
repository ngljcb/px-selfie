import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Activity } from '../../model/activity.model';
import { ActivitiesService } from '../../service/activities.service';
import { CalendarResponseComponent } from '../calendar-response/calendar-response.component';

type Variant = 'success' | 'error' | 'info' | 'warning';

@Component({
  selector: 'app-calendar-modify',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarResponseComponent],
  templateUrl: './calendar-modify.component.html',
  styleUrl: './calendar-modify.component.scss'
})
export class CalendarModifyComponent implements OnChanges {
  @Input() activity: Activity | null = null;

  /** Chiudi senza salvare */
  @Output() close = new EventEmitter<void>();
  /** Notifica al padre i dati aggiornati */
  @Output() saved = new EventEmitter<Activity>();

  // form model (editabile)
  title = '';
  due_date = '';
  status: Activity['status'] = 'pending';

  // response modal
  showResponse = false;
  responseTitle = 'Notice';
  responseMessage = '';
  responseVariant: Variant = 'info';
  private saveOk = false;
  private lastSaved!: Activity;

  constructor(private activities: ActivitiesService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activity'] && this.activity) {
      this.title = this.activity.title ?? '';
      this.due_date = (this.activity.due_date || '').slice(0, 10);
      this.status = (this.activity.status as any) || 'pending';
    }
  }

  onCancel(): void {
    this.close.emit();
  }

  onSave(): void {
    if (!this.activity?.id) return;
    if (!this.title || !this.due_date) {
      this.saveOk = false;
      this.responseTitle = 'Missing fields';
      this.responseMessage = 'Title and due date are required.';
      this.responseVariant = 'warning';
      this.showResponse = true;
      return;
    }

    const patch = { title: this.title, due_date: this.due_date, status: this.status };
    this.activities.update(this.activity.id, patch).subscribe({
      next: () => {
        this.saveOk = true;
        this.lastSaved = { ...this.activity!, ...patch };
        this.responseTitle = 'Saved';
        this.responseMessage = 'Activity updated successfully.';
        this.responseVariant = 'success';
        this.showResponse = true;
      },
      error: () => {
        this.saveOk = false;
        this.responseTitle = 'Update failed';
        this.responseMessage = 'Unable to update the activity. Please try again.';
        this.responseVariant = 'error';
        this.showResponse = true;
      }
    });
  }

  onResponseClose(): void {
    this.showResponse = false;
    if (this.saveOk) {
      this.saved.emit(this.lastSaved);
      this.close.emit();
    }
  }
}
