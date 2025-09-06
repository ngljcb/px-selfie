// src/app/components/calendar/calendar-modify/calendar-modify.component.ts
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, DoCheck } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Activity } from '../../../model/activity.model';
import { ActivitiesService } from '../../../service/activities.service';
import { CalendarResponseComponent } from '../calendar-response/calendar-response.component';
import { EventsService } from '../../../service/events.service';
import { Event as CalendarEvent } from '../../../model/event.model';

type Variant = 'success' | 'error' | 'info' | 'warning';

@Component({
  selector: 'app-calendar-modify',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarResponseComponent],
  templateUrl: './calendar-modify.component.html',
  styleUrl: './calendar-modify.component.scss'
})
export class CalendarModifyComponent implements OnChanges, DoCheck {
  @Input() activity: Activity | null = null;
  @Input() calendarEvent: CalendarEvent | null = null;

  /** Chiudi senza salvare */
  @Output() close = new EventEmitter<void>();
  /** Notifica al padre i dati aggiornati (activity) */
  @Output() saved = new EventEmitter<Activity>();
  /** Notifica al padre i dati aggiornati (event) */
  @Output() eventSaved = new EventEmitter<CalendarEvent>();

  // ===== Activity form model =====
  title = '';
  due_date = '';
  status: Activity['status'] = 'pending';

  // ===== Event form model =====
  ev_title = '';
  location = '';
  dataInizio = '';
  oraInizio = '';
  oraFine = '';
  isRecurring = false;
  tipoRipetizione: '' | 'giorniSettimana' | 'numeroFisso' | 'scadenza' | 'indeterminato' = '';
  ripetizioni: number | null = null;
  fineRicorrenza = '';
  giorniSettimana: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  giorniSelezionati: Record<string, boolean> = {
    Monday: false, Tuesday: false, Wednesday: false, Thursday: false, Friday: false, Saturday: false, Sunday: false
  };

  erroreData = false;

  // ===== response modal =====
  showResponse = false;
  responseTitle = 'Notice';
  responseMessage = '';
  responseVariant: Variant = 'info';
  private saveOk = false;
  private lastSavedActivity!: Activity;
  private lastSavedEvent!: CalendarEvent;

  // tracker per intercettare quando il flag passa da true -> false
  private prevIsRecurring = this.isRecurring;

  constructor(private activities: ActivitiesService, private events: EventsService) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Populate activity fields
    if (changes['activity'] && this.activity && !this.calendarEvent) {
      this.title = this.activity.title ?? '';
      this.due_date = (this.activity.due_date || '').slice(0, 10);
      this.status = (this.activity.status as any) || 'pending';
    }

    // Populate event fields
    if (changes['calendarEvent'] && this.calendarEvent && !this.activity) {
      const ev = this.calendarEvent;
      this.ev_title = ev.title || '';
      this.location = ev.place || '';
      this.dataInizio = ev.start_date || '';
      this.oraInizio = (ev.start_time || '').slice(0,5) || '';
      this.oraFine = (ev.end_time || '').slice(0,5) || '';

      // recurrence
      const hasRec = !!ev.recurrence_type;
      this.isRecurring = hasRec;
      this.prevIsRecurring = this.isRecurring;

      this.tipoRipetizione = (ev.recurrence_type as any) || '';
      this.ripetizioni = ev.number_recurrence ?? null;
      this.fineRicorrenza = ev.due_date || '';

      // selected days
      this.giorniSelezionati = { Monday:false, Tuesday:false, Wednesday:false, Thursday:false, Friday:false, Saturday:false, Sunday:false };
      (ev.days_recurrence || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(d => { if (this.giorniSelezionati.hasOwnProperty(d)) this.giorniSelezionati[d] = true; });
    }
  }

  // pulizia automatica quando isRecurring passa da true -> false
  ngDoCheck(): void {
    if (this.prevIsRecurring && !this.isRecurring) {
      this.tipoRipetizione = '';
      this.ripetizioni = null;
      this.fineRicorrenza = '';
      this.giorniSelezionati = {
        Monday: false, Tuesday: false, Wednesday: false, Thursday: false, Friday: false, Saturday: false, Sunday: false
      };
    }
    this.prevIsRecurring = this.isRecurring;
  }

  onCancel(): void {
    this.close.emit();
  }

  private normTime(t?: string): string {
    if (!t) return '';
    return t.length === 5 ? `${t}:00` : t;
    }

  onSave(): void {
    // ========= UPDATE EVENT =========
    if (this.calendarEvent && !this.activity) {
      this.erroreData = false;

      const days = Object.entries(this.giorniSelezionati)
        .filter(([_, v]) => v)
        .map(([k]) => k);

      // se non ricorrente -> svuota campi, usando "undefined" dove richiesto dal tipo
      const patch: Partial<CalendarEvent> = this.isRecurring
        ? {
            title: this.ev_title,
            place: this.location || '',
            start_date: this.dataInizio || '',
            start_time: this.normTime(this.oraInizio),
            end_time: this.normTime(this.oraFine),
            days_recurrence: days.length ? days.join(',') : '',
            recurrence_type: (this.tipoRipetizione || 'indeterminato') as any,
            number_recurrence: this.tipoRipetizione === 'numeroFisso' ? (this.ripetizioni ?? 0) : undefined,
            due_date: this.tipoRipetizione === 'scadenza' ? (this.fineRicorrenza || '') : ''
          }
        : {
            title: this.ev_title,
            place: this.location || '',
            start_date: this.dataInizio || '',
            start_time: this.normTime(this.oraInizio),
            end_time: this.normTime(this.oraFine),
            days_recurrence: '',
            recurrence_type: null,
            number_recurrence: 0,
            due_date: '' // string va bene per azzerare lato backend; opzionale potresti ometterlo
          };

      this.events.update(this.calendarEvent.id, patch).subscribe({
        next: () => {
          this.saveOk = true;
          this.lastSavedEvent = { ...(this.calendarEvent as any), ...patch } as CalendarEvent;
          this.responseTitle = 'Saved';
          this.responseMessage = 'Event updated successfully.';
          this.responseVariant = 'success';
          this.showResponse = true;
        },
        error: () => {
          this.saveOk = false;
          this.responseTitle = 'Update failed';
          this.responseMessage = 'Unable to update the event. Please try again.';
          this.responseVariant = 'error';
          this.showResponse = true;
        }
      });
      return;
    }

    // ========= UPDATE ACTIVITY (original behavior) =========
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
        this.lastSavedActivity = { ...this.activity!, ...patch };
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
      if (this.calendarEvent && !this.activity) {
        this.eventSaved.emit(this.lastSavedEvent);
      } else if (this.activity) {
        this.saved.emit(this.lastSavedActivity);
      }
      this.close.emit();
    }
  }
}
