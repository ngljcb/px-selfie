// src/app/features/timer/models/statistics.interface.ts

export interface UserStatistics {
  user_id: string;
  total_completed_sessions: number;
  total_study_time_minutes: number;
  consecutive_study_days: number;
}

// DTO per aggiornare le statistiche quando una sessione viene completata
export interface UpdateSessionStatsDTO {
  study_time_minutes: number; // Durata in minuti della sessione completata
}

// DTO per risposta API delle statistiche formattate per il frontend
export interface StatisticsResponse {
  totalCompletedSessions: number;
  totalStudyTimeMinutes: number;
  totalStudyTimeFormatted: string; // es. "2h 30m" 
  consecutiveStudyDays: number;
  // Campi calcolati per migliore UX
  averageDailyMinutes?: number; // Media calcolata su ultimi 30 giorni
  todayStudyMinutes?: number; // Studio di oggi (se disponibile)
}

// DTO per controllo streak al login
export interface LoginStreakCheckDTO {
  logDay: string; // Data dell'ultimo login (formato YYYY-MM-DD)
  canIncrementStreak: boolean; // Flag per permettere incremento streak
  streakWasReset: boolean; // Indica se lo streak è stato resettato
  currentStreak: number; // Streak attuale dopo il controllo
}