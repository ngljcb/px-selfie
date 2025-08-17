import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { 
  UserStatistics, 
  UpdateSessionStatsDTO, 
  StatisticsResponse, 
  LoginStreakCheckDTO 
} from '../model/statistics.interface';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private readonly apiUrl = `${environment.API_BASE_URL}/api`; // CORRETTO
  
  // Subject per mantenere le statistiche in cache
  private statisticsSubject = new BehaviorSubject<StatisticsResponse | null>(null);
  public statistics$ = this.statisticsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ==================== RECUPERO STATISTICHE ====================

  /**
   * Recupera le statistiche dell'utente corrente
   */
  getUserStatistics(): Observable<StatisticsResponse> {
    return this.http.get<StatisticsResponse>(`${this.apiUrl}/statistics`, {
      withCredentials: true // AGGIUNTO per coerenza con auth.service
    })
      .pipe(
        tap(stats => {
          // Aggiorna il subject per condividere i dati
          this.statisticsSubject.next(stats);
        }),
        catchError(error => {
          console.error('Errore nel recupero statistiche:', error);
          throw error;
        })
      );
  }

  // ==================== AGGIORNAMENTO STATISTICHE SESSIONE ====================

  /**
   * Aggiorna le statistiche quando una sessione viene completata
   * @param studyTimeMinutes Tempo di studio in minuti della sessione completata
   */
  updateSessionStats(studyTimeMinutes: number): Observable<StatisticsResponse> {
    const payload: UpdateSessionStatsDTO = {
      study_time_minutes: studyTimeMinutes
    };

    return this.http.post<StatisticsResponse>(`${this.apiUrl}/statistics/session-completed`, payload, {
      withCredentials: true // AGGIUNTO
    })
      .pipe(
        tap(updatedStats => {
          // Aggiorna il subject con i nuovi dati
          this.statisticsSubject.next(updatedStats);
        }),
        catchError(error => {
          console.error('Errore nell\'aggiornamento statistiche sessione:', error);
          throw error;
        })
      );
  }

  // ==================== CONTROLLO STREAK AL LOGIN ====================

  /**
   * Controlla e aggiorna lo streak consecutivo al login dell'utente
   */
  checkLoginStreak(): Observable<LoginStreakCheckDTO> {
    return this.http.post<LoginStreakCheckDTO>(`${this.apiUrl}/statistics/login-check`, {}, {
      withCredentials: true // AGGIUNTO
    })
      .pipe(
        tap(streakInfo => {
          console.log('Streak info:', streakInfo);
          // Se lo streak è stato resettato, potremmo voler ricaricare le statistiche
          if (streakInfo.streakWasReset) {
            this.getUserStatistics().subscribe(); // Ricarica le statistiche aggiornate
          }
        }),
        catchError(error => {
          console.error('Errore nel controllo streak login:', error);
          throw error;
        })
      );
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Ottiene le statistiche correnti dal subject (cache)
   */
  getCurrentStatistics(): StatisticsResponse | null {
    return this.statisticsSubject.value;
  }

  /**
   * Forza il refresh delle statistiche dal server
   */
  refreshStatistics(): Observable<StatisticsResponse> {
    return this.getUserStatistics();
  }

  /**
   * Pulisce la cache delle statistiche (utile per logout)
   */
  clearStatistics(): void {
    this.statisticsSubject.next(null);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Formatta il tempo di studio in formato leggibile
   * @param minutes Minuti totali
   * @returns Stringa formattata (es. "2h 30m", "45m")
   */
  formatStudyTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Calcola la media giornaliera di studio (se disponibili dati sufficienti)
   * @param totalMinutes Minuti totali studiati
   * @param consecutiveDays Giorni consecutivi di studio
   * @returns Media giornaliera in minuti
   */
  calculateDailyAverage(totalMinutes: number, consecutiveDays: number): number {
    if (consecutiveDays === 0) return 0;
    return Math.round(totalMinutes / consecutiveDays);
  }
}