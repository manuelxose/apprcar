// =================== src/app/core/services/geolocation.service.ts ===================

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, fromEvent, merge, of } from 'rxjs';
import { map, catchError, shareReplay, tap } from 'rxjs';
import { LocationData, Coordinates, LocationSource } from '../models';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private currentLocationSubject = new BehaviorSubject<LocationData | null>(null);
  public currentLocation$ = this.currentLocationSubject.asObservable();
  
  private watchId: number | null = null;
  private isWatching = false;

  constructor() {
    this.initializeGeolocation();
  }

  /**
   * Obtener ubicación actual del usuario
   */
  getCurrentPosition(): Observable<LocationData> {
    return new Observable<LocationData>(observer => {
      if (!this.isGeolocationSupported()) {
        observer.error(new Error('Geolocation not supported'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = this.createLocationData(position, LocationSource.GPS);
          this.currentLocationSubject.next(locationData);
          observer.next(locationData);
          observer.complete();
        },
        (error) => {
          console.error('Geolocation error:', error);
          this.tryFallbackLocation().subscribe({
            next: (location) => {
              observer.next(location);
              observer.complete();
            },
            error: (fallbackError) => observer.error(fallbackError)
          });
        },
        options
      );
    });
  }

  /**
   * Iniciar seguimiento de ubicación en tiempo real
   */
  startWatchingPosition(): Observable<LocationData> {
    if (this.isWatching) {
      return this.currentLocation$.pipe(
        map(location => {
          if (!location) throw new Error('No location available');
          return location;
        })
      );
    }

    return new Observable<LocationData>(observer => {
      if (!this.isGeolocationSupported()) {
        observer.error(new Error('Geolocation not supported'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      };

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const locationData = this.createLocationData(position, LocationSource.GPS);
          this.currentLocationSubject.next(locationData);
          observer.next(locationData);
        },
        (error) => {
          console.error('Watch position error:', error);
          observer.error(error);
        },
        options
      );

      this.isWatching = true;

      // Cleanup function
      return () => {
        this.stopWatchingPosition();
      };
    }).pipe(shareReplay(1));
  }

  /**
   * Detener seguimiento de ubicación
   */
  stopWatchingPosition(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
    }
  }

  /**
   * Calcular distancia entre dos puntos (fórmula de Haversine)
   */
  calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371000; // Radio de la Tierra en metros
    const lat1Rad = this.toRadians(point1.latitude);
    const lat2Rad = this.toRadians(point2.latitude);
    const deltaLatRad = this.toRadians(point2.latitude - point1.latitude);
    const deltaLngRad = this.toRadians(point2.longitude - point1.longitude);

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Verificar si una ubicación está dentro de un radio específico
   */
  isWithinRadius(
    userLocation: Coordinates,
    targetLocation: Coordinates,
    radiusInMeters: number
  ): boolean {
    const distance = this.calculateDistance(userLocation, targetLocation);
    return distance <= radiusInMeters;
  }

  /**
   * Obtener ubicación aproximada por IP (fallback)
   */
  private tryFallbackLocation(): Observable<LocationData> {
    // En un caso real, aquí usarías un servicio de geolocalización por IP
    const vigoCoords: Coordinates = {
      latitude: 42.2406,
      longitude: -8.7207
    };

    const fallbackLocation: LocationData = {
      coordinates: vigoCoords,
      address: {
        formattedAddress: 'Vigo, España',
        city: 'Vigo',
        country: 'España',
        countryCode: 'ES'
      },
      timestamp: new Date(),
      source: LocationSource.IP,
      accuracy: 10000
    };

    this.currentLocationSubject.next(fallbackLocation);
    return of(fallbackLocation);
  }

  /**
   * Verificar si la geolocalización está soportada
   */
  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Verificar permisos de geolocalización
   */
  async checkPermissions(): Promise<PermissionState> {
    if (!('permissions' in navigator)) {
      return 'granted'; // Asumir granted si no hay API de permisos
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
   * Métodos de utilidad
   */
  private createLocationData(position: GeolocationPosition, source: LocationSource): LocationData {
    return {
      coordinates: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude || undefined,
        heading: position.coords.heading || undefined,
        speed: position.coords.speed || undefined
      },
      address: {
        formattedAddress: `${position.coords.latitude}, ${position.coords.longitude}`,
        city: 'Unknown',
        country: 'Unknown',
        countryCode: 'UN'
      },
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp),
      source
    };
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private initializeGeolocation(): void {
    if (this.isGeolocationSupported()) {
      this.getCurrentPosition().subscribe({
        next: (location) => console.log('Initial location obtained:', location),
        error: (error) => console.warn('Could not get initial location:', error)
      });
    }
  }

  ngOnDestroy(): void {
    this.stopWatchingPosition();
  }
}
