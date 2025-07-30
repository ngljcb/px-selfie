// src/app/features/timer/timer-view/timer-view.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  TimerService 
} from '../../service/timer.service';
import { 
  TimerState, 
  TimerConfig, 
  TimerStatus, 
  TimerPhase 
} from '../../model/timer.interface';

@Component({
  selector: 'app-timer-view',
  templateUrl: './timer-view.component.html',
  styleUrls: ['./timer-view.component.scss']
})
export class TimerViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // State
  timerState: TimerState | null = null;
  showConfig = false;

  // Enums per template
  readonly TimerStatus = TimerStatus;
  readonly TimerPhase = TimerPhase;

  constructor(private timerService: TimerService) {}

  ngOnInit(): void {
    // Subscribe al timer state
    this.timerService.timerState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.timerState = state;
      });

    // Richiedi permessi notifiche all'avvio
    this.timerService.requestNotificationPermission();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== CONTROLLI TIMER ====================

  startTimer(): void {
    this.timerService.startTimer();
  }

  pauseTimer(): void {
    this.timerService.pauseTimer();
  }

  resetTimer(): void {
    this.timerService.resetTimer();
  }

  stopTimer(): void {
    this.timerService.stopTimer();
  }

  openConfig(): void {
    this.showConfig = true;
  }

  closeConfig(): void {
    this.showConfig = false;
  }

  // ==================== CONFIGURAZIONE ====================

  onConfigSave(newConfig: TimerConfig): void {
    this.timerService.updateConfig(newConfig);
    this.showConfig = false;
  }

  // ==================== UTILITY PER TEMPLATE ====================

  formatTime(seconds: number): string {
    return this.timerService.formatTime(seconds);
  }

  getSessionProgress(): number {
    return this.timerService.getSessionProgress();
  }

  getCurrentPhaseText(): string {
    if (!this.timerState) return '';
    
    return this.timerState.currentPhase === TimerPhase.STUDY ? 'Studio' : 'Pausa';
  }

  getCycleText(): string {
    if (!this.timerState) return '';
    
    return `Ciclo ${this.timerState.currentCycle} di ${this.timerState.config.totalCycles}`;
  }

  getStatusText(): string {
    if (!this.timerState) return '';
    
    switch (this.timerState.status) {
      case TimerStatus.IDLE:
        return 'Pronto per iniziare';
      case TimerStatus.RUNNING:
        return this.timerState.currentPhase === TimerPhase.STUDY ? 'In studio...' : 'In pausa...';
      case TimerStatus.PAUSED:
        return 'In pausa';
      case TimerStatus.COMPLETED:
        return 'Sessione completata!';
      default:
        return '';
    }
  }

  isRunning(): boolean {
    return this.timerState?.status === TimerStatus.RUNNING;
  }

  isPaused(): boolean {
    return this.timerState?.status === TimerStatus.PAUSED;
  }

  isIdle(): boolean {
    return this.timerState?.status === TimerStatus.IDLE;
  }

  isCompleted(): boolean {
    return this.timerState?.status === TimerStatus.COMPLETED;
  }

  isStudyPhase(): boolean {
    return this.timerState?.currentPhase === TimerPhase.STUDY;
  }

  isBreakPhase(): boolean {
    return this.timerState?.currentPhase === TimerPhase.BREAK;
  }

  // ==================== ANIMAZIONI E STYLING ====================

  getTimerDisplayClass(): string {
    const classes = ['timer-display'];
    
    if (this.timerState) {
      classes.push(this.timerState.currentPhase === TimerPhase.STUDY ? 'study-mode' : 'break-mode');
      
      if (this.timerState.status === TimerStatus.RUNNING) {
        classes.push('running');
      }
      
      if (this.timerState.status === TimerStatus.COMPLETED) {
        classes.push('completed');
      }
    }
    
    return classes.join(' ');
  }

  getProgressBarWidth(): string {
    return `${this.getSessionProgress()}%`;
  }
}