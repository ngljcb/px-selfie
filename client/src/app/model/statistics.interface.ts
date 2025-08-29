export interface UserStatistics {
  user_id: string;
  total_completed_sessions: number;
  total_study_time_minutes: number;
  id: string;
  updated_at: string;
}

export interface UpdateSessionStatsDTO {
  study_time_minutes: number; 
  virtual_time?: string; 
}

export interface StatisticsResponse {
  totalCompletedSessions: number;
  totalStudyTimeMinutes: number;
  totalStudyTimeFormatted: string;
  consecutiveStudyDays: number;
  averageDailyMinutes?: number; 
  todayStudyMinutes?: number; 
}

export interface LoginStreakCheckDTO {
  canIncrementStreak: boolean; 
  streakWasReset: boolean; 
  currentStreak: number;
  virtual_time?: string;
}
