import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatService, Message, User } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription, Subject, debounceTime } from 'rxjs';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  
  selectedUser: User | null = null;
  currentUserId: string = '';
  messages: Message[] = [];
  newMessage: string = '';
  loading = false;
  sendingMessage = false;
  isTyping = false;
  typingUsers: string[] = [];
  connectionStatus = false;
  
  private subscriptions: Subscription[] = [];
  private shouldScrollToBottom = false;
  private typingSubject = new Subject<void>();
  private typingTimeout?: number;
  
  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSubscriptions();
    this.setupTypingDebouncing();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.typingSubject.complete();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private initializeComponent(): void {
    // Get current user ID
    this.currentUserId = this.authService.getUserId() || '';
    
    // Check if a specific user was selected from query params
    this.route.queryParams.subscribe(params => {
      if (params['user']) {
        // You might need to fetch user details here
        this.loadMessages();
      }
    });
  }

  private setupSubscriptions(): void {
    // Listen for new messages
    this.subscriptions.push(
      this.chatService.newMessage$.subscribe(message => {
        if (message && this.selectedUser && 
            (message.senderId === this.selectedUser.id || message.recipientId === this.selectedUser.id)) {
          // Add message to current conversation if it's relevant
          const messageExists = this.messages.some(m => m.id === message.id);
          if (!messageExists) {
            this.messages = [...this.messages, message].sort((a, b) => 
              new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
            );
            this.shouldScrollToBottom = true;
            this.cdr.detectChanges();
            
            // Mark as read if message is from the current conversation partner
            if (message.senderId === this.selectedUser.id) {
              this.chatService.markAsRead(this.selectedUser.id).subscribe();
            }
          }
        }
      })
    );

    // Listen for message updates
    this.subscriptions.push(
      this.chatService.messages$.subscribe(messages => {
        if (messages.length >= 0) { // Changed from > 0 to >= 0 to handle empty arrays
          this.messages = messages;
          this.shouldScrollToBottom = true;
          this.cdr.detectChanges();
        }
      })
    );

    // Listen for typing indicators
    this.subscriptions.push(
      this.chatService.typingUsers$.subscribe(users => {
        this.typingUsers = users;
        this.cdr.detectChanges();
      })
    );

    // Listen for connection status
    this.subscriptions.push(
      this.chatService.connectionStatus$.subscribe(status => {
        this.connectionStatus = status;
        this.cdr.detectChanges();
      })
    );
  }

  private setupTypingDebouncing(): void {
    this.subscriptions.push(
      this.typingSubject.pipe(
        debounceTime(500)
      ).subscribe(() => {
        this.stopTypingIndicator();
      })
    );
  }

  onUserSelected(event: {user: User, isNewConversation: boolean}): void {
    // Clear previous state
    this.selectedUser = event.user;
    this.messages = [];
    this.newMessage = '';
    this.loading = false;
    this.sendingMessage = false;
    
    // Stop any existing typing indicators
    this.stopTypingIndicator();
    
    if (!event.isNewConversation) {
      this.loadMessages();
    } else {
      // For new conversations, just clear messages and wait for first message
      this.chatService.clearMessages();
    }
    
    this.cdr.detectChanges();
  }

  private loadMessages(): void {
    if (!this.selectedUser) return;
    
    this.loading = true;
    this.cdr.detectChanges();
    
    this.chatService.getConversation(this.selectedUser.id).subscribe({
      next: (messages: Message[]) => {
        this.chatService.updateMessages(messages);
        this.loading = false;
        this.shouldScrollToBottom = true;
        this.cdr.detectChanges();
        
        // Mark messages as read when loading conversation
        this.chatService.markAsRead(this.selectedUser!.id).subscribe();
      },
      error: (error: any) => {
        console.error('Error loading messages:', error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  sendMessage(): void {
    if (!this.canSendMessage()) {
      return;
    }

    const messageContent = this.newMessage.trim();
    this.newMessage = '';
    this.sendingMessage = true;
    this.stopTypingIndicator();
    this.cdr.detectChanges();

    const messageData = {
      recipientId: this.selectedUser!.id,
      content: messageContent
    };

    this.chatService.sendMessage(messageData).subscribe({
      next: (response: Message) => {
        // Message will be added via SignalR response or the API response
        const messageExists = this.messages.some(m => m.id === response.id);
        if (!messageExists) {
          this.messages = [...this.messages, response];
          this.shouldScrollToBottom = true;
        }
        this.sendingMessage = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error sending message:', error);
        // Restore message on error
        this.newMessage = messageContent;
        this.sendingMessage = false;
        this.cdr.detectChanges();
        // You could show an error toast here
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onInput(): void {
    this.startTypingIndicator();
    this.typingSubject.next();
  }

  private startTypingIndicator(): void {
    if (!this.isTyping && this.selectedUser && this.connectionStatus) {
      this.isTyping = true;
      this.chatService.sendTypingIndicator(this.selectedUser.id, true);
    }
    
    // Reset the timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    
    this.typingTimeout = window.setTimeout(() => {
      this.stopTypingIndicator();
    }, 3000);
  }

  private stopTypingIndicator(): void {
    if (this.isTyping && this.selectedUser && this.connectionStatus) {
      this.isTyping = false;
      this.chatService.sendTypingIndicator(this.selectedUser.id, false);
    }
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = undefined;
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer?.nativeElement) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  // Helper methods
  getUserDisplayName(user: User): string {
    return this.chatService.getUserDisplayName(user);
  }

  getUserInitials(user: User): string {
    return this.chatService.getUserInitials(user);
  }

  isMessageFromCurrentUser(message: Message): boolean {
    return message.senderId === this.currentUserId;
  }

  getMessageTime(sentAt: Date): string {
    const messageTime = new Date(sentAt);
    return messageTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  }

  getMessageDate(sentAt: Date): string {
    const messageTime = new Date(sentAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageTime.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageTime.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageTime.toLocaleDateString();
    }
  }

  shouldShowDateSeparator(currentMessage: Message, previousMessage: Message | null): boolean {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.sentAt).toDateString();
    const previousDate = new Date(previousMessage.sentAt).toDateString();
    
    return currentDate !== previousDate;
  }

  formatMessageContent(content: string): string {
    // Basic formatting - you can enhance this with links, mentions, etc.
    return content.replace(/\n/g, '<br>');
  }

  trackByMessageId(index: number, message: Message): number {
    return message.id;
  }

  canSendMessage(): boolean {
    return !!(this.newMessage.trim() && this.selectedUser && !this.sendingMessage);
  }

  isUserTyping(): boolean {
    return this.selectedUser ? this.typingUsers.includes(this.selectedUser.id) : false;
  }

  // Auto-resize textarea
  autoResizeTextarea(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  // Handle file attachment (placeholder for future implementation)
  onFileAttachment(): void {
    // TODO: Implement file attachment functionality
    console.log('File attachment clicked');
  }

  // Handle emoji picker (placeholder for future implementation)
  onEmojiPicker(): void {
    // TODO: Implement emoji picker functionality
    console.log('Emoji picker clicked');
  }
    getUserPhoto(user: User): string {
  return this.chatService.getPhotoUrl(user.photoPath);
}
}