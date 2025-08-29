import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { AudioService } from './audio.service';
import { StatisticsService } from './statistics.service';
import { 
  TimerConfig, 
  TimerState, 
  TimeProposal, 
  TimerSession,
  DEFAULT_TIMER_CONFIG 
} from '../model/timer.interface';

@Injectable({
  providedIn: 'root'
})
export class TimerService {
  private timerSubscription?: Subscription;
  private currentSession?: TimerSession;

  private timerStateSubject = new BehaviorSubject<TimerState>({
    config: DEFAULT_TIMER_CONFIG,
    currentCycle: 1,
    currentPhase: 'study',
    remainingSeconds: DEFAULT_TIMER_CONFIG.studyMinutes * 60,
    status: 'idle',
    totalElapsedSeconds: 0,
    canRestart: true
  });

  public timerState$: Observable<TimerState> = this.timerStateSubject.asObservable();

  constructor(
    private audioService: AudioService,
    private statisticsService: StatisticsService
  ) {
    this.loadSavedConfig();

    this.statisticsService.refreshStatistics().subscribe({
      next: () => console.log('Statistiche iniziali caricate'),
      error: (error) => console.error('Errore caricamento statistiche iniziali:', error)
    });
  }

  startTimer(): void {
    const currentState = this.timerStateSubject.value;
    
    if (currentState.status === 'idle') {
      this.startNewSession();
    }

    this.updateTimerState({ 
      status: 'running',
      canRestart: true
    });
    this.startCountdown();
  }

  pauseTimer(): void {
    this.stopCountdown();
    this.updateTimerState({ status: 'paused' });
  }

  resetTimer(): void {
    this.stopCountdown();
    const currentState = this.timerStateSubject.value;

    const studySeconds = currentState.config.studyMinutes * 60;

    const completedCycles = currentState.currentCycle - 1;
    const studySecondsPerCycle = currentState.config.studyMinutes * 60;
    const breakSecondsPerCycle = currentState.config.breakMinutes * 60;
    const secondsPerCompleteCycle = studySecondsPerCycle + breakSecondsPerCycle;

    const elapsedUntilCurrentCycle = completedCycles * secondsPerCompleteCycle;

    const newStatus = currentState.status === 'idle' ? 'idle' : 'paused';

    this.updateTimerState({
      currentPhase: 'study', 
      remainingSeconds: studySeconds,
      status: newStatus,
      totalElapsedSeconds: elapsedUntilCurrentCycle,
      canRestart: false
    });
  }

  stopTimer(): void {
    this.stopCountdown();
    this.endCurrentSession(false); 
    this.resetToInitialState();
  }

  skipCurrentPhase(): void {
    const currentState = this.timerStateSubject.value;

    if (currentState.status !== 'running') {
      return;
    }

    this.stopCountdown();
    
    if (currentState.currentPhase === 'study') {
      const elapsedStudyTime = (currentState.config.studyMinutes * 60) - currentState.remainingSeconds;
      this.updateTimerState({
        totalElapsedSeconds: currentState.totalElapsedSeconds + elapsedStudyTime
      });
    }
    
    this.onPhaseCompleted();

    this.notifyPhaseSkipped(currentState.currentPhase);

    this.startCountdown();
  }

  updateConfig(newConfig: TimerConfig): void {
    this.saveConfig(newConfig);
    this.resetToInitialState(newConfig);
  }

  getCurrentConfig(): TimerConfig {
    return this.timerStateSubject.value.config;
  }

  generateTimeProposals(availableMinutes: number): TimeProposal[] {
    const proposals: TimeProposal[] = [];

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

    return proposals.sort((a, b) => b.efficiency - a.efficiency);
  }

