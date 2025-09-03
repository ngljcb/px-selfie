// src/app/components/widgets/calendar/calendar.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import { CalendarOptions } from '@fullcalendar/core';
import { forkJoin } from 'rxjs';

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
      plugins: [dayGridPlugin],
      initialView: 'dayGridMonth',
      initialDate: this.timeMachine.getNow(),
      now: () => this.timeMachine.getNow(),
      nowIndicator: true,
      headerToolbar: false,
      selectable: false,
      editable: false,
      eventStartEditable: false,
      eventDurationEditable: false,
      droppable: false,
      events: [],
      height: 'full'
    };
  }

  ngOnInit(): void {
    this.loadActivitiesAndRender();
  }

  /**
   * Carica attività ed eventi in un'unica pipeline e aggiorna *una sola volta*
   * la sorgente degli eventi del calendario. Questo evita di aggiungere
   * EventSource multipli tra le navigazioni (bug dei duplicati).
   */
  private loadActivitiesAndRender(): void {
    // finestra della vista (widget è read-only: la vista è sempre il mese corrente della Time Machine)
    const now = this.timeMachine.getNow();
    const viewStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const viewEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // reset opzioni (svuota eventi) e nasconde momentaneamente per forzare re-render pulito
    this.calendarVisible = false;
    const freshOptions = this.baseOptions();

    forkJoin({
      acts: this.activitiesService.list({}),
      evs: this.eventsService.list({})
    }).subscribe({
      next: ({ acts, evs }) => {
        const activitiesAsEvents = this.calendarService.mapActivitiesToEvents(acts.items || []);
        const expandedEvents = (evs as AppEvent[]).flatMap(ev =>
          this.calendarService.expandEventForWindow(ev, viewStart, viewEnd)
        );

        // de-duplica per sicurezza (chiave: id/title + start)
        const seen = new Set<string>();
        const allEvents = [...activitiesAsEvents, ...expandedEvents].filter(e => {
          const key = `${e.id ?? e.title}-${e.start}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // aggiorna UNA SOLA volta la lista degli eventi -> niente duplicazioni
        this.calendarOptions = { ...freshOptions, events: allEvents };
        this.calendarVisible = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Errore caricamento attività/eventi:', err);
        this.calendarOptions = { ...freshOptions, events: [] };
        this.calendarVisible = true;
        this.cdr.markForCheck();
      }
    });
  }

  // Re-render when Time Machine changes (ricarica tutto in modo pulito)
  applyVirtualNowToCalendar(): void {
    this.loadActivitiesAndRender();
  }

  ngOnDestroy(): void {}
}
