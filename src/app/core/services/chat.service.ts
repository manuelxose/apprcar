// src/app/core/services/chat.service.ts (versión mejorada)
import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, of, interval, timer } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';

import { ChatMessage, ChatChannel, ChatUser } from '@core/models/chat.interface';
import { User } from '@core/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private authService = inject(AuthService);
  private socket!: Socket;
  private connected$ = new BehaviorSubject<boolean>(false);
  private currentUser: User | null = null;

  // Mock data para desarrollo
  private mockChannels: ChatChannel[] = [];
  private mockMessages: { [channelId: string]: ChatMessage[] } = {};
  private mockUsers: ChatUser[] = [];

  constructor() {
    this.initializeMockData();
    this.initSocket();
  }

  private initSocket(): void {
    // En desarrollo, usar mock Socket.IO
    try {
      this.socket = io('ws://localhost:3000', {
        autoConnect: false,
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('Chat socket conectado');
        this.connected$.next(true);
        this.joinUserToGeneralChannel();
      });

      this.socket.on('disconnect', () => {
        console.log('Chat socket desconectado');
        this.connected$.next(false);
      });

      this.socket.on('connect_error', (error) => {
        console.warn('Error de conexión WebSocket, usando modo mock:', error);
        this.enableMockMode();
      });

    } catch (error) {
      console.warn('Socket.IO no disponible, usando modo mock');
      this.enableMockMode();
    }
  }

  private enableMockMode(): void {
    // Simular conexión en modo mock
    setTimeout(() => {
      this.connected$.next(true);
      // NO iniciar simulación automática de mensajes
    }, 1000);
  }

  connect(): void {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    } else if (!this.socket) {
      this.enableMockMode();
    }
  }

  disconnect(): void {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    this.connected$.next(false);
  }

  isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  // Enviar mensaje con información completa del usuario
  sendMessage(channelId: string, content: string, user: User): void {
    const message: ChatMessage = {
      id: this.generateMessageId(),
      channelId,
      senderId: 'currentUser', // Marcar como usuario actual
      senderName: `${user.profile.firstName} ${user.profile.lastName}`,
      senderAvatar: user.profile.avatar || this.generateAvatar(user.profile.firstName, user.profile.lastName),
      content: content.trim(),
      timestamp: new Date(),
      messageType: 'text',
      isRead: true // El usuario siempre ha "leído" su propio mensaje
    };

    if (this.socket?.connected) {
      this.socket.emit('new-message', message);
    } else {
      // Modo mock: simular envío
      this.addMockMessage(message);
      console.log('Mensaje enviado:', content);
      
      // Simular respuesta del servidor solo si es un canal directo
      if (channelId.startsWith('user-')) {
        setTimeout(() => {
          this.simulateServerResponse(message);
        }, 500 + Math.random() * 1500); // Respuesta entre 0.5 y 2 segundos
      }
    }
  }

  // Escuchar mensajes nuevos
  onMessage(): Observable<ChatMessage> {
    return new Observable(observer => {
      if (this.socket?.connected) {
        this.socket.on('new-message', (message: ChatMessage) => {
          observer.next(message);
        });

        return () => this.socket.off('new-message');
      } else {
        // Modo mock: establecer callback para recibir mensajes
        this.onMessageCallback = (message: ChatMessage) => {
          observer.next(message);
        };

        // NO generar mensajes automáticamente, solo responder cuando el usuario envíe algo
        return () => {
          this.onMessageCallback = null;
        };
      }
    });
  }

  // Obtener canales disponibles
  getChannels(): Observable<ChatChannel[]> {
    return of(this.mockChannels).pipe(
      delay(500),
      tap(() => console.log('Canales cargados:', this.mockChannels.length))
    );
  }

  // Obtener usuarios online
  getOnlineUsers(): Observable<ChatUser[]> {
    return of(this.mockUsers).pipe(
      delay(300),
      map(users => users.filter(user => user.isOnline))
    );
  }

  // Obtener mensajes de un canal específico
  getChannelMessages(channelId: string): Observable<ChatMessage[]> {
    const messages = this.mockMessages[channelId] || [];
    return of([...messages]).pipe(
      delay(200),
      tap(() => console.log(`Mensajes cargados para canal ${channelId}:`, messages.length))
    );
  }

  // Marcar mensajes como leídos
  markChannelAsRead(channelId: string): void {
    // Marcar todos los mensajes del canal como leídos
    if (this.mockMessages[channelId]) {
      this.mockMessages[channelId].forEach(message => {
        if (message.senderId !== 'currentUser') {
          message.isRead = true;
        }
      });
    }

    // Resetear el contador de mensajes no leídos del canal
    const channelIndex = this.mockChannels.findIndex(c => c.id === channelId);
    if (channelIndex !== -1) {
      const updatedChannel = {
        ...this.mockChannels[channelIndex],
        unreadCount: 0
      };
      this.mockChannels[channelIndex] = updatedChannel;
    }

    console.log(`Canal ${channelId} marcado como leído`);
  }

  // Unirse a un canal
  joinChannel(channelId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-channel', { channelId });
    }
    console.log(`Usuario unido al canal: ${channelId}`);
  }

  // Salir de un canal
  leaveChannel(channelId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-channel', { channelId });
    }
    console.log(`Usuario salió del canal: ${channelId}`);
  }

  // Crear chat contextual para plaza
  createPlazaChat(plazaId: string, sharerUser: User, claimerUser: User): Observable<ChatChannel> {
    const channelId = `plaza-${plazaId}`;
    const sharerName = `${sharerUser.profile.firstName} ${sharerUser.profile.lastName}`;
    const claimerName = `${claimerUser.profile.firstName} ${claimerUser.profile.lastName}`;

    const channel: ChatChannel = {
      id: channelId,
      name: `Plaza: ${sharerName} → ${claimerName}`,
      type: 'direct',
      participants: [sharerUser.id, claimerUser.id],
      unreadCount: 0,
      avatar: '🅿️',
      isOnline: true,
      metadata: {
        plazaId,
        contextType: 'plaza_sharing',
        createdAt: new Date().toISOString()
      }
    };

    // Añadir a canales mock
    this.mockChannels.unshift(channel);

    // Mensaje de sistema inicial
    const systemMessage: ChatMessage = {
      id: this.generateMessageId(),
      channelId,
      senderId: 'system',
      senderName: 'Apparcar',
      senderAvatar: '🤖',
      content: `¡Hola! ${claimerName} está interesado en la plaza que ${sharerName} ha compartido. ¡Coordinaos para el intercambio!`,
      timestamp: new Date(),
      messageType: 'system',
      isRead: false
    };

    this.addMockMessage(systemMessage);

    return of(channel).pipe(delay(200));
  }

  // Métodos privados para modo mock
  private initializeMockData(): void {
    // Canales mock
    this.mockChannels = [
      {
        id: 'general',
        name: 'Chat General',
        type: 'global',
        participants: [],
        unreadCount: 0,
        avatar: '🌐',
        isOnline: true
      },
      {
        id: 'user-maria',
        name: 'María García',
        type: 'direct',
        participants: ['currentUser', 'user-maria'],
        unreadCount: 2,
        avatar: this.generateAvatar('María', 'García'),
        isOnline: true,
        lastSeen: new Date()
      },
      {
        id: 'user-carlos',
        name: 'Carlos López',
        type: 'direct',
        participants: ['currentUser', 'user-carlos'],
        unreadCount: 0,
        avatar: this.generateAvatar('Carlos', 'López'),
        isOnline: false,
        lastSeen: new Date(Date.now() - 900000) // 15 min ago
      }
    ];

    // Usuarios mock
    this.mockUsers = [
      {
        id: 'user-maria',
        name: 'María García',
        avatar: this.generateAvatar('María', 'García'),
        isOnline: true
      },
      {
        id: 'user-carlos',
        name: 'Carlos López',
        avatar: this.generateAvatar('Carlos', 'López'),
        isOnline: false,
        lastSeen: new Date(Date.now() - 900000)
      },
      {
        id: 'user-ana',
        name: 'Ana Martín',
        avatar: this.generateAvatar('Ana', 'Martín'),
        isOnline: true
      }
    ];

    // Mensajes mock iniciales
    this.mockMessages = {
      'general': [
        {
          id: 'msg-1',
          channelId: 'general',
          senderId: 'user-maria',
          senderName: 'María García',
          senderAvatar: this.generateAvatar('María', 'García'),
          content: '¡Hola a todos! ¿Alguien sabe si hay plazas libres cerca del centro?',
          timestamp: new Date(Date.now() - 300000),
          messageType: 'text',
          isRead: true
        }
      ],
      'user-maria': [
        {
          id: 'msg-2',
          channelId: 'user-maria',
          senderId: 'user-maria',
          senderName: 'María García',
          senderAvatar: this.generateAvatar('María', 'García'),
          content: '¡Hola! Vi que compartiste una plaza cerca de Callao. ¿Sigue disponible?',
          timestamp: new Date(Date.now() - 120000),
          messageType: 'text',
          isRead: false
        },
        {
          id: 'msg-3',
          channelId: 'user-maria',
          senderId: 'user-maria',
          senderName: 'María García',
          senderAvatar: this.generateAvatar('María', 'García'),
          content: 'Puedo estar allí en 5 minutos si me confirmas 😊',
          timestamp: new Date(Date.now() - 60000),
          messageType: 'text',
          isRead: false
        }
      ]
    };
  }

  private addMockMessage(message: ChatMessage): void {
    if (!this.mockMessages[message.channelId]) {
      this.mockMessages[message.channelId] = [];
    }
    this.mockMessages[message.channelId].push(message);

    // Actualizar canal con último mensaje
    const channelIndex = this.mockChannels.findIndex(c => c.id === message.channelId);
    if (channelIndex !== -1) {
      // Crear una nueva copia del canal para evitar problemas de mutabilidad
      const currentUnreadCount = this.mockChannels[channelIndex].unreadCount;
      const updatedChannel = {
        ...this.mockChannels[channelIndex],
        lastMessage: message,
        unreadCount: message.senderId !== 'currentUser' 
          ? (currentUnreadCount + 1) 
          : currentUnreadCount // No incrementar si es mensaje del usuario actual
      };
      
      // Reemplazar el canal en el array
      this.mockChannels[channelIndex] = updatedChannel;
    }
  }

  private generateMockMessage(): ChatMessage {
    const channels = ['general', 'user-maria'];
    const randomChannel = channels[Math.floor(Math.random() * channels.length)];
    const mockContents = [
      '¿Hay alguna plaza libre cerca de Sol?',
      'Acabo de liberar una plaza en Gran Vía',
      '¡Gracias por la plaza! 🙏',
      'Perfecto, nos vemos en 5 minutos',
      'La plaza está justo al lado del semáforo',
      '¿Sigue libre la plaza de Recoletos?'
    ];

    const message: ChatMessage = {
      id: this.generateMessageId(),
      channelId: randomChannel,
      senderId: 'user-maria',
      senderName: 'María García',
      senderAvatar: this.generateAvatar('María', 'García'),
      content: mockContents[Math.floor(Math.random() * mockContents.length)],
      timestamp: new Date(),
      messageType: 'text',
      isRead: false
    };

    try {
      this.addMockMessage(message);
    } catch (error) {
      console.error('Error añadiendo mensaje mock:', error);
    }
    
    return message;
  }

  private simulateServerResponse(originalMessage: ChatMessage): void {
    // Simular respuesta automática solo en canales directos
    if (originalMessage.channelId.startsWith('user-')) {
      const responses = [
        '¡Perfecto! Te veo allí en unos minutos 👍',
        'La plaza está disponible, date prisa',
        'Gracias por avisar, ya voy para allá',
        'Está bien, te espero un poco más',
        '¡Genial! Nos coordinamos por aquí'
      ];

      const responseMessage: ChatMessage = {
        id: this.generateMessageId(),
        channelId: originalMessage.channelId,
        senderId: 'user-maria',
        senderName: 'María García',
        senderAvatar: this.generateAvatar('María', 'García'),
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
        messageType: 'text',
        isRead: false
      };

      // Emitir como si viniera del servidor
      setTimeout(() => {
        try {
          this.addMockMessage(responseMessage);
          // Disparar evento para que lo capture onMessage()
          if (this.onMessageCallback) {
            this.onMessageCallback(responseMessage);
          }
        } catch (error) {
          console.error('Error simulando respuesta del servidor:', error);
        }
      }, 1000 + Math.random() * 2000);
    }
  }

  private onMessageCallback: ((message: ChatMessage) => void) | null = null;

  private joinUserToGeneralChannel(): void {
    if (this.socket?.connected) {
      this.socket.emit('join-channel', { channelId: 'general' });
    }
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAvatar(firstName: string, lastName: string): string {
    const name = `${firstName}+${lastName}`;
    const colors = ['3B82F6', '10B981', 'F59E0B', 'EF4444', '8B5CF6', '06B6D4'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return `https://ui-avatars.com/api/?name=${name}&background=${color}&color=fff&size=128`;
  }
}
