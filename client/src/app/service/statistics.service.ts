import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TimeMachineService } from './time-machine.service'; 
import { 
  UpdateSessionStatsDTO, 
  StatisticsResponse, 
  LoginStreakCheckDTO,
} from '../model/statistics.interface';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private readonly apiUrl = `${environment.API_BASE_URL}/api`;
  
  private statisticsSubject = new BehaviorSubject<StatisticsResponse | null>(null);
  public statistics$ = this.statisticsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private timeMachineService: TimeMachineService 
  ) {}

  getUserStatistics(): Observable<StatisticsResponse> {
    const virtualTime = this.timeMachineService.getVirtualNow();

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

          if (streakInfo.streakWasReset) {
            this.getUserStatistics().subscribe(); 
          }
        }),
        catchError(error => {
          console.error('Errore nel controllo streak login:', error);
          throw error;
        })
      );
  }

  getCurrentStatistics(): StatisticsResponse | null {
    return this.statisticsSubject.value;
  }

  refreshStatistics(): Observable<StatisticsResponse> {
    return this.getUserStatistics();
  }

  clearStatistics(): void {
    this.statisticsSubject.next(null);
  }

  isTimeMachineActive(): boolean {
    return this.timeMachineService.getVirtualNow() !== null;
  }

  getCurrentTime(): Date {
    return this.timeMachineService.getNow();
  }

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

  calculateDailyAverage(totalMinutes: number, consecutiveDays: number): number {
    if (consecutiveDays === 0) return 0;
    return Math.round(totalMinutes / consecutiveDays);
  }
}