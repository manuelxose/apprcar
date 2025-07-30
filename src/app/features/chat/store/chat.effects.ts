// src/app/features/chat/store/chat.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, EMPTY } from 'rxjs';
import { 
  map, 
  catchError, 
  exhaustMap, 
  switchMap, 
  tap, 
  withLatestFrom,
  filter,
  takeUntil
} from 'rxjs/operators';

import { ChatService } from '@core/services/chat.service';
import { UnifiedNotificationService } from '@core/services/unified-notification.service';
import * as ChatActions from './chat.actions';
import * as AuthActions from '@store/auth/auth.actions';
import * as AuthSelectors from '@store/auth/auth.selectors';

@Injectable()
export class ChatEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private chatService = inject(ChatService);
  private UnifiedNotificationService = inject(UnifiedNotificationService);

  // Inicializar conexión de chat tras login exitoso
  initChatSocket$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.initChatSocket, AuthActions.loginSuccess),
      tap(() => {
        console.log('Inicializando conexión de chat...');
        this.chatService.connect();
      }),
      switchMap(() =>
        this.chatService.onMessage().pipe(
          map(message => {
            // Mostrar notificación si el usuario no está en la conversación activa
            this.showMessageNotification(message);
            return ChatActions.messageReceived({ message });
          }),
          catchError(error => {
            console.error('Error en WebSocket de chat:', error);
            return of(ChatActions.socketError({ error: error.message }));
          })
        )
      )
    )
  );

  // Cargar canales de chat
  loadChannels$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.loadChannels),
      exhaustMap(() =>
        this.chatService.getChannels().pipe(
          map(channels => ChatActions.loadChannelsSuccess({ channels })),
          catchError(error => of(ChatActions.loadChannelsFailure({ error: error.message })))
        )
      )
    )
  );

  // Unirse a un canal
  joinChannel$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.joinChannel),
      tap(({ channelId }) => {
        console.log(`Uniéndose al canal: ${channelId}`);
        this.chatService.joinChannel(channelId);
      }),
      // Marcar mensajes como leídos al entrar al canal
      map(({ channelId }) => ChatActions.markMessagesAsRead({ channelId }))
    )
  );

  // Salir de un canal
  leaveChannel$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.leaveChannel),
      tap(({ channelId }) => {
        console.log(`Saliendo del canal: ${channelId}`);
        this.chatService.leaveChannel(channelId);
      })
    ),
    { dispatch: false }
  );

  // Enviar mensaje
  sendMessage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.sendMessage),
      withLatestFrom(this.store.select(AuthSelectors.selectCurrentUser)),
      tap(([{ channelId, content }, user]) => {
        if (user) {
          this.chatService.sendMessage(channelId, content, user);
        }
      })
    ),
    { dispatch: false }
  );

  // Desconectar al hacer logout
  disconnect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => {
        console.log('Desconectando chat...');
        this.chatService.disconnect();
      })
    ),
    { dispatch: false }
  );

  // Simular usuarios online (para desarrollo)
  simulateOnlineUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.initChatSocket),
      switchMap(() => 
        this.chatService.getOnlineUsers().pipe(
          map(users => ChatActions.usersOnlineUpdated({ users }))
        )
      )
    )
  );

  // Crear chat contextual para plaza
  createPlazaChat$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.createPlazaChat),
      withLatestFrom(this.store.select(AuthSelectors.selectCurrentUser)),
      switchMap(([{ plazaId, sharerUserId, claimerUserId }, currentUser]) => {
        // En un caso real, obtendrías los datos de los usuarios desde un servicio
        // Por ahora, simulamos usuarios mock para la demostración
        const mockSharerUser: any = {
          id: sharerUserId,
          profile: { firstName: 'Usuario', lastName: 'Compartidor' }
        };
        const mockClaimerUser: any = {
          id: claimerUserId,
          profile: { firstName: 'Usuario', lastName: 'Interesado' }
        };

        return this.chatService.createPlazaChat(plazaId, mockSharerUser, mockClaimerUser).pipe(
          map(channel => ChatActions.createPlazaChatSuccess({ channel })),
          catchError(error => of(ChatActions.socketError({ error: error.message })))
        );
      })
    )
  );

  private showMessageNotification(message: any): void {
    // Solo mostrar notificación si el mensaje no es del usuario actual
    if (message.senderId !== 'currentUser') {
      this.UnifiedNotificationService.showInfo(
        `${message.senderName}: ${message.content}`,
        'Nuevo mensaje',
        3000
      );
    }
  }
}
