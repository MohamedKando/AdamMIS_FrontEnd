export interface Message {
  id: number;
  senderId: string;
  recipientId: string;
  content: string;
  sentAt: Date;
  isRead: boolean;
  readAt?: Date;
}

export interface Conversation {
  userId: string;
  lastMessage: Message;
  unreadCount: number;
  // You can add user details here if you have them
  userName?: string;
  userAvatar?: string;
}

export interface SendMessageDto {
  recipientId: string;
  content: string;
}

export interface User {
  id: string;
  userName?: string;
  email?: string;
  avatar?: string;
}

export enum ConnectionStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting'
}