import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, throwError, retry, timer, mergeMap } from 'rxjs';

import { environment } from '@environments/environment';
import { StorageService as Storage } from '@core/services/storage';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const router = inject(Router);

  return next(req).pipe(
    retry({
      count: 2,
      delay: (error, retryCount) => {
        // Solo reintentar para errores de red (5xx) o timeouts
        if (error.status >= 500 || error.status === 0) {
          return timer(Math.pow(2, retryCount) * 1000); // Backoff exponencial
        }
        return throwError(() => error);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      handleHttpError(error);
      return throwError(() => error);
    })
  );

  function handleHttpError(error: HttpErrorResponse): void {
    let errorMessage = 'Ha ocurrido un error inesperado';
    let actionLabel = 'Cerrar';
    let shouldNavigate = false;
    let navigateTo = '/';

    switch (error.status) {
      case 0:
        errorMessage = 'No hay conexión a internet. Verifica tu conexión.';
        actionLabel = 'Reintentar';
        break;

      case 400:
        errorMessage = error.error?.message || 'Los datos enviados no son válidos';
        break;

      case 401:
        errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        actionLabel = 'Iniciar sesión';
        shouldNavigate = true;
        navigateTo = '/login';
        break;

      case 403:
        errorMessage = 'No tienes permisos para realizar esta acción';
        break;

      case 404:
        errorMessage = 'El recurso solicitado no fue encontrado';
        if (req.url.includes('/api/parkings/')) {
          errorMessage = 'El parking no fue encontrado';
          actionLabel = 'Ver parkings';
          shouldNavigate = true;
          navigateTo = '/parkings';
        }
        break;

      case 409:
        errorMessage = 'Ya existe un conflicto con los datos. Intenta nuevamente.';
        if (req.url.includes('/reservations')) {
          errorMessage = 'Ya tienes una reserva activa para ese horario';
        }
        break;

      case 422:
        errorMessage = 'Los datos enviados contienen errores de validación';
        break;

      case 429:
        errorMessage = 'Demasiadas solicitudes. Espera un momento antes de intentar nuevamente.';
        break;

      case 500:
        errorMessage = 'Error interno del servidor. Nuestro equipo ha sido notificado.';
        actionLabel = 'Reportar problema';
        break;

      case 502:
      case 503:
      case 504:
        errorMessage = 'El servicio no está disponible temporalmente. Inténtalo más tarde.';
        actionLabel = 'Reintentar';
        break;

      default:
        if (error.status >= 400 && error.status < 500) {
          errorMessage = error.error?.message || 'Error en la solicitud';
        } else if (error.status >= 500) {
          errorMessage = 'Error del servidor. Inténtalo más tarde.';
        }
        break;
    }

    // Mostrar mensaje de error
    const snackBarRef = snackBar.open(errorMessage, actionLabel, {
      duration: error.status === 0 ? 0 : 6000, // Sin timeout para errores de conexión
      panelClass: ['error-snackbar']
    });

    // Manejar acción del snackbar
    snackBarRef.onAction().subscribe(() => {
      if (shouldNavigate) {
        router.navigate([navigateTo]);
      } else if (actionLabel === 'Reintentar') {
        // Recargar la página o reejecutar la última acción
        window.location.reload();
      } else if (actionLabel === 'Reportar problema') {
        // Abrir formulario de reporte o email
        window.open('mailto:soporte@parkingapp.com?subject=Error de aplicación&body=Código de error: ' + error.status, '_blank');
      }
    });

    // Log para desarrollo
    if (!environment.production) {
      console.group('🚨 HTTP Error');
      console.error('Status:', error.status);
      console.error('Message:', error.message);
      console.error('URL:', error.url);
      console.error('Error:', error.error);
      console.groupEnd();
    }

    // Tracking de errores para analytics
    trackError(error);
  }

  function trackError(error: HttpErrorResponse): void {
    // Aquí se enviarían los errores a un servicio de analytics
    const errorData = {
      timestamp: new Date().toISOString(),
      status: error.status,
      url: error.url,
      message: error.message,
      userAgent: navigator.userAgent,
      userId: getUserId()
    };

    // En producción, enviar a servicio de analytics
    if (environment.production) {
      // analytics.track('http_error', errorData);
    }
  }

  function getUserId(): string | null {
    const storage = inject(Storage);
    return storage.getItem<string>('user_id') || null;
  }
};
