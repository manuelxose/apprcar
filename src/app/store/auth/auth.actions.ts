// src/app/store/auth/auth.actions.ts
import { User } from '@core/models';
import { LoginCredentials, RegisterData } from '@core/models/auth.interface';
import { createAction, props } from '@ngrx/store';

export const login = createAction(
  '[Auth] Login',
  props<{ credentials: LoginCredentials }>()
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ token: string; user: User }>()
);

export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);

export const register = createAction(
  '[Auth] Register',
  props<{ data: RegisterData }>()
);

export const registerSuccess = createAction(
  '[Auth] Register Success',
  props<{ token: string; user: User }>()
);

export const registerFailure = createAction(
  '[Auth] Register Failure',
  props<{ error: string }>()
);

export const logout = createAction('[Auth] Logout');

export const checkTokenValidity = createAction('[Auth] Check Token Validity');

export const loadUserProfile = createAction('[Auth] Load User Profile');

export const loadUserProfileSuccess = createAction(
  '[Auth] Load User Profile Success',
  props<{ user: User }>()
);

export const updateUserProfile = createAction(
  '[Auth] Update User Profile',
  props<{ userData: Partial<User> }>()
);

export const updateUserProfileSuccess = createAction(
  '[Auth] Update User Profile Success',
  props<{ user: User }>()
);
