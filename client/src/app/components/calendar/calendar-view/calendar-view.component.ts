import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
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

  private lastMonthStart?: string;
  private lastMonthEnd?: string;

  ngOnInit(): void {}

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
        const activitiesAsEvents = (res.items || []).map((act: Activity) => ({
          id: `A:${act.id}`,
          title: act.title,
          start: act.due_date,
          allDay: true,
          backgroundColor: act.status === 'done' ? '#43a047' : '#e53935'
        }));
        api.addEventSource(activitiesAsEvents);

        this.eventsService.list({}).subscribe({
          next: (items: AppEvent[]) => {
            const expanded = items.flatMap(ev =>
              this.expandEventForWindow(ev, new Date(fromISO), new Date(toISO))
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
        const activitiesAsEvents = (res.items || []).map((act: Activity) => ({
          id: `A:${act.id}`,
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

  private expandEventForWindow(ev: AppEvent, winStart: Date, winEnd: Date) {
    const out: any[] = [];

    const startDate = this.parseISODate(ev.start_date);
    if (!startDate) return out;

    const endDate = ev.end_date ? this.parseISODate(ev.end_date) : null;
    const startTime = ev.start_time ?? null;
    const endTime = ev.end_time ?? null;

    const pushOccurrence = (d: Date) => {
      const startISO = this.combineDateTime(d, startTime);
      const endISO = endTime
        ? this.combineDateTime(d, endTime)
        : (endDate && endDate.getTime() !== d.getTime() ? this.combineDateTime(endDate, endTime) : null);
      out.push({
        id: `E:${ev.id}:${startISO}`,
        title: ev.title,
        start: startISO,
        end: endISO ?? undefined,
        allDay: !startTime && !endTime,
        backgroundColor: '#1e88e5'
      });
    };

    const rtype = (ev.recurrence_type || '').trim();
    if (!rtype) {
      const eventStart = new Date(startDate);
      const eventEnd = endDate ? new Date(endDate) : null;
      const intersects =
        (eventEnd ? eventEnd >= winStart : eventStart >= winStart) &&
        eventStart < winEnd;
      if (intersects) pushOccurrence(eventStart);
      return out;
    }

    const days = this.parseDays(ev.days_recurrence);
    const daysToUse = days.length ? days : [startDate.getDay()];

    const seriesStart = new Date(Math.max(startDate.getTime(), winStart.getTime()));
    const seriesEndHard =
      rtype === 'scadenza' && ev.due_date ? this.parseISODate(ev.due_date)! :
      rtype === 'numeroFisso' ? null :
      rtype === 'indeterminato' ? null : null;

    const searchEnd = new Date(Math.min(winEnd.getTime(), seriesEndHard ? seriesEndHard.getTime() : winEnd.getTime()));
    let occurrencesLeft = rtype === 'numeroFisso' && ev.number_recurrence ? ev.number_recurrence : Infinity;

    let cursor = new Date(seriesStart);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= searchEnd && occurrencesLeft > 0) {
      // compute start-of-week (Sunday) for a stable week anchor
      const weekStart = new Date(cursor);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      for (const wd of daysToUse) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + wd);
        if (d < seriesStart) continue;
        if (seriesEndHard && d > seriesEndHard) continue;
        if (d > searchEnd) continue;

        pushOccurrence(d);
        occurrencesLeft--;
        if (occurrencesLeft <= 0) break;
      }
      cursor = new Date(weekStart);
      cursor.setDate(weekStart.getDate() + 7);
    }

    return out;
  }

  private parseISODate(s?: string | null): Date | null {
    if (!s) return null;
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private combineDateTime(date: Date, time: string | null): string {
    if (!time) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
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
    const d = new Date(base);
    const delta = weekday - d.getDay();
    d.setDate(d.getDate() + delta);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private handleEventClick(arg: EventClickArg): void {
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
