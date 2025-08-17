import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StatisticsService } from '../../../service/statistics.service';
import { StatisticsResponse } from '../../../model/statistics.interface';

@Component({
  selector: 'app-timer-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timer-stats.component.html',
  styleUrls: ['./timer-stats.component.scss']
})
export class TimerStatsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // State
  statistics: StatisticsResponse | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(private statisticsService: StatisticsService) {}

  ngOnInit(): void {
    // Subscribe alle statistiche dal service
    this.statisticsService.statistics$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.statistics = stats;
      });

    // Carica le statistiche all'inizializzazione
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== CARICAMENTO DATI ====================

  loadStatistics(): void {
    this.isLoading = true;
    this.error = null;

    this.statisticsService.getUserStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Errore nel caricamento statistiche:', error);
          this.error = 'Errore nel caricamento delle statistiche';
          this.isLoading = false;
        }
      });
  }

  // ==================== GETTERS PER TEMPLATE ====================

  get totalSessions(): number {
    return this.statistics?.totalCompletedSessions || 0;
  }

  get totalStudyMinutes(): number {
    return this.statistics?.totalStudyTimeMinutes || 0;
  }

  get consecutiveDays(): number {
    return this.statistics?.consecutiveStudyDays || 0;
  }

  // ==================== SAFE GETTERS ====================

  get safeStatistics(): StatisticsResponse {
    return this.statistics || {
      totalCompletedSessions: 0,
      totalStudyTimeMinutes: 0,
      totalStudyTimeFormatted: '0m',
      consecutiveStudyDays: 0
    };
  }
}