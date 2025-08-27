import { Injectable } from '@angular/core';
import { Activity } from '../model/activity.model';
import { Event as AppEvent } from '../model/event.model';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  /** Mappa le Activities del backend in event objects per FullCalendar */
  mapActivitiesToEvents(items: Activity[]) {
    return (items || []).map((act) => ({
      id: `A:${act.id}`,
      title: act.title,
      start: act.due_date,
      allDay: true,
      backgroundColor: act.status === 'done' ? '#43a047' : '#e53935'
    }));
  }

  /** Espande un singolo Event (recurrence inclusa) in uno o più eventi entro la finestra indicata */
  expandEventForWindow(ev: AppEvent, winStart: Date, winEnd: Date) {
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

  // ---------- helpers ----------
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
}