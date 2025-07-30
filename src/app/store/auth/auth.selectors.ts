// src/app/store/auth/auth.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectCurrentUser = createSelector(
  selectAuthState,
  (state) => state?.user || null
);

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state) => state?.isAuthenticated || false
);

export const selectAuthToken = createSelector(
  selectAuthState,
  (state) => state?.token || null
);

export const selectAuthLoading = createSelector(
  selectAuthState,
  (state) => state?.loading || false
);

export const selectAuthError = createSelector(
  selectAuthState,
  (state) => state?.error || null
);

export const selectIsRegistering = createSelector(
  selectAuthState,
  (state) => state?.isRegistering || false
);

export const selectUserName = createSelector(
  selectCurrentUser,
  (user) => user ? `${user.profile.firstName} ${user.profile.lastName}` : ''
);

export const selectUserEmail = createSelector(
  selectCurrentUser,
  (user) => user?.email || ''
);

export const selectUserPoints = createSelector(
  selectCurrentUser,
  (user) => {
    // Since the current User interface doesn't have gamification,
    // we'll return a default value until gamification is implemented
    return 0;
  }
);

export const selectUserLevel = createSelector(
  selectCurrentUser,
  (user) => {
    // Since the current User interface doesn't have gamification,
    // we'll return a default value until gamification is implemented
    return 'Novato';
  }
);

export const selectUserReputation = createSelector(
  selectCurrentUser,
  (user) => {
    // Since the current User interface doesn't have gamification,
    // we'll return a default value until gamification is implemented
    return 0;
  }
);