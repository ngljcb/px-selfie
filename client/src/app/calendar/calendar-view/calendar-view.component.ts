import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions, EventDropArg } from '@fullcalendar/core';
import { CalendarCreateComponent } from '../calendar-create/calendar-create.component';
import { TimeMachineService } from '../../service/time-machine.service';
import { TimeMachineListenerDirective } from '../../directive/time-machine-listener.directive';
import { ActivitiesService } from '../../service/activities.service';
import { Activity } from '../../model/activity.model';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, CalendarCreateComponent, TimeMachineListenerDirective],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.scss'
})
export class CalendarViewComponent implements OnInit, OnDestroy {
  @ViewChild('fc') fc?: FullCalendarComponent;

  private timeMachine = inject(TimeMachineService);
  private activitiesService = inject(ActivitiesService);
  private cdr = inject(ChangeDetectorRef);

  calendarOptions: CalendarOptions = this.baseOptions();
  calendarVisible = false;
  showCreate = false;
  selectedDate = '';

  ngOnInit(): void {
    this.loadActivitiesAndRender();
  }

  private baseOptions(): CalendarOptions {
    const now = this.timeMachine.getNow();
    return {
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
      events: [],
      editable: true,               // enables drag-and-drop
      eventDurationEditable: false, // only move, no resize
      selectable: true,
      height: 'full',
      dateClick: this.handleDateClick.bind(this),
      eventDrop: this.handleEventDrop.bind(this) // update due_date when moved
    };
  }

  private loadActivitiesAndRender(): void {
    const todayStr = this.timeMachine.getNow().toISOString().slice(0, 10);

    this.calendarOptions = this.baseOptions();
    this.calendarVisible = true;

    this.activitiesService.list({}).subscribe({
      next: (res) => {
        const events = (res.items || []).map((act: Activity) => ({
          id: String(act.id),                // needed to identify on drop
          title: act.title,
          start: act.due_date,               // use start instead of "date"
          allDay: true,
          backgroundColor: act.status === 'done' ? '#43a047' : '#e53935'
        }));

        if (this.fc?.getApi()) {
          const api = this.fc.getApi();
          api.removeAllEvents();
          api.addEventSource(events);
        } else {
          this.calendarOptions = { ...this.calendarOptions, events };
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Errore caricamento attività:', err);
      }
    });
  }

  private handleEventDrop(info: EventDropArg): void {
    const id = Number(info.event.id);
    const newDate = info.event.startStr.slice(0, 10); // YYYY-MM-DD

    // Optimistic UI is already moved by FullCalendar. If API fails, revert.
    this.activitiesService.update(id, { due_date: newDate }).subscribe({
      next: () => {
        // ok: nothing to do, calendar already reflects change
      },
      error: (err) => {
        console.error('Errore aggiornando due_date:', err);
        info.revert(); // rollback move
      }
    });
  }

  handleDateClick(arg: any): void {
    this.selectedDate = arg.dateStr;
    this.showCreate = true;
  }

  closeCreate(): void {
    this.showCreate = false;
    this.selectedDate = '';
  }

  onActivityCreated(): void {
    this.loadActivitiesAndRender();
  }

  applyVirtualNowToCalendar(): void {
    const eventsBackup = (this.fc?.getApi()?.getEvents() || []).map(e => ({
      id: e.id,
      title: e.title,
      start: e.startStr,
      allDay: e.allDay,
      backgroundColor: e.backgroundColor
    }));
    this.calendarVisible = false;
    this.cdr.detectChanges();

    this.calendarOptions = { ...this.baseOptions(), events: eventsBackup };
    this.calendarVisible = true;
    this.cdr.detectChanges();

    this.loadActivitiesAndRender();
  }

  ngOnDestroy(): void {}
}
