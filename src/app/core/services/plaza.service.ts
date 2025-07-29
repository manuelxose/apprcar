// src/app/core/services/plaza.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError, timer, BehaviorSubject } from 'rxjs';
import { map, delay, switchMap, tap } from 'rxjs/operators';
import { PlazaLibre, PlazaConfirmation, LocationData, PlazaFilters } from '@core/models';
import { GeolocationService } from './geolocation';

@Injectable({
  providedIn: 'root'
})
export class PlazaService {
  private geolocationService = inject(GeolocationService);
  private plazasSubject = new BehaviorSubject<PlazaLibre[]>([]);
  
  // Mock data for development
  private mockPlazas: PlazaLibre[] = [];

  constructor() {
    this.initializeMockData();
    this.startPlazaExpirationTimer();
  }

  /**
   * Notificar que se va a liberar una plaza
   */
  notifyFreeParkingSpot(
    location: LocationData, 
    details?: any
  ): Observable<PlazaLibre> {
    return of(null).pipe(
      delay(800), // Simular latencia
      map(() => {
        const plaza: PlazaLibre = {
          id: this.generateId(),
          createdBy: this.getCurrentUserId(),
          location: {
            latitude: location.coordinates.latitude,
            longitude: location.coordinates.longitude,
            address: location.address?.formattedAddress,
            description: details?.description
          },
          status: 'available',
          details: {
            size: details?.size || 'medium',
            description: details?.description,
            isPaid: details?.isPaid || false,
            price: details?.price,
            restrictions: details?.restrictions,
            estimatedDuration: details?.timeAvailable || 30
          },
          availability: {
            availableFrom: new Date().toISOString(),
            availableUntil: details?.timeAvailable ? 
              new Date(Date.now() + details.timeAvailable * 60000).toISOString() : 
              undefined,
            isImmediate: true
          },
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 10 * 60000).toISOString(), // 10 minutos
          score: this.calculatePlazaScore(location)
        };

        // Añadir a la lista local
        this.mockPlazas.push(plaza);
        this.plazasSubject.next([...this.mockPlazas]);

        return plaza;
      })
    );
  }

  /**
   * Obtener plazas libres cercanas
   */
  getNearbyFreePlazas(
    location: LocationData, 
    filters?: PlazaFilters
  ): Observable<PlazaLibre[]> {
    return of(null).pipe(
      delay(500),
      map(() => {
        const radius = filters?.radius || 1000;
        const maxAge = filters?.maxAge || 10;
        const now = new Date();

        return this.mockPlazas
          .filter(plaza => {
            // Filtrar por edad
            const ageMinutes = (now.getTime() - new Date(plaza.createdAt).getTime()) / 60000;
            if (ageMinutes > maxAge) return false;

            // Filtrar por distancia
            const distance = this.calculateDistance(
              location.coordinates,
              plaza.location
            );
            plaza.distance = distance;

            if (distance > radius) return false;

            // Filtrar por disponibilidad
            if (filters?.showOnlyAvailable && plaza.status !== 'available') {
              return false;
            }

            // Filtrar por precio
            if (!filters?.includePaid && plaza.details.isPaid) {
              return false;
            }

            return true;
          })
          .sort((a, b) => {
            // Ordenar por score (distancia + tiempo)
            return (b.score || 0) - (a.score || 0);
          });
      })
    );
  }

  /**
   * Reclamar una plaza
   */
  claimParkingSpot(plazaId: string): Observable<{ plazaId: string; userId: string }> {
    return of(null).pipe(
      delay(300),
      map(() => {
        const plaza = this.mockPlazas.find(p => p.id === plazaId);
        
        if (!plaza) {
          throw new Error('Plaza no encontrada');
        }

        if (plaza.status !== 'available') {
          throw new Error('Plaza ya no está disponible');
        }

        // Actualizar estado
        plaza.status = 'claimed';
        plaza.claimedBy = this.getCurrentUserId();
        plaza.claimedAt = new Date().toISOString();

        this.plazasSubject.next([...this.mockPlazas]);

        return {
          plazaId,
          userId: this.getCurrentUserId()
        };
      })
    );
  }

  /**
   * Confirmar que se ocupó la plaza
   */
  confirmParkingOccupied(
    plazaId: string, 
    successful: boolean, 
    feedback?: string
  ): Observable<PlazaConfirmation> {
    return of(null).pipe(
      delay(400),
      map(() => {
        const plaza = this.mockPlazas.find(p => p.id === plazaId);
        
        if (!plaza) {
          throw new Error('Plaza no encontrada');
        }

        plaza.status = successful ? 'occupied' : 'unavailable';
        plaza.confirmedAt = new Date().toISOString();
        plaza.successful = successful;

        const confirmation: PlazaConfirmation = {
          id: this.generateId(),
          plazaId,
          userId: this.getCurrentUserId(),
          successful,
          feedback,
          confirmedAt: new Date().toISOString()
        };

        // Remover plaza después de confirmación
        setTimeout(() => {
          const index = this.mockPlazas.findIndex(p => p.id === plazaId);
          if (index !== -1) {
            this.mockPlazas.splice(index, 1);
            this.plazasSubject.next([...this.mockPlazas]);
          }
        }, 2000);

        return confirmation;
      })
    );
  }

  /**
   * Reportar plaza como no disponible
   */
  reportPlazaUnavailable(
    plazaId: string, 
    reason: string, 
    comment?: string
  ): Observable<void> {
    return of(undefined).pipe(
      delay(300),
      tap(() => {
        const plaza = this.mockPlazas.find(p => p.id === plazaId);
        if (plaza) {
          plaza.status = 'unavailable';
          plaza.reportedAt = new Date().toISOString();
        }
        this.plazasSubject.next([...this.mockPlazas]);
      })
    );
  }

  /**
   * Cancelar notificación de plaza
   */
  cancelPlazaNotification(plazaId: string): Observable<void> {
    return of(undefined).pipe(
      delay(200),
      tap(() => {
        const index = this.mockPlazas.findIndex(p => p.id === plazaId);
        if (index !== -1) {
          this.mockPlazas.splice(index, 1);
          this.plazasSubject.next([...this.mockPlazas]);
        }
      })
    );
  }

  // Métodos privados
  private initializeMockData(): void {
    // Generar algunas plazas de ejemplo para Madrid
    const madridCenter = { latitude: 40.4168, longitude: -3.7038 };
    
    for (let i = 0; i < 5; i++) {
      const plaza: PlazaLibre = {
        id: this.generateId(),
        createdBy: `user_${Math.floor(Math.random() * 100)}`,
        location: {
          latitude: madridCenter.latitude + (Math.random() - 0.5) * 0.01,
          longitude: madridCenter.longitude + (Math.random() - 0.5) * 0.01,
          address: `Calle Ejemplo ${i + 1}, Madrid`,
          description: `Plaza compartida ${i + 1}`
        },
        status: 'available',
        details: {
          size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)] as any,
          description: 'Plaza libre en la calle',
          isPaid: Math.random() > 0.7,
          price: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : undefined,
          estimatedDuration: Math.floor(Math.random() * 60) + 15
        },
        availability: {
          availableFrom: new Date(Date.now() - Math.random() * 300000).toISOString(),
          isImmediate: true
        },
        createdAt: new Date(Date.now() - Math.random() * 600000).toISOString(),
        expiresAt: new Date(Date.now() + (Math.random() * 600000 + 300000)).toISOString()
      };

      this.mockPlazas.push(plaza);
    }

    this.plazasSubject.next([...this.mockPlazas]);
  }

  private startPlazaExpirationTimer(): void {
    // Revisar expiraciones cada minuto
    timer(0, 60000).subscribe(() => {
      const now = new Date();
      const before = this.mockPlazas.length;
      
      this.mockPlazas = this.mockPlazas.filter(plaza => {
        return new Date(plaza.expiresAt) > now;
      });

      if (this.mockPlazas.length !== before) {
        this.plazasSubject.next([...this.mockPlazas]);
      }
    });
  }

  private calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = point1.latitude * Math.PI/180;
    const φ2 = point2.latitude * Math.PI/180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI/180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private calculatePlazaScore(location: LocationData): number {
    // Puntuación basada en factores como proximidad, tiempo, etc.
    let score = 100;
    
    // Factor tiempo (más reciente = mejor puntuación)
    const ageBonus = Math.max(0, 50 - (Date.now() / 60000));
    score += ageBonus;

    return Math.max(0, Math.min(100, score));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getCurrentUserId(): string {
    // En un entorno real, obtener del servicio de autenticación
    return localStorage.getItem('apparcar_user_id') || 'anonymous';
  }
}