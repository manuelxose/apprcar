import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { UserLocation } from '@shared/interfaces';
import { UnifiedNotificationService } from './unified-notification.service';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private readonly notificationService = inject(UnifiedNotificationService);

  /**
   * Obtiene la posición actual del usuario
   */
  getCurrentPosition(options?: PositionOptions): Observable<UserLocation> {
    if (!navigator.geolocation) {
      return throwError(() => new Error('Geolocation is not supported by this browser'));
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutos
      ...options
    };

    return from(
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, defaultOptions);
      })
    ).pipe(
      map(position => this.mapPositionToUserLocation(position)),
      catchError(error => {
        this.handleGeolocationError(error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Observa los cambios de posición del usuario
   */
  watchPosition(options?: PositionOptions): Observable<UserLocation> {
    if (!navigator.geolocation) {
      return throwError(() => new Error('Geolocation is not supported by this browser'));
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minuto para watch
      ...options
    };

    return new Observable<UserLocation>(subscriber => {
      const watchId = navigator.geolocation.watchPosition(
        position => {
          const userLocation = this.mapPositionToUserLocation(position);
          subscriber.next(userLocation);
        },
        error => {
          this.handleGeolocationError(error);
          subscriber.error(error);
        },
        defaultOptions
      );

      // Cleanup function
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    });
  }

  /**
   * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
   */
  calculateDistance(
    location1: UserLocation, 
    location2: UserLocation
  ): number {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = this.toRadians(location2.latitude - location1.latitude);
    const dLon = this.toRadians(location2.longitude - location1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(location1.latitude)) * 
      Math.cos(this.toRadians(location2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c * 1000; // Convertir a metros
    
    return Math.round(distance);
  }

  /**
   * Verifica si el usuario está dentro de un radio específico de una ubicación
   */
  isWithinRadius(
    userLocation: UserLocation,
    targetLocation: UserLocation,
    radiusInMeters: number
  ): boolean {
    const distance = this.calculateDistance(userLocation, targetLocation);
    return distance <= radiusInMeters;
  }

  /**
   * Obtiene la dirección aproximada basada en las coordenadas
   * (En una implementación real, usarías un servicio de geocodificación inversa)
   */
  async getAddressFromCoordinates(location: UserLocation): Promise<string> {
    try {
      // Simulación - en producción usarías Google Maps API o similar
      return `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Error getting address:', error);
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
  }

  /**
   * Verifica si los permisos de geolocalización están concedidos
   */
  async checkGeolocationPermission(): Promise<PermissionState> {
    if (!navigator.permissions) {
      return 'granted'; // Asumir concedido si no hay API de permisos
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state;
    } catch (error) {
      console.error('Error checking geolocation permission:', error);
      return 'granted';
    }
  }

  /**
   * Solicita permisos de geolocalización al usuario
   */
  async requestGeolocationPermission(): Promise<boolean> {
    try {
      const permission = await this.checkGeolocationPermission();
      
      if (permission === 'granted') {
        return true;
      }
      
      if (permission === 'denied') {
        this.notificationService.showError(
          'Los permisos de ubicación están denegados. Por favor, actívalos en la configuración del navegador.'
        );
        return false;
      }

      // Si el permiso está en estado 'prompt', intentar obtener la ubicación
      // esto provocará el prompt automáticamente
      try {
        await this.getCurrentPosition({ timeout: 5000 }).toPromise();
        return true;
      } catch (error) {
        return false;
      }
    } catch (error) {
      console.error('Error requesting geolocation permission:', error);
      return false;
    }
  }

  /**
   * Formatea las coordenadas para mostrar al usuario
   */
  formatCoordinates(location: UserLocation): string {
    const lat = location.latitude.toFixed(6);
    const lng = location.longitude.toFixed(6);
    return `${lat}, ${lng}`;
  }

  /**
   * Verifica si las coordenadas son válidas
   */
  isValidLocation(location: UserLocation): boolean {
    return (
      location &&
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number' &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      location.longitude >= -180 &&
      location.longitude <= 180
    );
  }

  private mapPositionToUserLocation(position: GeolocationPosition): UserLocation {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };
  }

  private handleGeolocationError(error: GeolocationPositionError): void {
    let message = 'Error al obtener la ubicación';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Permisos de ubicación denegados. Por favor, activa la geolocalización en tu navegador.';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Información de ubicación no disponible. Verifica tu conexión y configuración.';
        break;
      case error.TIMEOUT:
        message = 'Tiempo agotado al obtener la ubicación. Inténtalo de nuevo.';
        break;
      default:
        message = `Error de geolocalización: ${error.message}`;
        break;
    }

    console.error('Geolocation error:', error);
    this.notificationService.showError(message);
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
