import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';

import { PricePipe } from '@shared/pipes/price-pipe';
import { DistancePipe } from '@shared/pipes/distance-pipe';

import { ParkingFilters as ParkingFiltersModel, ParkingType, Parking as ParkingModel } from '@core/models';

interface FilterDialogData {
  currentFilters: ParkingFiltersModel;
  parkings: ParkingModel[];
}

@Component({
  selector: 'app-parking-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSliderModule,
    MatSelectModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule
  ],
  templateUrl: './parking-filters.html',
  styleUrls: ['./parking-filters.scss']
})
export class ParkingFilters implements OnInit {
  filters = signal<ParkingFiltersModel>({});
  
  // Opciones disponibles
  parkingTypes = [
    { value: ParkingType.PUBLIC, label: 'Público', icon: '🅿️' },
    { value: ParkingType.PRIVATE, label: 'Privado', icon: '🏢' },
    { value: ParkingType.STREET, label: 'En calle', icon: '🛣️' },
    { value: ParkingType.UNDERGROUND, label: 'Subterráneo', icon: '🚇' },
    { value: ParkingType.SHOPPING_CENTER, label: 'Centro comercial', icon: '🏬' },
    { value: ParkingType.HOSPITAL, label: 'Hospital', icon: '🏥' },
    { value: ParkingType.AIRPORT, label: 'Aeropuerto', icon: '✈️' },
    { value: ParkingType.TRAIN_STATION, label: 'Estación de tren', icon: '🚂' },
    { value: ParkingType.UNIVERSITY, label: 'Universidad', icon: '🎓' }
  ];

  priceTypes = [
    { value: 'hourly', label: 'Por hora' },
    { value: 'daily', label: 'Por día' },
    { value: 'monthly', label: 'Por mes' }
  ];

  // Rangos dinámicos basados en los datos
  maxPriceRange = signal({ min: 0, max: 10 });
  maxDistanceRange = signal({ min: 100, max: 5000 });

  constructor(
    private bottomSheetRef: MatBottomSheetRef<ParkingFilters>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: FilterDialogData
  ) {}

  ngOnInit(): void {
    // Inicializar filtros con los valores actuales
    this.filters.set({ ...this.data.currentFilters });
    
    // Calcular rangos dinámicos basados en los parkings disponibles
    this.calculateDynamicRanges();
    
    // Inicializar features si no existen
    if (!this.filters().features) {
      this.filters.update(filters => ({
        ...filters,
        features: {}
      }));
    }
  }

  /**
   * Calcular rangos dinámicos
   */
  private calculateDynamicRanges(): void {
    const parkings = this.data.parkings;
    
    if (parkings.length === 0) return;

    // Calcular rango de precios
    const prices = parkings.flatMap(p => p.pricing.rates.map((r:any) => r.price));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    this.maxPriceRange.set({
      min: Math.floor(minPrice),
      max: Math.ceil(maxPrice)
    });

    // Rango de distancia fijo pero configurable
    this.maxDistanceRange.set({
      min: 100,
      max: 5000
    });
  }

  /**
   * Gestión de tipos de parking
   */
  toggleParkingType(type: ParkingType): void {
    this.filters.update(filters => {
      const currentTypes = filters.type || [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];
      
      return {
        ...filters,
        type: newTypes.length > 0 ? newTypes : undefined
      };
    });
  }

  isParkingTypeSelected(type: ParkingType): boolean {
    return this.filters().type?.includes(type) || false;
  }

  /**
   * Gestión de características
   */
  toggleFeature(feature: keyof NonNullable<ParkingFiltersModel['features']>): void {
    this.filters.update(filters => {
      const currentFeatures = filters.features || {};
      const newFeatures = {
        ...currentFeatures,
        [feature]: !currentFeatures[feature]
      };
      
      // Limpiar características no seleccionadas
      const cleanFeatures = Object.fromEntries(
        Object.entries(newFeatures).filter(([_, value]) => value)
      );
      
      return {
        ...filters,
        features: Object.keys(cleanFeatures).length > 0 ? cleanFeatures : undefined
      };
    });
  }

  isFeatureSelected(feature: keyof NonNullable<ParkingFiltersModel['features']>): boolean {
    return this.filters().features?.[feature] || false;
  }

  /**
   * Gestión de precio
   */
  onMaxPriceChange(value: number): void {
    this.filters.update(filters => ({
      ...filters,
      maxPrice: value > 0 ? value : undefined
    }));
  }

  onPriceTypeChange(type: 'hourly' | 'daily' | 'monthly'): void {
    this.filters.update(filters => ({
      ...filters,
      priceType: type
    }));
  }

  /**
   * Gestión de distancia
   */
  onMaxDistanceChange(value: number): void {
    this.filters.update(filters => ({
      ...filters,
      distance: value > 100 ? value : undefined
    }));
  }

  /**
   * Gestión de rating
   */
  onMinRatingChange(value: number): void {
    this.filters.update(filters => ({
      ...filters,
      rating: value > 0 ? value : undefined
    }));
  }

  /**
   * Gestión de disponibilidad
   */
  toggleAvailabilityFilter(): void {
    this.filters.update(filters => ({
      ...filters,
      availability: !filters.availability || undefined
    }));
  }

  /**
   * Acciones de los botones
   */
  applyFilters(): void {
    this.bottomSheetRef.dismiss(this.filters());
  }

  resetFilters(): void {
    this.filters.set({});
  }

  closeSheet(): void {
    this.bottomSheetRef.dismiss();
  }

  /**
   * Obtener conteo de filtros activos
   */
  getActiveFiltersCount(): number {
    const filters = this.filters();
    let count = 0;
    
    if (filters.type?.length) count++;
    if (filters.maxPrice) count++;
    if (filters.distance) count++;
    if (filters.rating) count++;
    if (filters.availability) count++;
    if (filters.priceType) count++;
    if (filters.features && Object.values(filters.features).some(v => v)) count++;
    
    return count;
  }

  /**
   * Obtener texto de resumen de filtros
   */
  getFiltersSummary(): string {
    const count = this.getActiveFiltersCount();
    if (count === 0) return 'Sin filtros aplicados';
    if (count === 1) return '1 filtro aplicado';
    return `${count} filtros aplicados`;
  }

  /**
   * Formatear valores para mostrar
   */
  formatPrice(value: number): string {
    return `€${value.toFixed(2)}`;
  }

  formatDistance(value: number): string {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}km` : `${value}m`;
  }

  formatRating(value: number): string {
    return `${value.toFixed(1)} ⭐`;
  }
}
