// search-bar.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

// Import shared interfaces
import { ParkingFilters, SortOption, ParkingType } from '@core/models';

// Local interfaces for the search bar
export interface ParkingFeatures {
  electricCharging?: boolean;
  wheelchairAccess?: boolean;
  security?: boolean;
  covered?: boolean;
  valet?: boolean;
  carWash?: boolean;
}

// Local availability options for UI
export type AvailabilityOption = 'all' | 'available' | 'few' | 'full';

interface FilterChip {
  key: string;
  label: string;
  type: 'type' | 'price' | 'rating' | 'feature' | 'availability';
}

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.html',
  styleUrls: ['./search-bar.scss']
})
export class SearchBar implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // Inputs
  @Input() placeholder = 'Buscar parkings...';
  @Input() showFilters = true;
  @Input() showCloseButton = false;
  @Input() showActiveFilters = true;
  @Input() autoFocus = false;
  @Input() disabled = false;
  
  @Input() set value(val: string) {
    this.searchQuery.set(val || '');
  }
  get value(): string {
    return this.searchQuery();
  }

  // Outputs
  @Output() searchSubmit = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<ParkingFilters>();
  @Output() sortChange = new EventEmitter<SortOption>();
  @Output() closeSearch = new EventEmitter<void>();

  // Private subjects
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // State management with internal availability type
  private internalAvailability = signal<AvailabilityOption>('all');
  
  // Reactive state
  searchQuery = signal<string>('');
  isFiltersOpen = signal<boolean>(false);
  sortBy = signal<SortOption>(SortOption.DISTANCE);
  filters = signal<ParkingFilters>({
    type: [],
    features: {
      electricCharging: false,
      wheelchairAccess: false,
      security: false,
      covered: false,
      valet: false,
      carWash: false
    }
  });

  // Computed properties
  hasSearchQuery = computed(() => this.searchQuery().trim().length > 0);
  hasActiveFilters = computed(() => this.getActiveFiltersCount() > 0);
  activeFilterChips = computed(() => this.generateFilterChips());

  // Static data
  readonly parkingTypes = [
    { value: ParkingType.PUBLIC, label: 'Público', icon: 'M12 2L2 7l10 5 10-5-10-5z' },
    { value: ParkingType.PRIVATE, label: 'Privado', icon: 'M12 1l3 3 3-3v4l-3 3-3-3V1z' },
    { value: ParkingType.STREET, label: 'En la calle', icon: 'M3 17h18v2H3v-2z' },
    { value: ParkingType.UNDERGROUND, label: 'Subterráneo', icon: 'M12 2l3 3 3-3v4l-3 3-3-3V2z' },
    { value: ParkingType.SHOPPING_CENTER, label: 'Centro comercial', icon: 'M19 7h-2v5h2v7h-8v-7h2V7h-8v12H3V7h2V5a2 2 0 012-2h8a2 2 0 012 2v2z' },
    { value: ParkingType.AIRPORT, label: 'Aeropuerto', icon: 'M20.36 2.64l-1.41 1.41L17.54 2.64 16.13 4.05l1.41 1.41L20.36 2.64z' },
    { value: ParkingType.HOSPITAL, label: 'Hospital', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' }
  ];

  readonly sortOptions = [
    { value: SortOption.DISTANCE, label: 'Distancia', icon: 'M12 2L2 7l10 5 10-5-10-5z' },
    { value: SortOption.PRICE, label: 'Precio', icon: 'M7 4V2a1 1 0 0 1 2 0v2h2a1 1 0 0 1 0 2H9v2a1 1 0 0 1-2 0V6H5a1 1 0 0 1 0-2h2z' },
    { value: SortOption.RATING, label: 'Calificación', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
    { value: SortOption.AVAILABILITY, label: 'Disponibilidad', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { value: SortOption.NAME, label: 'Nombre', icon: 'M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z' }
  ];

  readonly features = [
    { key: 'electricCharging', label: 'Carga eléctrica', icon: 'M11.5 19l-2-7h3l2 7h-3z' },
    { key: 'wheelchairAccess', label: 'Acceso PMR', icon: 'M18.5 14c-1.2 0-2.3-.5-3.1-1.3L14 12.2V9.5c0-.8-.7-1.5-1.5-1.5S11 8.7 11 9.5v4.3c0 .4.2.8.5 1l1.5 1.3c.3.3.5.7.5 1.1V19c0 .6.4 1 1 1s1-.4 1-1v-1.8c0-.8-.3-1.6-.8-2.2l-.7-.6V12c.5.3 1.1.5 1.8.5 1.3 0 2.4-.9 2.7-2.1.2-.7-.2-1.4-.9-1.4-.4 0-.8.2-1 .6-.1.2-.3.4-.6.4-.5 0-.9-.4-.9-.9 0-.8.9-1.1 1.4-1.1 1.1 0 2 .9 2 2 0 1.7-1.3 3-3 3z' },
    { key: 'security', label: 'Vigilancia', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z' },
    { key: 'covered', label: 'Cubierto', icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
    { key: 'valet', label: 'Valet parking', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
    { key: 'carWash', label: 'Lavado', icon: 'M17 6V4H6v2H4v4h1v7h2v-7h8v7h2v-7h1V6h-1zM8 8H6V6h2v2zm6 0h-2V6h2v2z' }
  ];

  ngOnInit(): void {
    this.setupSearchDebounce();
    
    if (this.autoFocus) {
      setTimeout(() => {
        this.searchInput?.nativeElement?.focus();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Setup search debounce
  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      if (query.trim()) {
        this.searchSubmit.emit(query.trim());
      }
    });
  }

  // Event handlers
  onSearchInput(): void {
    const value = this.searchInput.nativeElement.value;
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  onSearchSubmit(): void {
    const query = this.searchQuery().trim();
    if (query) {
      this.searchSubmit.emit(query);
    }
  }

  onCloseSearch(): void {
    this.closeSearch.emit();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchInput.nativeElement.value = '';
    this.searchInput.nativeElement.focus();
  }

  toggleFilters(): void {
    this.isFiltersOpen.update(isOpen => !isOpen);
  }

  closeFilters(): void {
    this.isFiltersOpen.set(false);
  }

  // Filter methods
  toggleParkingType(type: ParkingType): void {
    this.filters.update(current => {
      const types = current.type || [];
      const index = types.indexOf(type);
      
      if (index >= 0) {
        types.splice(index, 1);
      } else {
        types.push(type);
      }
      
      return { ...current, type: [...types] };
    });
    this.emitFilterChange();
  }

  toggleFeature(feature: keyof ParkingFeatures): void {
    this.filters.update(current => {
      const features = { ...current.features };
      features[feature] = !features[feature];
      return { ...current, features };
    });
    this.emitFilterChange();
  }

  updateMaxPrice(price: number): void {
    this.filters.update(current => ({ ...current, maxPrice: price }));
    this.emitFilterChange();
  }

  updateMinRating(rating: number): void {
    this.filters.update(current => ({ ...current, rating }));
    this.emitFilterChange();
  }

  updateAvailability(availability: AvailabilityOption): void {
    this.internalAvailability.set(availability);
    
    // Convert string availability to boolean for the shared interface
    let booleanAvailability: boolean | undefined;
    switch (availability) {
      case 'available':
        booleanAvailability = true;
        break;
      case 'full':
        booleanAvailability = false;
        break;
      case 'all':
      case 'few':
      default:
        booleanAvailability = undefined;
        break;
    }
    
    this.filters.update(current => ({ ...current, availability: booleanAvailability }));
    this.emitFilterChange();
  }

  updateSortBy(sort: SortOption): void {
    this.sortBy.set(sort);
    this.sortChange.emit(sort);
  }

  // Utility methods
  private emitFilterChange(): void {
    this.filterChange.emit(this.filters());
  }

  private getActiveFiltersCount(): number {
    const current = this.filters();
    const availability = this.internalAvailability();
    let count = 0;
    
    if (current.type && current.type.length > 0) count += current.type.length;
    if (current.maxPrice && current.maxPrice < 50) count += 1; // Assuming max price is normally 50
    if (current.rating && current.rating > 0) count += 1;
    if (availability && availability !== 'all') count += 1;
    
    if (current.features) {
      count += Object.values(current.features).filter(Boolean).length;
    }
    
    return count;
  }

  private generateFilterChips(): FilterChip[] {
    const chips: FilterChip[] = [];
    const current = this.filters();
    const availability = this.internalAvailability();
    
    // Type chips
    if (current.type && current.type.length > 0) {
      current.type.forEach(type => {
        const typeData = this.parkingTypes.find(t => t.value === type);
        if (typeData) {
          chips.push({
            key: `type-${type}`,
            label: typeData.label,
            type: 'type'
          });
        }
      });
    }
    
    // Price chip
    if (current.maxPrice && current.maxPrice < 50) {
      chips.push({
        key: 'maxPrice',
        label: `Hasta €${current.maxPrice}`,
        type: 'price'
      });
    }
    
    // Rating chip
    if (current.rating && current.rating > 0) {
      chips.push({
        key: 'minRating',
        label: `${current.rating}+ estrellas`,
        type: 'rating'
      });
    }
    
    // Features chips
    if (current.features) {
      Object.entries(current.features).forEach(([key, value]) => {
        if (value) {
          const feature = this.features.find(f => f.key === key);
          if (feature) {
            chips.push({
              key: `feature-${key}`,
              label: feature.label,
              type: 'feature'
            });
          }
        }
      });
    }
    
    // Availability chip
    if (availability && availability !== 'all') {
      const labels = {
        available: 'Disponible',
        few: 'Pocas plazas',
        full: 'Completo'
      };
      chips.push({
        key: 'availability',
        label: labels[availability],
        type: 'availability'
      });
    }
    
    return chips;
  }

  removeFilter(chipKey: string): void {
    const current = this.filters();
    
    if (chipKey.startsWith('type-')) {
      const type = chipKey.replace('type-', '') as ParkingType;
      const types = (current.type || []).filter(t => t !== type);
      this.filters.update(f => ({ ...f, type: types }));
    } else if (chipKey === 'maxPrice') {
      this.filters.update(f => ({ ...f, maxPrice: undefined }));
    } else if (chipKey === 'minRating') {
      this.filters.update(f => ({ ...f, rating: undefined }));
    } else if (chipKey === 'availability') {
      this.internalAvailability.set('all');
      this.filters.update(f => ({ ...f, availability: undefined }));
    } else if (chipKey.startsWith('feature-')) {
      const feature = chipKey.replace('feature-', '') as keyof ParkingFeatures;
      this.filters.update(f => ({
        ...f,
        features: { ...f.features, [feature]: false }
      }));
    }
    
    this.emitFilterChange();
  }

  clearAllFilters(): void {
    this.internalAvailability.set('all');
    this.filters.set({
      type: [],
      features: {
        electricCharging: false,
        wheelchairAccess: false,
        security: false,
        covered: false,
        valet: false,
        carWash: false
      }
    });
    this.sortBy.set(SortOption.DISTANCE);
    this.emitFilterChange();
    this.sortChange.emit(SortOption.DISTANCE);
  }

  // Template helper methods
  isParkingTypeSelected(type: ParkingType): boolean {
    return (this.filters().type || []).includes(type);
  }

  isFeatureSelected(feature: keyof ParkingFeatures): boolean {
    return this.filters().features?.[feature] || false;
  }

  getMaxPrice(): number {
    return this.filters().maxPrice || 50;
  }

  getMinRating(): number {
    return this.filters().rating || 0;
  }

  getAvailability(): string {
    return this.internalAvailability();
  }

  trackChip(index: number, chip: FilterChip): string {
    return chip.key;
  }
}