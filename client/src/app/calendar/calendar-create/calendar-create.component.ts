import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivitiesService } from '../../service/activities.service';
import { Activity } from '../../model/activity.model';

@Component({
  selector: 'app-calendar-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(private activitiesService: ActivitiesService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate'] && this.selectedDate) {
      const base = this.selectedDate.slice(0, 10); // YYYY-MM-DD
      this.dataOraInizio = `${base}T09:00`;
      this.dataOraFine = `${base}T10:00`;
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
          this.activityCreated.emit();
          this.chiudi.emit();
        },
        error: (err) => {
          console.error('Errore creazione attività:', err);
        }
      });
    } else {
      console.log('Nuovo elemento:', evento);
      this.chiudi.emit();
    }
  }

  annulla(): void {
    this.chiudi.emit();
  }
}
