import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions, EventDropArg, EventClickArg } from '@fullcalendar/core';
import { CalendarCreateComponent } from '../calendar-create/calendar-create.component';
import { CalendarInfoComponent } from '../calendar-info/calendar-info.component';
import { TimeMachineService } from '../../service/time-machine.service';
import { TimeMachineListenerDirective } from '../../directive/time-machine-listener.directive';
import { ActivitiesService } from '../../service/activities.service';
import { Activity } from '../../model/activity.model';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, CalendarCreateComponent, CalendarInfoComponent, TimeMachineListenerDirective],
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
  showInfo = false;
  selectedDate = '';
  selectedActivity: Activity | null = null;

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
      editable: true,
      eventDurationEditable: false,
      selectable: true,
      height: 'full',
      dateClick: this.handleDateClick.bind(this),
      eventDrop: this.handleEventDrop.bind(this),
      eventClick: this.handleEventClick.bind(this)
    };
  }

  private loadActivitiesAndRender(): void {
    this.calendarOptions = this.baseOptions();
    this.calendarVisible = true;

    this.activitiesService.list({}).subscribe({
      next: (res) => {
        const events = (res.items || []).map((act: Activity) => ({
          id: String(act.id),
          title: act.title,
          start: act.due_date,
          allDay: true,
          backgroundColor: act.status === 'done' ? '#43a047' : '#e53935'
        }));

        const api = this.fc?.getApi();
        if (api) {
          api.removeAllEvents();
          api.addEventSource(events);
        } else {
          this.calendarOptions = { ...this.calendarOptions, events };
        }
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Errore caricamento attività:', err)
    });
  }

  private handleEventClick(arg: EventClickArg): void {
    const id = Number(arg.event.id);
    this.activitiesService.get(id).subscribe({
      next: (act) => {
        this.selectedActivity = act;
        this.showInfo = true;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Errore caricando activity:', err)
    });
  }

  private handleEventDrop(info: EventDropArg): void {
    const id = Number(info.event.id);
    const newDate = info.event.startStr.slice(0, 10);
    this.activitiesService.update(id, { due_date: newDate }).subscribe({
      error: (err) => { console.error('Errore aggiornando due_date:', err); info.revert(); }
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

  closeInfo(): void {
    this.showInfo = false;
    this.selectedActivity = null;
    this.loadActivitiesAndRender(); 
  }

  deleteActivity(id: number): void {
    this.closeInfo();
    this.loadActivitiesAndRender();
  }

  modifyActivity(id: number): void {
    this.closeInfo();
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