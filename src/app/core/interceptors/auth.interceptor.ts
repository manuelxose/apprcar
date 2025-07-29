import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

import { StorageService as Storage } from '@core/services/storage';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storageService = inject(Storage);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  // Solo añadir headers de autenticación para APIs internas
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  // Obtener token de sesión
  const sessionToken = storageService.getItem<string>('session_token');
  const userAgent = navigator.userAgent;
  const deviceId = storageService.getItem<string>('device_id') || generateDeviceId();

  // Añadir headers de autenticación
  const authReq = req.clone({
    setHeaders: {
      'Authorization': sessionToken ? `Bearer ${sessionToken}` : '',
      'X-Device-ID': deviceId,
      'X-User-Agent': userAgent,
      'X-App-Version': '1.0.0',
      'X-Platform': getPlatform(),
      'Content-Type': 'application/json'
    }
  });

  return next(authReq).pipe(
    catchError(error => {
      // Manejar errores de autenticación
      if (error.status === 401) {
        handleUnauthorized();
      } else if (error.status === 403) {
        handleForbidden();
      }

      return throwError(() => error);
    })
  );

  function generateDeviceId(): string {
    const deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    storageService.setItem('device_id', deviceId);
    return deviceId;
  }

  function getPlatform(): string {
    if (/Android/i.test(navigator.userAgent)) return 'android';
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'ios';
    if (/Windows/i.test(navigator.userAgent)) return 'windows';
    if (/Mac/i.test(navigator.userAgent)) return 'mac';
    return 'web';
  }

  function handleUnauthorized(): void {
    // Limpiar sesión
    storageService.removeItem('session_token');
    storageService.removeItem('session_expiry');
    
    snackBar.open('Tu sesión ha expirado', 'Iniciar sesión', {
      duration: 4000,
      panelClass: ['warn-snackbar']
    }).onAction().subscribe(() => {
      router.navigate(['/login']);
    });

    // Redirigir después de un delay para que se vea el snackbar
    setTimeout(() => {
      router.navigate(['/login']);
    }, 1000);
  }

  function handleForbidden(): void {
    snackBar.open('No tienes permisos para realizar esta acción', 'Cerrar', {
      duration: 4000,
      panelClass: ['warn-snackbar']
    });
  }
};