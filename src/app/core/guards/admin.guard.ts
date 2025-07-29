
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, catchError, of } from 'rxjs';

import { MockDataService as MockData } from '@core/services/mock-data';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const mockDataService = inject(MockData);
  const snackBar = inject(MatSnackBar);

  return mockDataService.getMockUser().pipe(
    map(user => {
      // Verificar si el usuario tiene permisos de administrador
      const isAdmin = user?.email === 'admin@parkingapp.com' || 
                     user?.profile.firstName === 'Admin';

      if (!isAdmin) {
        snackBar.open('No tienes permisos para acceder a esta sección', 'Cerrar', {
          duration: 4000,
          panelClass: ['warn-snackbar']
        });
        router.navigate(['/']);
        return false;
      }

      return true;
    }),
    catchError(() => {
      snackBar.open('Error al verificar permisos', 'Cerrar');
      router.navigate(['/']);
      return of(false);
    })
  );
};