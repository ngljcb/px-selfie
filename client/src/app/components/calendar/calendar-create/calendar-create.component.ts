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
  tipoRipetizione: '' | 'numeroFisso' | 'scadenza' | 'indeterminato' = 'indeterminato';

  title: string = '';
  scadenza: string = '';
  
  location: string = '';
  dataInizio: string = '';
  dataFine: string = '';
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

  constructor(private activitiesService: ActivitiesService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate'] && this.selectedDate) {
      const base = this.selectedDate.slice(0, 10); // YYYY-MM-DD
      this.dataInizio = base;
      this.dataFine = base;
      this.scadenza = base;
    }
  }

  onSubmit(): void {
    this.erroreData = false;

    if (this.dataInizio && this.dataFine) {
      const inizio = new Date(this.dataInizio);
      const fine = new Date(this.dataFine);
      if (inizio > fine) {
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
      dataInizio: this.dataInizio,
      dataFine: this.dataFine,
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
