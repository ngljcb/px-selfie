// src/app/features/timer/timer-stats/timer-stats.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StatisticsService } from '../../service/statistics.service';
import { StatisticsResponse } from '../../model/statistics.interface';

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
  isExpanded = false; // Per show/hide dettagli

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

  // ==================== CONTROLLI UI ====================

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  refreshStats(): void {
    this.loadStatistics();
  }

  // ==================== GETTERS PER TEMPLATE ====================

  get totalSessions(): number {
    return this.statistics?.totalCompletedSessions || 0;
  }

  get totalStudyTime(): string {
    return this.statistics?.totalStudyTimeFormatted || '0m';
  }

  get totalStudyMinutes(): number {
    return this.statistics?.totalStudyTimeMinutes || 0;
  }

  get consecutiveDays(): number {
    return this.statistics?.consecutiveStudyDays || 0;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Calcola media sessioni per giorno (se streak > 0)
   */
  getAverageSessionsPerDay(): number {
    if (!this.statistics || this.consecutiveDays === 0) return 0;
    return Math.round((this.totalSessions / this.consecutiveDays) * 10) / 10; // 1 decimale
  }

  /**
   * Calcola media minuti per giorno (se streak > 0)
   */
  getAverageMinutesPerDay(): number {
    if (!this.statistics || this.consecutiveDays === 0) return 0;
    return Math.round(this.totalStudyMinutes / this.consecutiveDays);
  }

  /**
   * Calcola media minuti per sessione
   */
  getAverageMinutesPerSession(): number {
    if (!this.statistics || this.totalSessions === 0) return 0;
    return Math.round(this.totalStudyMinutes / this.totalSessions);
  }

  /**
   * Formatta i minuti in formato leggibile
   */
  formatMinutes(minutes: number): string {
    return this.statisticsService.formatStudyTime(minutes);
  }

  /**
   * Ottiene l'icona per lo streak
   */
  getStreakIcon(): string {
    const days = this.consecutiveDays;
    if (days === 0) return '😴';
    if (days < 3) return '🌱';
    if (days < 7) return '🔥';
    if (days < 14) return '⚡';
    if (days < 30) return '🚀';
    return '👑'; // 30+ giorni
  }

  /**
   * Ottiene il messaggio motivazionale per lo streak
   */
  getStreakMessage(): string {
    const days = this.consecutiveDays;
    if (days === 0) return 'Inizia il tuo streak!';
    if (days === 1) return 'Primo giorno completato!';
    if (days < 7) return `${days} giorni di fila!`;
    if (days < 14) return `Una settimana di studio! 🎉`;
    if (days < 30) return `${days} giorni consecutivi! 💪`;
    return `Incredibile! ${days} giorni! 🏆`;
  }

  /**
   * Ottiene la classe CSS per il colore dello streak
   */
  getStreakColorClass(): string {
    const days = this.consecutiveDays;
    if (days === 0) return 'streak-none';
    if (days < 3) return 'streak-beginner';
    if (days < 7) return 'streak-good';
    if (days < 14) return 'streak-great';
    if (days < 30) return 'streak-amazing';
    return 'streak-legendary';
  }

  /**
   * Calcola la percentuale di progresso verso il prossimo traguardo
   */
  getNextMilestoneProgress(): { current: number; next: number; percentage: number } {
    const days = this.consecutiveDays;
    const milestones = [3, 7, 14, 30, 50, 100];
    
    const nextMilestone = milestones.find(m => m > days) || (days + 10);
    const previousMilestone = milestones.find(m => m <= days) || 0;
    
    const progress = previousMilestone === nextMilestone 
      ? 100 
      : Math.round(((days - previousMilestone) / (nextMilestone - previousMilestone)) * 100);
    
    return {
      current: days,
      next: nextMilestone,
      percentage: Math.min(100, progress)
    };
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