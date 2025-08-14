import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivitiesService } from '../../../service/activities.service';
import { Activity } from '../../../model/activity.model';
import { CalendarResponseComponent } from '../calendar-response/calendar-response.component';

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

  type: '' | 'event' | 'activity' = '';
  tipoRipetizione: '' | 'numeroFisso' | 'scadenza' = '';

  title: string = '';
  location: string = '';

  scadenza: string = '';

  dataOraInizio: string = '';
  dataOraFine: string = '';
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

  constructor(private activitiesService: ActivitiesService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate'] && this.selectedDate) {
      const base = this.selectedDate.slice(0, 10); // YYYY-MM-DD
      this.dataOraInizio = `${base}T09:00`;
      this.dataOraFine = `${base}T10:00`;
      this.scadenza = base;
    }
  }

  onSubmit(): void {
    this.erroreData = false;

    if (this.dataOraInizio && this.dataOraFine) {
      const inizio = new Date(this.dataOraInizio);
      const fine = new Date(this.dataOraFine);
      if (inizio >= fine) {
        this.erroreData = true;
        return;
      }
    }

    const giorniAttivi = Object.entries(this.giorniSelezionati)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    const evento = {
      type: this.type,
      title: this.title,
      location: this.location,
      dataOraInizio: this.dataOraInizio,
      dataOraFine: this.dataOraFine,
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
          // mostra modal di risposta → al close emetti activityCreated + chiudi
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
    } else {
      // Manteniamo il comportamento attuale per gli eventi
      console.log('Nuovo elemento:', evento);
      this.chiudi.emit();
    }
  }

  onResponseClose(): void {
    this.showResponse = false;
    if (this.createdOk) {
      this.activityCreated.emit();
      this.chiudi.emit();
    }
  }

  annulla(): void {
    this.chiudi.emit();
  }
}
