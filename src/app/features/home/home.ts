// home.component.ts
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';

// Shared components - modernized with Tailwind
import { SearchBar } from '@shared/components/search-bar/search-bar';
import { Loading } from '@shared/components/loading/loading';

// Pipes - Tailwind compatible
import { DistancePipe } from '@shared/pipes/distance-pipe';
import { PricePipe } from '@shared/pipes/price-pipe';

// Services
import { ParkingService } from '@core/services/parking';
import { GeolocationService } from '@core/services/geolocation';
import { MockDataService } from '@core/services/mock-data';
import { StorageService } from '@core/services/storage';

// Models
import { 
  Parking, 
  LocationData, 
  User, 
  Vehicle, 
  ParkingReservation, 
  ParkingSearchParams,
  PriceRate,
  ParkingFilters,
  SortOption
} from '@core/models';

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
}

interface ParkingSection {
  title: string;
  subtitle?: string;
  parkings: Parking[];
  showMore?: boolean;
  loading?: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SearchBar,
    Loading,
    DistancePipe,
    PricePipe
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Injected services
  private parkingService = inject(ParkingService);
  private geoService = inject(GeolocationService);
  private mockService = inject(MockDataService);
  private storageService = inject(StorageService);

  // Reactive state
  isLoading = signal<boolean>(true);
  isLoadingNearby = signal<boolean>(false);
  isLoadingReservations = signal<boolean>(false);
  showLocationPrompt = signal<boolean>(false);
  
  // User data
  user = signal<User | null>(null);
  currentLocation = signal<LocationData | null>(null);
  
  // Parking data
  nearbyParkings = signal<Parking[]>([]);
  popularParkings = signal<Parking[]>([]);
  recentParkings = signal<Parking[]>([]);
  favoriteParkings = signal<Parking[]>([]);
  
  // Reservations
  activeReservations = signal<ParkingReservation[]>([]);
  upcomingReservations = signal<ParkingReservation[]>([]);
  
  // UI state
  favoriteIds = signal<Set<string>>(new Set());
  searchQuery = signal<string>('');
  
  // Computed properties
  userName = computed(() => {
    const user = this.user();
    return user ? user?.username?.split(' ')[0] : 'Usuario';
  });

  //router navigation
  private router = inject(Router);
  
  hasLocation = computed(() => this.currentLocation() !== null);
  
  favoriteCount = computed(() => this.favoriteIds().size);
  
  activeReservationCount = computed(() => 
    this.activeReservations().filter(r => r.status === 'active').length
  );
  
  upcomingReservationCount = computed(() => 
    this.upcomingReservations().length
  );
  
  // Quick actions
  quickActions = computed<QuickAction[]>(() => [
    {
      id: 'find-parking',
      title: 'Buscar parking',
      subtitle: 'Encuentra plazas cercanas',
      icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      route: '/parkings',
      color: 'blue',

      
    },
    {
      id: 'view-map',
      title: 'Ver mapa',
      subtitle: 'Explora la zona',
      icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
      route: '/map',
      color: 'green'
    },
    {
      id: 'my-reservations',
      title: 'Mis reservas',
      subtitle: `${this.activeReservationCount()} activas`,
      icon: 'M8 7V3a1 1 0 012 0v4h4V3a1 1 0 012 0v4h3a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z',
      route: '/reservations',
      color: 'purple'
    },
    {
      id: 'favorites',
      title: 'Favoritos',
      subtitle: `${this.favoriteCount()} guardados`,
      icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
      route: '/favorites',
      color: 'amber'
    }
  ]);
  
