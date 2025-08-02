// src/app/features/timer/timer-view/timer-view.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TimerConfigComponent } from '../timer-config/timer-config.component';
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
  standalone: true,
  imports: [CommonModule, TimerConfigComponent],
  templateUrl: './timer-view.component.html',
  styleUrls: ['./timer-view.component.scss']
})
export class TimerViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // State
  timerState: TimerState | null = null;
  showConfig = false;

  // Utility per template
  Math = Math; // Per usare Math.round nel template

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
    
    // Inizializza AudioContext con la prima interazione utente
    this.initializeAudioOnFirstInteraction();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.timerService.skipCurrentPhase();
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
      totalElapsedSeconds: 0
    };
  }

  // ==================== INFO AUDIO STATUS ====================

  isAudioEnabled(): boolean {
    return this.timerService.isAudioEnabled();
  }
}