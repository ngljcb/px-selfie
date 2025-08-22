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