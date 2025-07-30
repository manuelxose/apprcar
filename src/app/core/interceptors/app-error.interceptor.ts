// src/app/core/interceptors/app-error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { NotificationService } from '@core/services/notification.service';

export const appErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ha ocurrido un error inesperado';

      switch (error.status) {
        case 0:
          errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
          break;
        case 400:
          errorMessage = 'Solicitud inválida. Verifica los datos enviados.';
          break;
        case 401:
          errorMessage = 'No autorizado. Tu sesión ha expirado.';
          break;
        case 403:
          errorMessage = 'Acceso denegado. No tienes permisos suficientes.';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado.';
          break;
        case 422:
          errorMessage = 'Datos de entrada inválidos.';
          break;
        case 500:
          errorMessage = 'Error del servidor. Inténtalo más tarde.';
          break;
        case 503:
          errorMessage = 'Servicio no disponible temporalmente.';
          break;
        default:
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
      }

      // Mostrar notificación solo para errores no manejados específicamente
      if (error.status !== 401) {
        notificationService.showError(errorMessage);
      }

      return throwError(() => ({
        ...error,
        message: errorMessage
      }));
    })
  );
};
