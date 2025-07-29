import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@environments/environment';
import { tap, finalize } from 'rxjs';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const startTime = Date.now();
  
  // Solo hacer log en desarrollo
  if (environment.production) {
    return next(req);
  }

  console.group(`🌐 HTTP ${req.method} ${req.url}`);
  console.log('Request:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });

  return next(req).pipe(
    tap({
      next: (response) => {
        const duration = Date.now() - startTime;
        console.log(`✅ Response (${duration}ms):`, response);
      },
      error: (error) => {
        const duration = Date.now() - startTime;
        console.error(`❌ Error (${duration}ms):`, error);
      }
    }),
    finalize(() => {
      console.groupEnd();
    })
  );
};
