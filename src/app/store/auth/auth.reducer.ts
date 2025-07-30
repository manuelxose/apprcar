
// src/app/store/auth/auth.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { User } from '@core/models';
import * as AuthActions from './auth.actions';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  isRegistering: boolean;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('apparcar_token'),
  isAuthenticated: false,
  loading: false,
  error: null,
  isRegistering: false
};

export const authReducer = createReducer(
  initialState,
  
  // Login
  on(AuthActions.login, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(AuthActions.loginSuccess, (state, { token, user }) => ({
    ...state,
    user,
    token,
    isAuthenticated: true,
    loading: false,
    error: null
  })),
  
  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    isAuthenticated: false,
    user: null,
    token: null
  })),
  
  // Register
  on(AuthActions.register, (state) => ({
    ...state,
    isRegistering: true,
    error: null
  })),
  
  on(AuthActions.registerSuccess, (state, { token, user }) => ({
    ...state,
    user,
    token,
    isAuthenticated: true,
    isRegistering: false,
    loading: false,
    error: null
  })),
  
  on(AuthActions.registerFailure, (state, { error }) => ({
    ...state,
    isRegistering: false,
    error,
    isAuthenticated: false
  })),
  
  // Logout
  on(AuthActions.logout, () => ({
    ...initialState,
    token: null
  })),
  
  // Profile
  on(AuthActions.loadUserProfile, (state) => ({
    ...state,
    loading: true
  })),
  
  on(AuthActions.loadUserProfileSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false,
    isAuthenticated: true
  })),
  
  on(AuthActions.updateUserProfile, (state) => ({
    ...state,
    loading: true
  })),
  
  on(AuthActions.updateUserProfileSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false
  }))
);
