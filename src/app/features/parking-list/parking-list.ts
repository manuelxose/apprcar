// src/app/features/parking-list/parking-list.component.ts
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Components
import { SearchBar } from '@shared/components/search-bar/search-bar';
import { Loading } from '@shared/components/loading/loading';
import { ParkingCard } from './components/parking-card/parking-card';

// Services & Models
import { ParkingService as Parking } from '@core/services/parking';
import { GeolocationService as Geolocation } from '@core/services/geolocation';
import { MockDataService as MockData } from '@core/services/mock-data';
import { StorageService as Storage } from '@core/services/storage';

import { 
  Parking as ParkingModel, 
  LocationData, 
  ParkingSearchParams,
  ParkingFilters,
  SortOption 
} from '@core/models';

@Component({
  selector: 'app-parking-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SearchBar,
    Loading,
    ParkingCard
  ],
  templateUrl: './parking-list.html',
  styleUrls: ['./parking-list.scss']
})
export class ParkingList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Injected services
  private parking = inject(Parking);
  private geolocation = inject(Geolocation);
  private mockData = inject(MockData);
  private storage = inject(Storage);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Reactive signals
  isLoading = signal(true);
  isSearching = signal(false);
  parkings = signal<ParkingModel[]>([]);
  filteredParkings = signal<ParkingModel[]>([]);
  userLocation = signal<LocationData | null>(null);
  currentQuery = signal('');
  activeFilters = signal<ParkingFilters>({});
  currentSort = signal<SortOption>(SortOption.DISTANCE);
  favorites = signal<Set<string>>(new Set());

  // UI state
  currentPage = signal(1);
  itemsPerPage = signal(20);
  viewMode = signal<'list' | 'grid'>('list');
  showSortDropdown = signal(false);
  showFiltersSheet = signal(false);

  // Sort options
  sortOptions = [
    { 
      value: SortOption.DISTANCE, 
      label: 'Distancia', 
      icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' 
    },
    { 
      value: SortOption.PRICE, 
      label: 'Precio', 
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1' 
    },
    { 
      value: SortOption.RATING, 
      label: 'Valoración', 
      icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' 
    },
    { 
      value: SortOption.AVAILABILITY, 
      label: 'Disponibilidad', 
      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' 
    }
  ];

  // Computed properties
  totalPages = computed(() => Math.ceil(this.filteredParkings().length / this.itemsPerPage()));
  hasNextPage = computed(() => this.currentPage() < this.totalPages());
  hasPreviousPage = computed(() => this.currentPage() > 1);
  
  paginatedParkings = computed(() => {
    const filtered = this.filteredParkings();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return filtered.slice(start, end);
  });

  hasActiveFilters = computed(() => {
    const filters = this.activeFilters();
    return !!(
      filters.type?.length ||
      filters.maxPrice ||
      filters.distance ||
      filters.rating ||
      Object.values(filters.features || {}).some(value => value)
    );
  });

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSearchDebounce();
    this.loadUserLocation();
    this.loadFavorites();
    this.processRouteParams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Event handlers
  onSearch(query: string): void {
    this.currentQuery.set(query);
    this.searchSubject.next(query);
    this.updateUrlParams();
  }

  onSortChange(sort: SortOption): void {
    this.currentSort.set(sort);
    this.showSortDropdown.set(false);
    this.sortParkings();
    this.saveSettings();
    this.resetPagination();
  }

  onViewModeChange(mode: 'list' | 'grid'): void {
    this.viewMode.set(mode);
    this.saveSettings();
  }

  onParkingClick(parking: ParkingModel): void {
    this.router.navigate(['/parking', parking.id]);
  }

  onFavoriteToggle(parkingId: string): void {
    const currentFavorites = new Set(this.favorites());
    if (currentFavorites.has(parkingId)) {
      currentFavorites.delete(parkingId);
    } else {
      currentFavorites.add(parkingId);
    }
    this.favorites.set(currentFavorites);
    this.saveFavorites();
  }

  toggleSortDropdown(): void {
    this.showSortDropdown.update(show => !show);
  }

  toggleFiltersSheet(): void {
    this.showFiltersSheet.update(show => !show);
  }

  clearFilters(): void {
    this.activeFilters.set({});
    this.applyFiltersAndSort();
    this.resetPagination();
  }

  viewOnMap(query?: string): void {
    const location = this.userLocation();
    const queryParams: any = {};
    
    if (query) queryParams.search = query;
    if (location) {
      queryParams.lat = location.coordinates.latitude;
      queryParams.lng = location.coordinates.longitude;
    }

    this.router.navigate(['/map'], { queryParams });
  }

  clearSearchAndFilters(): void {
    this.currentQuery.set('');
    this.clearFilters();
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.scrollToTop();
    }
  }

  getVisiblePages(): (number | string)[] {
    const totalPages = this.totalPages();
    const currentPage = this.currentPage();
    const visiblePages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        visiblePages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          visiblePages.push(i);
        }
        visiblePages.push('...');
        visiblePages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        visiblePages.push(1);
        visiblePages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          visiblePages.push(i);
        }
      } else {
        visiblePages.push(1);
        visiblePages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          visiblePages.push(i);
        }
        visiblePages.push('...');
        visiblePages.push(totalPages);
      }
    }

    return visiblePages;
  }

  // Utility methods
  getSortLabel(sort: SortOption): string {
    const option = this.sortOptions.find(o => o.value === sort);
    return option?.label || 'Distancia';
  }

  calculateDistance(parking: ParkingModel): number {
    const userLoc = this.userLocation();
    if (!userLoc) return 0;

    return this.geolocation.calculateDistance(
      userLoc.coordinates,
      { latitude: parking.location.latitude, longitude: parking.location.longitude }
    );
  }

  isFavorite(parkingId: string): boolean {
    return this.favorites().has(parkingId);
  }

  trackByParkingId(index: number, parking: ParkingModel): string {
    return parking.id;
  }

  getActiveFilterChips(): Array<{ key: string; label: string }> {
    // Implementation for filter chips
    return [];
  }

  removeFilter(filterKey: string): void {
    // Implementation for removing filters
  }

  // Private methods
  private async initializeComponent(): Promise<void> {
    try {
      this.loadSavedSettings();
      await this.loadInitialData();
    } catch (error) {
      console.error('Error initializing parking list:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  private loadUserLocation(): void {
    this.geolocation.getCurrentPosition()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (location) => {
          this.userLocation.set(location);
          this.sortParkings();
        },
        error: (error) => {
          console.warn('Could not get user location:', error);
        }
      });
  }

  private loadFavorites(): void {
    const saved = this.storage.getItem<string[]>('favorites') || [];
    this.favorites.set(new Set(saved));
  }

  private saveFavorites(): void {
    const favArray = Array.from(this.favorites());
    this.storage.setItem('favorites', favArray);
  }

  private processRouteParams(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['query']) {
        this.currentQuery.set(params['query']);
        this.performSearch(params['query']);
      }
      if (params['sort']) {
        this.currentSort.set(params['sort'] as SortOption);
      }
      if (params['view']) {
        this.viewMode.set(params['view'] as 'list' | 'grid');
      }
    });
  }

  private async loadInitialData(): Promise<void> {
    try {
      const parkings = await this.mockData.getVigoParkings().toPromise();
      if (parkings) {
        this.parkings.set(parkings);
        this.applyFiltersAndSort();
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

  private loadSavedSettings(): void {
    const savedSort = this.storage.getItem<SortOption>('parking_list_sort');
    if (savedSort) this.currentSort.set(savedSort);

    const savedView = this.storage.getItem<'list' | 'grid'>('parking_list_view');
    if (savedView) this.viewMode.set(savedView);
  }

  private saveSettings(): void {
    this.storage.setItem('parking_list_sort', this.currentSort());
    this.storage.setItem('parking_list_view', this.viewMode());
  }

  private performSearch(query: string): void {
    if (!query.trim()) {
      this.applyFiltersAndSort();
      return;
    }

    this.isSearching.set(true);
    
    setTimeout(() => {
      const allParkings = this.parkings();
      const searchResults = allParkings.filter(parking =>
        parking.name.toLowerCase().includes(query.toLowerCase()) ||
        parking.address.toLowerCase().includes(query.toLowerCase()) ||
        parking.description?.toLowerCase().includes(query.toLowerCase())
      );

      this.filteredParkings.set(searchResults);
      this.sortParkings();
      this.resetPagination();
      this.isSearching.set(false);
    }, 300);
  }

  private applyFiltersAndSort(): void {
    const allParkings = this.parkings();
    this.filteredParkings.set(allParkings);
    this.sortParkings();
  }

  private sortParkings(): void {
    const parkings = [...this.filteredParkings()];
    const sortBy = this.currentSort();
    const userLoc = this.userLocation();

    parkings.sort((a, b) => {
      switch (sortBy) {
        case SortOption.DISTANCE:
          if (!userLoc) return 0;
          const distanceA = this.calculateDistance(a);
          const distanceB = this.calculateDistance(b);
          return distanceA - distanceB;

        case SortOption.PRICE:
          const priceA = this.getLowestPrice(a);
          const priceB = this.getLowestPrice(b);
          return priceA - priceB;

        case SortOption.RATING:
          return b.rating.average - a.rating.average;

        case SortOption.AVAILABILITY:
          const availabilityA = a.capacity.available / a.capacity.total;
          const availabilityB = b.capacity.available / b.capacity.total;
          return availabilityB - availabilityA;

        default:
          return 0;
      }
    });

    this.filteredParkings.set(parkings);
  }

  private getLowestPrice(parking: ParkingModel): number {
    const prices = parking.pricing.rates.map((rate: any) => rate.price);
    return Math.min(...prices);
  }

  private updateUrlParams(): void {
    const queryParams: any = {};
    
    if (this.currentQuery()) queryParams.query = this.currentQuery();
    if (this.currentSort() !== SortOption.DISTANCE) queryParams.sort = this.currentSort();
    if (this.viewMode() !== 'list') queryParams.view = this.viewMode();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  private resetPagination(): void {
    this.currentPage.set(1);
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
