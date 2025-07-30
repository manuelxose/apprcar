// src/app/core/interceptors/app-auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, switchMap, take } from 'rxjs/operators';
import { throwError } from 'rxjs';
import * as AuthSelectors from '@store/auth/auth.selectors';
import * as AuthActions from '@store/auth/auth.actions';

export const appAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);

  // URLs que no requieren token
  const publicUrls = ['/auth', '/public'];
  const isPublicUrl = publicUrls.some(url => req.url.includes(url));

  if (isPublicUrl) {
    return next(req);
  }

  return store.select(AuthSelectors.selectAuthToken).pipe(
    take(1),
    switchMap(token => {
      // Clonar request y añadir token si existe
      let authReq = req;
      
      if (token) {
        authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      return next(authReq).pipe(
        catchError(error => {
          // Si el token expiró o es inválido (401), hacer logout
          if (error.status === 401) {
            store.dispatch(AuthActions.logout());
          }

          return throwError(() => error);
        })
      );
    })
  );
};
