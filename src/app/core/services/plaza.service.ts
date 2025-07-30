// src/app/core/services/plaza.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError, timer, BehaviorSubject } from 'rxjs';
import { map, delay, switchMap, tap, catchError } from 'rxjs/operators';
import { PlazaLibre, PlazaConfirmation, LocationData, PlazaFilters, User } from '@core/models';
import { GeolocationService } from './geolocation';
import { MockPlazaService } from './mock-plaza.service';
import { PlazaChatIntegrationService } from './plaza-chat-integration.service';
import { UnifiedNotificationService } from './unified-notification.service';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlazaService {
  private geolocationService = inject(GeolocationService);
  private mockPlazaService = inject(MockPlazaService);
  private plazaChatIntegration = inject(PlazaChatIntegrationService);
  private notificationService = inject(UnifiedNotificationService);
  private plazasSubject = new BehaviorSubject<PlazaLibre[]>([]);
  
  // Mock data for development
  private mockPlazas: PlazaLibre[] = [];
  private useMockService = environment.mockDataEnabled;

  constructor() {
    if (this.useMockService) {
      console.log('🔄 Usando servicio de plazas simuladas');
      this.initializeMockService();
    } else {
      this.initializeMockData();
      this.startPlazaExpirationTimer();
    }
  }

  private initializeMockService(): void {
    // Suscribirse a las plazas del servicio mock
    this.mockPlazaService.plazas$.subscribe(plazas => {
      this.plazasSubject.next(plazas);
    });
  }

  /**
   * Notificar que se va a liberar una plaza
   */
  notifyFreeParkingSpot(
    location: LocationData, 
    details?: any
  ): Observable<PlazaLibre> {
    if (this.useMockService) {
      return this.mockPlazaService.notifyFreePlaza(location, details);
    }

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
    console.log('🔍 PlazaService: getNearbyFreePlazas called');
    console.log('📍 Location:', location.coordinates);
    console.log('🎛️ Filters:', filters);
    console.log('🔧 useMockService:', this.useMockService);
    
    if (this.useMockService) {
      const radius = filters?.radius || 2000;
      console.log('📞 Calling MockPlazaService with radius:', radius);
      return this.mockPlazaService.getPlazasNearLocation(location, radius);
    }

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
    if (this.useMockService) {
      return this.mockPlazaService.claimPlaza(plazaId).pipe(
        map(success => ({
          plazaId,
          userId: 'mock-user-id',
          success
        })),
        tap(result => {
          if (result.success) {
            // Enviar notificación push al propietario de la plaza
            this.sendPlazaClaimedNotification(plazaId);
          }
        })
      );
    }

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

        // Enviar notificación push al propietario de la plaza
        this.sendPlazaClaimedNotification(plazaId, plaza);

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

  // ===== INTEGRACIÓN CON CHAT =====

  /**
   * Reclamar plaza con creación automática de chat
   */
  claimParkingSpotWithChat(plazaId: string, currentUser: User): Observable<{ plazaId: string; userId: string; chatCreated: boolean }> {
    return this.claimParkingSpot(plazaId).pipe(
      tap(result => {
        // Crear chat automáticamente después de reclamar
        this.createPlazaChatAfterClaim(plazaId, currentUser);
      }),
      map(result => ({
        ...result,
        chatCreated: true
      }))
    );
  }

  /**
   * Crear chat automáticamente después de reclamar plaza
   */
  private async createPlazaChatAfterClaim(plazaId: string, claimerUser: User): Promise<void> {
    try {
      // Obtener información del dueño de la plaza
      const plazaOwner = await this.getPlazaOwner(plazaId);
      
      // Crear el chat usando el servicio de integración
      this.plazaChatIntegration.createPlazaChatOnClaim(
        plazaId,
        plazaOwner,
        claimerUser
      ).subscribe({
        next: (channel) => {
          console.log(`Chat creado para plaza ${plazaId}:`, channel.id);
        },
        error: (error) => {
          console.error('Error creando chat para plaza:', error);
        }
      });
    } catch (error) {
      console.error('Error obteniendo información del dueño de la plaza:', error);
    }
  }

  /**
   * Obtener información del dueño de la plaza
   */
  private async getPlazaOwner(plazaId: string): Promise<User> {
    // En un entorno real, esto consultaría la base de datos
    const plaza = this.mockPlazas.find(p => p.id === plazaId);
    
    if (!plaza) {
      throw new Error('No se pudo obtener información del dueño de la plaza');
    }

    // Mock user data - en producción vendría de un servicio de usuarios
    return {
      id: plaza.createdBy || 'owner-default',
      email: 'owner@example.com',
      profile: {
        firstName: 'Juan',
        lastName: 'Pérez',
        avatar: 'https://via.placeholder.com/100'
      }
    } as User;
  }

  /**
   * Confirmar ocupación de plaza con notificación al chat
   */
  confirmPlazaOccupationWithChat(plazaId: string, successful: boolean): Observable<any> {
    // Enviar notificación al chat
    this.plazaChatIntegration.sendPlazaConfirmationMessage(plazaId, successful);
    this.plazaChatIntegration.handlePlazaExchangeCompleted(plazaId, successful);

    // Enviar notificación push
    const points = successful ? 10 : 0; // Puntos por plaza exitosa
    this.sendPlazaConfirmationNotification(plazaId, successful, points);

    // Simular confirmación (en producción sería una llamada real al API)
    return of({ plazaId, successful, confirmedAt: new Date().toISOString() }).pipe(
      delay(300),
      tap(() => {
        // Actualizar estado local
        const plaza = this.mockPlazas.find(p => p.id === plazaId);
        if (plaza) {
          plaza.status = successful ? 'occupied' : 'available';
          plaza.successful = successful;
          plaza.confirmedAt = new Date().toISOString();
          this.plazasSubject.next([...this.mockPlazas]);
        }
      })
    );
  }

  /**
   * Notificar llegada con mensaje al chat
   */
  notifyArrivalWithChat(plazaId: string, estimatedArrival: number): void {
    const userId = this.getCurrentUserId();
    this.plazaChatIntegration.sendArrivalNotification(plazaId, userId, estimatedArrival);
  }

  /**
   * Reportar problema con creación de chat de emergencia
   */
  reportPlazaIssueWithChat(
    plazaId: string,
    reporterUser: User,
    issueDescription: string
  ): Observable<any> {
    return this.plazaChatIntegration.createEmergencyPlazaChat(
      plazaId,
      reporterUser,
      issueDescription
    );
  }

  /**
   * Navegar al chat de una plaza específica
   */
  openPlazaChat(plazaId: string): void {
    this.plazaChatIntegration.navigateToPlazaChat(plazaId);
  }

  /**
   * Verificar si existe chat activo para una plaza
   */
  hasActivePlazaChat(plazaId: string): Observable<boolean> {
    return this.plazaChatIntegration.hasActivePlazaChat(plazaId);
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

  // Métodos de notificaciones push

  /**
   * Enviar notificación push cuando una plaza es reclamada
   */
  private sendPlazaClaimedNotification(plazaId: string, plaza?: PlazaLibre): void {
    if (!this.notificationService.areNotificationsEnabled()) {
      return;
    }

    // Obtener información de la plaza si no se proporciona
    if (!plaza) {
      plaza = this.mockPlazas.find(p => p.id === plazaId);
    }

    if (!plaza) {
      return;
    }

    // Obtener nombre del usuario que reclama (simulado)
    const claimerName = this.getCurrentUserName();
    const address = plaza.location.address || 'Ubicación desconocida';

    // Enviar notificación al propietario de la plaza
    this.notificationService.sendPlazaClaimedNotification(
      claimerName,
      plazaId,
      `plaza-${plazaId}` // channelId para el chat
    );
  }

  /**
   * Enviar notificación push cuando se confirma la ocupación de una plaza
   */
  private sendPlazaConfirmationNotification(plazaId: string, successful: boolean, points?: number): void {
    if (!this.notificationService.areNotificationsEnabled()) {
      return;
    }

    this.notificationService.sendPlazaConfirmedNotification(successful, points);
  }

  /**
   * Enviar notificación push cuando hay una nueva plaza disponible cerca del usuario
   */
  private sendNewPlazaAvailableNotification(plaza: PlazaLibre, distance: number): void {
    if (!this.notificationService.areNotificationsEnabled()) {
      return;
    }

    const address = plaza.location.address || `${plaza.location.latitude}, ${plaza.location.longitude}`;
    
    this.notificationService.sendPlazaAvailableNotification(
      address,
      Math.round(distance),
      plaza.id
    );
  }

  /**
   * Obtener nombre del usuario actual (simulado)
   */
  private getCurrentUserName(): string {
    // En una implementación real, esto vendría del servicio de autenticación
    return 'Usuario';
  }

  private getCurrentUserId(): string {
    // En un entorno real, obtener del servicio de autenticación
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('apparcar_user_id') || 'anonymous';
    }
    return 'anonymous';
  }
}
