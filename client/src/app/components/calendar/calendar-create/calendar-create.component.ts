// src/app/components/calendar/calendar-create/calendar-create.component.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivitiesService } from '../../../service/activities.service';
import { Activity } from '../../../model/activity.model';
import { CalendarResponseComponent } from '../calendar-response/calendar-response.component';
import { EventsService } from '../../../service/events.service';
import { Event as CalendarEvent } from '../../../model/event.model';

type Variant = 'success' | 'error' | 'info' | 'warning';

@Component({
  selector: 'app-calendar-create',
  standalone: true,
  imports: [CommonModule, FormsModule, CalendarResponseComponent],
  templateUrl: './calendar-create.component.html',
  styleUrl: './calendar-create.component.scss'
})
export class CalendarCreateComponent implements OnChanges {
  @Input() selectedDate: string = '';
  @Output() chiudi = new EventEmitter<void>();
  @Output() activityCreated = new EventEmitter<void>();
  @Output() eventCreated = new EventEmitter<void>(); // facoltativo per chi ascolta

  type: '' | 'event' | 'activity' = '';
  tipoRipetizione: '' | 'giorniSettimana' | 'numeroFisso' | 'scadenza' | 'indeterminato' = '';

  title: string = '';
  scadenza: string = '';
  
  location: string = '';
  dataInizio: string = '';
  oraInizio: string = '';
  oraFine: string = '';
  duration: number = 1;
  isRecurring: boolean = false;
  ripetizioni: number | null = null;
  fineRicorrenza: string = '';

  giorniSettimana: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  giorniSelezionati: { [key: string]: boolean } = {
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
    Saturday: false,
    Sunday: false
  };

  erroreData: boolean = false;

  // ---- response modal state ----
  showResponse = false;
  responseTitle = 'Notice';
  responseMessage = '';
  responseVariant: Variant = 'info';
  private createdOk = false;

  // ---- client-side validation helpers (no logic changes) ----
  submitted = false;
  get hasSelectedDays(): boolean {
    return Object.values(this.giorniSelezionati).some(v => !!v);
  }

  constructor(
    private activitiesService: ActivitiesService,
    private eventsService: EventsService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate'] && this.selectedDate) {
      const base = this.selectedDate.slice(0, 10); // YYYY-MM-DD
      this.dataInizio = base;
      this.scadenza = base;
    }
  }

  onSubmit(): void {
    this.erroreData = false;

    if (this.dataInizio && this.fineRicorrenza) {
      const inizio = new Date(this.dataInizio);
      const fine = new Date(this.fineRicorrenza);
      if (inizio > fine) {
        this.erroreData = true;
        return;
      }
    }

    const giorniAttivi = Object.entries(this.giorniSelezionati)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    const eventoPreview = {
      type: this.type,
      title: this.title,
      location: this.location,
      dataInizio: this.dataInizio,
      oraInizio: this.oraInizio,
      oraFine: this.oraFine,
      tipoRipetizione: this.tipoRipetizione,
      ripetizioni: this.ripetizioni,
      fineRicorrenza: this.fineRicorrenza,
      isRecurring: this.isRecurring,
      giorniSelezionati: giorniAttivi
    };

    if (this.type === 'activity') {
      const newActivity: Activity = {
        title: this.title,
        due_date: this.scadenza.slice(0, 10),
        status: 'pending'
      };

      this.activitiesService.create(newActivity).subscribe({
        next: () => {
          this.createdOk = true;
          this.responseTitle = 'Saved';
          this.responseMessage = 'Activity created successfully.';
          this.responseVariant = 'success';
          this.showResponse = true;
        },
        error: () => {
          this.createdOk = false;
          this.responseTitle = 'Creation failed';
          this.responseMessage = 'Unable to create the activity. Please try again.';
          this.responseVariant = 'error';
          this.showResponse = true;
        }
      });
    } else if (this.type === 'event') {
      const normTime = (t?: string) => t ? (t.length === 5 ? `${t}:00` : t) : '';

      const payload: Partial<CalendarEvent> = {
        title: this.title,
        place: this.location || '',
        start_date: this.dataInizio || '',
        start_time: normTime(this.oraInizio),
        end_time: normTime(this.oraFine),
        days_recurrence: this.isRecurring && giorniAttivi.length ? giorniAttivi.join(',') : '',
        recurrence_type: this.isRecurring ? (this.tipoRipetizione || 'indeterminato') : undefined,
        number_recurrence: this.isRecurring && this.tipoRipetizione === 'numeroFisso' ? (this.ripetizioni ?? 0) : 0,
        due_date: this.isRecurring && this.tipoRipetizione === 'scadenza' ? (this.fineRicorrenza || '') : ''
      };

      this.eventsService.create(payload).subscribe({
        next: () => {
          this.createdOk = true;
          this.responseTitle = 'Saved';
          this.responseMessage = 'Event created successfully.';
          this.responseVariant = 'success';
          this.showResponse = true;
        },
        error: () => {
          this.createdOk = false;
          this.responseTitle = 'Creation failed';
          this.responseMessage = 'Unable to create the event. Please try again.';
          this.responseVariant = 'error';
          this.showResponse = true;
        }
      });
    } else {
      console.log('Nuovo elemento:', eventoPreview);
      this.chiudi.emit();
    }
  }

  onResponseClose(): void {
    this.showResponse = false;
    if (this.createdOk) {
      this.activityCreated.emit();
      this.eventCreated.emit();
      this.chiudi.emit();
    }
  }

  annulla(): void {
    this.chiudi.emit();
  }
}
