// src/app/features/timer/services/timer.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { 
  TimerConfig, 
  TimerState, 
  TimeProposal, 
  TimerSession,
  TimerStatus,
  TimerPhase,
  DEFAULT_TIMER_CONFIG 
} from '../model/timer.interface';

@Injectable({
  providedIn: 'root'
})
export class TimerService {
  private timerSubscription?: Subscription;
  private currentSession?: TimerSession;

  // State management con BehaviorSubject
  private timerStateSubject = new BehaviorSubject<TimerState>({
    config: DEFAULT_TIMER_CONFIG,
    currentCycle: 1,
    currentPhase: TimerPhase.STUDY,
    remainingSeconds: DEFAULT_TIMER_CONFIG.studyMinutes * 60,
    status: TimerStatus.IDLE,
    totalElapsedSeconds: 0
  });

  // Observable pubblico per i componenti
  public timerState$: Observable<TimerState> = this.timerStateSubject.asObservable();

  constructor() {
    // Carica configurazione salvata (localStorage)
    this.loadSavedConfig();
  }

  // ==================== CONTROLLI TIMER ====================

  startTimer(): void {
    const currentState = this.timerStateSubject.value;
    
    if (currentState.status === TimerStatus.IDLE) {
      // Nuova sessione
      this.startNewSession();
    }

    this.updateTimerState({ status: TimerStatus.RUNNING });
    this.startCountdown();
  }

  pauseTimer(): void {
    this.stopCountdown();
    this.updateTimerState({ status: TimerStatus.PAUSED });
  }

  resetTimer(): void {
    this.stopCountdown();
    const currentState = this.timerStateSubject.value;
    const phaseSeconds = currentState.currentPhase === TimerPhase.STUDY 
      ? currentState.config.studyMinutes * 60
      : currentState.config.breakMinutes * 60;

    this.updateTimerState({
      remainingSeconds: phaseSeconds,
      status: TimerStatus.IDLE
    });
  }

  stopTimer(): void {
    this.stopCountdown();
    this.endCurrentSession(false); // Non completata
    this.resetToInitialState();
  }

  // ==================== CONFIGURAZIONE ====================

  updateConfig(newConfig: TimerConfig): void {
    this.saveConfig(newConfig);
    this.resetToInitialState(newConfig);
  }

  getCurrentConfig(): TimerConfig {
    return this.timerStateSubject.value.config;
  }

  // ==================== PROPOSTE SMART ====================

  generateTimeProposals(availableMinutes: number): TimeProposal[] {
    const proposals: TimeProposal[] = [];

    // Proposta 1: Pomodoro classico (25+5)
    if (availableMinutes >= 30) {
      const cycles = Math.floor(availableMinutes / 30);
      proposals.push({
        studyMinutes: 25,
        breakMinutes: 5,
        cycles: cycles,
        totalTime: cycles * 30,
        description: `Pomodoro classico: ${cycles} cicli da 25+5 min`,
        efficiency: 85
      });
    }

    // Proposta 2: Sessioni standard progetto (30+5)
    if (availableMinutes >= 35) {
      const cycles = Math.floor(availableMinutes / 35);
      proposals.push({
        studyMinutes: 30,
        breakMinutes: 5,
        cycles: cycles,
        totalTime: cycles * 35,
        description: `Standard: ${cycles} cicli da 30+5 min`,
        efficiency: 90
      });
    }

    // Proposta 3: Studio intensivo (45+10)
    if (availableMinutes >= 55) {
      const cycles = Math.floor(availableMinutes / 55);
      proposals.push({
        studyMinutes: 45,
        breakMinutes: 10,
        cycles: cycles,
        totalTime: cycles * 55,
        description: `Intensivo: ${cycles} cicli da 45+10 min`,
        efficiency: 80
      });
    }

    // Proposta 4: Ottimizzata per tempo disponibile
    if (availableMinutes >= 20 && proposals.length === 0) {
      const optimalStudy = Math.floor(availableMinutes * 0.85);
      const optimalBreak = Math.floor(availableMinutes * 0.15);
      proposals.push({
        studyMinutes: optimalStudy,
        breakMinutes: optimalBreak,
        cycles: 1,
        totalTime: availableMinutes,
        description: `Ottimizzato: ${optimalStudy}+${optimalBreak} min`,
        efficiency: 75
      });
    }

    // Ordina per efficienza decrescente
    return proposals.sort((a, b) => b.efficiency - a.efficiency);
  }

  // ==================== METODI PRIVATI ====================

  private startCountdown(): void {
    this.timerSubscription = interval(1000).subscribe(() => {
      const currentState = this.timerStateSubject.value;
      
      if (currentState.remainingSeconds > 0) {
        // Continua countdown
        this.updateTimerState({
          remainingSeconds: currentState.remainingSeconds - 1,
          totalElapsedSeconds: currentState.totalElapsedSeconds + 1
        });
      } else {
        // Fase completata
        this.onPhaseCompleted();
      }
    });
  }

