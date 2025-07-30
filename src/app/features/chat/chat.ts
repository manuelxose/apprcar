// src/app/features/chat/components/chat.component.ts
import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { ChatChannel } from '@core/models/chat.interface';
import * as ChatActions from './store/chat.actions';
import * as ChatSelectors from './store/chat.selectors';


@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss'],
})
export class ChatComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private router = inject(Router);

  // Signals
  channels = signal<ChatChannel[]>([]);
  onlineUsers = signal<any[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.store.dispatch(ChatActions.loadChannels());
    this.store.dispatch(ChatActions.initChatSocket());

    // Subscribe to store
    this.store.select(ChatSelectors.selectChannels).subscribe(
      channels => this.channels.set(channels)
    );

    this.store.select(ChatSelectors.selectUsersOnline).subscribe(
      users => this.onlineUsers.set(users)
    );

    this.store.select(ChatSelectors.selectChatLoading).subscribe(
      loading => this.loading.set(loading)
    );

    this.store.select(ChatSelectors.selectChatError).subscribe(
      error => this.error.set(error)
    );
  }

  ngOnDestroy(): void {
    // Cleanup handled by store
  }

  selectChannel(channel: ChatChannel): void {
    this.store.dispatch(ChatActions.setActiveChannel({ channelId: channel.id }));
    this.store.dispatch(ChatActions.joinChannel({ channelId: channel.id }));
    this.router.navigate(['/chat', channel.id]);
  }

  startNewChat(): void {
    // Navigate to user selection or show modal
    this.router.navigate(['/chat/new']);
  }

  createPlazaChat(plazaId: string, sharerUserId: string, claimerUserId: string): void {
    this.store.dispatch(ChatActions.createPlazaChat({ 
      plazaId, 
      sharerUserId, 
      claimerUserId 
    }));
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatTime(timestamp: Date): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  }

  formatLastSeen(lastSeen: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 5) return 'hace un momento';
    if (diffMinutes < 60) return `hace ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;
    
    return lastSeen.toLocaleDateString('es-ES');
  }
}
