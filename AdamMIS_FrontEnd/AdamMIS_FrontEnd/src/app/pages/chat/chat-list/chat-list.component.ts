import { Component, OnInit, OnDestroy, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ChatService, Conversation, User } from '../../../services/chat.service';
import { Subscription, Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-chat-list',
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatListComponent implements OnInit, OnDestroy {
  @Output() userSelected = new EventEmitter<{user: User, isNewConversation: boolean}>();

  conversations: Conversation[] = [];
  availableUsers: User[] = [];
  selectedUserId: string | null = null;
  loading = false;
  error: string | null = null;
  showUserList = false;
  searchQuery = '';
  searchResults: User[] = [];
  searchLoading = false;
  
  private subscriptions: Subscription[] = [];
  private searchSubject = new Subject<string>();

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSubscriptions();
    this.setupSearchDebouncing();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.searchSubject.complete();
  }

  private initializeComponent(): void {
    this.loadConversations();
    this.loadAvailableUsers();
  }

  private setupSubscriptions(): void {
    // Subscribe to conversations updates
    this.subscriptions.push(
      this.chatService.conversations$.subscribe(conversations => {
        this.conversations = conversations;
        this.cdr.detectChanges();
      })
    );

    // Subscribe to available users updates
    this.subscriptions.push(
      this.chatService.availableUsers$.subscribe(users => {
        this.availableUsers = users;
        this.cdr.detectChanges();
      })
    );

    // Listen for new messages to update conversation list
    this.subscriptions.push(
      this.chatService.newMessage$.subscribe(message => {
        if (message) {
          this.loadConversations();
        }
      })
    );

    // Listen for connection status changes
    this.subscriptions.push(
      this.chatService.connectionStatus$.subscribe(isConnected => {
        if (!isConnected) {
          this.error = 'Connection lost. Trying to reconnect...';
        } else if (this.error === 'Connection lost. Trying to reconnect...') {
          this.error = null;
          this.loadConversations();
        }
        this.cdr.detectChanges();
      })
    );
  }

  private setupSearchDebouncing(): void {
    this.subscriptions.push(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(query => {
        this.performSearch(query);
      })
    );
  }

  loadConversations(): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();
    
    this.chatService.getConversations().subscribe({
      next: (conversations) => {
        this.chatService.updateConversations(conversations);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading conversations:', error);
        this.error = 'Failed to load conversations';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadAvailableUsers(): void {
    this.chatService.getAvailableUsers().subscribe({
      next: (users) => {
        this.chatService.updateAvailableUsers(users);
      },
      error: (error) => {
        console.error('Error loading available users:', error);
      }
    });
  }

  selectConversation(conversation: Conversation): void {
    this.selectedUserId = conversation.user.id;
    this.userSelected.emit({user: conversation.user, isNewConversation: false});
    
    // Mark messages as read when opening conversation
    this.chatService.markAsRead(conversation.user.id).subscribe({
      next: () => {
        // Update local conversation to reflect read status
        this.loadConversations();
      },
      error: (error) => {
        console.error('Error marking messages as read:', error);
      }
    });
  }

  selectNewUser(user: User): void {
    this.selectedUserId = user.id;
    this.userSelected.emit({user: user, isNewConversation: true});
    this.closeUserList();
  }

  toggleUserList(): void {
    this.showUserList = !this.showUserList;
    if (!this.showUserList) {
      this.closeUserList();
    }
    this.cdr.detectChanges();
  }

  private closeUserList(): void {
    this.showUserList = false;
    this.searchQuery = '';
    this.searchResults = [];
    this.searchLoading = false;
  }

  onSearchQueryChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  private performSearch(query: string): void {
    if (query.trim().length < 2) {
      this.searchResults = [];
      this.searchLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.searchLoading = true;
    this.cdr.detectChanges();

    this.chatService.searchUsers(query.trim()).subscribe({
      next: (users) => {
        // Filter out users who already have conversations
        const existingUserIds = this.conversations.map(c => c.user.id);
        this.searchResults = users.filter(u => !existingUserIds.includes(u.id));
        this.searchLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error searching users:', error);
        this.searchResults = [];
        this.searchLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getConversationTime(sentAt: Date): string {
    const now = new Date();
    const messageTime = new Date(sentAt);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return messageTime.toLocaleDateString();
  }

  refreshConversations(): void {
    this.loadConversations();
    this.loadAvailableUsers();
  }

  trackByConversation(index: number, conversation: Conversation): string {
    return conversation.user.id;
  }

  trackByUser(index: number, user: User): string {
    return user.id;
  }

  getUserInitials(user: User): string {
    return this.chatService.getUserInitials(user);
  }

  getUserDisplayName(user: User): string {
    return this.chatService.getUserDisplayName(user);
  }

  // Check if the last message was sent by current user
  isLastMessageFromCurrentUser(conversation: Conversation): boolean {
    // You might need to get current user ID from auth service
    // For now, we'll check if it's not from the conversation partner
    return conversation.lastMessage.senderId !== conversation.user.id;
  }

  // Get truncated message content
  getTruncatedMessage(content: string, maxLength: number = 50): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  // Clear error message
  clearError(): void {
    this.error = null;
    this.cdr.detectChanges();
  }
  getUserPhoto(user: User): string {
  return this.chatService.getPhotoUrl(user.photoPath);
}
}