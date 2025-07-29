// src/app/features/map/map.component.ts
import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ViewChild, 
  ElementRef, 
  inject, 
  signal, 
  computed, 
  AfterViewInit,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Services & Models
import { ParkingService } from '@core/services/parking';
import { GeolocationService } from '@core/services/geolocation';
import { Parking, LocationData, ParkingSearchParams } from '@core/models';

// Components
import { SearchBar } from '@shared/components/search-bar/search-bar';
import { Loading } from '@shared/components/loading/loading';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SearchBar,
    Loading
  ],
  templateUrl: './map.html',
  styleUrls: ['./map.scss']
})
export class MapComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private destroy$ = new Subject<void>();
  private map: any;
  private userMarker?: any;
  private markersGroup: any;
  private L: any;

  // Injected services
  private parkingService = inject(ParkingService);
  private geoService = inject(GeolocationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  // Reactive state
  isLoading = signal(true);
  parkings = signal<Parking[]>([]);
  userLocation = signal<LocationData | null>(null);
  showFilters = signal(false);
  selectedFeatures = signal<string[]>([]);
  hasSearched = signal(false);
  mapStyle = signal<'default' | 'satellite'>('default');

  // Computed properties
  visibleParkings = computed(() => {
    return this.parkings().filter(parking => {
      // Add filtering logic here if needed
      return true;
    });
  });

  hasResults = computed(() => this.parkings().length > 0);
  canShowFilters = computed(() => this.hasSearched() && this.hasResults());

  async ngOnInit(): Promise<void> {
    this.initializeLocation();
    this.handleRouteParams();
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return; // Skip map initialization on server
    }

    try {
      // Dynamic import of Leaflet only in browser
      this.L = await import('leaflet');
      
      // Wait for view to be ready before initializing map
      setTimeout(() => {
        this.initializeMap();
      }, 100);
    } catch (error) {
      console.error('Error loading map libraries:', error);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
    }
  }

  private initializeMap(): void {
    if (!this.L || !isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      // Configure Leaflet icons
      delete (this.L.Icon.Default.prototype as any)._getIconUrl;
      this.L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
        iconUrl: 'assets/leaflet/marker-icon.png',
        shadowUrl: 'assets/leaflet/marker-shadow.png',
      });

      // Create map
      this.map = this.L.map(this.mapContainer.nativeElement, {
        center: [42.2406, -8.7207], // Vigo center
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true
      });

      // Add tile layer
      this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Initialize markers group
      this.markersGroup = new this.L.FeatureGroup();
      this.map.addLayer(this.markersGroup);

      this.isLoading.set(false);
      
    } catch (error) {
      console.error('Error initializing map:', error);
      this.isLoading.set(false);
    }
  }

  private initializeLocation(): void {
    // Get user location
    this.geoService.getCurrentPosition()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (location) => {
          this.userLocation.set(location);
          this.addUserMarker(location);
        },
        error: (error) => {
          console.warn('Could not get user location:', error);
        }
      });
  }

  private addUserMarker(location: LocationData): void {
    if (!this.L || !this.map) return;

    const userIcon = this.L.divIcon({
      html: '<div class="user-marker">📍</div>',
      className: 'custom-div-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    this.userMarker = this.L.marker(
      [location.coordinates.latitude, location.coordinates.longitude],
      { icon: userIcon }
    ).addTo(this.map);
  }

  private updateParkingMarkers(): void {
    if (!this.map || !this.markersGroup) return;

    // Clear existing markers
    this.markersGroup.clearLayers();

    // Add new markers
    this.visibleParkings().forEach(parking => {
      const marker = this.createParkingMarker(parking);
      this.markersGroup.addLayer(marker);
    });
  }

  private createParkingMarker(parking: Parking): any {
    const icon = this.L.divIcon({
      html: `<div class="parking-marker">🅿️</div>`,
      className: 'custom-div-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = this.L.marker(
      [parking.location.latitude, parking.location.longitude],
      { icon }
    );

    // Add popup
    marker.bindPopup(`
      <div class="parking-popup">
        <h3>${parking.name}</h3>
        <p>${parking.address}</p>
        <p>${parking.capacity.available} plazas disponibles</p>
      </div>
    `);

    // Add click handler
    marker.on('click', () => {
      this.onParkingClick(parking);
    });

    return marker;
  }

  private handleRouteParams(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['search']) {
          this.onSearch(params['search']);
        }
      });
  }

  // Public methods for template
  onSearch(query: string): void {
    this.hasSearched.set(true);
    this.performSearch(query);
  }

  private async performSearch(query: string): Promise<void> {
    try {
      this.isLoading.set(true);
      const searchParams: ParkingSearchParams = {
        query
      };
      const response = await this.parkingService.searchParkings(searchParams).toPromise();
      const results = response?.data || [];
      this.parkings.set(results);
      this.updateParkingMarkers();
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onFilterChange(filters: any): void {
    this.selectedFeatures.set(filters);
    this.updateParkingMarkers();
  }

  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  clearFilters(): void {
    this.selectedFeatures.set([]);
    this.showFilters.set(false);
    this.updateParkingMarkers();
  }

  toggleMapStyle(): void {
    const newStyle = this.mapStyle() === 'default' ? 'satellite' : 'default';
    this.mapStyle.set(newStyle);
    // Add layer switching logic here if needed
  }

  zoomToUserLocation(): void {
    if (this.userLocation() && this.map) {
      const location = this.userLocation()!;
      this.map.setView([location.coordinates.latitude, location.coordinates.longitude], 16);
    }
  }

  private onParkingClick(parking: Parking): void {
    this.router.navigate(['/parking', parking.id]);
  }
}
