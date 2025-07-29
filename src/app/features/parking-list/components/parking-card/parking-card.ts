// src/app/features/parking-list/components/parking-card/parking-card.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { DistancePipe } from '@shared/pipes/distance-pipe';

import { Parking as ParkingModel, LocationData, PriceRate } from '@core/models';

@Component({
  selector: 'app-parking-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DistancePipe
  ],
  templateUrl: './parking-card.html',
  styleUrls: ['./parking-card.scss']
})
export class ParkingCard {
  @Input() parking!: ParkingModel;
  @Input() distance: number = 0;
  @Input() isFavorite: boolean = false;
  @Input() userLocation: LocationData | null = null;
  @Input() viewMode: 'list' | 'grid' = 'list';

  @Output() click = new EventEmitter<ParkingModel>();
  @Output() favoriteToggle = new EventEmitter<string>();

  onCardClick(): void {
    this.click.emit(this.parking);
  }

  onFavoriteClick(event: Event): void {
    event.stopPropagation();
    this.favoriteToggle.emit(this.parking.id);
  }

  getStatusColor(): 'available' | 'limited' | 'full' {
    const available = this.parking.capacity.available;
    const total = this.parking.capacity.total;
    const ratio = available / total;

    if (available === 0) return 'full';
    if (ratio < 0.2) return 'limited';
    return 'available';
  }

  getStatusBadgeClass(): string {
    const status = this.getStatusColor();
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    
    switch (status) {
      case 'available':
        return `${baseClasses} bg-green-100 text-green-700 border border-green-200`;
      case 'limited':
        return `${baseClasses} bg-yellow-100 text-yellow-700 border border-yellow-200`;
      case 'full':
        return `${baseClasses} bg-red-100 text-red-700 border border-red-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700 border border-gray-200`;
    }
  }

  getAvailabilityText(): string {
    const available = this.parking.capacity.available;
    const total = this.parking.capacity.total;

    if (available === 0) return 'Completo';
    if (available < total * 0.2) return 'Pocas plazas';
    return `${available} disponibles`;
  }

  getParkingTypeLabel(): string {
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

  getLowestPrice(): number {
    const prices = this.parking.pricing.rates.map((rate: PriceRate) => rate.price);
    return Math.min(...prices);
  }

  getMainPriceType(): 'hourly' | 'daily' | 'monthly' | 'minute' {
    return this.parking.pricing.rates[0]?.type || 'hourly';
  }

  getKeyFeatures(): string[] {
    const features: string[] = [];

    if (this.parking.features.services.electricCharging) {
      features.push('⚡ Carga eléctrica');
    }
    if (this.parking.features.accessibility.wheelchairAccess) {
      features.push('♿ Accesible');
    }
    if (this.parking.features.security.surveillance) {
      features.push('🛡️ Vigilancia');
    }
    if (this.parking.schedule.is24Hours) {
      features.push('🕐 24h');
    }
    if (this.isCoveredParking()) {
      features.push('🏠 Cubierto');
    }

    return features.slice(0, 3); // Máximo 3 características
  }

  isCoveredParking(): boolean {
    // Determine if parking is covered based on type
    const coveredTypes = ['underground', 'building', 'shopping_center', 'airport', 'train_station'];
    return coveredTypes.includes(this.parking.type);
  }

  hasVisibleFeatures(): boolean {
    return this.getKeyFeatures().length > 0;
  }

  getParkingGradient(): string {
    // Generar gradiente basado en el tipo de parking
    const gradients = {
      underground: 'from-purple-500 to-purple-700',
      street: 'from-orange-500 to-red-500',
      shopping_center: 'from-blue-500 to-cyan-500',
      hospital: 'from-green-500 to-emerald-500',
      private: 'from-pink-500 to-rose-500',
      public: 'from-indigo-500 to-purple-500',
      default: 'from-gray-500 to-gray-700'
    };

    return gradients[this.parking.type as keyof typeof gradients] || gradients.default;
  }

  getTypeIcon(): string {
    const icons = {
      underground: '🚇',
      street: '🛣️',
      shopping_center: '🏬',
      hospital: '🏥',
      private: '🏢',
      public: '🅿️',
      default: '🅿️'
    };

    return icons[this.parking.type as keyof typeof icons] || icons.default;
  }
}
