// src/app/components/home/widgets/stats/stats.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { GradesService } from '../../../../service/grades.service';
import { Grade } from '../../../../model/entity/grade.model';
import { computeTotals as computeGradeTotals } from '../../../../utils/grades.utils';
import { StatisticsService } from '../../../../service/statistics.service';
import { TimeMachineService } from '../../../../service/time-machine.service';
import { StatisticsResponse } from '../../../../model/statistics.interface';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats.component.html'
})
export class StatsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Services
  private gradesService = inject(GradesService);
  private statisticsService = inject(StatisticsService);
  private timeMachineService = inject(TimeMachineService);

  // UI state
  loading = true;
  error: string | null = null;

  // Grades metrics (row 1)
  grades: Grade[] = [];
  totalCFU = 0;
  average = 0;
  laureaBase = 0;

  // Timer metrics (row 2)
  statistics: StatisticsResponse | null = null;

  ngOnInit(): void {
    // React to TimeMachine changes: refresh both grades + timer stats
    this.timeMachineService
      .virtualNow$()
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged((a, b) => a?.getTime() === b?.getTime())
      )
      .subscribe(() => {
        this.refreshGrades();
        this.refreshTimerStats();
      });

    // Live updates from StatisticsService observable
    this.statisticsService.statistics$
      .pipe(takeUntil(this.destroy$))
      .subscribe((stats) => {
        this.statistics = stats;
      });

    // Initial load
    this.refreshGrades();
    this.refreshTimerStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ----------- LOADERS -----------
  private refreshGrades(): void {
    this.loading = true;
    this.error = null;

    this.gradesService
      .list({ limit: 1000, offset: 0 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.grades = (res.items ?? []).slice();
          const { totalCFU, average, laureaBase } = computeGradeTotals(this.grades);
          this.totalCFU = totalCFU;
          this.average = average;
          this.laureaBase = laureaBase;
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.message || 'Errore nel caricamento delle statistiche';
          this.loading = false;
        }
      });
  }

  private refreshTimerStats(): void {
    this.statisticsService
      .refreshStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
        },
        error: () => {
          // Non bloccare il widget se fallisce solo il blocco timer
          if (!this.error) this.error = 'Impossibile aggiornare le statistiche del timer';
        }
      });
  }

  // ----------- GETTERS (Timer row) -----------
  get totalSessions(): number {
    return this.statistics?.totalCompletedSessions ?? 0;
  }

  get totalStudyTimeFormatted(): string {
    return this.statistics?.totalStudyTimeFormatted ?? '0m';
  }

  get consecutiveDays(): number {
    return this.statistics?.consecutiveStudyDays ?? 0;
  }
}
