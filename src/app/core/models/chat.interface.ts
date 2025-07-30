
// src/app/core/models/chat.interface.ts
export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
  messageType: 'text' | 'system';
  isRead: boolean;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'global';
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  metadata?: {
    plazaId?: string;
    contextType?: string;
    createdAt?: string;
    [key: string]: any;
  };
}

export interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}