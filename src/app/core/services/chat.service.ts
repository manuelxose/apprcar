// src/app/features/chat/services/chat.service.ts
import { Injectable } from '@angular/core';
import { ChatMessage, ChatChannel } from '@core/models/chat.interface';
import { Observable, BehaviorSubject, of, delay } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket!: Socket;
  private connected$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.initSocket();
  }

  private initSocket(): void {
    // En desarrollo, usamos un mock WebSocket
    this.socket = io('ws://localhost:3000', {
      autoConnect: false
    });

    this.socket.on('connect', () => {
      this.connected$.next(true);
      console.log('Chat socket connected');
    });

    this.socket.on('disconnect', () => {
      this.connected$.next(false);
      console.log('Chat socket disconnected');
    });
  }

  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  sendMessage(channelId: string, content: string): void {
    const message = {
      channelId,
      content,
      timestamp: new Date(),
      senderId: 'currentUser' // En producción vendría del AuthService
    };
    
    this.socket.emit('new-message', message);
  }

  onMessage(): Observable<ChatMessage> {
    return new Observable(observer => {
      this.socket.on('new-message', (data: ChatMessage) => {
        observer.next(data);
      });
      
      return () => this.socket.off('new-message');
    });
  }

  joinChannel(channelId: string): void {
    this.socket.emit('join-channel', { channelId });
  }

  leaveChannel(channelId: string): void {
    this.socket.emit('leave-channel', { channelId });
  }

  getChannels(): Observable<ChatChannel[]> {
    // Mock data para desarrollo
    const mockChannels: ChatChannel[] = [
      {
        id: 'global',
        name: 'Chat General',
        type: 'global',
        participants: [],
        unreadCount: 2,
        avatar: '🌐'
      },
      {
        id: 'user-1',
        name: 'María García',
        type: 'direct',
        participants: ['currentUser', 'user-1'],
        unreadCount: 1,
        avatar: 'https://ui-avatars.com/api/?name=Maria+Garcia&background=3B82F6&color=fff',
        isOnline: true
      },
      {
        id: 'user-2',
        name: 'Carlos López',
        type: 'direct',
        participants: ['currentUser', 'user-2'],
        unreadCount: 0,
        avatar: 'https://ui-avatars.com/api/?name=Carlos+Lopez&background=10B981&color=fff',
        isOnline: false,
        lastSeen: new Date(Date.now() - 300000) // 5 min ago
      }
    ];

    return of(mockChannels).pipe(delay(500));
  }

  // Mock para desarrollo - simula mensajes
  simulateMessage(channelId: string): void {
    setTimeout(() => {
      const mockMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        channelId,
        senderId: 'user-1',
        senderName: 'María García',
        senderAvatar: 'https://ui-avatars.com/api/?name=Maria+Garcia&background=3B82F6&color=fff',
        content: '¡Perfecto! Te veo en 5 minutos en la plaza de San Martín.',
        timestamp: new Date(),
        messageType: 'text',
        isRead: false
      };
      
      this.socket.emit('new-message', mockMessage);
    }, 2000);
  }
}
