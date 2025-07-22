import { Component } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions } from '@fullcalendar/core';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [FullCalendarModule],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.scss'
})
export class CalendarViewComponent {

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
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
