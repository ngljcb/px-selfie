// src/app/service/calendar.service.ts
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
      backgroundColor: act.status === 'done' ? '#91ff00' : '#ff6df3',
      color: act.status === 'done' ? '#91ff00' : '#ff6df3'
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
        backgroundColor: '#2ecc70',
        color: '#2ecc70',
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

    // --- SCADENZA senza giorni specificati: mostra OGNI GIORNO da start_date a due_date inclusa
    if (rtype === 'scadenza' && ev.due_date && days.length === 0) {
      const due = this.parseISODate(ev.due_date)!;
      const rangeStart = new Date(Math.max(startDate.getTime(), winStart.getTime()));
      const rangeEnd = new Date(Math.min(due.getTime(), winEnd.getTime()));
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(0, 0, 0, 0);

      for (let d = new Date(rangeStart); d.getTime() <= rangeEnd.getTime(); d.setDate(d.getDate() + 1)) {
        pushOccurrence(d);
      }
      return out;
    }

    // --- NUMEROFISSO senza days_recurrence: N GIORNI CONSECUTIVI da start_date (inclusa)
    if (rtype === 'numeroFisso' && days.length === 0 && (ev.number_recurrence ?? 0) > 0) {
      const n = ev.number_recurrence as number; // già > 0
      const last = new Date(startDate);
      last.setDate(last.getDate() + (n - 1)); // inclusivo

      const rangeStart = new Date(Math.max(startDate.getTime(), winStart.getTime()));
      const rangeEnd = new Date(Math.min(last.getTime(), winEnd.getTime()));
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(0, 0, 0, 0);

      for (let d = new Date(rangeStart); d.getTime() <= rangeEnd.getTime(); d.setDate(d.getDate() + 1)) {
        pushOccurrence(d);
      }
      return out;
    }

    // --- INDETERMINATO senza days_recurrence: ricorrenza ANNUALE nella stessa data (mese/giorno)
    if (rtype === 'indeterminato' && days.length === 0) {
      const startYear = Math.max(startDate.getFullYear(), winStart.getFullYear());
      const endYear = winEnd.getFullYear();
      const m = startDate.getMonth();
      const d = startDate.getDate();

      for (let y = startYear; y <= endYear; y++) {
        const occ = new Date(y, m, d);
        occ.setHours(0, 0, 0, 0);
        if (occ < startDate) continue;
        if (occ >= winEnd || occ < winStart) continue;

        const startISO = this.combineDateTime(occ, startTime);
        const endISO = endTime ? this.combineDateTime(occ, endTime) : undefined;

        out.push({
          id: `E:${ev.id}:${startISO}`,
          title: ev.title,
          start: startISO,
          end: endISO,
          allDay: !startTime && !endTime,
          backgroundColor: '#2ecc70',
          color: '#2ecc70',
        });
      }
      return out;
    }

    // Caso generale: ricorrenza settimanale (con giorni specificati o il giorno di startDate),
    // con fine inclusiva se 'scadenza' (<= due_date).
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

    while (cursor.getTime() <= searchEnd.getTime() && occurrencesLeft > 0) {
      const weekStart = new Date(cursor);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      for (const wd of daysToUse) {
        const dW = new Date(weekStart);
        dW.setDate(weekStart.getDate() + wd);
        if (dW < seriesStart) continue;
        if (seriesEndHard && dW > seriesEndHard) continue;
        if (dW > searchEnd) continue;

        pushOccurrence(dW);
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
