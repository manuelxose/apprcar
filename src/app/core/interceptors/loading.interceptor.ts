import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { LoadingService } from '../services/loading';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Solo mostrar loading para ciertas requests
  const showLoading = shouldShowLoading(req.url, req.method);

  if (showLoading) {
    loadingService.show();
  }

  return next(req).pipe(
    finalize(() => {
      if (showLoading) {
        loadingService.hide();
      }
    })
  );

  function shouldShowLoading(url: string, method: string): boolean {
    // No mostrar loading para:
    // - Requests de analytics/tracking
    // - Requests muy frecuentes (cada pocos segundos)
    // - Requests de configuración/cache
    const skipLoadingPatterns = [
      '/analytics',
      '/tracking',
      '/health',
      '/ping',
      '/cache'
    ];

    if (skipLoadingPatterns.some(pattern => url.includes(pattern))) {
      return false;
    }

    // No mostrar loading para GET requests de datos rápidos
    if (method === 'GET' && (
      url.includes('/search') ||
      url.includes('/autocomplete') ||
      url.includes('/suggestions')
    )) {
      return false;
    }

    return true;
  }
};