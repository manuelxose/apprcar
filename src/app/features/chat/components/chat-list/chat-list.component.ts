// src/app/features/chat/components/chat-list/chat-list.component.ts
import { 
  Component, 
  OnInit, 
  OnDestroy, 
  signal, 
  computed, 
  inject 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';

import { ChatChannel } from '@core/models/chat.interface';
import * as ChatActions from '../../store/chat.actions';
import * as ChatSelectors from '../../store/chat.selectors';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.scss']
})
export class ChatListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private store = inject(Store);
  private router = inject(Router);

  // Signals
  channels = signal<ChatChannel[]>([]);
  isLoading = signal(false);
  isConnected = signal(true);
  showSearch = signal(false);
  showOptionsMenu = signal(false);
  searchQuery = signal('');
  activeChannelId = signal<string | null>(null);

  // Computed properties
  filteredChannels = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.channels();

    return this.channels().filter(channel =>
      channel.name.toLowerCase().includes(query) ||
      channel.lastMessage?.content?.toLowerCase().includes(query)
    );
  });

  totalUnreadCount = computed(() => {
    return this.channels().reduce((total, channel) => total + channel.unreadCount, 0);
  });

  ngOnInit() {
    this.initializeStoreSubscriptions();
    this.loadChannels();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeStoreSubscriptions(): void {
    // Suscribirse a los canales
    this.store.select(ChatSelectors.selectChannels)
      .pipe(takeUntil(this.destroy$))
      .subscribe(channels => {
        this.channels.set(channels || []);
      });

    // Suscribirse al estado de carga
    this.store.select(ChatSelectors.selectChatLoading)
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.isLoading.set(loading));

    // Suscribirse al canal activo
    this.store.select(ChatSelectors.selectActiveChannelId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(channelId => this.activeChannelId.set(channelId));
  }

  private loadChannels(): void {
    this.store.dispatch(ChatActions.loadChannels());
    this.store.dispatch(ChatActions.initChatSocket());
  }

  // Métodos de UI
  getChannelInitials(channel: ChatChannel): string {
    return channel.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  }

  getChannelColor(channel: ChatChannel): string {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    const index = channel.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  }

  getLastMessageTime(channel: ChatChannel): string {
    if (!channel.lastMessage) return '';

    const date = new Date(channel.lastMessage.timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 1) return 'ahora';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  isOwnMessage(message: any): boolean {
    return message?.senderId === 'currentUser';
  }

  isPlazaChat(channel: ChatChannel): boolean {
    return channel.id.startsWith('plaza-') || channel.metadata?.contextType === 'plaza_sharing';
  }

  isTyping(channel: ChatChannel): boolean {
    // TODO: Implementar lógica de "escribiendo..."
    return false;
  }

  trackByChannelId(index: number, channel: ChatChannel): string {
    return channel.id;
  }

  // Métodos de interacción
  openChat(channel: ChatChannel): void {
    this.store.dispatch(ChatActions.setActiveChannel({ channelId: channel.id }));
    this.router.navigate(['/chat', channel.id]);
  }

  toggleSearch(): void {
    this.showSearch.set(!this.showSearch());
    if (!this.showSearch()) {
      this.searchQuery.set('');
    }
  }

  updateSearchQuery(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onSearchChange(): void {
    // La búsqueda es reactiva gracias al computed filteredChannels
  }

  toggleOptionsMenu(): void {
    this.showOptionsMenu.set(!this.showOptionsMenu());
  }

  hideOptionsMenu(): void {
    this.showOptionsMenu.set(false);
  }

  startNewChat(): void {
    this.router.navigate(['/map']);
  }

  markAllAsRead(): void {
    this.channels().forEach(channel => {
      if (channel.unreadCount > 0) {
        this.store.dispatch(ChatActions.markMessagesAsRead({ channelId: channel.id }));
      }
    });
    this.hideOptionsMenu();
  }

  openSettings(): void {
    this.router.navigate(['/settings/chat']);
    this.hideOptionsMenu();
  }

  showHelp(): void {
    // TODO: Mostrar modal de ayuda
    console.log('Mostrar ayuda del chat');
    this.hideOptionsMenu();
  }
}
