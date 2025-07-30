// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import * as AuthSelectors from '@store/auth/auth.selectors';
import * as AuthActions from '@store/auth/auth.actions';

export const authGuard: CanActivateFn = (route, state) => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(AuthSelectors.selectIsAuthenticated).pipe(
    take(1),
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true;
      }

      // Si hay token pero no está validado, intentar validar
      const token = localStorage.getItem('apparcar_token');
      if (token) {
        store.dispatch(AuthActions.checkTokenValidity());
        return false; // Se resolverá en el próximo ciclo
      }

      // No autenticado, redirigir al login
      router.navigate(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    })
  );
};
