// src/app/store/auth/auth.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, catchError, exhaustMap, tap } from 'rxjs/operators';
import { AuthService } from '@core/services/auth.service';
import { UnifiedNotificationService } from '@core/services/unified-notification.service';
import * as AuthActions from './auth.actions';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);
  private UnifiedNotificationService = inject(UnifiedNotificationService);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({ credentials }) =>
        this.authService.login(credentials).pipe(
          map(response => {
            localStorage.setItem('apparcar_token', response.token);
            this.UnifiedNotificationService.showSuccess(
              'Has iniciado sesión correctamente',
              '¡Bienvenido a Apparcar!'
            );
            return AuthActions.loginSuccess({ 
              token: response.token, 
              user: response.user 
            });
          }),
          catchError(error => {
            this.UnifiedNotificationService.showError(
              error.message || 'Error al iniciar sesión',
              'Error de inicio de sesión'
            );
            return of(AuthActions.loginFailure({ error: error.message }));
          })
        )
      )
    )
  );

  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      exhaustMap(({ data }) =>
        this.authService.login({ email: data.email, password: data.password }).pipe(
          map(response => {
            localStorage.setItem('apparcar_token', response.token);
            this.UnifiedNotificationService.showSuccess(
              'Tu cuenta ha sido registrada correctamente',
              '¡Cuenta creada exitosamente!'
            );
            return AuthActions.registerSuccess({ 
              token: response.token, 
              user: response.user 
            });
          }),
          catchError(error => {
            this.UnifiedNotificationService.showError(
              error.message || 'Error al crear cuenta',
              'Error al crear cuenta'
            );
            return of(AuthActions.registerFailure({ error: error.message }));
          })
        )
      )
    )
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => {
        localStorage.removeItem('apparcar_token');
        this.router.navigate(['/auth/login']);
        this.UnifiedNotificationService.showInfo(
          'Has cerrado sesión correctamente',
          'Sesión cerrada'
        );
      })
    ),
    { dispatch: false }
  );

  loginSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSuccess, AuthActions.registerSuccess),
      tap(() => {
        this.router.navigate(['/']);
      })
    ),
    { dispatch: false }
  );

  checkToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkTokenValidity),
      exhaustMap(() => {
        if (this.authService.isSessionValid()) {
          const user = this.authService.getCurrentUser();
          if (user) {
            return of(AuthActions.loadUserProfileSuccess({ user }));
          }
        }
        localStorage.removeItem('apparcar_token');
        return of(AuthActions.logout());
      })
    )
  );

  loadProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loadUserProfile),
      exhaustMap(() => {
        const user = this.authService.getCurrentUser();
        if (user) {
          return of(AuthActions.loadUserProfileSuccess({ user }));
        } else {
          return of(AuthActions.loginFailure({ error: 'No user found' }));
        }
      })
    )
  );

  updateProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.updateUserProfile),
      exhaustMap(({ userData }) => {
        // For now, just simulate profile update since the service doesn't have this method
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData };
          this.UnifiedNotificationService.showSuccess(
            'Tu perfil ha sido actualizado correctamente',
            'Perfil actualizado'
          );
          return of(AuthActions.updateUserProfileSuccess({ user: updatedUser }));
        } else {
          this.UnifiedNotificationService.showError(
            'No se pudo actualizar el perfil',
            'Error al actualizar perfil'
          );
          return of(AuthActions.loginFailure({ error: 'No user found' }));
        }
      })
    )
  );
}
