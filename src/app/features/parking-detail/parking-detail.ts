import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';

// Componentes modernizados sin Angular Material
import { Loading } from '@shared/components/loading/loading';
import { ParkingInfoComponent } from './components/parking-info/parking-info';
import { ParkingMapComponent } from './components/parking-map/parking-map';
import { ParkingBookingComponent } from './components/parking-booking/parking-booking';

// Servicios
import { ParkingService } from '@core/services/parking';
import { MockDataService } from '@core/services/mock-data';
import { GeolocationService } from '@core/services/geolocation';
import { UnifiedNotificationService } from '@core/services/unified-notification.service';
import { PushNotificationService } from '@core/services';

// Modelos
import { Parking, ParkingReservation, LocationData } from '@core/models';

@Component({
  selector: 'app-parking-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    Loading,
    ParkingInfoComponent,
    ParkingMapComponent,
    ParkingBookingComponent
  ],
  templateUrl: './parking-detail.html',
  styleUrls: ['./parking-detail.scss']
})
export class ParkingDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private parkingService = inject(ParkingService);
  private mockDataService = inject(MockDataService);
  private geolocationService = inject(GeolocationService);
  private notificationService = inject(UnifiedNotificationService);
  private pushNotificationService = inject(PushNotificationService);

  // Signals reactivos
  parking = signal<Parking | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  isFavorite = signal(false);
  activeTab = signal<'info' | 'map' | 'booking'>('info');
  userLocation = signal<LocationData | null>(null);
  bookingInProgress = signal(false);
  showFullDescription = signal(false);
  notificationEnabled = signal(false);
  watchingAvailability = signal(false);

  // Computed properties
  canMakeReservation = computed(() => {
    const p = this.parking();
    return p && p.status === 'active' && p.capacity.available > 0;
  });

  availabilityPercentage = computed(() => {
    const p = this.parking();
    if (!p) return 0;
    return Math.round((p.capacity.available / p.capacity.total) * 100);
  });

  statusColor = computed(() => {
    const percentage = this.availabilityPercentage();
    if (percentage > 60) return 'green';
    if (percentage > 30) return 'yellow';
    return 'red';
  });

  pricePerHour = computed(() => {
    const p = this.parking();
    if (!p || !p.pricing?.rates?.length) return 0;
    return Math.min(...p.pricing.rates.map(rate => rate.price));
  });

  distance = computed(() => {
    const p = this.parking();
    const userLoc = this.userLocation();
    if (!p || !userLoc) return 0;
    
    const distance = this.calculateDistance(
      userLoc.coordinates,
      { latitude: p.location.latitude, longitude: p.location.longitude }
    );
    
    console.log(`📏 Distance calculated: ${Math.round(distance)}m from user to ${p.name}`);
    return distance;
  });

  keyFeatures = computed(() => {
    const p = this.parking();
    if (!p) return [];
    
    const features = [];
    if (p.features?.security?.surveillance) features.push('CCTV');
    if (p.features?.security?.guards) features.push('Vigilancia');
    if (p.features?.services?.electricCharging) features.push('Carga eléctrica');
    if (p.features?.accessibility?.wheelchairAccess) features.push('Accesible');
    if (p.schedule?.is24Hours) features.push('24h');
    
    return features.slice(0, 4); // Máximo 4 features
  });

  ngOnInit(): void {
    this.loadParkingDetails();
    this.loadUserLocation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadParkingDetails(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) {
          console.error('❌ No parking ID provided in route');
          this.error.set('ID de parking no válido');
          return [];
        }
        console.log('🅿️ Loading parking details for ID:', id);
        return this.mockDataService.getParkingById(id);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (parking) => {
        if (parking) {
          console.log('✅ Parking loaded successfully:', parking.name, 'in', parking.address);
          this.parking.set(parking);
          this.checkIfFavorite(parking.id);
          this.initializeNotificationState();
        } else {
          console.error('❌ Parking not found for provided ID');
          this.error.set('Parking no encontrado');
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading parking:', error);
        this.error.set('Error al cargar el parking');
        this.loading.set(false);
      }
    });
  }

  private loadUserLocation(): void {
    this.geolocationService.getCurrentPosition().subscribe({
      next: (location) => {
        console.log('🧭 User location obtained:', location);
        this.userLocation.set(location);
      },
      error: (error) => {
        console.warn('Could not get user location, using Vigo default:', error);
        // Usar ubicación por defecto de Vigo
        const defaultVigoLocation = {
          coordinates: { latitude: 42.2406, longitude: -8.7207 },
          address: {
            formattedAddress: 'Vigo, España',
            city: 'Vigo',
            country: 'España',
            countryCode: 'ES'
          },
          accuracy: 0,
          timestamp: new Date(),
          source: 'manual' as any
        };
        this.userLocation.set(defaultVigoLocation);
      }
    });
  }

  private checkIfFavorite(parkingId: string): void {
    // Simular verificación de favoritos desde localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const favorites = JSON.parse(localStorage.getItem('parking_favorites') || '[]');
      this.isFavorite.set(favorites.includes(parkingId));
    } else {
      this.isFavorite.set(false);
    }
  }

  private calculateDistance(userCoords: any, parkingCoords: any): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(parkingCoords.latitude - userCoords.latitude);
    const dLng = this.toRadians(parkingCoords.longitude - userCoords.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(userCoords.latitude)) * 
              Math.cos(this.toRadians(parkingCoords.latitude)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Métodos públicos
  onBackClick(): void {
    this.router.navigate(['/']);
  }

  onTabChange(tab: 'info' | 'map' | 'booking'): void {
    this.activeTab.set(tab);
  }

  onToggleFavorite(): void {
    const parking = this.parking();
    if (!parking) return;

    if (typeof window !== 'undefined' && window.localStorage) {
      const favorites = JSON.parse(localStorage.getItem('parking_favorites') || '[]');
      const isFav = this.isFavorite();
      
      if (isFav) {
        const index = favorites.indexOf(parking.id);
        if (index > -1) favorites.splice(index, 1);
      } else {
        favorites.push(parking.id);
      }
      
      localStorage.setItem('parking_favorites', JSON.stringify(favorites));
      this.isFavorite.set(!isFav);
      
      this.notificationService.showSuccess(
        isFav ? 'El parking ha sido eliminado de tus favoritos' : 'El parking ha sido añadido a tus favoritos',
        isFav ? 'Eliminado de favoritos' : 'Añadido a favoritos'
      );
    }
  }

  onOpenInMaps(): void {
    const parking = this.parking();
    if (!parking) return;

    const { latitude, longitude } = parking.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    
    console.log(`🗺️ Opening navigation to ${parking.name} at coordinates: ${latitude}, ${longitude}`);
    console.log(`📍 Address: ${parking.address}`);
    
    window.open(url, '_blank');
  }

  onCallParking(): void {
    const parking = this.parking();
    if (parking?.contact?.phone) {
      window.open(`tel:${parking.contact.phone}`, '_self');
    }
  }

  onShareParking(): void {
    const parking = this.parking();
    if (!parking) return;

    if (navigator.share) {
      navigator.share({
        title: parking.name,
        text: `Parking en ${parking.address}`,
        url: window.location.href
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: copiar al clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.notificationService.showSuccess(
          'El enlace ha sido copiado al clipboard',
          'Enlace copiado'
        );
      });
    }
  }

  onToggleDescription(): void {
    this.showFullDescription.update(show => !show);
  }

  onBookParking(): void {
    const parking = this.parking();
    if (!parking || !this.canMakeReservation()) {
      console.warn('❌ Cannot make reservation:', {
        hasParking: !!parking,
        canReserve: this.canMakeReservation(),
        available: parking?.capacity.available || 0,
        status: parking?.status
      });
      return;
    }

    console.log(`🎯 Starting booking process for ${parking.name}`);
    console.log(`📊 Available spots: ${parking.capacity.available}/${parking.capacity.total}`);
    
    this.bookingInProgress.set(true);
    
    // Simular proceso de reserva
    setTimeout(() => {
      this.bookingInProgress.set(false);
      console.log(`✅ Booking completed for ${parking.name}, navigating to booking page`);
      this.router.navigate(['/booking', parking.id]);
    }, 2000);
  }

  onBookingComplete(reservation: ParkingReservation): void {
    // Usar el nuevo método que incluye notificaciones push
    this.onReservationCompleted(reservation);
  }

  getParkingTypeIcon(): string {
    const parking = this.parking();
    if (!parking) return '🅿️';
    
    const icons: { [key: string]: string } = {
      underground: '🏢',
      street: '🛣️',
      private: '🏠',
      shopping_center: '🏪',
      hospital: '🏥',
      public: '🏛️'
    };
    
    return icons[parking.type] || '🅿️';
  }

  getParkingTypeLabel(): string {
    const parking = this.parking();
    if (!parking) return '';
    
    const labels: { [key: string]: string } = {
      underground: 'Subterráneo',
      street: 'En calle',
      private: 'Privado',
      shopping_center: 'Centro comercial',
      hospital: 'Hospital',
      public: 'Público'
    };
    
    return labels[parking.type] || parking.type;
  }

  getAvailabilityText(): string {
    const p = this.parking();
    if (!p) return '';
    
    const available = p.capacity.available;
    const total = p.capacity.total;
    
    if (available === 0) return 'Completo';
    if (available === 1) return '1 plaza libre';
    if (available <= 3) return `${available} plazas libres`;
    return `${available}/${total} plazas`;
  }

  formatDistance(): string {
    const dist = this.distance();
    if (dist === 0) return '';
    
    if (dist < 50) {
      return 'Muy cerca';
    } else if (dist < 1000) {
      return `${Math.round(dist)}m`;
    } else if (dist < 10000) {
      return `${(dist / 1000).toFixed(1)}km`;
    } else {
      return `${Math.round(dist / 1000)}km`;
    }
  }

  formatPrice(): string {
    const price = this.pricePerHour();
    return `€${price.toFixed(2)}/h`;
  }

  // Nuevos métodos para notificaciones push

  /**
   * Activar/desactivar notificaciones de disponibilidad para este parking
   */
  async onToggleAvailabilityNotifications(): Promise<void> {
    const parking = this.parking();
    if (!parking) return;

    try {
      // Verificar si las notificaciones push están habilitadas
      if (!this.pushNotificationService.areNotificationsEnabled()) {
        const granted = await this.pushNotificationService.requestPermission();
        if (!granted) {
          this.notificationService.showWarning(
            'Para recibir alertas de disponibilidad, permite las notificaciones en tu navegador'
          );
          return;
        }
      }

      const isWatching = this.watchingAvailability();
      
      if (isWatching) {
        // Desactivar notificaciones
        this.removeFromWatchList(parking.id);
        this.watchingAvailability.set(false);
        
        this.notificationService.showInfo(
          `Ya no recibirás alertas cuando ${parking.name} tenga plazas disponibles`,
          'Alertas Desactivadas'
        );
      } else {
        // Activar notificaciones
        this.addToWatchList(parking.id);
        this.watchingAvailability.set(true);
        
        this.notificationService.showSuccess(
          `Te notificaremos cuando ${parking.name} tenga plazas disponibles`,
          'Alertas Activadas',
          0, // No auto-dismiss
          [
            {
              label: 'Configurar',
              action: () => this.router.navigate(['/settings/notifications']),
              primary: false
            }
          ]
        );

        // Simular notificación de prueba
        if (!this.isProduction()) {
          setTimeout(() => {
            this.simulateAvailabilityNotification(parking);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error toggling availability notifications:', error);
      this.notificationService.showError('Error al configurar las notificaciones');
    }
  }

  /**
   * Compartir parking con notificación push
   */
  async onShareParkingWithNotification(): Promise<void> {
    const parking = this.parking();
    if (!parking) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${parking.name} - Apparcar`,
          text: `He encontrado un parking en ${parking.address}`,
          url: window.location.href
        });
        
        // Enviar notificación de confirmación
        this.notificationService.showSuccess(
          'Parking compartido exitosamente',
          'Compartido'
        );
      } else {
        // Fallback: copiar al clipboard y mostrar notificación
        await navigator.clipboard.writeText(window.location.href);
        
        this.pushNotificationService.showLocalNotification({
          title: 'Enlace copiado',
          body: 'El enlace del parking ha sido copiado al portapapeles',
          data: { type: 'system' }
        });
      }
    } catch (error) {
      console.error('Error sharing parking:', error);
      this.notificationService.showError('Error al compartir el parking');
    }
  }

  /**
   * Notificar cuando se realiza una reserva
   */
  onReservationCompleted(reservation: ParkingReservation): void {
    const parking = this.parking();
    if (!parking) return;

    console.log(`🎉 Reservation completed for ${parking.name}:`, {
      reservationId: reservation.id,
      spotNumber: reservation.spotNumber,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      price: reservation.estimatedPrice
    });

    // Enviar notificación push de confirmación
    this.pushNotificationService.showLocalNotification({
      title: '✅ Reserva Confirmada',
      body: `Tu reserva en ${parking.name} ha sido procesada exitosamente`,
      data: {
        type: 'plaza_confirmed',
        url: '/profile/reservations',
        reservationId: reservation.id
      }
    });

    // Actualizar disponibilidad del parking
    if (parking.capacity.available > 0) {
      const oldAvailable = parking.capacity.available;
      parking.capacity.available -= 1;
      this.parking.set({ ...parking });
      console.log(`📊 Updated availability: ${oldAvailable} -> ${parking.capacity.available}`);
    }
    
    this.router.navigate(['/profile/reservations']);
  }

  // Métodos privados auxiliares

  private addToWatchList(parkingId: string): void {
    // En producción, esto sería una llamada al backend
    const watchList = JSON.parse(localStorage.getItem('parking_watch_list') || '[]');
    if (!watchList.includes(parkingId)) {
      watchList.push(parkingId);
      localStorage.setItem('parking_watch_list', JSON.stringify(watchList));
    }
  }

  private removeFromWatchList(parkingId: string): void {
    // En producción, esto sería una llamada al backend
    const watchList = JSON.parse(localStorage.getItem('parking_watch_list') || '[]');
    const updatedList = watchList.filter((id: string) => id !== parkingId);
    localStorage.setItem('parking_watch_list', JSON.stringify(updatedList));
  }

  private checkIfWatchingAvailability(parkingId: string): void {
    // Verificar si el usuario ya está vigilando este parking
    const watchList = JSON.parse(localStorage.getItem('parking_watch_list') || '[]');
    this.watchingAvailability.set(watchList.includes(parkingId));
  }

  private simulateAvailabilityNotification(parking: Parking): void {
    // Solo en desarrollo - simular que hay una plaza disponible
    this.pushNotificationService.showLocalNotification({
      title: '🅿️ Plaza Disponible!',
      body: `Se liberó una plaza en ${parking.name}`,
      data: {
        type: 'plaza_available',
        plazaId: `${parking.id}-demo`,
        url: `/parking/${parking.id}`
      }
    });
  }

  private isProduction(): boolean {
    // En una implementación real, usar environment.production
    return false;
  }

  /**
   * Inicializar estado de notificaciones
   */
  private initializeNotificationState(): void {
    const parking = this.parking();
    if (parking) {
      this.checkIfWatchingAvailability(parking.id);
      this.notificationEnabled.set(this.pushNotificationService.areNotificationsEnabled());
    }
  }
}
