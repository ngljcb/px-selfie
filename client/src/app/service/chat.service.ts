import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ChatResponse } from '../model/response/chat-response.interface';
import { ErrorHandlerService } from './error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly apiUrl = `${environment.API_BASE_URL}/api/chat`;

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
) {}

  sendMessage(message: string): Observable<ChatResponse> {
    const payload = { message: message.trim() };
    
    return this.http.post<ChatResponse>(this.apiUrl, payload, {
      withCredentials: true, 
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      retry(1), 
      catchError(this.errorHandler.handleError)
    );
  }

  formatMessage(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>') 
      .replace(/`(.*?)`/g, '<code>$1</code>') 
      .replace(/\n/g, '<br>'); 
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Ora';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m fa`;
    } else if (diffInMinutes < 1440) { 
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