// src/app/features/chat/components/chat-conversation/chat-conversation.component.ts
import { 
  Component, 
  OnInit, 
  OnDestroy, 
  AfterViewChecked,
  signal, 
  computed, 
  inject, 
  ViewChild, 
  ElementRef 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { ChatChannel, ChatMessage } from '@core/models/chat.interface';
import * as ChatActions from '../../store/chat.actions';
import * as ChatSelectors from '../../store/chat.selectors';
import * as AuthSelectors from '@store/auth/auth.selectors';

@Component({
  selector: 'app-chat-conversation',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    RouterModule
  ],
  templateUrl: './chat-conversation.component.html',
  styleUrls: ['./chat-conversation.component.scss']
})
export class ChatConversationComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;

  private destroy$ = new Subject<void>();
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Signals
  activeChannel = signal<ChatChannel | null>(null);
  messages = signal<ChatMessage[]>([]);
  isLoading = signal(false);
  newMessage = signal('');
  showContextMenu = signal(false);
  contextMenuStyle = signal('');
  isTyping = signal(false);
  someoneIsTyping = signal(false);

  // Props computadas
  canSendMessage = computed(() => {
    return this.newMessage().trim().length > 0 && this.activeChannel();
  });

  private shouldScrollToBottom = true;
  private lastMessageCount = 0;

  ngOnInit() {
    this.initializeSubscriptions();
    this.loadChannelFromRoute();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom && this.messages().length > this.lastMessageCount) {
      this.scrollToBottom();
      this.lastMessageCount = this.messages().length;
      this.shouldScrollToBottom = false;
    }
  }

  private initializeSubscriptions(): void {
    // Suscribirse al canal activo
    this.store.select(ChatSelectors.selectActiveChannel)
      .pipe(takeUntil(this.destroy$))
      .subscribe(channel => {
        this.activeChannel.set(channel);
        if (channel) {
          this.shouldScrollToBottom = true;
        }
      });

    // Suscribirse a los mensajes
    this.store.select(ChatSelectors.selectMessagesForActiveChannel)
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        this.messages.set(messages || []);
        this.shouldScrollToBottom = true;
      });

    // Suscribirse al estado de carga
    this.store.select(ChatSelectors.selectChatLoading)
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.isLoading.set(loading));
  }

  private loadChannelFromRoute(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const channelId = params['channelId'];
        if (channelId) {
          this.store.dispatch(ChatActions.setActiveChannel({ channelId }));
          this.store.dispatch(ChatActions.joinChannel({ channelId }));
        }
      });
  }

  // Métodos de UI
  getChannelInitials(): string {
    const name = this.activeChannel()?.name || '';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  }

  getChannelStatus(): string {
    const channel = this.activeChannel();
    if (!channel) return '';

    if (channel.type === 'global') {
      return 'Chat general de la comunidad';
    }

    if (channel.isOnline) {
      return 'En línea';
    }

    if (channel.lastSeen) {
      const diff = Date.now() - new Date(channel.lastSeen).getTime();
      const minutes = Math.floor(diff / 60000);
      
      if (minutes < 1) return 'Visto hace un momento';
      if (minutes < 60) return `Visto hace ${minutes} min`;
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `Visto hace ${hours}h`;
      
      return 'Visto hace más de un día';
    }

    return 'Desconectado';
  }

  isOwnMessage(message: ChatMessage): boolean {
    return message.senderId === 'currentUser';
  }

  getMessageBubbleClass(message: ChatMessage): string {
    if (message.messageType === 'system') {
      return 'bg-gray-100 text-gray-700 mx-auto text-center';
    }

    return this.isOwnMessage(message)
      ? 'bg-blue-600 text-white ml-auto'
      : 'bg-white text-gray-900 border border-gray-200';
  }

  getUserInitials(name: string): string {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  }

  formatTime(timestamp: Date): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  }

  isPlazaChat(): boolean {
    return this.activeChannel()?.id?.startsWith('plaza-') || false;
  }

  getTypingIndicatorText(): string {
    return `${this.activeChannel()?.name?.split(' ')[0] || 'Alguien'} está escribiendo...`;
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  // Métodos de interacción
  sendMessage(): void {
    const content = this.newMessage().trim();
    const channelId = this.activeChannel()?.id;

    if (content && channelId) {
      this.store.dispatch(ChatActions.sendMessage({ channelId, content }));
      this.newMessage.set('');
      this.shouldScrollToBottom = true;
      
      // Focus en el input después de enviar
      setTimeout(() => {
        this.messageInput?.nativeElement?.focus();
      }, 100);
    }
  }

  updateMessage(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.newMessage.set(target.value);
  }

  sendQuickMessage(content: string): void {
    const channelId = this.activeChannel()?.id;
    if (channelId) {
      this.store.dispatch(ChatActions.sendMessage({ channelId, content }));
      this.shouldScrollToBottom = true;
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onTyping(): void {
    // Implementar indicador de "escribiendo..."
    // Por simplicidad, solo actualizamos el signal local
    this.isTyping.set(true);
    
    // Debounce para dejar de mostrar "escribiendo"
    setTimeout(() => {
      this.isTyping.set(false);
    }, 1000);
  }

  onScroll(): void {
    const container = this.messagesContainer.nativeElement;
    const isAtBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 10;
    
    if (isAtBottom) {
      this.shouldScrollToBottom = true;
    }
  }

  private scrollToBottom(): void {
    try {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.warn('Error al hacer scroll:', err);
    }
  }

  // Métodos de menús y acciones
  showChannelInfo(): void {
    // TODO: Mostrar modal con información del canal
    console.log('Mostrar info del canal:', this.activeChannel());
  }

  makeCall(): void {
    // TODO: Integrar con sistema de llamadas
    console.log('Realizar llamada a:', this.activeChannel()?.name);
  }

  openAttachmentMenu(): void {
    // TODO: Abrir menú de adjuntos
    console.log('Abrir menú de adjuntos');
  }

  openEmojiPicker(): void {
    // TODO: Abrir selector de emojis
    console.log('Abrir selector de emojis');
  }

  hideContextMenu(): void {
    this.showContextMenu.set(false);
  }

  goBack(): void {
    this.router.navigate(['/chat']);
  }
}