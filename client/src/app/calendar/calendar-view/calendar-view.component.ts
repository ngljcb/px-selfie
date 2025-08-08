// calendar-view.component.ts
import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions } from '@fullcalendar/core';
import { TimeMachineService } from '../../service/time-machine.service';
import { TimeMachineListenerDirective } from '../../directive/time-machine-listener.directive';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, TimeMachineListenerDirective],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.scss'
})
export class CalendarViewComponent implements OnInit, OnDestroy {
  private timeMachine = inject(TimeMachineService);

  @ViewChild(FullCalendarComponent) fc!: FullCalendarComponent;

  calendarOptions!: CalendarOptions;

  ngOnInit(): void {
    const now = this.timeMachine.getNow();

    this.calendarOptions = {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialDate: now,
      now: () => now,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      events: [
        { title: 'Consegnare relazione', date: '2025-07-06', color: '#e53935' },
        { title: 'Studiare per esame', date: '2025-07-08', color: '#43a047' },
        { title: 'Finire progetto', date: '2025-07-09', color: '#1e88e5' },
        { title: 'Cinema', date: '2025-07-14', color: '#1976d2' },
        { title: 'Concerto Guns N Roses', date: '2025-07-23', color: '#1565c0' },
        { title: 'Aperitivo', date: '2025-07-27', color: '#0d47a1' },
      ],
      editable: true,
      selectable: true,
      height: 'full'
    };
  }

  // chiamata automaticamente dalla direttiva quando cambia la data virtuale
  applyVirtualNowToCalendar(): void {
    const now = this.timeMachine.getNow();
    const api = this.fc?.getApi();
    if (!api) return;

    api.setOption('now', () => now);
    api.gotoDate(now);
    api.today(); // forza la “today cell” a essere ricalcolata
  }

  ngOnDestroy(): void {
    // nessuna subscribe manuale: la direttiva gestisce tutto
  }
}
