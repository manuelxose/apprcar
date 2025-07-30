// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, take } from 'rxjs/operators';
import * as AuthSelectors from '@store/auth/auth.selectors';

export const createRoleGuard = (requiredRole: string): CanActivateFn => {
  return (route, state) => {
    const store = inject(Store);
    const router = inject(Router);

    return store.select(AuthSelectors.selectCurrentUser).pipe(
      take(1),
      map(user => {
        if (!user) {
          router.navigate(['/auth/login']);
          return false;
        }

        // Por ahora todos los usuarios tienen el mismo rol
        // En el futuro se puede implementar sistema de roles
        return true;
      })
    );
  };
};
