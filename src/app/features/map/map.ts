import { 
  Component, 
  OnInit, 
  OnDestroy, 
  AfterViewInit, 
  inject, 
  signal, 
  computed,
  ViewChild,
  ElementRef 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';
import * as L from 'leaflet';
import 'leaflet.markercluster';

// Importar CSS de Leaflet
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { GeolocationService } from '@core/services/geolocation.service';
import { NotificationService } from '@core/services/notification.service';
import { PlazaDetailModalComponent } from './components/plaza-detail-modal/plaza-detail-modal.component';
import { MapControlsComponent } from './components/map-controls/map-controls.component';

import * as PlazaActions from '@store/plaza/plaza.actions';
import * as PlazaSelectors from '@store/plaza/plaza.selectors';

import { PlazaLibre, LocationData, PlazaFilters } from '@core/models';

// Fix para iconos de Leaflet
const iconRetinaUrl = 'assets/marker-icon-2x.png';
const iconUrl = 'assets/marker-icon.png';
const shadowUrl = 'assets/marker-shadow.png';
const iconDefault = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule,
    PlazaDetailModalComponent,
    MapControlsComponent
  ],
  templateUrl: './map.html',
  styleUrl: './map.scss'
})
export class MapComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private destroy$ = new Subject<void>();
  private store = inject(Store);
  private geolocationService = inject(GeolocationService);
  private notificationService = inject(NotificationService);

  // Leaflet map instance
  private map!: L.Map;
  private markerClusterGroup!: L.MarkerClusterGroup;
  private userLocationMarker?: L.Marker;
  private plazaMarkers: Map<string, L.Marker> = new Map();
  private isMapInitialized = signal(false);
  private pendingPlazas: PlazaLibre[] = [];

  // Signals
  isLoading = signal(true);
  isRefreshing = signal(false);
  loadingMessage = signal('Inicializando mapa...');
  userLocation = signal<LocationData | null>(null);
  filters = signal<PlazaFilters>({
    radius: 1000,
    maxAge: 10,
    showOnlyAvailable: true,
    includePaid: false
  });
  selectedPlaza = signal<PlazaLibre | null>(null);
  error = signal<string | null>(null);

  // Store selectors
  availablePlazas = signal<PlazaLibre[]>([]);
  plazaStats = signal({
    available: 0,
    claimed: 0,
    occupied: 0,
    total: 0
  });

  ngOnInit() {
    this.initializeStoreSubscriptions();
    this.getUserLocation();
  }

  ngAfterViewInit() {
    this.initializeMap();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.map) {
      this.map.remove();
    }
  }

  private initializeStoreSubscriptions(): void {
    // Subscribe to plaza data
    this.store.select(PlazaSelectors.selectAvailablePlazas)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plazas) => {
          try {
            console.log('Received plazas:', plazas?.length || 0);
            this.availablePlazas.set(plazas || []);
            
            // Check if map is initialized before updating markers
            if (this.isMapInitialized()) {
              this.updateMapMarkers(plazas || []);
            } else {
              // Store plazas to process when map is ready
              this.pendingPlazas = plazas || [];
            }
          } catch (error) {
            console.error('Error updating plaza markers:', error);
          }
        },
        error: (error) => {
          console.error('Error subscribing to available plazas:', error);
          this.availablePlazas.set([]);
        }
      });

    // Subscribe to plaza stats
    this.store.select(PlazaSelectors.selectPlazaStats)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => this.plazaStats.set(stats),
        error: (error) => console.error('Error subscribing to plaza stats:', error)
      });

    // Subscribe to filters
    this.store.select(PlazaSelectors.selectPlazaFilters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (filters) => this.filters.set(filters),
        error: (error) => console.error('Error subscribing to plaza filters:', error)
      });

    // Subscribe to loading state
    this.store.select(PlazaSelectors.selectPlazaLoading)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (loading) => {
          console.log('Loading state changed:', loading);
          this.isLoading.set(loading);
          if (loading) {
            this.loadingMessage.set('Cargando plazas cercanas...');
          } else {
            this.loadingMessage.set('');
          }
        },
        error: (error) => console.error('Error subscribing to plaza loading:', error)
      });

    // Subscribe to errors
    this.store.select(PlazaSelectors.selectPlazaError)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (error) => this.error.set(error),
        error: (error) => console.error('Error subscribing to plaza errors:', error)
      });
  }

  private getUserLocation(): void {
    this.loadingMessage.set('Obteniendo tu ubicación...');
    
    this.geolocationService.getCurrentPosition()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (userLocation) => {
          // Transform UserLocation to LocationData
          const locationData: LocationData = {
            coordinates: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude
            },
            address: {
              formattedAddress: userLocation.address || `${userLocation.latitude}, ${userLocation.longitude}`,
              city: 'Unknown',
              country: 'Unknown',
              countryCode: 'UN'
            },
            accuracy: userLocation.accuracy || 0,
            timestamp: new Date(userLocation.timestamp || Date.now()),
            source: 'gps' as any
          };
          
          this.userLocation.set(locationData);
          this.store.dispatch(PlazaActions.updateUserLocation({ location: locationData }));
          this.centerMapOnLocation(locationData.coordinates);
          this.loadNearbyPlazas(locationData);
        },
        error: (error) => {
          console.error('Geolocation error:', error);
          this.error.set('No se pudo obtener tu ubicación. Activa el GPS.');
          this.loadingMessage.set('Usando ubicación por defecto...');
          
          // Usar ubicación por defecto (Madrid)
          const defaultLocation: LocationData = {
            coordinates: { latitude: 40.4168, longitude: -3.7038 },
            address: {
              formattedAddress: 'Madrid, España',
              city: 'Madrid',
              country: 'España',
              countryCode: 'ES'
            },
            accuracy: 0,
            timestamp: new Date(),
            source: 'manual' as any
          };
          this.userLocation.set(defaultLocation);
          this.centerMapOnLocation(defaultLocation.coordinates);
          this.loadNearbyPlazas(defaultLocation);
        }
      });
  }

  private initializeMap(): void {
    // Crear mapa
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [40.4168, -3.7038], // Madrid por defecto
      zoom: 15,
      zoomControl: true,
      attributionControl: true
    });

    // Añadir capa de teselas
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Inicializar cluster de marcadores
    this.markerClusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        
        if (count > 10) size = 'large';
        else if (count > 5) size = 'medium';
        
        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: [40, 40]
        });
      }
    });

    this.map.addLayer(this.markerClusterGroup);

    // Event listeners
    this.map.on('moveend', () => this.onMapMoveEnd());
    this.map.on('zoomend', () => this.onMapZoomEnd());

    // Mark map as initialized and process pending plazas
    this.isMapInitialized.set(true);
    this.isLoading.set(false);
    console.log('Map initialized successfully');
    
    // Process any pending plazas that arrived before map was ready
    if (this.pendingPlazas.length > 0) {
      console.log('Processing pending plazas:', this.pendingPlazas.length);
      this.updateMapMarkers(this.pendingPlazas);
      this.pendingPlazas = [];
    }
  }

  private centerMapOnLocation(coordinates: { latitude: number; longitude: number }): void {
    if (this.isMapInitialized() && this.map) {
      this.map.setView([coordinates.latitude, coordinates.longitude], 16);
      this.updateUserLocationMarker(coordinates);
    }
  }

  private updateUserLocationMarker(coordinates: { latitude: number; longitude: number }): void {
    if (!this.isMapInitialized() || !this.map) {
      return;
    }

    if (this.userLocationMarker) {
      this.map.removeLayer(this.userLocationMarker);
    }

    // Crear marcador personalizado para el usuario
    const userIcon = L.divIcon({
      html: `
        <div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
        <div class="absolute inset-0 w-4 h-4 bg-blue-600 rounded-full animate-ping opacity-20"></div>
      `,
      className: 'user-location-marker',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    this.userLocationMarker = L.marker([coordinates.latitude, coordinates.longitude], {
      icon: userIcon,
      zIndexOffset: 1000
    }).addTo(this.map);

    // Añadir círculo de precisión
    L.circle([coordinates.latitude, coordinates.longitude], {
      radius: 100,
      fillColor: '#3b82f6',
      color: '#3b82f6',
      weight: 1,
      opacity: 0.3,
      fillOpacity: 0.1
    }).addTo(this.map);
  }

  private updateMapMarkers(plazas: PlazaLibre[]): void {
    // Verify that the map and markerClusterGroup are initialized
    if (!this.isMapInitialized() || !this.map || !this.markerClusterGroup) {
      console.warn('Map not ready for marker updates, storing plazas for later');
      this.pendingPlazas = plazas;
      return;
    }

    try {
      // Clear existing markers
      this.markerClusterGroup.clearLayers();
      this.plazaMarkers.clear();

      // Add new markers
      plazas.forEach(plaza => this.addPlazaMarker(plaza));
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  }

  private addPlazaMarker(plaza: PlazaLibre): void {
    if (!this.isMapInitialized() || !this.markerClusterGroup) {
      return;
    }

    const icon = this.createPlazaIcon(plaza);
    const marker = L.marker([plaza.location.latitude, plaza.location.longitude], { icon });

    // Popup con información básica
    const popupContent = this.createPopupContent(plaza);
    marker.bindPopup(popupContent, {
      className: 'custom-plaza-popup',
      maxWidth: 300,
      closeButton: true
    });

    // Event listeners
    marker.on('click', () => this.onMarkerClick(plaza));
    marker.on('popupopen', () => this.onPopupOpen(plaza));

    // Añadir al cluster y al mapa
    this.markerClusterGroup.addLayer(marker);
    this.plazaMarkers.set(plaza.id, marker);
  }

  private createPlazaIcon(plaza: PlazaLibre): L.DivIcon {
    let color = '#10b981'; // Verde por defecto
    let bgColor = '#ecfdf5';
    let symbol = '🅿️';

    switch (plaza.status) {
      case 'available':
        color = '#10b981';
        bgColor = '#ecfdf5';
        symbol = '🅿️';
        break;
      case 'claimed':
        color = '#f59e0b';
        bgColor = '#fffbeb';
        symbol = '⏱️';
        break;
      case 'occupied':
        color = '#ef4444';
        bgColor = '#fef2f2';
        symbol = '🚗';
        break;
      default:
        color = '#6b7280';
        bgColor = '#f9fafb';
        symbol = '❓';
    }

    return L.divIcon({
      html: `
        <div class="plaza-marker" style="background-color: ${bgColor}; border-color: ${color};">
          <span style="color: ${color};">${symbol}</span>
          ${plaza.details.isPaid ? '<div class="paid-indicator">€</div>' : ''}
        </div>
      `,
      className: 'custom-plaza-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  }

  private createPopupContent(plaza: PlazaLibre): string {
    const distance = plaza.distance ? `${Math.round(plaza.distance)}m` : '';
    const timeAgo = this.getTimeAgo(plaza.createdAt);
    
    return `
      <div class="p-2">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold text-gray-900 text-sm">Plaza ${plaza.details.size}</h3>
          <span class="text-xs px-2 py-1 rounded-full ${this.getStatusBadgeClass(plaza.status)}">
            ${this.getStatusText(plaza.status)}
          </span>
        </div>
        
        <div class="space-y-1 text-xs text-gray-600">
          ${plaza.location.description ? `<p>${plaza.location.description}</p>` : ''}
          ${distance ? `<p>📍 A ${distance}</p>` : ''}
          <p>⏰ ${timeAgo}</p>
          ${plaza.details.isPaid ? `<p>💰 Zona de pago</p>` : ''}
        </div>

        <button 
          onclick="window.selectPlaza('${plaza.id}')"
          class="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors duration-200"
        >
          Ver detalles
        </button>
      </div>
    `;
  }

  private loadNearbyPlazas(location: LocationData): void {
    console.log('Loading nearby plazas for location:', location.coordinates);
    this.store.dispatch(PlazaActions.loadNearbyFreePlazas({
      location,
      radius: this.filters().radius
    }));

    // Safety timeout to prevent infinite loading
    setTimeout(() => {
      if (this.isLoading()) {
        console.warn('Plaza loading timeout reached, forcing loading state to false');
        this.isLoading.set(false);
        this.loadingMessage.set('');
        // If no plazas were loaded, show a message
        if (this.availablePlazas().length === 0) {
          this.error.set('No se encontraron plazas cercanas. Intenta ajustar los filtros.');
        }
      }
    }, 10000); // 10 second timeout
  }

  // Event handlers
  onMarkerClick(plaza: PlazaLibre): void {
    this.selectedPlaza.set(plaza);
  }

  onPopupOpen(plaza: PlazaLibre): void {
    // Hacer disponible globalmente para el onclick del popup
    (window as any).selectPlaza = (plazaId: string) => {
      const plaza = this.availablePlazas().find(p => p.id === plazaId);
      if (plaza) {
        this.selectedPlaza.set(plaza);
      }
    };
  }

  onMapMoveEnd(): void {
    if (this.userLocation() && this.isMapInitialized()) {
      this.loadNearbyPlazas(this.userLocation()!);
    }
  }

  onMapZoomEnd(): void {
    // Opcional: recargar datos basado en el zoom
  }

  onFiltersChange(newFilters: PlazaFilters): void {
    this.store.dispatch(PlazaActions.setPlazaFilters({ filters: newFilters }));
    if (this.userLocation()) {
      this.loadNearbyPlazas(this.userLocation()!);
    }
  }

  centerOnUserLocation(): void {
    if (this.userLocation()) {
      this.centerMapOnLocation(this.userLocation()!.coordinates);
    } else {
      this.getUserLocation();
    }
  }

  refreshPlazas(): void {
    if (this.userLocation()) {
      this.isRefreshing.set(true);
      this.loadNearbyPlazas(this.userLocation()!);
      
      setTimeout(() => {
        this.isRefreshing.set(false);
      }, 1000);
    }
  }

  closeDetailModal(): void {
    this.selectedPlaza.set(null);
  }

  onClaimPlaza(plazaId: string): void {
    this.store.dispatch(PlazaActions.claimParkingSpot({ plazaId }));
  }

  onNavigateToPlaza(plaza: PlazaLibre): void {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${plaza.location.latitude},${plaza.location.longitude}`;
    window.open(url, '_blank');
  }

  onReportPlaza(data: { plazaId: string; reason: string; comment?: string }): void {
    const validReasons = ['not_found', 'already_taken', 'restricted', 'other'] as const;
    const reason = validReasons.includes(data.reason as any) ? data.reason as typeof validReasons[number] : 'other';
    
    this.store.dispatch(PlazaActions.reportPlazaUnavailable({
      plazaId: data.plazaId,
      reason,
      comment: data.comment
    }));
  }

  // Utility methods
  private getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      available: 'Libre',
      claimed: 'Reclamada',
      occupied: 'Ocupada',
      unavailable: 'No disponible'
    };
    return statusMap[status] || status;
  }

  private getStatusBadgeClass(status: string): string {
    const classMap: { [key: string]: string } = {
      available: 'bg-green-100 text-green-800',
      claimed: 'bg-yellow-100 text-yellow-800',
      occupied: 'bg-red-100 text-red-800',
      unavailable: 'bg-gray-100 text-gray-800'
    };
    return classMap[status] || 'bg-gray-100 text-gray-800';
  }

  private getTimeAgo(dateString: string): string {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Hace un momento';
    if (minutes === 1) return 'Hace 1 minuto';
    if (minutes < 60) return `Hace ${minutes} minutos`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return 'Hace 1 hora';
    return `Hace ${hours} horas`;
  }

  getLastUpdateText(): string {
    return new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
