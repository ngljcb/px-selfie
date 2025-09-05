// src/app/components/grades/grades-view/grades-view.component.ts 
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, Subscription, distinctUntilChanged } from 'rxjs';
import { GradesService } from '../../../service/grades.service';
import { Grade } from '../../../model/entity/grade.model';
import {
  normalizeAndSort,
  computeTotals,
  groupByYear,
  toNumericGrade,
  formatDate,
} from '../../../utils/grades.utils';
import { TimeMachineService } from '../../../service/time-machine.service';

@Component({
  selector: 'app-grades-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './grades-view.component.html',
  styleUrl: './grades-view.component.scss',
})
export class GradesViewComponent implements OnInit, OnDestroy {
  private gradesService = inject(GradesService);
  private router = inject(Router);
  private timeMachine = inject(TimeMachineService);
  private navSub?: Subscription;
  private tmSub?: Subscription;

  grades: Grade[] = [];
  loading = false;
  error: string | null = null;

  limit = 1000;
  offset = 0;
  total = 0;

  totalCFU = 0;
  average = 0;
  laureaBase = 0;

  years: string[] = [];
  byYear = new Map<string, Grade[]>();

  /** Anni collassati: di default VUOTO => tutto visibile */
  collapsedYears = new Set<string>();

  ngOnInit(): void {
    this.fetch();

    // Ricarica la lista al ritorno su /grades senza refresh
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (e.urlAfterRedirects.startsWith('/grades')) {
          this.fetch();
        }
      });

    // Ascolta i cambiamenti del Time Machine e ricarica dinamicamente
    this.tmSub = this.timeMachine
      .virtualNow$()
      .pipe(distinctUntilChanged((a, b) => a?.getTime() === b?.getTime()))
      .subscribe(() => this.fetch());
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    this.tmSub?.unsubscribe();
  }

  fetch(): void {
    this.loading = true;
    this.error = null;

    const cutoff = this.timeMachine.isActive()
      ? this.timeMachine.getNow()
      : new Date();

    this.gradesService
      .list({
        limit: this.limit,
        offset: this.offset,
        to: cutoff.toISOString(),
        // cache buster per evitare eventuali risposte stale dopo una modifica
        ts: Date.now()
      } as any)
      .subscribe({
        next: (res) => {
          this.grades = (res.items ?? []).slice();
          this.total = res.count ?? this.grades.length;

          this.grades = normalizeAndSort(this.grades);

          const totals = computeTotals(this.grades);
          this.totalCFU = totals.totalCFU;
          this.average = totals.average;
          this.laureaBase = totals.laureaBase;

          const grouped = groupByYear(this.grades);
          this.byYear = grouped.byYear;
          this.years = grouped.years;

          this.collapsedYears.clear();
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.message || 'Errore nel caricamento';
          this.loading = false;
        },
      });
  }

  toNumericGrade = (grade: number | string | null | undefined) => toNumericGrade(grade);

  formatDate = (d?: string | null) => formatDate(d);

  trackById = (_: number, g: Grade) => g.id;

  isCollapsed(year: string): boolean {
    return this.collapsedYears.has(year);
  }

  toggleYear(year: string): void {
    if (this.collapsedYears.has(year)) this.collapsedYears.delete(year);
    else this.collapsedYears.add(year);
  }
}
