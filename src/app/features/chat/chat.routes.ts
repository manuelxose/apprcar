// src/app/features/chat/chat.routes.ts
import { Routes } from '@angular/router';

export const chatRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./chat').then(m => m.ChatComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./components/chat-conversation/chat-conversation').then(m => m.ChatConversationComponent)
  }
];