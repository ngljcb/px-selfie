import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService} from '../../../service/chat.service';
import { AuthService } from '../../../service/auth.service';
import { ChatMessage } from '../../../model/entity/chat.interface';
import { ChatResponse } from '../../../model/response/chat-response.interface';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-chat-ai',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-ai.component.html',
  styleUrl: './chat-ai.component.scss'
})
export class ChatAiComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  messages: ChatMessage[] = [];
  currentMessage: string = '';
  isLoading: boolean = false;
  isModalOpen: boolean = false;
  isUserLoggedIn: boolean = false;
  
  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkAuthenticationStatus();
    this.initializeChat();
    
    // Controlla periodicamente lo stato di autenticazione
    interval(2000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkAuthenticationStatus();
      });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkAuthenticationStatus(): void {
    const username = sessionStorage.getItem('username');
    const userid = sessionStorage.getItem('userid');
    const wasLoggedIn = this.isUserLoggedIn;
    
    this.isUserLoggedIn = !!(username && userid);
    
    // Se l'utente si è appena loggato, inizializza la chat
    if (this.isUserLoggedIn && !wasLoggedIn) {
      this.initializeChat();
    }
    
    // Se l'utente si è disconnesso, chiudi il modal e resetta la chat
    if (!this.isUserLoggedIn && wasLoggedIn) {
      this.closeModal();
      this.resetChat();
    }
  }

  private initializeChat(): void {
    if (!this.isUserLoggedIn) return;
    
    this.messages = [
      {
        content: 'Ciao! Sono il tuo assistente AI per SELFIE. Come posso aiutarti oggi?',
        isUser: false,
        timestamp: new Date()
      }
    ];
  }

  private resetChat(): void {
    this.messages = [];
    this.currentMessage = '';
    this.isLoading = false;
  }

  openModal(): void {
    if (!this.isUserLoggedIn) {
      console.log('Utente non autenticato, impossibile aprire la chat');
      return;
    }
    
    this.isModalOpen = true;
    // Focus sull'input dopo che il modal è aperto
    setTimeout(() => {
      if (this.messageInput) {
        this.messageInput.nativeElement.focus();
      }
    }, 300);
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.currentMessage = '';
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading || !this.isUserLoggedIn) {
      return;
    }

    const userMessage: ChatMessage = {
      content: this.currentMessage.trim(),
      isUser: true,
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    this.shouldScrollToBottom = true;

    const messageToSend = this.currentMessage.trim();
    this.currentMessage = '';
    this.isLoading = true;

    // Auto-resize textarea
    this.resetTextareaHeight();

    this.chatService.sendMessage(messageToSend)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ChatResponse) => {
          if (response.success) {
            const aiMessage: ChatMessage = {
              content: response.response,
              isUser: false,
              timestamp: new Date()
            };
            this.messages.push(aiMessage);
          } else {
            this.addErrorMessage('Risposta non valida dal server');
          }
          this.isLoading = false;
          this.shouldScrollToBottom = true;
        },
        error: (error: Error) => {
          console.error('Errore nella comunicazione con il server:', error);
          
          // Se l'errore è di autenticazione, aggiorna lo stato
          if (error.message.includes('401') || error.message.includes('Sessione scaduta')) {
            this.checkAuthenticationStatus();
            this.addErrorMessage('Sessione scaduta. Effettua il login di nuovo.');
          } else {
            this.addErrorMessage(error.message || 'Errore di comunicazione');
          }
          
          this.isLoading = false;
          this.shouldScrollToBottom = true;
        }
      });
  }

  private addErrorMessage(errorText: string): void {
    const errorMessage: ChatMessage = {
      content: `Scusa, ${errorText}. Riprova più tardi.`,
      isUser: false,
      timestamp: new Date()
    };
    this.messages.push(errorMessage);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    } else if (event.key === 'Enter' && event.shiftKey) {
      // Permetti nuova linea con Shift+Enter
      this.autoResizeTextarea();
    } else {
      // Auto-resize durante la digitazione
      setTimeout(() => this.autoResizeTextarea(), 0);
    }
  }

  private autoResizeTextarea(): void {
    if (this.messageInput) {
      const textarea = this.messageInput.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }

  private resetTextareaHeight(): void {
    if (this.messageInput) {
      this.messageInput.nativeElement.style.height = 'auto';
    }
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  // Template helper methods
  formatMessage(content: string): string {
    return this.chatService.formatMessage(content);
  }

  formatTime(timestamp: Date): string {
    return this.chatService.formatTime(timestamp);
  }

  trackByMessage(index: number, message: ChatMessage): string {
    return `${message.timestamp.getTime()}-${message.isUser}-${index}`;
  }
}