import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions } from '@fullcalendar/core';
import { CalendarCreateComponent } from '../calendar-create/calendar-create.component';
import { TimeMachineService } from '../../service/time-machine.service';
import { TimeMachineListenerDirective } from '../../directive/time-machine-listener.directive';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, CalendarCreateComponent, TimeMachineListenerDirective],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.scss'
})
export class CalendarViewComponent implements OnInit, OnDestroy {
  private timeMachine = inject(TimeMachineService);
  private cdr = inject(ChangeDetectorRef);

  calendarOptions!: CalendarOptions;
  calendarVisible = true;
  showCreate = false;
  selectedDate: string = '';

  ngOnInit(): void {
      this.generateCalendarOptions();
    }

    private generateCalendarOptions(): void {
      const now = this.timeMachine.getNow();

      this.calendarOptions = {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: 'dayGridMonth',
        initialDate: now,
        now: () => now,
        nowIndicator: true,
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
        height: 'full',
        dateClick: this.handleDateClick.bind(this)
      };
    }

/*
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
    height: 'full',
    dateClick: this.handleDateClick.bind(this)
  };*/

  handleDateClick(arg: any): void {
    this.selectedDate = arg.dateStr; // formato YYYY-MM-DD
    this.showCreate = true;
  }

  closeCreate(): void {
    this.showCreate = false;
    this.selectedDate = '';
  }

  applyVirtualNowToCalendar(): void {
    this.calendarVisible = false;
    this.cdr.detectChanges();
    this.generateCalendarOptions();

    setTimeout(() => {
      this.calendarVisible = true;
      this.cdr.detectChanges();
    }, 0);
  }

  ngOnDestroy(): void {}
}
