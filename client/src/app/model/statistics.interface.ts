export interface UserStatistics {
  user_id: string;
  total_completed_sessions: number;
  total_study_time_minutes: number;
  id: string;
  updated_at: string;
}

// DTO per aggiornare le statistiche quando una sessione viene completata
export interface UpdateSessionStatsDTO {
  study_time_minutes: number; // Durata in minuti della sessione completata
  virtual_time?: string; // Tempo virtuale opzionale (formato ISO) per Time Machine
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
  canIncrementStreak: boolean; // Flag per permettere incremento streak
  streakWasReset: boolean; // Indica se lo streak è stato resettato
  currentStreak: number; // Streak attuale dopo il controllo
  virtual_time?: string; // Tempo virtuale opzionale per Time Machine
}

// Nuovo DTO per la cronologia delle statistiche (per debug/visualizzazioni avanzate)
export interface StatisticsHistoryResponse {
  message: string;
  statistics: StatisticsResponse;
  virtualTime: string | null;
}