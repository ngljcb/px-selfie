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
    // MIGLIORAMENTO: Sottoscrivi separatamente ai cambiamenti della Time Machine
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
        
        // SEMPRE ricarica le statistiche quando la Time Machine cambia
        console.log('Ricaricando statistiche per cambio Time Machine...');
        this.loadStatistics();
      });

    // Sottoscrivi alle statistiche dal service
    this.statisticsService.statistics$
      .pipe(takeUntil(this.destroy$))
      .subscribe((stats) => {
        console.log('Statistiche ricevute dal service:', stats);
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

    // NUOVO: Usa refreshStatistics invece di getUserStatistics per forzare il refresh
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

  /**
   * NUOVO: Metodo per refresh automatico tramite direttiva
   */
  onTimeMachineChange = (): void => {
    console.log('TimeMachine change detected, refreshing stats...');
    this.loadStatistics();
  }

  /**
   * Forza il refresh delle statistiche (utile quando si cambia il tempo virtuale)
   */
  refreshStats(): void {
    this.loadStatistics();
  }

  // ==================== GETTERS PER TEMPLATE ====================

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