  // Parking sections for display
  parkingSections = computed<ParkingSection[]>(() => {
    const sections: ParkingSection[] = [];
    
    // Nearby parkings
    if (this.nearbyParkings().length > 0) {
      sections.push({
        title: 'Cerca de ti',
        subtitle: this.hasLocation() ? 'En tu zona actual' : 'Populares en la ciudad',
        parkings: this.nearbyParkings().slice(0, 6),
        showMore: this.nearbyParkings().length > 6,
        loading: this.isLoadingNearby()
      });
    }
    
    // Recent parkings
    if (this.recentParkings().length > 0) {
      sections.push({
        title: 'Visitados recientemente',
        subtitle: 'Tus últimos parkings',
        parkings: this.recentParkings().slice(0, 4),
        showMore: this.recentParkings().length > 4
      });
    }
    
    // Popular parkings
    if (this.popularParkings().length > 0) {
      sections.push({
        title: 'Más populares',
        subtitle: 'Los favoritos de otros usuarios',
        parkings: this.popularParkings().slice(0, 4),
        showMore: this.popularParkings().length > 4
      });
    }
    
    // Favorites
    if (this.favoriteParkings().length > 0) {
      sections.push({
        title: 'Tus favoritos',
        subtitle: 'Parkings que has guardado',
        parkings: this.favoriteParkings().slice(0, 4),
        showMore: this.favoriteParkings().length > 4
      });
    }
    
    return sections;
  });

