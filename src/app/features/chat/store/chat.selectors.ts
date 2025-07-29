// src/app/features/chat/store/chat.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ChatState } from './chat.reducer';

export const selectChatState = createFeatureSelector<ChatState>('chat');

export const selectChannels = createSelector(
  selectChatState,
  (state: { channels: any; }) => state.channels
);

export const selectActiveChannelId = createSelector(
  selectChatState,
  (state: { activeChannelId: any; }) => state.activeChannelId
);

export const selectActiveChannel = createSelector(
  selectChannels,
  selectActiveChannelId,
  (channels: any[], activeChannelId: any) => 
    channels.find((channel: { id: any; }) => channel.id === activeChannelId) || null
);

export const selectMessagesForActiveChannel = createSelector(
  selectChatState,
  selectActiveChannelId,
  (state: { messagesByChannel: { [x: string]: any; }; }, activeChannelId: string | number) => 
    activeChannelId ? state.messagesByChannel[activeChannelId] || [] : []
);

export const selectUsersOnline = createSelector(
  selectChatState,
  (state: { usersOnline: any; }) => state.usersOnline
);

export const selectTotalUnreadCount = createSelector(
  selectChannels,
  (channels: any[]) => channels.reduce((total: any, channel: { unreadCount: any; }) => total + channel.unreadCount, 0)
);

export const selectChatLoading = createSelector(
  selectChatState,
  (state: { loading: any; }) => state.loading
);

export const selectChatError = createSelector(
  selectChatState,
  (state: { error: any; }) => state.error
);