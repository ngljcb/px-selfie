import { Component, OnDestroy, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions, EventDropArg, EventClickArg, DatesSetArg } from '@fullcalendar/core';
import { CalendarCreateComponent } from '../calendar-create/calendar-create.component';
import { CalendarInfoComponent } from '../calendar-info/calendar-info.component';
import { TimeMachineService } from '../../../service/time-machine.service';
import { TimeMachineListenerDirective } from '../../../directives/time-machine-listener.directive';
import { ActivitiesService } from '../../../service/activities.service';
import { Activity } from '../../../model/activity.model';
import { EventsService } from '../../../service/events.service';
import { Event as AppEvent } from '../../../model/event.model';
import { CalendarService } from '../../../service/calendar.service';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, CalendarCreateComponent, CalendarInfoComponent, TimeMachineListenerDirective],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.scss'
})
export class CalendarViewComponent implements OnDestroy {
  @ViewChild('fc') fc?: FullCalendarComponent;

  private timeMachine = inject(TimeMachineService);
  private activitiesService = inject(ActivitiesService);
  private eventsService = inject(EventsService);
  private calendarService = inject(CalendarService);
  private cdr = inject(ChangeDetectorRef);

  calendarOptions: CalendarOptions = this.baseOptions();
  calendarVisible = false;
  showCreate = false;
  showInfo = false;
  selectedDate = '';
  selectedActivity: Activity | null = null;
  selectedEvent: AppEvent | null = null;

  private lastMonthStart?: string;
  private lastMonthEnd?: string;

  private baseOptions(): CalendarOptions {
    return {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      initialDate: this.timeMachine.getNow(),
      now: () => this.timeMachine.getNow(),
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
      eventClick: this.handleEventClick.bind(this),
      datesSet: this.handleMonthDatesSet.bind(this)
    };
  }

  private handleMonthDatesSet(arg: DatesSetArg): void {
    if (arg.view.type !== 'dayGridMonth') return;
    const startISO = arg.start.toISOString().slice(0, 10);
    const endISO = arg.end.toISOString().slice(0, 10);
    if (this.lastMonthStart === startISO && this.lastMonthEnd === endISO) return;
    this.lastMonthStart = startISO;
    this.lastMonthEnd = endISO;
    this.refreshCurrentMonth(startISO, endISO);
  }

  private refreshCurrentMonth(fromISO: string, toISO: string): void {
    const api = this.fc?.getApi();
    if (!api) return;

    api.removeAllEvents();

    this.activitiesService.list({ from: fromISO, to: toISO }).subscribe({
      next: (res) => {
        const activitiesAsEvents = this.calendarService.mapActivitiesToEvents(res.items || []);
        api.addEventSource(activitiesAsEvents);

        this.eventsService.list({}).subscribe({
          next: (items: AppEvent[]) => {
            const expanded = items.flatMap(ev =>
              this.calendarService.expandEventForWindow(ev, new Date(fromISO), new Date(toISO))
            );
            api.addEventSource(expanded);
            this.cdr.markForCheck();
          },
          error: (err) => console.error('Errore caricamento events (mese):', err)
        });
      },
      error: (err) => console.error('Errore caricamento attività (mese):', err)
    });
  }

  private loadActivitiesAndRender(): void {
    this.calendarOptions = this.baseOptions();
    this.calendarVisible = true;

    this.activitiesService.list({}).subscribe({
      next: (res) => {
        const activitiesAsEvents = this.calendarService.mapActivitiesToEvents(res.items || []);

        const api = this.fc?.getApi();
        if (api) {
          api.removeAllEvents();
          api.addEventSource(activitiesAsEvents);
        } else {
          this.calendarOptions = { ...this.calendarOptions, events: activitiesAsEvents };
        }

        this.loadAndInjectCalendarEvents();
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Errore caricamento attività:', err)
    });
  }

  private loadAndInjectCalendarEvents(): void {
    const api = this.fc?.getApi();
    const now = this.timeMachine.getNow();
    const viewStart = api?.view?.currentStart ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const viewEnd = api?.view?.currentEnd ?? new Date(now.getFullYear(), now.getMonth() + 1, 1);

    this.eventsService.list({}).subscribe({
      next: (items: AppEvent[]) => {
        const expanded = items.flatMap(ev => this.calendarService.expandEventForWindow(ev, viewStart, viewEnd));
        if (api) {
          api.addEventSource(expanded);
        } else {
          const existing = (this.calendarOptions.events as any[]) ?? [];
          this.calendarOptions = { ...this.calendarOptions, events: [...existing, ...expanded] };
        }
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Errore caricamento events:', err)
    });
  }

  private handleEventClick(arg: EventClickArg): void {
    const idStr = String(arg.event.id);
    if (idStr.startsWith('A:')) {
      const id = Number(idStr.split(':')[1]);
      this.activitiesService.get(id).subscribe({
        next: (act) => {
          this.selectedActivity = act;
          this.showInfo = true;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Errore caricando activity:', err)
      });
      return;
    }

    if (idStr.startsWith('E:')) {
      const id = Number(idStr.split(':')[1]);
      this.eventsService.get(id).subscribe({
        next: (ev) => {
          this.selectedEvent = ev;
          this.selectedActivity = null;
          this.showInfo = true;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Errore caricando event:', err)
      });
    }
  }

  private handleEventDrop(info: EventDropArg): void {
    if (String(info.event.id).startsWith('A:')) {
      const id = Number(String(info.event.id).split(':')[1]);
      const newDate = info.event.startStr.slice(0, 10);
      this.activitiesService.update(id, { due_date: newDate }).subscribe({
        error: (err) => { console.error('Errore aggiornando due_date:', err); info.revert(); }
      });
    } else {
      info.revert();
    }
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
    this.selectedEvent = null;
    this.loadActivitiesAndRender();
  }

  deleteActivity(id: number): void {
    this.closeInfo();
    this.loadActivitiesAndRender();
  }

  modifyActivity(id: number): void {
    this.closeInfo();
    this.loadActivitiesAndRender();
  }

  applyVirtualNowToCalendar(): void {
    const eventsBackup = (this.fc?.getApi()?.getEvents() || []).map(e => ({
      id: e.id,
      title: e.title,
      start: e.startStr,
      end: e.endStr || undefined,
      allDay: e.allDay,
      backgroundColor: (e as any).backgroundColor
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