  ngOnInit(): void {
    this.initializeHome();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Initialization
  private async initializeHome(): Promise<void> {
    try {
      // Load user data and favorites
      await Promise.all([
        this.loadUserData(),
        this.loadFavorites(),
        this.loadRecentParkings()
      ]);
      
      // Try to get location
      await this.getCurrentLocation();
      
      // Load parking data
      await this.loadParkingData();
      
    } catch (error) {
      console.error('Error initializing home:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadUserData(): Promise<void> {
    try {
      const userData = await this.mockService.getMockUser().toPromise();
      if (userData) {
        this.user.set(userData);
        await this.loadReservations();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  private async loadReservations(): Promise<void> {
    try {
      this.isLoadingReservations.set(true);
      const reservations = await this.mockService.getMockReservations().toPromise();
      
      if (reservations) {
        const now = new Date();
        const active = reservations.filter(r => 
          (r.status === 'confirmed' || r.status === 'active') &&
          new Date(r.startTime) <= now &&
          new Date(r.endTime) >= now
        );
        
        const upcoming = reservations.filter(r => 
          r.status === 'confirmed' &&
          new Date(r.startTime) > now
        );
        
        this.activeReservations.set(active);
        this.upcomingReservations.set(upcoming.slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      this.isLoadingReservations.set(false);
    }
  }

  private async loadFavorites(): Promise<void> {
    try {
      const favorites = this.storageService.getItem<string[]>('favorites') || [];
      this.favoriteIds.set(new Set(favorites));
      
      if (favorites.length > 0) {
        // Load favorite parkings details
        const favoriteDetails = await this.mockService.getVigoParkings().toPromise();
        if (favoriteDetails) {
          const favoriteParkings = favoriteDetails.filter((p: { id: string; }) => favorites.includes(p.id));
          this.favoriteParkings.set(favoriteParkings);
        }
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }

  private async loadRecentParkings(): Promise<void> {
    try {
      const recent = this.storageService.getItem<string[]>('recent_parkings') || [];
      if (recent.length > 0) {
        const parkings = await this.mockService.getVigoParkings().toPromise();
        if (parkings) {
          const recentParkings = recent
            .map(id => parkings.find((p: { id: string; }) => p.id === id))
            .filter(Boolean) as Parking[];
          this.recentParkings.set(recentParkings);
        }
      }
    } catch (error) {
      console.error('Error loading recent parkings:', error);
    }
  }

  private async getCurrentLocation(): Promise<void> {
    try {
      if (this.geoService.isGeolocationSupported()) {
        const location = await this.geoService.getCurrentPosition().toPromise();
        this.currentLocation.set(location || null);
        this.showLocationPrompt.set(false);
      } else {
        this.showLocationPrompt.set(true);
      }
    } catch (error) {
      console.warn('Location not available:', error);
      this.showLocationPrompt.set(true);
    }
  }

  private async loadParkingData(): Promise<void> {
    try {
      this.isLoadingNearby.set(true);
      
      const parkings = await this.mockService.getVigoParkings().toPromise();
      if (!parkings) return;
      
      // Load nearby parkings based on location
      if (this.hasLocation()) {
        const location = this.currentLocation()!;
        const searchLocation = {
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude
        };
        
        const response = await this.parkingService.searchParkings({
          location: searchLocation,
          radius: 2000, // 2km
          limit: 10
        }).toPromise();
        
        this.nearbyParkings.set(response?.data || []);
      } else {
        // Show popular ones if no location
        this.nearbyParkings.set(parkings.slice(0, 10));
      }
      
      // Load popular parkings
      const popular = parkings
        .sort((a: { rating: any; }, b: { rating: any; }) => (b.rating?.average || 0) - (a.rating?.average || 0))
        .slice(0, 8);
      this.popularParkings.set(popular);
      
    } catch (error) {
      console.error('Error loading parking data:', error);
    } finally {
      this.isLoadingNearby.set(false);
    }
  }

  // Event handlers
  onSearch(query: string): void {
    this.searchQuery.set(query);
    // Navigate to search results or update results in place
    // For now, navigate to parkings list with search
    // this.router.navigate(['/parkings'], { queryParams: { q: query } });
  }

  onFilterChange(filters: ParkingFilters): void {
    // Handle filter changes
    console.log('Filters changed:', filters);
  }

  onQuickActionClick(action: QuickAction): void {
    // Handle quick action clicks
     this.router.navigate([action.route]);
  }

  onParkingClick(parking: Parking): void {
    // Navigate to parking details
    // this.router.navigate(['/parking', parking.id]);
    
    // Add to recent parkings
    this.addToRecentParkings(parking.id);
  }

  onSectionShowMore(section: ParkingSection): void {
    // Navigate to full list based on section
    if (section.title === 'Cerca de ti') {
      // this.router.navigate(['/parkings'], { queryParams: { nearby: true } });
    } else if (section.title === 'Más populares') {
      // this.router.navigate(['/parkings'], { queryParams: { popular: true } });
    }
    // etc.
  }

  onToggleFavorite(parking: Parking): void {
    const favorites = new Set(this.favoriteIds());
    
    if (favorites.has(parking.id)) {
      favorites.delete(parking.id);
    } else {
      favorites.add(parking.id);
    }
    
    this.favoriteIds.set(favorites);
    this.storageService.setItem('favorites', Array.from(favorites));
    
    // Update favorite parkings list
    if (favorites.has(parking.id)) {
      this.favoriteParkings.update(current => [...current, parking]);
    } else {
      this.favoriteParkings.update(current => 
        current.filter(p => p.id !== parking.id)
      );
    }
  }

  onReservationClick(reservation: ParkingReservation): void {
    // Navigate to reservation details
    // this.router.navigate(['/reservation', reservation.id]);
  }

  onEnableLocation(): void {
    this.getCurrentLocation();
  }

  onDismissLocationPrompt(): void {
    this.showLocationPrompt.set(false);
  }

  // Utility methods
  private addToRecentParkings(parkingId: string): void {
    const recent = this.storageService.getItem<string[]>('recent_parkings') || [];
    const updated = [parkingId, ...recent.filter(id => id !== parkingId)].slice(0, 10);
    this.storageService.setItem('recent_parkings', updated);
  }

  getQuickActionColor(color: string): string {
    const colorMap = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      amber: 'from-amber-500 to-amber-600'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  }

  getParkingStatusColor(parking: Parking): string {
    if (!parking.capacity) return 'text-gray-500';
    
    if (parking.capacity.available === 0) return 'text-red-500';
    if (parking.capacity.available <= 3) return 'text-amber-500';
    return 'text-green-500';
  }

  getParkingStatusText(parking: Parking): string {
    if (!parking.capacity) return 'Disponibilidad desconocida';
    
    if (parking.capacity.available === 0) return 'Completo';
    if (parking.capacity.available === 1) return '1 plaza libre';
    if (parking.capacity.available <= 3) return `${parking.capacity.available} plazas libres`;
    return 'Disponible';
  }

  isFavorite(parkingId: string): boolean {
    return this.favoriteIds().has(parkingId);
  }

  trackByParkingId(index: number, parking: Parking): string {
    return parking.id;
  }

  trackByReservationId(index: number, reservation: ParkingReservation): string {
    return reservation.id;
  }

  trackByActionId(index: number, action: QuickAction): string {
    return action.id;
  }

  trackBySectionTitle(index: number, section: ParkingSection): string {
    return section.title;
  }
}