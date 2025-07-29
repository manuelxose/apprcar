// src/app/features/chat/components/chat-conversation.component.ts
import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ChatChannel, ChatMessage } from '@core/models/chat.interface';
import * as ChatActions from '../../store/chat.actions';
import * as ChatSelectors from '../../store/chat.selectors';


@Component({
  selector: 'app-chat-conversation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-conversation.html',
  styleUrls: ['./chat-conversation.scss']
})
export class ChatConversationComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Signals
  activeChannel = signal<ChatChannel | null>(null);
  messages = signal<ChatMessage[]>([]);
  messageText = '';
  
  private shouldScrollToBottom = false;

  ngOnInit(): void {
    const channelId = this.route.snapshot.paramMap.get('id');
    
    if (channelId) {
      this.store.dispatch(ChatActions.setActiveChannel({ channelId }));
      this.store.dispatch(ChatActions.joinChannel({ channelId }));
      this.store.dispatch(ChatActions.markMessagesAsRead({ channelId }));
    }

    // Subscribe to store
    this.store.select(ChatSelectors.selectActiveChannel).subscribe(
      channel => this.activeChannel.set(channel)
    );

    this.store.select(ChatSelectors.selectMessagesForActiveChannel).subscribe(
      messages => {
        this.messages.set(messages);
        this.shouldScrollToBottom = true;
      }
    );
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    if (this.activeChannel()?.id) {
      this.store.dispatch(ChatActions.leaveChannel({ 
        channelId: this.activeChannel()!.id 
      }));
    }
  }

  sendMessage(): void {
    if (!this.messageText.trim() || !this.activeChannel()) return;

    this.store.dispatch(ChatActions.sendMessage({
      channelId: this.activeChannel()!.id,
      content: this.messageText.trim()
    }));

    this.messageText = '';
    this.messageInput.nativeElement.style.height = '40px';
  }

  onEnterPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  goBack(): void {
    this.router.navigate(['/chat']);
  }

  private scrollToBottom(): void {
    try {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatMessageTime(timestamp: Date): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
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