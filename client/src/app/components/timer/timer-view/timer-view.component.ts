import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TimerConfigComponent } from '../timer-config/timer-config.component';
import { TimerStatsComponent } from '../timer-stats/timer-stats.component';
import { TimerService } from '../../../service/timer.service';
import { 
  TimerState, 
  TimerConfig, 
  TimerStatus, 
  TimerPhase,
  TimerNotification,
} from '../../../model/timer.interface';
import { StatisticsService } from '../../../service/statistics.service';

@Component({
  selector: 'app-timer-view',
  standalone: true,
  imports: [CommonModule, TimerConfigComponent, TimerStatsComponent],
  templateUrl: './timer-view.component.html',
  styleUrls: ['./timer-view.component.scss']
})
export class TimerViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  timerState: TimerState | null = null;
  showConfig = false;
  
  notifications: TimerNotification[] = [];
  
  private sessionCompleted = false;
  
  Math = Math; 

  readonly TimerStatus = TimerStatus;
  readonly TimerPhase = TimerPhase;

  constructor(
    private timerService: TimerService,
    private statisticsService: StatisticsService
  ) {}

  ngOnInit(): void {

    this.timerService.timerState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        const previousState = this.timerState;
        this.timerState = state;
        
        this.checkForPhaseTransition(previousState, state);
      });
    
    this.initializeAudioOnFirstInteraction();

    this.checkLoginStreak();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkLoginStreak(): void {
    this.statisticsService.checkLoginStreak()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (streakInfo) => {
          console.log('Login streak checked:', streakInfo);
          if (streakInfo.streakWasReset) {
            this.showNotification(
              `Il tuo streak è stato resettato.`, 
              'phase-skipped'
            );
          } else if (streakInfo.canIncrementStreak) {
            this.showNotification(
              `Completa una sessione per continuare il tuo streak.`, 
              'phase-skipped'
            );
          }
        },
        error: (error) => {
          console.error('Errore nel controllo login streak:', error);
        }
      });
  }

  private checkForPhaseTransition(previousState: TimerState | null, currentState: TimerState): void {
    if (!previousState) return;

    if (previousState.status !== TimerStatus.COMPLETED && 
        currentState.status === TimerStatus.COMPLETED) {
      
      this.sessionCompleted = true;
      
      this.updateSessionStatistics(currentState);
      return; 
    }

    if (previousState.status === TimerStatus.RUNNING && 
        previousState.remainingSeconds > 0 &&
        currentState.remainingSeconds === 0 &&
        currentState.status === TimerStatus.RUNNING) {
      
      if (currentState.currentPhase === TimerPhase.BREAK && 
          currentState.currentCycle >= currentState.config.totalCycles) {

        return; 
      }
      
      this.timerService.pauseTimer();
      
      if (currentState.currentPhase === TimerPhase.STUDY && currentState.config.breakMinutes === 0) {
        this.showNotification('Tempo di pausa!', 'study-complete');
      } else {
        this.showNotification('Torniamo a studiare!', 'break-complete');
      }
    }
  }

  private updateSessionStatistics(timerState: TimerState): void {

    const studyTimePerCycle = timerState.config.studyMinutes;
    const completedCycles = timerState.config.totalCycles;
    const totalStudyMinutes = completedCycles * studyTimePerCycle;

    this.statisticsService.updateSessionStats(totalStudyMinutes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedStats) => {
          console.log('Statistiche aggiornate:', updatedStats);
        },
        error: (error) => {
          console.error('Errore nell\'aggiornamento delle statistiche:', error);
        }
      });
  }

  private showNotification(message: string, type: TimerNotification['type']): void {
    const notification: TimerNotification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date()
    };

    this.notifications.unshift(notification);

    setTimeout(() => {
      this.dismissNotification(notification.id);
    }, 4000);
  }

  dismissNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
  }

  dismissAllNotifications(): void {
    this.notifications = [];
  }

  private initializeAudioOnFirstInteraction(): void {

    const enableAudio = () => {
      if (this.timerService.isAudioEnabled()) {
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('keydown', enableAudio);
      }
    };

    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });
  }

  startTimer(): void {
    this.timerService.startTimer();
  }

  pauseTimer(): void {
    this.timerService.pauseTimer();
  }

  resetTimer(): void {
    this.sessionCompleted = false;
    this.timerService.resetTimer();
  }

  stopTimer(): void {

    this.sessionCompleted = false;
    this.timerService.stopTimer();
  }

  skipCurrentPhase(): void {
    const currentState = this.timerState;
    
    if (currentState && currentState.status === TimerStatus.RUNNING) {
      const skippedPhase = currentState.currentPhase === TimerPhase.STUDY ? 'studio' : 'pausa';
      
      if (currentState.currentPhase === TimerPhase.BREAK && 
          currentState.currentCycle >= currentState.config.totalCycles) {

        this.timerService.skipCurrentPhase(); 
        return;
      }
      
      this.showNotification(`Fase di ${skippedPhase} saltata!`, 'phase-skipped');

      this.timerService.skipCurrentPhase();

      setTimeout(() => {
        this.timerService.pauseTimer();
      }, 100);
    }
  }

  openConfig(): void {
    this.showConfig = true;
  }

  closeConfig(): void {
    this.showConfig = false;
  }

  startNewSession(): void {
    this.sessionCompleted = false;
    
    this.timerService.resetTimer();

    setTimeout(() => {

      if (this.timerState?.status !== TimerStatus.IDLE || 
          this.timerState?.currentPhase !== TimerPhase.STUDY ||
          this.timerState?.currentCycle !== 1) {
        this.timerService.resetTimer();
      }
    }, 100);
  }

  onConfigSave(newConfig: TimerConfig): void {
    this.timerService.updateConfig(newConfig);
    this.showConfig = false;
  }

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
    
    return `Cycle ${this.timerState.currentCycle} of ${this.timerState.config.totalCycles}`;
  }

  getStatusText(): string {
    if (!this.timerState) return '';
    
    switch (this.timerState.status) {
      case TimerStatus.IDLE:
        return 'Pronto per iniziare';
      case TimerStatus.RUNNING:
        return this.timerState.currentPhase === TimerPhase.STUDY ? 'Studying...' : 'Resting...';
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

  canRestart(): boolean {
    return this.timerState?.canRestart ?? true;
  }

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

  getDisplayTime(): number {
    if (this.sessionCompleted && this.isCompleted()) {
      return 0; 
    }
    return this.timerState?.remainingSeconds || 0;
  }

  getTotalEffectiveTime(): number {
    if (!this.timerState) return 0;

    if (this.timerState.status === TimerStatus.COMPLETED) {

      const completedCycles = this.timerState.config.totalCycles;
      const studyTimePerCycle = this.timerState.config.studyMinutes * 60;
      const breakTimePerCycle = this.timerState.config.breakMinutes * 60;

      const totalStudyTime = completedCycles * studyTimePerCycle;
      const totalBreakTime = Math.max(0, completedCycles) * breakTimePerCycle;
      
      return totalStudyTime + totalBreakTime;
    }
    
    return this.timerState.totalElapsedSeconds;
  }

  get safeTimerState(): TimerState {
    return this.timerState || {
      config: { studyMinutes: 30, breakMinutes: 5, totalCycles: 5 },
      currentCycle: 1,
      currentPhase: TimerPhase.STUDY,
      remainingSeconds: 1800,
      status: TimerStatus.IDLE,
      totalElapsedSeconds: 0,
      canRestart: true
    };
  }

  isAudioEnabled(): boolean {
    return this.timerService.isAudioEnabled();
  }
}