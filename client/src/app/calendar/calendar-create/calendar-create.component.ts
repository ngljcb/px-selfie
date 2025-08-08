import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  type: '' | 'evento' | 'attivita' = '';
  tipoRipetizione: 'nulla' | 'numeroFisso' | 'scadenza' = 'nulla';

  title: string = '';
  location: string = '';

  dataOraInizio: string = '';
  dataOraFine: string = '';
  duration: number = 1;

  isRecurring: boolean = false;
  ripetizioni: number | null = null;
  fineRicorrenza: string = '';

  giorniSettimana: string[] = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  giorniSelezionati: { [key: string]: boolean } = {
    Lunedì: false,
    Martedì: false,
    Mercoledì: false,
    Giovedì: false,
    Venerdì: false,
    Sabato: false,
    Domenica: false
  };

  erroreData: boolean = false;

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
        return; // blocca il submit
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

    console.log('Nuovo elemento:', evento);
    this.chiudi.emit();
  }

  annulla(): void {
    this.chiudi.emit();
  }
}
