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

  type: 'evento' | 'attività' = 'evento';

  // Campi comuni
  title: string = '';
  location: string = '';

  // Campi per evento
  dataInizio: string = '';
  dataFine: string = '';
  time: string = '';
  duration: number = 1;

  // Ricorrenza evento
  isRecurring: boolean = false;
  frequenza: 'giornaliera' | 'settimanale' | 'mensile' | '' = '';
  ripetizioni: number | null = null;
  fineRicorrenza: string = '';

  // Campo per attività
  deadline: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDate'] && this.selectedDate) {
      this.dataInizio = this.selectedDate;
    }
  }

  onSubmit(): void {
    const evento = {
      type: this.type,
      title: this.title,
      location: this.location,
      dataInizio: this.dataInizio,
      dataFine: this.dataFine,
      time: this.time,
      duration: this.duration,
      isRecurring: this.isRecurring,
      frequenza: this.frequenza,
      ripetizioni: this.ripetizioni,
      fineRicorrenza: this.fineRicorrenza,
      deadline: this.deadline
    };

    console.log('Nuovo elemento:', evento);
    // TODO: Integrazione con backend
    this.chiudi.emit(); // chiudi il modale dopo il salvataggio
  }

  annulla(): void {
    this.chiudi.emit(); // chiudi il modale
  }
}
