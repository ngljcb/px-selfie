import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { GradesService } from '../../../service/grades.service';
import { Grade } from '../../../model/entity/grade.model';
import {
  normalizeAndSort,
  computeTotals,
  groupByYear,
  toNumericGrade,
  formatDate,
} from '../../../utils/grades.utils';

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
  private navSub?: Subscription;

  grades: Grade[] = [];
  loading = false;
  error: string | null = null;

  // paging (se servirà in futuro)
  limit = 1000;
  offset = 0;
  total = 0;

  // computed
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
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  fetch(): void {
    this.loading = true;
    this.error = null;

    this.gradesService.list({ limit: this.limit, offset: this.offset }).subscribe({
      next: (res) => {
        this.grades = (res.items ?? []).slice();
        this.total = res.count ?? this.grades.length;

        // normalizzazione/ordinamento + calcoli delegati alle utility
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

  // ---------- Helpers usati nel template ----------
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