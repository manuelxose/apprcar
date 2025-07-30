// src/app/features/chat/store/chat.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { ChatMessage, ChatChannel, ChatUser } from '../../../core/models/chat.interface';
import * as ChatActions from './chat.actions';

export interface ChatState {
  channels: ChatChannel[];
  messagesByChannel: { [channelId: string]: ChatMessage[] };
  activeChannelId: string | null;
  usersOnline: ChatUser[];
  isConnected: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  channels: [],
  messagesByChannel: {},
  activeChannelId: null,
  usersOnline: [],
  isConnected: false,
  loading: false,
  error: null
};

export const chatReducer = createReducer(
  initialState,
  on(ChatActions.loadChannels, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(ChatActions.loadChannelsSuccess, (state, { channels }) => ({
    ...state,
    channels,
    loading: false,
    error: null
  })),
  
  on(ChatActions.loadChannelsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  on(ChatActions.setActiveChannel, (state, { channelId }) => ({
    ...state,
    activeChannelId: channelId
  })),
  
  on(ChatActions.messageReceived, (state, { message }) => {
    const channelMessages = state.messagesByChannel[message.channelId] || [];
    return {
      ...state,
      messagesByChannel: {
        ...state.messagesByChannel,
        [message.channelId]: [...channelMessages, message]
      },
      channels: state.channels.map(channel => 
        channel.id === message.channelId
          ? { 
              ...channel, 
              lastMessage: message,
              unreadCount: message.senderId !== 'currentUser' 
                ? channel.unreadCount + 1 
                : channel.unreadCount
            }
          : channel
      )
    };
  }),
  
  on(ChatActions.usersOnlineUpdated, (state, { users }) => ({
    ...state,
    usersOnline: users
  })),
  
  on(ChatActions.markMessagesAsRead, (state, { channelId }) => ({
    ...state,
    channels: state.channels.map(channel =>
      channel.id === channelId
        ? { ...channel, unreadCount: 0 }
        : channel
    ),
    messagesByChannel: {
      ...state.messagesByChannel,
      [channelId]: (state.messagesByChannel[channelId] || []).map(msg => ({
        ...msg,
        isRead: true
      }))
    }
  })),

  // Socket connection states
  on(ChatActions.socketConnected, (state) => ({
    ...state,
    isConnected: true,
    error: null
  })),

  on(ChatActions.socketDisconnected, (state) => ({
    ...state,
    isConnected: false
  })),

  on(ChatActions.socketError, (state, { error }) => ({
    ...state,
    error,
    isConnected: false
  })),

  // Plaza chat creation
  on(ChatActions.createPlazaChat, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ChatActions.createPlazaChatSuccess, (state, { channel }) => ({
    ...state,
    channels: [channel, ...state.channels],
    activeChannelId: channel.id,
    loading: false,
    error: null
  }))
);