  private startCountdown(): void {
    this.timerSubscription = interval(1000).subscribe(() => {
      const currentState = this.timerStateSubject.value;
      
      if (currentState.remainingSeconds > 0) {
        this.updateTimerState({
          remainingSeconds: currentState.remainingSeconds - 1,
          totalElapsedSeconds: currentState.totalElapsedSeconds + 1
        });
      } else {
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
    
    if (currentState.currentPhase === 'study') {
      this.startBreakPhase();
      this.notifyStudyPhaseComplete();
    } else {
      this.completeCurrentCycle();
      this.notifyBreakPhaseComplete();
    }
  }

  private startBreakPhase(): void {
    const currentState = this.timerStateSubject.value;
    this.updateTimerState({
      currentPhase: 'break',
      remainingSeconds: currentState.config.breakMinutes * 60
    });
  }

  private completeCurrentCycle(): void {
    const currentState = this.timerStateSubject.value;
    
    if (currentState.currentCycle >= currentState.config.totalCycles) {
      this.completeSession();
    } else {
      this.startNextCycle();
    }
  }

  private startNextCycle(): void {
    const currentState = this.timerStateSubject.value;
    this.updateTimerState({
      currentCycle: currentState.currentCycle + 1,
      currentPhase: 'study',
      remainingSeconds: currentState.config.studyMinutes * 60
    });
  }

  private completeSession(): void {
    this.stopCountdown();

    this.updateStatisticsOnCompletion();
    
    this.endCurrentSession(true);
    this.updateTimerState({ status: 'completed' });
  }

  private resetToInitialState(config?: TimerConfig): void {
    const newConfig = config || this.timerStateSubject.value.config;
    
    this.updateTimerState({
      config: newConfig,
      currentCycle: 1,
      currentPhase: 'study',
      remainingSeconds: newConfig.studyMinutes * 60,
      status: 'idle',
      totalElapsedSeconds: 0,
      canRestart: true
    });
  }

  private updateTimerState(updates: Partial<TimerState>): void {
    const currentState = this.timerStateSubject.value;
    this.timerStateSubject.next({ ...currentState, ...updates });
  }

  private updateStatisticsOnCompletion(): void {

    if (this.statisticsUpdateInProgress) {
      console.log('Aggiornamento statistiche già in corso, skipping...');
      return;
    }
    
    this.statisticsUpdateInProgress = true;

    if (!this.currentSession) {
      console.warn('Nessuna sessione corrente trovata, calcolo manuale dei minuti di studio');

      const currentState = this.timerStateSubject.value;
      const totalStudySeconds = this.calculateStudyTimeFromState(currentState);
      const studyTimeMinutes = Math.floor(totalStudySeconds / 60);
      
      if (studyTimeMinutes > 0) {
        this.updateStatsWithMinutes(studyTimeMinutes);
      } else {
        console.warn('Nessun tempo di studio valido da registrare');
        this.statisticsUpdateInProgress = false;
      }
      return;
    }

    this.currentSession.totalStudyTime = this.calculateStudyTime();

    const studyTimeMinutes = Math.floor(this.currentSession.totalStudyTime / 60);
    
    console.log('Sessione completata:', {
      id: this.currentSession.id,
      totalStudySeconds: this.currentSession.totalStudyTime,
      studyTimeMinutes
    });
    
    if (studyTimeMinutes > 0) {
      this.updateStatsWithMinutes(studyTimeMinutes);
    } else {
      this.statisticsUpdateInProgress = false;
    }
  }

  private statisticsUpdateInProgress = false;

  private updateStatsWithMinutes(studyTimeMinutes: number): void {
    this.statisticsService.updateSessionStats(studyTimeMinutes)
      .subscribe({
        next: (updatedStats) => {
          console.log('Statistiche aggiornate con successo:', updatedStats);
          this.statisticsUpdateInProgress = false; 
        },
        error: (error) => {
          console.error('Errore nell\'aggiornamento delle statistiche:', error);
          this.statisticsUpdateInProgress = false;
        }
      });
  }

  private calculateStudyTimeFromState(state: TimerState): number {
    const completedCycles = state.currentCycle - 1;
    const studySecondsPerCycle = state.config.studyMinutes * 60;

    let totalStudyTime = completedCycles * studySecondsPerCycle;

    if (state.status === 'completed' || state.currentPhase === 'break') {
      totalStudyTime += studySecondsPerCycle;
    }
    
    return totalStudyTime;
  }

  public checkLoginStreak(): void {
    this.statisticsService.checkLoginStreak()
      .subscribe({
        next: (streakInfo) => {
          console.log('Controllo streak completato:', streakInfo);
          if (streakInfo.streakWasReset) {
            console.log('Streak resettato a causa di inattività');
          }
        },
        error: (error) => {
          console.error('Errore nel controllo dello streak:', error);
        }
      });
  }

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
    
    console.log('Nuova sessione avviata:', this.currentSession.id);
  }

  private endCurrentSession(completed: boolean): void {
    if (this.currentSession) {
      const currentState = this.timerStateSubject.value;
      this.currentSession.endTime = new Date();
      this.currentSession.completedCycles = completed ? currentState.config.totalCycles : currentState.currentCycle - 1;
      this.currentSession.wasCompleted = completed;
      this.currentSession.totalStudyTime = this.calculateStudyTime();
      
      console.log('Sessione terminata:', {
        id: this.currentSession.id,
        completed,
        totalStudyTime: this.currentSession.totalStudyTime
      });

      this.currentSession = undefined;
    }
  }

  private calculateStudyTime(): number {
    const currentState = this.timerStateSubject.value;
    const completedCycles = currentState.currentCycle - 1;
    const studySecondsPerCycle = currentState.config.studyMinutes * 60;
    
    let totalStudyTime = completedCycles * studySecondsPerCycle;

    if (currentState.currentPhase === 'study') {
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

  private generateSessionId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private notifyStudyPhaseComplete(): void {
    const message = 'Tempo di pausa!';
    
    this.audioService.playStudyCompleteSound();

    if (Notification.permission === 'granted') {
      new Notification('Timer SELFIE', { 
        body: message,
        icon: '/assets/icons/timer-icon.png'
      });
    }
  }

  private notifyBreakPhaseComplete(): void {
    const message = 'Torniamo a studiare!';
    
    this.audioService.playBreakCompleteSound();

    if (Notification.permission === 'granted') {
      new Notification('Timer SELFIE', { 
        body: message,
        icon: '/assets/icons/timer-icon.png'
      });
    }
  }

  private notifyPhaseSkipped(skippedPhase: 'study' | 'break'): void {
    const message = skippedPhase === 'study' 
      ? 'Fase di studio saltata!' 
      : 'Pausa saltata!';
    
    this.audioService.playPhaseSkippedSound();

    if (Notification.permission === 'granted') {
      new Notification('Timer SELFIE', { 
        body: message,
        icon: '/assets/icons/timer-icon.png'
      });
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getSessionProgress(): number {
    const currentState = this.timerStateSubject.value;
    const config = currentState.config;
    
    const studySecondsPerCycle = config.studyMinutes * 60;
    const breakSecondsPerCycle = config.breakMinutes * 60;
    const secondsPerCompleteCycle = studySecondsPerCycle + breakSecondsPerCycle;
    
    const totalSessionSeconds = config.totalCycles * secondsPerCompleteCycle;
    
    let elapsedSeconds = 0;
    
    const completedCycles = currentState.currentCycle - 1;
    elapsedSeconds += completedCycles * secondsPerCompleteCycle;
    
    if (currentState.currentPhase === 'study') {
      const currentStudyElapsed = studySecondsPerCycle - currentState.remainingSeconds;
      elapsedSeconds += currentStudyElapsed;
    } else {
      elapsedSeconds += studySecondsPerCycle;
      const currentBreakElapsed = breakSecondsPerCycle - currentState.remainingSeconds;
      elapsedSeconds += currentBreakElapsed;
    }
    
    const progress = (elapsedSeconds / totalSessionSeconds) * 100;
    
    return Math.min(100, Math.max(0, progress));
  }

  enableAudio(enabled: boolean): void {
    this.audioService.setEnabled(enabled);
  }

  isAudioEnabled(): boolean {
    return this.audioService.isAudioEnabled();
  }
}