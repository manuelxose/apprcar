// src/app/features/chat/store/chat.actions.ts
import { createAction, props } from '@ngrx/store';
import { ChatMessage, ChatChannel, ChatUser } from '../../../core/models/chat.interface';

export const initChatSocket = createAction('[Chat] Init Socket');

export const joinChannel = createAction(
  '[Chat] Join Channel',
  props<{ channelId: string }>()
);

export const leaveChannel = createAction(
  '[Chat] Leave Channel',
  props<{ channelId: string }>()
);

export const sendMessage = createAction(
  '[Chat] Send Message',
  props<{ channelId: string; content: string }>()
);

export const messageReceived = createAction(
  '[Chat] Message Received',
  props<{ message: ChatMessage }>()
);

export const loadChannels = createAction('[Chat] Load Channels');

export const loadChannelsSuccess = createAction(
  '[Chat] Load Channels Success',
  props<{ channels: ChatChannel[] }>()
);

export const loadChannelsFailure = createAction(
  '[Chat] Load Channels Failure',
  props<{ error: string }>()
);

export const setActiveChannel = createAction(
  '[Chat] Set Active Channel',
  props<{ channelId: string | null }>()
);

export const usersOnlineUpdated = createAction(
  '[Chat] Users Online Updated',
  props<{ users: ChatUser[] }>()
);

export const markMessagesAsRead = createAction(
  '[Chat] Mark Messages As Read',
  props<{ channelId: string }>()
);

// Nuevas acciones para manejo de errores y socket
export const socketError = createAction(
  '[Chat] Socket Error',
  props<{ error: string }>()
);

export const socketConnected = createAction('[Chat] Socket Connected');

export const socketDisconnected = createAction('[Chat] Socket Disconnected');

// Nuevas acciones para chat contextual de plazas
export const createPlazaChat = createAction(
  '[Chat] Create Plaza Chat',
  props<{ plazaId: string; sharerUserId: string; claimerUserId: string }>()
);

export const createPlazaChatSuccess = createAction(
  '[Chat] Create Plaza Chat Success',
  props<{ channel: ChatChannel }>()
);