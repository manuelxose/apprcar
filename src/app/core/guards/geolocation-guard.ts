import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, catchError, of, switchMap, from } from 'rxjs';

import { GeolocationService as Geolocation } from '@core/services/geolocation';
import { StorageService as Storage } from '@core/services/storage';

export const geolocationGuard: CanActivateFn = (route, state) => {
  const geolocationService = inject(Geolocation);
  const storageService = inject(Storage);
  const snackBar = inject(MatSnackBar);
  const dialog = inject(MatDialog);

  // Verificar si ya se han verificado los permisos
  const permissionsChecked = storageService.getItem<boolean>('geolocation_permissions_checked');
  const permissionsGranted = storageService.getItem<boolean>('geolocation_permissions_granted');

  if (permissionsChecked && permissionsGranted) {
    return true;
  }

  if (permissionsChecked && !permissionsGranted) {
    // Ya se verificó y no se concedió permiso, mostrar mensaje pero permitir acceso
    showGeolocationInfo();
    return true;
  }

  // Primera vez, verificar permisos
  return from(geolocationService.checkPermissions()).pipe(
    switchMap(permissionState => {
      const hasPermission = permissionState === 'granted';
      storageService.setItem('geolocation_permissions_checked', true);
      
      if (hasPermission) {
        storageService.setItem('geolocation_permissions_granted', true);
        return of(true);
      }

      // Solicitar permisos
      return geolocationService.getCurrentPosition().pipe(
        map(() => {
          storageService.setItem('geolocation_permissions_granted', true);
          snackBar.open('¡Perfecto! Ahora podemos encontrar parkings cercanos', '', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          return true;
        }),
        catchError(() => {
          storageService.setItem('geolocation_permissions_granted', false);
          showGeolocationInfo();
          return of(true); // Permitir acceso sin geolocalización
        })
      );
    }),
    catchError(() => {
      storageService.setItem('geolocation_permissions_checked', true);
      storageService.setItem('geolocation_permissions_granted', false);
      showGeolocationInfo();
      return of(true);
    })
  );

  function showGeolocationInfo(): void {
    snackBar.open(
      'Para mejores resultados, activa la ubicación en configuración',
      'Activar',
      {
        duration: 6000,
        panelClass: ['info-snackbar']
      }
    ).onAction().subscribe(() => {
      // Intentar abrir configuración de ubicación
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'geolocation' as PermissionName })
          .then(() => {
            snackBar.open('Busca "Ubicación" en la configuración del navegador', '', {
              duration: 4000
            });
          });
      }
    });
  }
};
