import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Message {
  id: number;
  senderId: string;
  recipientId: string;
  content: string;
  sentAt: Date;
  isRead: boolean;
  readAt?: Date;
}

export interface User {
  id: string;
  userName: string;
  email: string;
  title?: string;
  department?: string;
  photoPath?: string;
  internalPhone?: string;
}

export interface Conversation {
  user: User;
  lastMessage: Message;
  unreadCount: number;
}

export interface SendMessageDto {
  recipientId: string;
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private LocalbaseUrl = 'https://localhost:7209/api';
  private baseUrl = 'http://192.168.1.203:8080/api';
  private hubConnection: HubConnection | null = null;
  
  // Subjects for real-time updates
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  private newMessageSubject = new BehaviorSubject<Message | null>(null);
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private availableUsersSubject = new BehaviorSubject<User[]>([]);
  private typingUsersSubject = new BehaviorSubject<string[]>([]);
  
  // Public observables
  public messages$ = this.messagesSubject.asObservable();
  public conversations$ = this.conversationsSubject.asObservable();
  public newMessage$ = this.newMessageSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public availableUsers$ = this.availableUsersSubject.asObservable();
  public typingUsers$ = this.typingUsersSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Get HTTP headers with authorization
  private getHttpOptions(): { headers: HttpHeaders } {
    const token = this.getAuthToken();
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      })
    };
  }

  private getAuthToken(): string {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  }

  // Initialize SignalR connection
  public async startConnection(): Promise<void> {
    const token = this.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${this.baseUrl.replace('/api', '')}/chathub`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    this.setupSignalREventListeners();

    try {
      await this.hubConnection.start();
      this.connectionStatusSubject.next(true);
      console.log('SignalR Connected');
    } catch (error) {
      this.connectionStatusSubject.next(false);
      console.error('SignalR Connection Error:', error);
      throw error;
    }
  }

  private setupSignalREventListeners(): void {
    if (!this.hubConnection) return;

    // Handle receiving messages
    this.hubConnection.on('ReceiveMessage', (message: any) => {
      const newMessage: Message = {
        ...message,
        sentAt: new Date(message.sentAt),
        readAt: message.readAt ? new Date(message.readAt) : undefined
      };
      this.newMessageSubject.next(newMessage);
      this.addMessageToCurrentConversation(newMessage);
      this.refreshConversations();
    });

    // Handle message read confirmations
    this.hubConnection.on('MessagesRead', (data: any) => {
      this.markMessagesAsReadInUI(data.readerId);
    });

    // Handle message sent confirmations
    this.hubConnection.on('MessageSent', (message: any) => {
      console.log('Message sent confirmation:', message);
      const confirmedMessage: Message = {
        ...message,
        sentAt: new Date(message.sentAt),
        readAt: message.readAt ? new Date(message.readAt) : undefined
      };
      this.addMessageToCurrentConversation(confirmedMessage);
    });

    // Handle typing indicators
    this.hubConnection.on('UserTyping', (userId: string) => {
      const currentTypingUsers = this.typingUsersSubject.value;
      if (!currentTypingUsers.includes(userId)) {
        this.typingUsersSubject.next([...currentTypingUsers, userId]);
      }
    });

    this.hubConnection.on('UserStoppedTyping', (userId: string) => {
      const currentTypingUsers = this.typingUsersSubject.value;
      this.typingUsersSubject.next(currentTypingUsers.filter(id => id !== userId));
    });

    // Handle connection events
    this.hubConnection.onreconnecting(() => {
      this.connectionStatusSubject.next(false);
      console.log('SignalR reconnecting...');
    });

    this.hubConnection.onreconnected(() => {
      this.connectionStatusSubject.next(true);
      console.log('SignalR reconnected');
    });

    this.hubConnection.onclose(() => {
      this.connectionStatusSubject.next(false);
      console.log('SignalR connection closed');
    });
  }

  // Stop SignalR connection
  public async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.connectionStatusSubject.next(false);
      console.log('SignalR Disconnected');
    }
  }

  // Get all available users for starting new conversations
  public getAvailableUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/Messages/users`, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  // Search users
  public searchUsers(query: string, limit: number = 10): Observable<User[]> {
    const encodedQuery = encodeURIComponent(query);
    return this.http.get<User[]>(
      `${this.baseUrl}/Messages/users/search?query=${encodedQuery}&limit=${limit}`,
      this.getHttpOptions()
    ).pipe(catchError(this.handleError));
  }

  // Get conversation between current user and another user
  public getConversation(otherUserId: string, page: number = 1, pageSize: number = 50): Observable<Message[]> {
    return this.http.get<Message[]>(
      `${this.baseUrl}/Messages/conversation/${otherUserId}?page=${page}&pageSize=${pageSize}`,
      this.getHttpOptions()
    ).pipe(catchError(this.handleError));
  }

  // Send a message via HTTP API
  public sendMessage(dto: SendMessageDto): Observable<Message> {
    return this.http.post<Message>(`${this.baseUrl}/Messages`, dto, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  // Mark messages as read
  public markAsRead(senderId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/Messages/mark-read/${senderId}`, {}, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  // Get list of conversations
  public getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.baseUrl}/Messages/conversations`, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  // Get unread messages count
  public getUnreadCount(): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.baseUrl}/Messages/unread-count`, this.getHttpOptions())
      .pipe(catchError(this.handleError));
  }

  // Send typing indicator via SignalR
  public sendTypingIndicator(recipientId: string, isTyping: boolean): void {
    if (this.hubConnection && this.hubConnection.state === 'Connected') {
      const method = isTyping ? 'StartTyping' : 'StopTyping';
      this.hubConnection.invoke(method, recipientId)
        .catch(err => console.error('Error sending typing indicator:', err));
    }
  }

  // Send message via SignalR (alternative method)
  public sendMessageViaSignalR(recipientId: string, message: string): void {
    if (this.hubConnection && this.hubConnection.state === 'Connected') {
      this.hubConnection.invoke('SendMessageToUser', recipientId, message)
        .catch(err => console.error('Error sending message via SignalR:', err));
    }
  }

  // Mark as read via SignalR
  public markAsReadViaSignalR(senderId: string): void {
    if (this.hubConnection && this.hubConnection.state === 'Connected') {
      this.hubConnection.invoke('MarkAsRead', senderId)
        .catch(err => console.error('Error marking as read via SignalR:', err));
    }
  }

  // Helper methods
  private addMessageToCurrentConversation(message: Message): void {
    const currentMessages = this.messagesSubject.value;
    
    // Check if message already exists to avoid duplicates
    const messageExists = currentMessages.some(m => m.id === message.id);
    if (!messageExists) {
      const updatedMessages = [...currentMessages, message].sort((a, b) => 
        new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
      );
      this.messagesSubject.next(updatedMessages);
    }
  }

  private markMessagesAsReadInUI(readerId: string): void {
    const currentMessages = this.messagesSubject.value;
    const updatedMessages = currentMessages.map(msg => 
      msg.senderId === readerId ? { ...msg, isRead: true, readAt: new Date() } : msg
    );
    this.messagesSubject.next(updatedMessages);
  }

  // Refresh conversations (useful after new messages)
  private refreshConversations(): void {
    this.getConversations().subscribe({
      next: (conversations) => {
        this.conversationsSubject.next(conversations);
      },
      error: (error) => {
        console.error('Error refreshing conversations:', error);
      }
    });
  }

  // Update local messages state
  public updateMessages(messages: Message[]): void {
    const messagesWithDates = messages.map(msg => ({
      ...msg,
      sentAt: typeof msg.sentAt === 'string' ? new Date(msg.sentAt) : msg.sentAt,
      readAt: msg.readAt ? (typeof msg.readAt === 'string' ? new Date(msg.readAt) : msg.readAt) : undefined
    }));
    this.messagesSubject.next(messagesWithDates);
  }

  // Update local conversations state
  public updateConversations(conversations: Conversation[]): void {
    const conversationsWithDates = conversations.map(conv => ({
      ...conv,
      lastMessage: {
        ...conv.lastMessage,
        sentAt: typeof conv.lastMessage.sentAt === 'string' ? new Date(conv.lastMessage.sentAt) : conv.lastMessage.sentAt,
        readAt: conv.lastMessage.readAt ? (typeof conv.lastMessage.readAt === 'string' ? new Date(conv.lastMessage.readAt) : conv.lastMessage.readAt) : undefined
      }
    }));
    this.conversationsSubject.next(conversationsWithDates);
  }

  // Update available users state
  public updateAvailableUsers(users: User[]): void {
    this.availableUsersSubject.next(users);
  }

  // Clear messages (useful when switching conversations)
  public clearMessages(): void {
    this.messagesSubject.next([]);
  }

  // Get connection status
  public isConnected(): boolean {
    return this.hubConnection?.state === 'Connected';
  }

  // Get user display name
  public getUserDisplayName(user: User): string {
    return user.userName || user.email || user.id;
  }

  // Get user initials for avatar
  public getUserInitials(user: User): string {
    const name = this.getUserDisplayName(user);
    if (name.includes(' ')) {
      const parts = name.split(' ');
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.charAt(0).toUpperCase();
  }

  // Error handler
  private handleError = (error: any): Observable<never> => {
    console.error('Chat service error:', error);
    return throwError(() => error);
  }

  // Clean up resources
  public cleanup(): void {
    this.messagesSubject.complete();
    this.conversationsSubject.complete();
    this.newMessageSubject.complete();
    this.connectionStatusSubject.complete();
    this.availableUsersSubject.complete();
    this.typingUsersSubject.complete();
  }
  public getPhotoUrl(photoPath: string | undefined | null): string {
  if (!photoPath) {
    return 'assets/images/AdamLogo.png';
  }
  const cleanPath = photoPath.startsWith('/') ? photoPath.substring(1) : photoPath;
  return `http://192.168.1.203:8080/user-photos/${cleanPath}`;
}
}