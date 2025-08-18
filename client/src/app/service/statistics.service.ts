import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TimeMachineService } from './time-machine.service'; // Import del servizio Time Machine
import { 
  UserStatistics, 
  UpdateSessionStatsDTO, 
  StatisticsResponse, 
  LoginStreakCheckDTO,
  StatisticsHistoryResponse
} from '../model/statistics.interface';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private readonly apiUrl = `${environment.API_BASE_URL}/api`;
  
  // Subject per mantenere le statistiche in cache
  private statisticsSubject = new BehaviorSubject<StatisticsResponse | null>(null);
  public statistics$ = this.statisticsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private timeMachineService: TimeMachineService // Iniettato per gestire il tempo virtuale
  ) {}

  // ==================== RECUPERO STATISTICHE ====================

  /**
   * Recupera le statistiche dell'utente corrente
   * Utilizza automaticamente il tempo virtuale se attivo
   */
  getUserStatistics(): Observable<StatisticsResponse> {
    const virtualTime = this.timeMachineService.getVirtualNow();
    
    // Prepara parametri e headers
    let params: any = {};
    let headers = new HttpHeaders();
    
    if (virtualTime) {
      params.virtual_time = virtualTime.toISOString();
      headers = headers.set('x-virtual-time', virtualTime.toISOString());
    }

    return this.http.get<StatisticsResponse>(`${this.apiUrl}/statistics`, {
      params,
      headers,
      withCredentials: true
    })
      .pipe(
        tap(stats => {
          // Aggiorna il subject per condividere i dati
          this.statisticsSubject.next(stats);
          console.log('Statistiche recuperate:', stats, 
                     virtualTime ? `(Time Machine attiva: ${virtualTime.toISOString()})` : '(tempo reale)');
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
   * Utilizza automaticamente il tempo virtuale se attivo
   * @param studyTimeMinutes Tempo di studio in minuti della sessione completata
   */
  updateSessionStats(studyTimeMinutes: number): Observable<StatisticsResponse> {
    const virtualTime = this.timeMachineService.getVirtualNow();
    
    const payload: UpdateSessionStatsDTO = {
      study_time_minutes: studyTimeMinutes
    };

    let headers = new HttpHeaders();
    
    if (virtualTime) {
      payload.virtual_time = virtualTime.toISOString();
      headers = headers.set('x-virtual-time', virtualTime.toISOString());
    }

    return this.http.post<StatisticsResponse>(`${this.apiUrl}/statistics/session-completed`, payload, {
      headers,
      withCredentials: true
    })
      .pipe(
        tap(updatedStats => {
          // Aggiorna il subject con i nuovi dati
          this.statisticsSubject.next(updatedStats);
          console.log('Statistiche sessione aggiornate:', updatedStats,
                     virtualTime ? `(Time Machine attiva: ${virtualTime.toISOString()})` : '(tempo reale)');
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
   * Utilizza automaticamente il tempo virtuale se attivo
   */
  checkLoginStreak(): Observable<LoginStreakCheckDTO> {
    const virtualTime = this.timeMachineService.getVirtualNow();
    
    let payload: any = {};
    let headers = new HttpHeaders();
    
    if (virtualTime) {
      payload.virtual_time = virtualTime.toISOString();
      headers = headers.set('x-virtual-time', virtualTime.toISOString());
    }

    return this.http.post<LoginStreakCheckDTO>(`${this.apiUrl}/statistics/login-check`, payload, {
      headers,
      withCredentials: true
    })
      .pipe(
        tap(streakInfo => {
          console.log('Streak info:', streakInfo,
                     virtualTime ? `(Time Machine attiva: ${virtualTime.toISOString()})` : '(tempo reale)');
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

  // ==================== NUOVO: CRONOLOGIA STATISTICHE ====================

  /**
   * Recupera la cronologia delle statistiche (utile per debug)
   */
  getStatisticsHistory(): Observable<StatisticsHistoryResponse> {
    const virtualTime = this.timeMachineService.getVirtualNow();
    
    let params: any = {};
    let headers = new HttpHeaders();
    
    if (virtualTime) {
      params.virtual_time = virtualTime.toISOString();
      headers = headers.set('x-virtual-time', virtualTime.toISOString());
    }

    return this.http.get<StatisticsHistoryResponse>(`${this.apiUrl}/statistics/history`, {
      params,
      headers,
      withCredentials: true
    })
      .pipe(
        catchError(error => {
          console.error('Errore nel recupero cronologia statistiche:', error);
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

  /**
   * Controlla se la Time Machine è attiva
   */
  isTimeMachineActive(): boolean {
    return this.timeMachineService.getVirtualNow() !== null;
  }

  /**
   * Ottiene il tempo corrente (virtuale o reale)
   */
  getCurrentTime(): Date {
    return this.timeMachineService.getNow();
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