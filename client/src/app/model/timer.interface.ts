// src/app/features/timer/models/timer.models.ts

export interface TimerConfig {
  studyMinutes: number;
  breakMinutes: number;
  totalCycles: number;
}

export interface TimerState {
  config: TimerConfig;
  currentCycle: number;
  currentPhase: 'study' | 'break';
  remainingSeconds: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
  totalElapsedSeconds: number;
  canRestart?: boolean; 
}

export interface TimeProposal {
  studyMinutes: number;
  breakMinutes: number;
  cycles: number;
  totalTime: number; // in minutes
  description: string;
  efficiency: number; // 0-100, per ordinare le proposte
}

export interface TimerSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  config: TimerConfig;
  completedCycles: number;
  totalStudyTime: number; // seconds
  wasCompleted: boolean;
}

// Interfaccia per le notifiche
export interface TimerNotification {
  id: string;
  message: string;
  type: 'study-complete' | 'break-complete' | 'session-complete' | 'phase-skipped';
  timestamp: Date;
}

export interface ConfigProposal {
  id: number;
  name: string;
  studyMinutes: number;
  breakMinutes: number;
  totalCycles: number;
  totalTime: number; // in minutes
  studyTime: number; // total study time
  breakTime: number; // total break time
  details: string;
}

// Enums per maggiore type safety
export enum TimerStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed'
}

export enum TimerPhase {
  STUDY = 'study',
  BREAK = 'break'
}

// Configurazione di default
export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  studyMinutes: 30,
  breakMinutes: 5,
  totalCycles: 5
};