  private stopCountdown(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = undefined;
    }
  }

  private onPhaseCompleted(): void {
    const currentState = this.timerStateSubject.value;
    
    if (currentState.currentPhase === TimerPhase.STUDY) {
      // Studio completato → Pausa
      this.startBreakPhase();
    } else {
      // Pausa completata → Prossimo ciclo o fine
      this.completeCurrentCycle();
    }
    
    // Notifica cambio fase
    this.notifyPhaseChange();
  }

  private startBreakPhase(): void {
    const currentState = this.timerStateSubject.value;
    this.updateTimerState({
      currentPhase: TimerPhase.BREAK,
      remainingSeconds: currentState.config.breakMinutes * 60
    });
  }

  private completeCurrentCycle(): void {
    const currentState = this.timerStateSubject.value;
    
    if (currentState.currentCycle >= currentState.config.totalCycles) {
      // Sessione completata!
      this.completeSession();
    } else {
      // Prossimo ciclo
      this.startNextCycle();
    }
  }

  private startNextCycle(): void {
    const currentState = this.timerStateSubject.value;
    this.updateTimerState({
      currentCycle: currentState.currentCycle + 1,
      currentPhase: TimerPhase.STUDY,
      remainingSeconds: currentState.config.studyMinutes * 60
    });
  }

  private completeSession(): void {
    this.stopCountdown();
    this.endCurrentSession(true); // Completata con successo
    this.updateTimerState({ status: TimerStatus.COMPLETED });
    
    // Notifica completamento
    this.notifySessionComplete();
  }

  private resetToInitialState(config?: TimerConfig): void {
    const newConfig = config || this.timerStateSubject.value.config;
    
    this.updateTimerState({
      config: newConfig,
      currentCycle: 1,
      currentPhase: TimerPhase.STUDY,
      remainingSeconds: newConfig.studyMinutes * 60,
      status: TimerStatus.IDLE,
      totalElapsedSeconds: 0
    });
  }

  private updateTimerState(updates: Partial<TimerState>): void {
    const currentState = this.timerStateSubject.value;
    this.timerStateSubject.next({ ...currentState, ...updates });
  }

  // ==================== SESSIONI E PERSISTENZA ====================

  private startNewSession(): void {
    const currentState = this.timerStateSubject.value;
    this.currentSession = {
      id: this.generateSessionId(),
      startTime: new Date(),
      config: { ...currentState.config },
      completedCycles: 0,
      totalStudyTime: 0,
      wasCompleted: false
    };
  }

  private endCurrentSession(completed: boolean): void {
    if (this.currentSession) {
      const currentState = this.timerStateSubject.value;
      this.currentSession.endTime = new Date();
      this.currentSession.completedCycles = completed ? currentState.config.totalCycles : currentState.currentCycle - 1;
      this.currentSession.wasCompleted = completed;
      this.currentSession.totalStudyTime = this.calculateStudyTime();
      
      // Qui potresti salvare la sessione (localStorage o backend)
      this.saveSession(this.currentSession);
      this.currentSession = undefined;
    }
  }

  private calculateStudyTime(): number {
    const currentState = this.timerStateSubject.value;
    const completedCycles = currentState.currentCycle - 1;
    const studySecondsPerCycle = currentState.config.studyMinutes * 60;
    
    let totalStudyTime = completedCycles * studySecondsPerCycle;
    
    // Aggiungi tempo della fase corrente se è studio
    if (currentState.currentPhase === TimerPhase.STUDY) {
      const currentPhaseElapsed = (currentState.config.studyMinutes * 60) - currentState.remainingSeconds;
      totalStudyTime += currentPhaseElapsed;
    }
    
    return totalStudyTime;
  }

  private saveConfig(config: TimerConfig): void {
    localStorage.setItem('timer-config', JSON.stringify(config));
  }

  private loadSavedConfig(): void {
    const saved = localStorage.getItem('timer-config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        this.resetToInitialState(config);
      } catch (e) {
        console.warn('Impossibile caricare configurazione salvata');
      }
    }
  }

  private saveSession(session: TimerSession): void {
    // Per ora salviamo in localStorage, poi potremo integrare con backend
    const sessions = this.getSavedSessions();
    sessions.push(session);
    localStorage.setItem('timer-sessions', JSON.stringify(sessions));
  }

  private getSavedSessions(): TimerSession[] {
    const saved = localStorage.getItem('timer-sessions');
    return saved ? JSON.parse(saved) : [];
  }

  private generateSessionId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // ==================== NOTIFICHE ====================

  private notifyPhaseChange(): void {
    const currentState = this.timerStateSubject.value;
    const message = currentState.currentPhase === TimerPhase.BREAK 
      ? '🎉 Tempo di pausa!' 
      : '📚 Torniamo a studiare!';
    
    // Browser notification (se permesso)
    if (Notification.permission === 'granted') {
      new Notification('Timer SELFIE', { body: message });
    }
    
    console.log(message); // Per debugging
  }

  private notifySessionComplete(): void {
    const message = '🎊 Sessione completata! Ottimo lavoro!';
    
    if (Notification.permission === 'granted') {
      new Notification('Timer SELFIE', { body: message });
    }
    
    console.log(message);
  }

  // ==================== UTILITY PUBBLICHE ====================

  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getSessionProgress(): number {
    const currentState = this.timerStateSubject.value;
    const totalCycles = currentState.config.totalCycles;
    const currentCycle = currentState.currentCycle;
    const phaseProgress = currentState.currentPhase === TimerPhase.STUDY 
      ? this.getPhaseProgress()
      : 1; // Pausa considerata completata per il calcolo
    
    return ((currentCycle - 1) + phaseProgress) / totalCycles * 100;
  }

  private getPhaseProgress(): number {
    const currentState = this.timerStateSubject.value;
    const totalSeconds = currentState.currentPhase === TimerPhase.STUDY
      ? currentState.config.studyMinutes * 60
      : currentState.config.breakMinutes * 60;
    
    return (totalSeconds - currentState.remainingSeconds) / totalSeconds;
  }
}