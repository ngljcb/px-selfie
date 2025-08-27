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
  totalTime: number; 
  description: string;
  efficiency: number; 
}

export interface TimerSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  config: TimerConfig;
  completedCycles: number;
  totalStudyTime: number; 
  wasCompleted: boolean;
}
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
  totalTime: number; 
  studyTime: number; 
  breakTime: number; 
  details: string;
}

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

export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  studyMinutes: 30,
  breakMinutes: 5,
  totalCycles: 5
};