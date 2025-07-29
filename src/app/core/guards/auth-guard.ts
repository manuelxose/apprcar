import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, catchError, of } from 'rxjs';

import { MockDataService as MockData } from '@core/services/mock-data';
import { StorageService as Storage } from '@core/services/storage';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const mockDataService = inject(MockData);
  const storageService = inject(Storage);
  const snackBar = inject(MatSnackBar);

  // Verificar si hay sesión activa
  const hasValidSession = checkValidSession();
  
  if (!hasValidSession) {
    snackBar.open('Necesitas iniciar sesión para acceder', 'Login', {
      duration: 4000
    }).onAction().subscribe(() => {
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    });
    
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Verificar que el usuario existe y está activo
  return mockDataService.getMockUser().pipe(
    map(user => {
      if (!user || !user.isActive) {
        snackBar.open('Tu cuenta no está activa', 'Soporte');
        router.navigate(['/login']);
        return false;
      }

      // Actualizar última actividad
      storageService.setItem('last_activity', new Date().toISOString());
      return true;
    }),
    catchError(() => {
      snackBar.open('Error al verificar sesión', 'Reintentar');
      router.navigate(['/login']);
      return of(false);
    })
  );
};

function checkValidSession(): boolean {
  const storage = inject(Storage);
  
  // Verificar token de sesión
  const sessionToken = storage.getItem<string>('session_token');
  if (!sessionToken) return false;

  // Verificar expiración de sesión
  const sessionExpiry = storage.getItem<string>('session_expiry');
  if (!sessionExpiry || new Date() > new Date(sessionExpiry)) {
    // Limpiar sesión expirada
    storage.removeItem('session_token');
    storage.removeItem('session_expiry');
    return false;
  }

  return true;
}