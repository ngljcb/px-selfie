import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { GradesService } from '../../../service/grades.service';
import { Grade } from '../../../model/entity/grade.model';

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

    // Quando si torna dalla route di delete (o da qualunque altra navigazione verso /grades),
    // ricarica la lista e ricalcola le statistiche SENZA refresh di pagina.
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
        this.normalizeAndSort();
        this.computeTotals();
        this.groupByYear();
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
  toNumericGrade(grade: number | string | null | undefined): number | null {
    if (grade == null) return null;
    if (typeof grade === 'number') return grade;
    const s = String(grade).trim().toLowerCase();
    if (s === 'passed' || s === 'idoneo') return null;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  }

  formatDate(d?: string | null): string {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  trackById = (_: number, g: Grade) => g.id;

  isCollapsed(year: string): boolean {
    return this.collapsedYears.has(year);
  }

  toggleYear(year: string): void {
    if (this.collapsedYears.has(year)) this.collapsedYears.delete(year);
    else this.collapsedYears.add(year);
  }

  // ---------- Interni ----------
  private normalizeAndSort(): void {
    this.grades.sort((a, b) => {
      const ya = (a.year ?? '').localeCompare(b.year ?? '');
      if (ya !== 0) return ya;
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      if (da !== db) return da - db;
      return (a.course_name ?? '').localeCompare(b.course_name ?? '');
    });
  }

  private computeTotals(): void {
    this.totalCFU = this.grades.reduce((s, g) => s + (Number(g.cfu) || 0), 0);

    let sumWeighted = 0;
    let sumCfu = 0;
    for (const g of this.grades) {
      const nv = this.toNumericGrade(g.grade);
      if (nv != null) {
        const c = Number(g.cfu) || 0;
        sumWeighted += nv * c;
        sumCfu += c;
      }
    }
    this.average = sumCfu > 0 ? +(sumWeighted / sumCfu).toFixed(2) : 0;
    this.laureaBase = this.average ? +((this.average * 110) / 30).toFixed(2) : 0;
  }

  private groupByYear(): void {
    this.byYear.clear();
    for (const g of this.grades) {
      const y = g.year || '—';
      if (!this.byYear.has(y)) this.byYear.set(y, []);
      this.byYear.get(y)!.push(g);
    }
    this.years = Array.from(this.byYear.keys());
  }
}
