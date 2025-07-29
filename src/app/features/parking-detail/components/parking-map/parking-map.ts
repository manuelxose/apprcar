import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

// Modelos
import { Parking, LocationData } from '@core/models';

@Component({
  selector: 'app-parking-map',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './parking-map.html',
  styleUrls: ['./parking-map.scss']
})
export class ParkingMapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  @Input() parking!: Parking;
  @Input() userLocation: LocationData | null = null;

  // Signals
  mapInitialized = signal(false);
  mapStyle = signal<'default' | 'satellite'>('default');
  showTraffic = signal(false);
  isFullscreen = signal(false);

  private map: any;
  private parkingMarker: any;
  private userMarker: any;
  private L: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}
  private routeControl?: any;

  // Computed
  distance = computed(() => {
    if (!this.userLocation || !this.parking) return 0;
    return this.calculateDistance(
      this.userLocation.coordinates,
      { latitude: this.parking.location.latitude, longitude: this.parking.location.longitude }
    );
  });

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return; // Skip map initialization on server
    }

    try {
      // Dynamic import of Leaflet only in browser
      this.L = await import('leaflet');
      
      // Pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => {
        this.initializeMap();
      }, 100);
    } catch (error) {
      console.error('Error loading map:', error);
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initializeMap(): void {
    try {
      // Configurar iconos por defecto de Leaflet
      this.configureLeafletIcons();

      // Crear el mapa centrado en el parking
      this.map = this.L.map(this.mapContainer.nativeElement, {
        center: [this.parking.location.latitude, this.parking.location.longitude],
        zoom: 16,
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: true,
        attributionControl: false
      });

      // Añadir capa del mapa
      this.addTileLayer();

      // Añadir marcadores
      this.addParkingMarker();
      
      if (this.userLocation) {
        this.addUserMarker();
        this.fitBounds();
      }

      this.mapInitialized.set(true);

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  private configureLeafletIcons(): void {
    // Fix para los iconos por defecto de Leaflet
    delete (this.L.Icon.Default.prototype as any)._getIconUrl;
    this.L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/vendor/leaflet/marker-icon-2x.png',
      iconUrl: 'assets/vendor/leaflet/marker-icon.png',
      shadowUrl: 'assets/vendor/leaflet/marker-shadow.png',
    });
  }

  private addTileLayer(): void {
    const tileLayer = this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    });

    tileLayer.addTo(this.map);
  }

  private addParkingMarker(): void {
    // Crear icono personalizado para el parking
    const parkingIcon = this.L.divIcon({
      className: 'custom-parking-marker',
      html: this.createParkingMarkerHTML(),
      iconSize: [50, 60],
      iconAnchor: [25, 60],
      popupAnchor: [0, -60]
    });

    this.parkingMarker = this.L.marker(
      [this.parking.location.latitude, this.parking.location.longitude],
      { icon: parkingIcon }
    ).addTo(this.map);

    // Popup con información del parking
    const popupContent = this.createParkingPopupContent();
    this.parkingMarker.bindPopup(popupContent, {
      maxWidth: 300,
      className: 'custom-popup'
    }).openPopup();
  }

  private createParkingMarkerHTML(): string {
    const availabilityColor = this.getAvailabilityColor();
    const typeIcon = this.getParkingTypeIcon();
    
    return `
      <div class="parking-marker-container">
        <div class="parking-marker-pin ${availabilityColor}">
          <div class="parking-icon">${typeIcon}</div>
          <div class="parking-count">${this.parking.capacity.available}</div>
        </div>
        <div class="parking-marker-shadow"></div>
      </div>
    `;
  }

  private createParkingPopupContent(): string {
    const distance = this.distance();
    const price = this.getLowestPrice();
    
    return `
      <div class="parking-popup">
        <div class="popup-header">
          <h3>${this.parking.name}</h3>
          <div class="popup-type">${this.getParkingTypeLabel()}</div>
        </div>
        
        <p class="popup-address">${this.parking.address}</p>
        
        <div class="popup-details">
          <div class="detail-item">
            <span class="detail-icon">📍</span>
            <span class="detail-text">${distance > 0 ? this.formatDistance(distance) : '--'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-icon">💰</span>
            <span class="detail-text">€${price.toFixed(2)}/h</span>
          </div>
          <div class="detail-item">
            <span class="detail-icon">🅿️</span>
            <span class="detail-text">${this.parking.capacity.available}/${this.parking.capacity.total}</span>
          </div>
        </div>
        
        <div class="popup-actions">
          <button onclick="window.parent.openParkingDetail('${this.parking.id}')" class="popup-button primary">
            Ver detalles
          </button>
        </div>
      </div>
    `;
  }

  private addUserMarker(): void {
    if (!this.userLocation) return;

    const userIcon = this.L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div class="user-marker-container">
          <div class="user-marker-dot"></div>
          <div class="user-marker-pulse"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    this.userMarker = this.L.marker(
      [this.userLocation.coordinates.latitude, this.userLocation.coordinates.longitude],
      { icon: userIcon }
    ).addTo(this.map);

    this.userMarker.bindPopup('Tu ubicación', {
      className: 'user-popup'
    });
  }

  private fitBounds(): void {
    if (!this.userLocation || !this.userMarker) return;

    const group = new this.L.FeatureGroup([this.parkingMarker, this.userMarker]);
    this.map.fitBounds(group.getBounds(), { 
      padding: [30, 30],
      maxZoom: 16 
    });
  }

  // Métodos públicos para controles del mapa
  centerOnParking(): void {
    if (!this.map) return;
    
    this.map.setView(
      [this.parking.location.latitude, this.parking.location.longitude],
      17,
      { animate: true, duration: 0.5 }
    );
  }

  centerOnUser(): void {
    if (!this.userLocation || !this.map) return;
    
    this.map.setView(
      [this.userLocation.coordinates.latitude, this.userLocation.coordinates.longitude],
      17,
      { animate: true, duration: 0.5 }
    );
  }

  toggleMapStyle(): void {
    // Cambiar entre vista normal y satélite (simulado)
    const currentStyle = this.mapStyle();
    this.mapStyle.set(currentStyle === 'default' ? 'satellite' : 'default');
    
    // En una implementación real, cambiarías el tile layer aquí
    console.log('Map style changed to:', this.mapStyle());
  }

  toggleFullscreen(): void {
    this.isFullscreen.update(fs => !fs);
    
    // Resize del mapa después del cambio de tamaño
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 300);
  }

  openInGoogleMaps(): void {
    const { latitude, longitude } = this.parking.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  }

  openInAppleMaps(): void {
    const { latitude, longitude } = this.parking.location;
    const url = `http://maps.apple.com/?daddr=${latitude},${longitude}`;
    window.open(url, '_blank');
  }

  // Métodos auxiliares
  calculateDistance(userCoords: any, parkingCoords: any): number {
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

  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  formatDistance(distance: number): string {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  }

  getAvailabilityColor(): string {
    const available = this.parking.capacity.available;
    const total = this.parking.capacity.total;
    const percentage = (available / total) * 100;
    
    if (available === 0) return 'red';
    if (percentage <= 25) return 'yellow';
    return 'green';
  }

  getParkingTypeIcon(): string {
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
    if (!this.parking.pricing?.rates?.length) return 0;
    const prices = this.parking.pricing.rates.map(rate => rate.price);
    return Math.min(...prices);
  }
}