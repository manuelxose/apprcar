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
import { NotificationService } from '@core/services/notification.service';

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
  private notificationService = inject(NotificationService);

  // Signals reactivos
  parking = signal<Parking | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  isFavorite = signal(false);
  activeTab = signal<'info' | 'map' | 'booking'>('info');
  userLocation = signal<LocationData | null>(null);
  bookingInProgress = signal(false);
  showFullDescription = signal(false);

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
    
    return this.calculateDistance(
      userLoc.coordinates,
      { latitude: p.location.latitude, longitude: p.location.longitude }
    );
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
          this.error.set('ID de parking no válido');
          return [];
        }
        return this.mockDataService.getParkingById(id);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (parking) => {
        if (parking) {
          this.parking.set(parking);
          this.checkIfFavorite(parking.id);
        } else {
          this.error.set('Parking no encontrado');
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading parking:', error);
        this.error.set('Error al cargar el parking');
        this.loading.set(false);
      }
    });
  }

  private loadUserLocation(): void {
    this.geolocationService.getCurrentPosition().subscribe({
      next: (location) => this.userLocation.set(location),
      error: (error) => console.warn('Could not get user location:', error)
    });
  }

  private checkIfFavorite(parkingId: string): void {
    // Simular verificación de favoritos desde localStorage
    const favorites = JSON.parse(localStorage.getItem('parking_favorites') || '[]');
    this.isFavorite.set(favorites.includes(parkingId));
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

  onOpenInMaps(): void {
    const parking = this.parking();
    if (!parking) return;

    const { latitude, longitude } = parking.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
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
    if (!parking || !this.canMakeReservation()) return;

    this.bookingInProgress.set(true);
    
    // Simular proceso de reserva
    setTimeout(() => {
      this.bookingInProgress.set(false);
      this.router.navigate(['/booking', parking.id]);
    }, 2000);
  }

  onBookingComplete(reservation: ParkingReservation): void {
    this.notificationService.showSuccess(
      'Tu reserva ha sido procesada exitosamente',
      '¡Reserva completada!'
    );
    
    // Actualizar disponibilidad del parking (simulado)
    const parking = this.parking();
    if (parking && parking.capacity.available > 0) {
      parking.capacity.available -= 1;
      this.parking.set({ ...parking });
    }
    
    // Navegar a las reservas del usuario o mostrar confirmación
    this.router.navigate(['/profile/reservations']);
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
    
    if (dist < 1000) {
      return `${Math.round(dist)}m`;
    } else {
      return `${(dist / 1000).toFixed(1)}km`;
    }
  }

  formatPrice(): string {
    const price = this.pricePerHour();
    return `€${price.toFixed(2)}/h`;
  }
}