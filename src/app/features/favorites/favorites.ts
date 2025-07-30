import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, combineLatest } from 'rxjs';

// Componentes modernizados
import { Loading } from '@shared/components/loading/loading';

// Servicios
import { ParkingService } from '@core/services/parking';
import { GeolocationService } from '@core/services/geolocation';
import { MockDataService } from '@core/services/mock-data';
import { StorageService } from '@core/services/storage';
import { UnifiedNotificationService } from '@core/services/unified-notification.service';

// Modelos
import { Parking, SortOption, ParkingType, LocationData } from '@core/models';

interface FavoriteFilters {
  search: string;
  type: ParkingType | 'all';
  sortBy: SortOption;
  showNearby: boolean;
}

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    Loading
  ],
  templateUrl: './favorites.html',
  styleUrls: ['./favorites.scss']
})
export class FavoritesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private parkingService = inject(ParkingService);
  private geolocationService = inject(GeolocationService);
  private mockDataService = inject(MockDataService);
  private storageService = inject(StorageService);
  private notificationService = inject(UnifiedNotificationService);

  // Signals reactivos
  favoritesParkings = signal<Parking[]>([]);
  loading = signal(true);
  loadingAction = signal(false);
  userLocation = signal<LocationData | null>(null);
  showSortMenu = signal(false);
  undoItem = signal<Parking | null>(null);

  // Form controls
  searchControl = new FormControl('');
  typeControl = new FormControl<ParkingType | 'all'>('all');
  sortControl = new FormControl<SortOption>(SortOption.NAME);

  // Computed properties
  filters = computed<FavoriteFilters>(() => ({
    search: this.searchControl.value || '',
    type: this.typeControl.value || 'all',
    sortBy: this.sortControl.value || SortOption.NAME,
    showNearby: !!this.userLocation()
  }));

  filteredFavorites = computed(() => {
    const parkings = this.favoritesParkings();
    const filters = this.filters();
    let filtered = [...parkings];

    // Filtro por búsqueda
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.address.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search)
      );
    }

    // Filtro por tipo
    if (filters.type !== 'all') {
      filtered = filtered.filter(p => p.type === filters.type);
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case SortOption.NAME:
          return a.name.localeCompare(b.name);
        
        case SortOption.DISTANCE:
          if (!this.userLocation()) return 0;
          const distA = this.calculateDistance(a);
          const distB = this.calculateDistance(b);
          return distA - distB;
        
        case SortOption.PRICE:
          const priceA = a.pricing?.rates[0]?.price || 0;
          const priceB = b.pricing?.rates[0]?.price || 0;
          return priceA - priceB;
        
        case SortOption.RATING:
          return (b.rating?.average || 0) - (a.rating?.average || 0);
        
        case SortOption.AVAILABILITY:
          return b.capacity.available - a.capacity.available;
        
        case SortOption.NEWEST:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        
        default:
          return 0;
      }
    });

    return filtered;
  });

  isEmpty = computed(() => this.favoritesParkings().length === 0);
  hasResults = computed(() => this.filteredFavorites().length > 0);
  hasFilters = computed(() => {
    return !!(this.searchControl.value || this.typeControl.value !== 'all');
  });

  // Estadísticas
  stats = computed(() => {
    const total = this.favoritesParkings().length;
    const filtered = this.filteredFavorites().length;
    const available = this.filteredFavorites().filter(p => p.capacity.available > 0).length;
    
    return { total, filtered, available };
  });

  // Enums y opciones para template
  parkingTypes = Object.values(ParkingType);
  sortOptions = Object.values(SortOption);

  sortLabels: Record<SortOption, string> = {
    [SortOption.NAME]: 'Nombre',
    [SortOption.DISTANCE]: 'Distancia',
    [SortOption.PRICE]: 'Precio',
    [SortOption.RATING]: 'Valoración',
    [SortOption.AVAILABILITY]: 'Disponibilidad',
    [SortOption.NEWEST]: 'Más reciente'
  };

  typeLabels: Record<ParkingType | 'all', string> = {
    'all': 'Todos los tipos',
    [ParkingType.UNDERGROUND]: 'Subterráneo',
    [ParkingType.STREET]: 'En calle',
    [ParkingType.PRIVATE]: 'Privado',
    [ParkingType.SHOPPING_CENTER]: 'Centro comercial',
    [ParkingType.HOSPITAL]: 'Hospital',
    [ParkingType.PUBLIC]: 'Público',
    [ParkingType.BUILDING]: 'Edificio',
    [ParkingType.AIRPORT]: 'Aeropuerto',
    [ParkingType.TRAIN_STATION]: 'Estación de tren',
    [ParkingType.UNIVERSITY]: 'Universidad'
  };

  ngOnInit(): void {
    this.setupFormSubscriptions();
    this.loadFavorites();
    this.getCurrentLocation();
    this.loadSavedFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormSubscriptions(): void {
    // Debounce para la búsqueda
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe();

    // Guardar preferencias de filtros
    combineLatest([
      this.typeControl.valueChanges,
      this.sortControl.valueChanges
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([type, sort]) => {
      this.storageService.setItem('favorites_filters', {
        type,
        sortBy: sort
      });
    });
  }

  private loadSavedFilters(): void {
    const saved = this.storageService.getItem('favorites_filters') as any;
    if (saved) {
      this.typeControl.setValue(saved.type || 'all', { emitEvent: false });
      this.sortControl.setValue(saved.sortBy || SortOption.NAME, { emitEvent: false });
    }
  }

  private loadFavorites(): void {
    this.loading.set(true);
    
    // Obtener IDs de favoritos y luego cargar los datos de parking
    this.parkingService.favorites$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (favoriteIds: Set<string>) => {
          if (favoriteIds.size === 0) {
            this.favoritesParkings.set([]);
            this.loading.set(false);
            return;
          }

          // Cargar datos de parkings favoritos desde mock data
          this.mockDataService.getVigoParkings()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (allParkings: Parking[]) => {
                const favoriteParkings = allParkings.filter(p => favoriteIds.has(p.id));
                this.favoritesParkings.set(favoriteParkings);
                this.loading.set(false);
              },
              error: (error: any) => {
                console.error('Error loading parking data:', error);
                // No notification needed for data loading error
                this.loading.set(false);
              }
            });
        },
        error: (error: any) => {
          console.error('Error loading favorites:', error);
          // No notification needed for favorites loading error
          this.loading.set(false);
        }
      });
  }

  private getCurrentLocation(): void {
    this.geolocationService.getCurrentPosition()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (location) => {
          this.userLocation.set(location);
        },
        error: () => {
          // No mostrar error, la ubicación es opcional para favoritos
        }
      });
  }

  private calculateDistance(parking: Parking): number {
    const userLoc = this.userLocation();
    if (!userLoc) return 0;

    return this.geolocationService.calculateDistance(
      userLoc.coordinates,
      { latitude: parking.location.latitude, longitude: parking.location.longitude }
    );
  }

  // Métodos públicos
  async removeFavorite(parking: Parking, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    this.loadingAction.set(true);

    try {
      this.parkingService.removeFromFavorites(parking.id);
      
      // Actualizar lista local
      const updated = this.favoritesParkings().filter(p => p.id !== parking.id);
      this.favoritesParkings.set(updated);

      // Mostrar undo con el item
      this.undoItem.set(parking);
      
      // Mostrar notificación de confirmación
      await this.notificationService.showLocalNotification({
        title: 'Favorito eliminado',
        body: `${parking.name} eliminado de favoritos`,
        icon: '/assets/icons/icon-192x192.png',
        data: { type: 'favorite_removed' as any }
      });
      
      this.notificationService.showSuccess(
        `${parking.name} eliminado de favoritos`, 
        'Favorito eliminado'
      );

      // Auto-clear undo después de 4 segundos
      setTimeout(() => {
        if (this.undoItem() === parking) {
          this.undoItem.set(null);
        }
      }, 4000);

    } catch (error) {
      console.error('Error removing favorite:', error);
    } finally {
      this.loadingAction.set(false);
    }
  }

  undoRemoveFavorite(parking: Parking): void {
    try {
      this.parkingService.addToFavorites(parking.id);
      
      // Añadir de vuelta a la lista
      const updated = [...this.favoritesParkings(), parking];
      this.favoritesParkings.set(updated);
      
      this.undoItem.set(null);
      
      // Mostrar notificación de confirmación
      this.notificationService.showSuccess(
        `${parking.name} restaurado a favoritos`,
        'Favorito restaurado'
      );

    } catch (error) {
      console.error('Error restoring favorite:', error);
    }
  }

  clearAllFilters(): void {
    this.searchControl.setValue('');
    this.typeControl.setValue('all');
    // No resetear el sort, mantener preferencia del usuario
  }

  refreshFavorites(): void {
    this.loadFavorites();
  }

  toggleSortMenu(): void {
    this.showSortMenu.update(show => !show);
  }

  onSortChange(option: SortOption): void {
    this.sortControl.setValue(option);
    this.showSortMenu.set(false);
  }

  onTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.typeControl.setValue(target.value as ParkingType | 'all');
  }

  // Utilidades para template
  getParkingStatusColor(parking: Parking): 'green' | 'yellow' | 'red' {
    if (parking.capacity.available === 0) return 'red';
    if (parking.capacity.available < 10) return 'yellow';
    return 'green';
  }

  getParkingStatusText(parking: Parking): string {
    if (parking.capacity.available === 0) return 'Completo';
    if (parking.capacity.available < 10) return 'Pocas plazas';
    return `${parking.capacity.available} plazas`;
  }

  getDistanceToParking(parking: Parking): number {
    return this.calculateDistance(parking);
  }

  formatDistance(distance: number): string {
    if (distance === 0) return '';
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  }

  formatPrice(parking: Parking): string {
    const rate = parking.pricing?.rates[0];
    if (!rate) return '--';
    return `€${rate.price.toFixed(2)}/h`;
  }

  getParkingTypeIcon(type: ParkingType): string {
    const icons: { [key in ParkingType]: string } = {
      [ParkingType.UNDERGROUND]: '🏢',
      [ParkingType.STREET]: '🛣️',
      [ParkingType.PRIVATE]: '🏠',
      [ParkingType.SHOPPING_CENTER]: '🏪',
      [ParkingType.HOSPITAL]: '🏥',
      [ParkingType.PUBLIC]: '🏛️',
      [ParkingType.BUILDING]: '🏢',
      [ParkingType.AIRPORT]: '✈️',
      [ParkingType.TRAIN_STATION]: '🚉',
      [ParkingType.UNIVERSITY]: '🎓'
    };
    return icons[type] || '🅿️';
  }

  getKeyFeatures(parking: Parking): string[] {
    const features = [];
    if (parking.features?.services?.electricCharging) features.push('Carga eléctrica');
    if (parking.features?.accessibility?.wheelchairAccess) features.push('Accesible');
    if (parking.features?.security?.surveillance) features.push('Videovigilancia');
    if (parking.schedule?.is24Hours) features.push('24h');
    return features.slice(0, 3); // Máximo 3 features
  }

  onParkingClick(parking: Parking): void {
    // La navegación se maneja en el template con routerLink
  }

  // Tracking function para ngFor
  trackByParkingId(index: number, parking: Parking): string {
    return parking.id;
  }

  // Helper methods for template type safety
  getSortLabel(option: SortOption): string {
    return this.sortLabels[option];
  }

  getTypeLabel(type: ParkingType | 'all'): string {
    return this.typeLabels[type];
  }

  getParkingTypeLabel(parking: Parking): string {
    return this.typeLabels[parking.type];
  }
}