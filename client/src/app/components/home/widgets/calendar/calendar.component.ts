// src/app/components/widgets/calendar/calendar.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import { CalendarOptions } from '@fullcalendar/core';

import { TimeMachineService } from '../../../../service/time-machine.service';
import { TimeMachineListenerDirective } from '../../../../directives/time-machine-listener.directive';
import { ActivitiesService } from '../../../../service/activities.service';
import { Activity } from '../../../../model/activity.model';
import { EventsService } from '../../../../service/events.service';
import { Event as AppEvent } from '../../../../model/event.model';
import { CalendarService } from '../../../../service/calendar.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, TimeMachineListenerDirective],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent implements OnInit, OnDestroy {
  @ViewChild('fc') fc?: FullCalendarComponent;

  private timeMachine = inject(TimeMachineService);
  private activitiesService = inject(ActivitiesService);
  private eventsService = inject(EventsService);
  private calendarService = inject(CalendarService);
  private cdr = inject(ChangeDetectorRef);

  calendarOptions: CalendarOptions = this.baseOptions();
  calendarVisible = false;

  // kept for compatibility, but unused in the read-only widget
  showCreate = false;
  showInfo = false;
  selectedDate = '';
  selectedActivity: Activity | null = null;
  selectedEvent: AppEvent | null = null;

  private baseOptions(): CalendarOptions {
    return {
      // only the month grid body
      plugins: [dayGridPlugin],
      initialView: 'dayGridMonth',
      initialDate: this.timeMachine.getNow(),
      now: () => this.timeMachine.getNow(),
      nowIndicator: true,

      // hide toolbar completely (title + nav buttons)
      headerToolbar: false,

      // READ-ONLY: no selection, no drag/resize, no external drop
      selectable: false,
      editable: false,
      eventStartEditable: false,
      eventDurationEditable: false,
      droppable: false,

      // data will be injected after fetch
      events: [],
      height: 'full'
    };
  }

  ngOnInit(): void {
    this.loadActivitiesAndRender();
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

  // Re-render when Time Machine changes
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
