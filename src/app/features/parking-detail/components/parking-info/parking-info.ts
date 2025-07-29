import { Component, Input, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// Servicios
import { GeolocationService } from '@core/services/geolocation';

// Modelos
import { Parking, LocationData } from '@core/models';

@Component({
  selector: 'app-parking-info',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './parking-info.html',
  styleUrls: ['./parking-info.scss']
})
export class ParkingInfoComponent {
  @Input() parking!: Parking;
  @Input() userLocation: LocationData | null = null;

  private geolocationService = inject(GeolocationService);

  // Signals computados
  distance = computed(() => {
    if (!this.userLocation || !this.parking) return 0;
    
    return this.calculateDistance(
      this.userLocation.coordinates,
      { latitude: this.parking.location.latitude, longitude: this.parking.location.longitude }
    );
  });

  keyFeatures = computed(() => {
    if (!this.parking) return [];
    
    const features = [];
    
    // Características de seguridad
    if (this.parking.features?.security?.surveillance) features.push({ icon: '📹', label: 'CCTV' });
    if (this.parking.features?.security?.guards) features.push({ icon: '👮', label: 'Vigilancia' });
    if (this.parking.features?.security?.lighting) features.push({ icon: '💡', label: 'Iluminado' });
    
    // Servicios
    if (this.parking.features?.services?.electricCharging) features.push({ icon: '⚡', label: 'Carga eléctrica' });
    if (this.parking.features?.services?.valet) features.push({ icon: '🅿️', label: 'Valet' });
    if (this.parking.features?.services?.carWash) features.push({ icon: '🚿', label: 'Lavado' });
    
    // Accesibilidad
    if (this.parking.features?.accessibility?.wheelchairAccess) {
      features.push({ icon: '♿', label: 'Accesible' });
    }
    
    // Horario
    if (this.parking.schedule?.is24Hours) features.push({ icon: '🕐', label: '24h' });
    
    return features.slice(0, 6); // Máximo 6 características
  });

  availabilityStatus = computed(() => {
    if (!this.parking) return { color: 'gray', text: 'Sin datos' };
    
    const available = this.parking.capacity.available;
    const total = this.parking.capacity.total;
    const percentage = (available / total) * 100;
    
    if (available === 0) {
      return { color: 'red', text: 'Completo' };
    } else if (percentage <= 25) {
      return { color: 'yellow', text: 'Pocas plazas' };
    } else {
      return { color: 'green', text: 'Disponible' };
    }
  });

  priceRange = computed(() => {
    if (!this.parking?.pricing?.rates) return null;
    
    const prices = this.parking.pricing.rates.map(rate => rate.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (minPrice === maxPrice) {
      return `€${minPrice.toFixed(2)}/h`;
    } else {
      return `€${minPrice.toFixed(2)} - €${maxPrice.toFixed(2)}/h`;
    }
  });

  // Métodos públicos
  formatDistance(): string {
    const dist = this.distance();
    if (dist === 0) return '';
    
    if (dist < 1000) {
      return `${Math.round(dist)}m`;
    } else {
      return `${(dist / 1000).toFixed(1)}km`;
    }
  }

  getParkingTypeIcon(): string {
    if (!this.parking) return '🅿️';
    
    const icons: { [key: string]: string } = {
      underground: '🏢',
      street: '🛣️',
      private: '🏠',
      shopping_center: '🏪',
      hospital: '🏥',
      public: '🏛️'
    };
    
    return icons[this.parking.type] || '🅿️';
  }

  getParkingTypeLabel(): string {
    if (!this.parking) return '';
    
    const labels: { [key: string]: string } = {
      underground: 'Subterráneo',
      street: 'En calle',
      private: 'Privado',
      shopping_center: 'Centro comercial',
      hospital: 'Hospital',
      public: 'Público'
    };
    
    return labels[this.parking.type] || this.parking.type;
  }

  getAccessInfo(): string {
    if (!this.parking) return '';
    
    const accessInfo: string[] = [];

    // Información basada en el tipo de parking
    switch (this.parking.type) {
      case 'underground':
        accessInfo.push('Acceso subterráneo con rampa');
        break;
      case 'street':
        accessInfo.push('Parking en superficie');
        break;
      case 'private':
        accessInfo.push('Acceso privado controlado');
        break;
      case 'public':
        accessInfo.push('Acceso público libre');
        break;
      case 'shopping_center':
        accessInfo.push('Acceso a través del centro comercial');
        break;
      case 'hospital':
        accessInfo.push('Acceso por el área hospitalaria');
        break;
      default:
        accessInfo.push('Acceso directo');
    }

    // Información adicional basada en características
    if (this.parking.features?.accessibility?.wheelchairAccess) {
      accessInfo.push('Entrada adaptada para personas con movilidad reducida');
    }

    if (this.parking.features?.security?.gatedAccess) {
      accessInfo.push('Acceso controlado con barrera automática');
    }

    if (this.parking.features?.services?.valet) {
      accessInfo.push('Servicio de valet parking disponible');
    }

    return accessInfo.join('. ') + '.';
  }

  getScheduleInfo(): string {
    if (!this.parking?.schedule) return '';
    
    if (this.parking.schedule.is24Hours) {
      return 'Abierto 24 horas';
    }
    
    if (this.parking.schedule.schedule?.length) {
      // Mostrar horario del primer día como ejemplo
      const firstDay = this.parking.schedule.schedule[0];
      if (!firstDay.isClosed) {
        return `${firstDay.openTime} - ${firstDay.closeTime}`;
      }
    }
    
    return 'Consultar horarios';
  }

  onOpenInMaps(): void {
    if (!this.parking) return;
    
    const { latitude, longitude } = this.parking.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  }

  onCallParking(): void {
    if (this.parking?.contact?.phone) {
      window.open(`tel:${this.parking.contact.phone}`, '_self');
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
}