// src/app/features/timer/timer-view/timer-view.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TimerConfigComponent } from '../timer-config/timer-config.component';
import { TimerStatsComponent } from '../timer-stats/timer-stats.component';
import { 
  TimerService 
} from '../../service/timer.service';
import { 
  TimerState, 
  TimerConfig, 
  TimerStatus, 
  TimerPhase 
} from '../../model/timer.interface';
import { StatisticsService } from '../../service/statistics.service'; // NUOVO

// Interfaccia per le notifiche
interface TimerNotification {
  id: string;
  message: string;
  type: 'study-complete' | 'break-complete' | 'session-complete' | 'phase-skipped';
  timestamp: Date;
}

@Component({
  selector: 'app-timer-view',
  standalone: true,
  imports: [CommonModule, TimerConfigComponent, TimerStatsComponent],
  templateUrl: './timer-view.component.html',
  styleUrls: ['./timer-view.component.scss']
})
export class TimerViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // State
  timerState: TimerState | null = null;
  showConfig = false;
  
  // Notifiche
  notifications: TimerNotification[] = [];
  
  // Utility per template
  Math = Math; // Per usare Math.round nel template

  // Enums per template
  readonly TimerStatus = TimerStatus;
  readonly TimerPhase = TimerPhase;

  constructor(
    private timerService: TimerService,
    private statisticsService: StatisticsService // NUOVO
  ) {}

  ngOnInit(): void {
    // Subscribe al timer state
    this.timerService.timerState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        const previousState = this.timerState;
        this.timerState = state;
        
        // Controlla se c'è stata una transizione di fase o fine timer
        this.checkForPhaseTransition(previousState, state);
      });

    // Richiedi permessi notifiche all'avvio
    this.timerService.requestNotificationPermission();
    
    // Inizializza AudioContext con la prima interazione utente
    this.initializeAudioOnFirstInteraction();

    // NUOVO: Controlla il login streak all'avvio
    this.checkLoginStreak();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // NUOVO: Controlla il login streak
  private checkLoginStreak(): void {
    this.statisticsService.checkLoginStreak()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (streakInfo) => {
          console.log('Login streak checked:', streakInfo);
          if (streakInfo.streakWasReset) {
            this.showNotification(
              `📅 Nuovo giorno di studio! Il tuo streak è stato resettato.`, 
              'phase-skipped'
            );
          } else if (streakInfo.canIncrementStreak) {
            this.showNotification(
              `🔥 Nuovo giorno! Completa una sessione per continuare il tuo streak.`, 
              'phase-skipped'
            );
          }
        },
        error: (error) => {
          console.error('Errore nel controllo login streak:', error);
        }
      });
  }

  // ==================== GESTIONE NOTIFICHE ====================

  private checkForPhaseTransition(previousState: TimerState | null, currentState: TimerState): void {
    if (!previousState) return;

    // Controlla se la sessione è stata completata PRIMA di tutto
    if (previousState.status !== TimerStatus.COMPLETED && 
        currentState.status === TimerStatus.COMPLETED) {
      
      // NUOVO: Aggiorna le statistiche quando la sessione è completata
      this.updateSessionStatistics(currentState);
      
      this.showNotification('🎊 Sessione completata! Ottimo lavoro!', 'session-complete');
      return; // Esci subito, non fare altre operazioni
    }

    // Controlla se una fase è appena terminata (timer arriva a 0 mentre era in running)
    if (previousState.status === TimerStatus.RUNNING && 
        previousState.remainingSeconds > 0 &&
        currentState.remainingSeconds === 0 &&
        currentState.status === TimerStatus.RUNNING) {
      
      // Verifica se siamo nell'ultima pausa dell'ultimo ciclo
      if (currentState.currentPhase === TimerPhase.BREAK && 
          currentState.currentCycle >= currentState.config.totalCycles) {
        // Sessione completata - non pausare, lascia che vada a COMPLETED
        return; // Non fare nulla, lascia che il timer completi naturalmente
      }
      
      // Pausa immediatamente il timer per tutte le altre fasi
      this.timerService.pauseTimer();
      
      // Mostra notifica appropriata
      if (currentState.currentPhase === TimerPhase.STUDY) {
        this.showNotification('🎉 Tempo di pausa! Premi "Riprendi" quando sei pronto.', 'study-complete');
      } else {
        this.showNotification('📚 Torniamo a studiare! Premi "Riprendi" quando sei pronto.', 'break-complete');
      }
    }
  }

  // NUOVO: Aggiorna le statistiche quando una sessione è completata
  private updateSessionStatistics(timerState: TimerState): void {
    // Calcola il tempo totale di studio effettivo (solo fasi di studio, non pause)
    const studyTimePerCycle = timerState.config.studyMinutes;
    const completedCycles = timerState.config.totalCycles;
    const totalStudyMinutes = completedCycles * studyTimePerCycle;

    this.statisticsService.updateSessionStats(totalStudyMinutes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedStats) => {
          console.log('Statistiche aggiornate:', updatedStats);
          this.showNotification(
            `📊 Statistiche aggiornate! Sessioni: ${updatedStats.totalCompletedSessions}, Tempo totale: ${updatedStats.totalStudyTimeFormatted}`, 
            'session-complete'
          );
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

    // Rimuovi automaticamente la notifica dopo 4 secondi
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

  // ==================== INIZIALIZZAZIONE AUDIO ====================

  private initializeAudioOnFirstInteraction(): void {
    // AudioContext richiede interazione utente per essere attivato
    const enableAudio = () => {
      // Riprova ad attivare l'audio context con la prima interazione
      if (this.timerService.isAudioEnabled()) {
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('keydown', enableAudio);
      }
    };

    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('keydown', enableAudio, { once: true });
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

  skipCurrentPhase(): void {
    const currentState = this.timerState;
    
    // Mostra notifica per il salto
    if (currentState && currentState.status === TimerStatus.RUNNING) {
      const skippedPhase = currentState.currentPhase === TimerPhase.STUDY ? 'studio' : 'pausa';
      
      // Verifica se siamo nell'ultima pausa dell'ultimo ciclo
      if (currentState.currentPhase === TimerPhase.BREAK && 
          currentState.currentCycle >= currentState.config.totalCycles) {
        // Ultima pausa saltata = sessione completata
        this.showNotification('🎊 Sessione completata! Ottimo lavoro!', 'session-complete');
        this.timerService.skipCurrentPhase(); // Questo dovrebbe portare a COMPLETED
        return;
      }
      
      this.showNotification(`⏭️ Fase di ${skippedPhase} saltata!`, 'phase-skipped');
      
      // Prima salta la fase, poi pausa
      this.timerService.skipCurrentPhase();
      
      // Pausa il timer dopo lo skip (solo se non è l'ultima pausa)
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

  // ==================== CONTROLLO SPECIFICO PER NUOVA SESSIONE ====================

  startNewSession(): void {
    // Forza il reset completo del timer allo stato iniziale
    this.timerService.resetTimer();
    // Assicurati che il timer torni allo stato IDLE con fase STUDY
    setTimeout(() => {
      // Se necessario, fai un secondo reset per assicurarti che tutto torni allo stato iniziale
      if (this.timerState?.status !== TimerStatus.IDLE || 
          this.timerState?.currentPhase !== TimerPhase.STUDY ||
          this.timerState?.currentCycle !== 1) {
        this.timerService.resetTimer();
      }
    }, 100);
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

  // ==================== NUOVO METODO PER GESTIRE LA DISPONIBILITÀ DEL BOTTONE RICOMINCIA ====================

  canRestart(): boolean {
    return this.timerState?.canRestart ?? true;
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

  // ==================== METODO PER CALCOLARE IL TEMPO TOTALE EFFETTIVO ====================

  getTotalEffectiveTime(): number {
    if (!this.timerState) return 0;
    
    // Se la sessione è completata, mostra solo il tempo effettivamente trascorso
    if (this.timerState.status === TimerStatus.COMPLETED) {
      // Calcola il tempo totale basandosi sui cicli completati
      const completedCycles = this.timerState.config.totalCycles;
      const studyTimePerCycle = this.timerState.config.studyMinutes * 60;
      const breakTimePerCycle = this.timerState.config.breakMinutes * 60;
      
      // Tempo totale = (cicli completati * tempo studio) + ((cicli completati - 1) * tempo pausa)
      // L'ultimo ciclo non ha pausa
      const totalStudyTime = completedCycles * studyTimePerCycle;
      const totalBreakTime = Math.max(0, completedCycles) * breakTimePerCycle;
      
      return totalStudyTime + totalBreakTime;
    }
    
    // Se non è completata, usa il tempo elapsed normale
    return this.timerState.totalElapsedSeconds;
  }

  // ==================== SAFE GETTERS PER TEMPLATE ====================

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

  // ==================== INFO AUDIO STATUS ====================

  isAudioEnabled(): boolean {
    return this.timerService.isAudioEnabled();
  }
}