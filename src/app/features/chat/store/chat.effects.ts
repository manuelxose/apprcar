// src/app/features/chat/store/chat.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import * as ChatActions from './chat.actions';
import { ChatService } from '../../../core/services/chat.service';

@Injectable()
export class ChatEffects {
  private actions$ = inject(Actions);
  private chatService = inject(ChatService);

  initSocket$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.initChatSocket),
      switchMap(() =>
        this.chatService.onMessage().pipe(
          map(message => ChatActions.messageReceived({ message }))
        )
      )
    )
  );

  sendMessage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.sendMessage),
      tap(({ channelId, content }) => 
        this.chatService.sendMessage(channelId, content)
      )
    ), { dispatch: false }
  );

  joinChannel$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.joinChannel),
      tap(({ channelId }) => this.chatService.joinChannel(channelId))
    ), { dispatch: false }
  );

  loadChannels$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ChatActions.loadChannels),
      switchMap(() =>
        this.chatService.getChannels().pipe(
          map(channels => ChatActions.loadChannelsSuccess({ channels })),
          catchError(error => 
            of(ChatActions.loadChannelsFailure({ error: error.message }))
          )
        )
      )
    )
  );
}