import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { StatisticsService } from '../../../service/statistics.service';
import { TimeMachineService } from '../../../service/time-machine.service';
import { StatisticsResponse } from '../../../model/statistics.interface';

@Component({
  selector: 'app-timer-stats',
  standalone: true,
  templateUrl: './timer-stats.component.html',
  styleUrls: ['./timer-stats.component.scss']
})
export class TimerStatsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // State
  statistics: StatisticsResponse | null = null;
  isLoading = false;
  error: string | null = null;
  isTimeMachineActive = false;

  constructor(
    private statisticsService: StatisticsService,
    private timeMachineService: TimeMachineService
  ) {}

  ngOnInit(): void {

    this.timeMachineService.virtualNow$()
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged((prev, curr) => {
          return prev?.getTime() === curr?.getTime();
        })
      )
      .subscribe((virtualTime) => {
        const wasActive = this.isTimeMachineActive;
        this.isTimeMachineActive = virtualTime !== null;
        
        console.log('Time Machine stato cambiato:', {
          wasActive,
          isActive: this.isTimeMachineActive,
          virtualTime: virtualTime?.toISOString(),
          currentStats: this.statistics
        });
        
        console.log('Ricaricando statistiche per cambio Time Machine...');
        this.loadStatistics();
      });

    this.statisticsService.statistics$
      .pipe(takeUntil(this.destroy$))
      .subscribe((stats) => {
        console.log('Statistiche ricevute dal service:', stats);
        this.statistics = stats;
      });

    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStatistics(): void {
    this.isLoading = true;
    this.error = null;

    this.statisticsService.refreshStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          console.log('Statistiche caricate con refresh forzato:', stats);
          this.statistics = stats;
          this.isLoading = false;
          this.isTimeMachineActive = this.statisticsService.isTimeMachineActive();
        },
        error: (error) => {
          console.error('Errore nel caricamento statistiche:', error);
          this.error = 'Errore nel caricamento delle statistiche';
          this.isLoading = false;
        }
      });
  }

  refreshStats(): void {
    this.loadStatistics();
  }

  get totalSessions(): number {
    return this.statistics?.totalCompletedSessions || 0;
  }

  get totalStudyMinutes(): number {
    return this.statistics?.totalStudyTimeMinutes || 0;
  }

  get totalStudyTimeFormatted(): string {
    return this.statistics?.totalStudyTimeFormatted || '0m';
  }

  get consecutiveDays(): number {
    return this.statistics?.consecutiveStudyDays || 0;
  }

  get currentTime(): Date {
    return this.statisticsService.getCurrentTime();
  }

  get safeStatistics(): StatisticsResponse {
    return this.statistics || {
      totalCompletedSessions: 0,
      totalStudyTimeMinutes: 0,
      totalStudyTimeFormatted: '0m',
      consecutiveStudyDays: 0
    };
  }
}