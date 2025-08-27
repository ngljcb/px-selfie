// src/app/components/calendar/calendar-view/calendar-view.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions, EventDropArg, EventClickArg } from '@fullcalendar/core';
import { CalendarCreateComponent } from '../calendar-create/calendar-create.component';
import { CalendarInfoComponent } from '../calendar-info/calendar-info.component';
import { TimeMachineService } from '../../../service/time-machine.service';
import { TimeMachineListenerDirective } from '../../../directives/time-machine-listener.directive';
import { ActivitiesService } from '../../../service/activities.service';
import { Activity } from '../../../model/activity.model';

// NEW: import Events service + model (aliased to avoid name clash)
import { EventsService } from '../../../service/events.service';
import { Event as AppEvent } from '../../../model/event.model';

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
  private eventsService = inject(EventsService);
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
    // Make "now" dynamic so the Today button always follows the current TimeMachine value.
    return {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      // use a fresh value each time we rebuild options
      initialDate: this.timeMachine.getNow(),
      // and let FullCalendar call into TimeMachine whenever it needs "now"
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
      eventClick: this.handleEventClick.bind(this)
    };
  }

  private loadActivitiesAndRender(): void {
    this.calendarOptions = this.baseOptions();
    this.calendarVisible = true;

    this.activitiesService.list({}).subscribe({
      next: (res) => {
        const activitiesAsEvents = (res.items || []).map((act: Activity) => ({
          id: `A:${act.id}`, // prefix to avoid id clash with Events
          title: act.title,
          start: act.due_date,
          allDay: true,
          backgroundColor: act.status === 'done' ? '#43a047' : '#e53935'
        }));

        const api = this.fc?.getApi();
        if (api) {
          api.removeAllEvents();
          api.addEventSource(activitiesAsEvents);
        } else {
          this.calendarOptions = { ...this.calendarOptions, events: activitiesAsEvents };
        }

        // After activities, load also the Events and merge them in the calendar
        this.loadAndInjectCalendarEvents();

        this.cdr.markForCheck();
      },
      error: (err) => console.error('Errore caricamento attività:', err)
    });
  }

  // NEW: load events from backend and inject into FullCalendar
  private loadAndInjectCalendarEvents(): void {
    const api = this.fc?.getApi();
    const now = this.timeMachine.getNow();

    // Try to use current view range if available, else fall back to current month window
    const viewStart = api?.view?.currentStart ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const viewEnd = api?.view?.currentEnd ?? new Date(now.getFullYear(), now.getMonth() + 1, 1);

    this.eventsService.list({}).subscribe({
      next: (items: AppEvent[]) => {
        const expanded = items.flatMap(ev => this.expandEventForWindow(ev, viewStart, viewEnd));
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

  // NEW: Expand a single DB event into one or more calendar entries based on recurrence
  private expandEventForWindow(ev: AppEvent, winStart: Date, winEnd: Date) {
    const out: any[] = [];

    const startDate = this.parseISODate(ev.start_date);
    if (!startDate) return out;

    const endDate = ev.end_date ? this.parseISODate(ev.end_date) : null;

    const startTime = ev.start_time ?? null; // 'HH:mm:ss' or null
    const endTime = ev.end_time ?? null;

    // Helper to push one occurrence
    const pushOccurrence = (d: Date) => {
      const startISO = this.combineDateTime(d, startTime);
      const endISO = endTime
        ? this.combineDateTime(d, endTime)
        : (endDate && endDate.getTime() !== d.getTime() ? this.combineDateTime(endDate, endTime) : null);

      out.push({
        id: `E:${ev.id}:${startISO}`, // composite id to keep unique
        title: ev.title,
        start: startISO,
        end: endISO ?? undefined,
        allDay: !startTime && !endTime,
        backgroundColor: '#1e88e5' // blue-ish for events
      });
    };

    // If no recurrence_type or empty string, just render the single (or multi-day) event if within window
    const rtype = (ev.recurrence_type || '').trim();
    if (!rtype) {
      // If multi-day w/out times, we just add a single event spanning dates; otherwise, push the start day
      const eventStart = new Date(startDate);
      const eventEnd = endDate ? new Date(endDate) : null;

      // Only add if intersects window
      const intersects =
        (eventEnd ? eventEnd >= winStart : eventStart >= winStart) &&
        eventStart < winEnd;

      if (intersects) {
        pushOccurrence(eventStart);
      }
      return out;
    }

    // Recurring: weekly on specified days_recurrence within a limit (window / number_recurrence / due_date)
    const days = this.parseDays(ev.days_recurrence);
    // If no days specified, default to startDate's weekday
    const daysToUse = days.length ? days : [startDate.getDay()];

    const seriesStart = new Date(Math.max(startDate.getTime(), winStart.getTime()));
    const seriesEndHard =
      rtype === 'scadenza' && ev.due_date ? this.parseISODate(ev.due_date)! :
      rtype === 'numeroFisso' ? null :
      rtype === 'indeterminato' ? null : null;

    // We’ll search occurrences from seriesStart to min(window end, due_date if present)
    const searchEnd = new Date(Math.min(winEnd.getTime(), seriesEndHard ? seriesEndHard.getTime() : winEnd.getTime()));

    let occurrencesLeft = rtype === 'numeroFisso' && ev.number_recurrence ? ev.number_recurrence : Infinity;

    // Start from the Monday of the week of seriesStart (or that day), then iterate day by day within window
    // but to be efficient, we jump week by week and add selected weekdays.
    let cursor = new Date(seriesStart);
    // normalize cursor to start of its day
    cursor.setHours(0, 0, 0, 0);

    // We will iterate week by week until searchEnd or until occurrencesLeft exhausted
    while (cursor <= searchEnd && occurrencesLeft > 0) {
      // For this week, compute each target weekday date
      for (const wd of daysToUse) {
        const d = this.dateForWeekday(cursor, wd);
        if (d < seriesStart) continue;
        if (seriesEndHard && d > seriesEndHard) continue;
        if (d > searchEnd) continue;

        pushOccurrence(d);
        occurrencesLeft--;
        if (occurrencesLeft <= 0) break;
      }
      // advance to next week
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
    }

    return out;
  }

  // Helpers for recurrence mapping
  private parseISODate(s?: string | null): Date | null {
    if (!s) return null;
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private combineDateTime(date: Date, time: string | null): string {
    if (!time) {
      // all-day -> use local midnight
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    // time like HH:mm:ss
    const [hh, mm, ss = '00'] = time.split(':');
    const d = new Date(date);
    d.setHours(+hh || 0, +mm || 0, +ss || 0, 0);
    return d.toISOString();
  }

  private parseDays(s?: string | null): number[] {
    if (!s) return [];
    const map: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    };
    return s
      .split(',')
      .map(x => x.trim().toLowerCase())
      .map(x => map[x])
      .filter((x): x is number => typeof x === 'number');
  }

  private dateForWeekday(base: Date, weekday: number): Date {
    // Given a base date (any day), return the date for target weekday in that same week (Sun=0..Sat=6)
    const d = new Date(base);
    const delta = weekday - d.getDay();
    d.setDate(d.getDate() + delta);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private handleEventClick(arg: EventClickArg): void {
    // Only activities open the Activity info panel, events are "informational" for now
    if (String(arg.event.id).startsWith('A:')) {
      const id = Number(String(arg.event.id).split(':')[1]);
      this.activitiesService.get(id).subscribe({
        next: (act) => {
          this.selectedActivity = act;
          this.showInfo = true;
          this.cdr.markForCheck();
        },
        error: (err) => console.error('Errore caricando activity:', err)
      });
    }
  }

  private handleEventDrop(info: EventDropArg): void {
    // Only allow dragging for Activities (keep Events static here)
    if (String(info.event.id).startsWith('A:')) {
      const id = Number(String(info.event.id).split(':')[1]);
      const newDate = info.event.startStr.slice(0, 10);
      this.activitiesService.update(id, { due_date: newDate }).subscribe({
        error: (err) => { console.error('Errore aggiornando due_date:', err); info.revert(); }
      });
    } else {
      // revert drag for Events
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

    // Re-fetch both Activities and Events to reflect the new "now" anchor
    this.loadActivitiesAndRender();
  }

  ngOnDestroy(): void {}
}
