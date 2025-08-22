import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ChatResponse {
  success: boolean;
  response: string;
  messageCount: number;
  message?: string;
}

export interface ChatMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly apiUrl = `${environment.API_BASE_URL}/api/chat`;

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<ChatResponse> {
    const payload = { message: message.trim() };
    
    return this.http.post<ChatResponse>(this.apiUrl, payload, {
      withCredentials: true, // Per includere i cookie
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      retry(1), // Riprova una volta in caso di errore di rete
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Si è verificato un errore inaspettato';

    if (error.error instanceof ErrorEvent) {
      // Errore client-side o di rete
      errorMessage = 'Errore di connessione. Verifica la tua connessione internet.';
    } else {
      // Errore server-side
      switch (error.status) {
        case 400:
          errorMessage = 'Richiesta non valida. Riprova con un messaggio diverso.';
          break;
        case 401:
          errorMessage = 'Sessione scaduta. Effettua il login di nuovo.';
          break;
        case 403:
          errorMessage = 'Non hai i permessi per utilizzare questa funzionalità.';
          break;
        case 429:
          errorMessage = 'Troppe richieste. Attendi un momento prima di riprovare.';
          break;
        case 500:
          errorMessage = 'Errore del server. Riprova più tardi.';
          break;
        case 503:
          errorMessage = 'Servizio temporaneamente non disponibile.';
          break;
        default:
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
      }
    }

    console.error('Errore Chat AI:', error);
    return throwError(() => new Error(errorMessage));
  }

  // Utility per formattare i messaggi con markdown di base
  formatMessage(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **grassetto**
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // *corsivo*
      .replace(/`(.*?)`/g, '<code>$1</code>') // `codice`
      .replace(/\n/g, '<br>'); // nuove righe
  }

  // Utility per formattare il timestamp
  formatTime(timestamp: Date): string {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Ora';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m fa`;
    } else if (diffInMinutes < 1440) { // 24 ore
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h fa`;
    } else {
      return messageTime.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
}