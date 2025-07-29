// =================== src/app/core/services/map.service.ts ===================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { 
  MapMarker, 
  Coordinates, 
  RouteInfo, 
  MapBounds, 
  MarkerType,
  Parking 
} from '@core/models';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private http = inject(HttpClient);
  
  private markersSubject = new BehaviorSubject<MapMarker[]>([]);
  public markers$ = this.markersSubject.asObservable();
  
  private mapCenterSubject = new BehaviorSubject<Coordinates>(environment.defaultCity);
  public mapCenter$ = this.mapCenterSubject.asObservable();
  
  private selectedMarkerSubject = new BehaviorSubject<MapMarker | null>(null);
  public selectedMarker$ = this.selectedMarkerSubject.asObservable();

  /**
   * Crear marcador de parking en el mapa
   */
  createParkingMarker(parking: Parking): MapMarker {
    return {
      id: parking.id,
      position: {
        latitude: parking.location.latitude,
        longitude: parking.location.longitude
      },
      title: parking.name,
      description: parking.address,
      type: MarkerType.PARKING,
      icon: this.getParkingIcon(parking),
      color: this.getParkingColor(parking),
      isVisible: true,
      data: parking
    };
  }

  /**
   * Crear marcador de ubicación del usuario
   */
  createUserLocationMarker(coordinates: Coordinates): MapMarker {
    return {
      id: 'user-location',
      position: coordinates,
      title: 'Tu ubicación',
      description: 'Ubicación actual',
      type: MarkerType.USER_LOCATION,
      icon: '📍',
      color: '#4285F4',
      isVisible: true,
      data: null
    };
  }

  /**
   * Añadir marcadores al mapa
   */
  addMarkers(markers: MapMarker[]): void {
    const currentMarkers = this.markersSubject.value;
    const updatedMarkers = [...currentMarkers, ...markers];
    this.markersSubject.next(updatedMarkers);
  }

  /**
   * Eliminar marcadores por tipo
   */
  removeMarkersByType(type: MarkerType): void {
    const currentMarkers = this.markersSubject.value;
    const filteredMarkers = currentMarkers.filter(marker => marker.type !== type);
    this.markersSubject.next(filteredMarkers);
  }

  /**
   * Limpiar todos los marcadores
   */
  clearMarkers(): void {
    this.markersSubject.next([]);
  }

  /**
   * Actualizar marcadores de parkings
   */
  updateParkingMarkers(parkings: Parking[]): void {
    this.removeMarkersByType(MarkerType.PARKING);
    const parkingMarkers = parkings.map(parking => this.createParkingMarker(parking));
    this.addMarkers(parkingMarkers);
  }

  /**
   * Centrar mapa en ubicación específica
   */
  centerMap(coordinates: Coordinates): void {
    this.mapCenterSubject.next(coordinates);
  }

  /**
   * Seleccionar marcador
   */
  selectMarker(marker: MapMarker): void {
    this.selectedMarkerSubject.next(marker);
  }

  /**
   * Deseleccionar marcador
   */
  deselectMarker(): void {
    this.selectedMarkerSubject.next(null);
  }

  /**
   * Calcular bounds para mostrar todos los marcadores
   */
  calculateBounds(coordinates: Coordinates[]): MapBounds | null {
    if (coordinates.length === 0) return null;

    const lats = coordinates.map(coord => coord.latitude);
    const lngs = coordinates.map(coord => coord.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Añadir padding
    const latPadding = (maxLat - minLat) * 0.1;
    const lngPadding = (maxLng - minLng) * 0.1;

    return {
      southwest: {
        latitude: minLat - latPadding,
        longitude: minLng - lngPadding
      },
      northeast: {
        latitude: maxLat + latPadding,
        longitude: maxLng + lngPadding
      }
    };
  }

  /**
   * Obtener ruta entre dos puntos
   */
  getRoute(origin: Coordinates, destination: Coordinates): Observable<RouteInfo | null> {
    const params = {
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      mode: 'driving'
    };

    return this.http.get<any>(`${environment.apiUrl}/maps/route`, { params })
      .pipe(
        map(response => this.parseRouteResponse(response)),
        catchError(() => of(null))
      );
  }

  /**
   * Buscar lugares por texto
   */
  searchPlaces(query: string, location?: Coordinates): Observable<MapMarker[]> {
    const params: any = { query };
    
    if (location) {
      params.lat = location.latitude;
      params.lng = location.longitude;
    }

    return this.http.get<any>(`${environment.apiUrl}/maps/search`, { params })
      .pipe(
        map(response => this.parsePlacesResponse(response)),
        catchError(() => of([]))
      );
  }

  /**
   * Obtener dirección de coordenadas (geocodificación inversa)
   */
  reverseGeocode(coordinates: Coordinates): Observable<string> {
    const params = {
      lat: coordinates.latitude.toString(),
      lng: coordinates.longitude.toString()
    };

    return this.http.get<any>(`${environment.apiUrl}/maps/reverse-geocode`, { params })
      .pipe(
        map(response => response.formatted_address || 'Dirección desconocida'),
        catchError(() => of('Dirección desconocida'))
      );
  }

  /**
   * Métodos privados para iconos y colores
   */
  private getParkingIcon(parking: Parking): string {
    switch (parking.type) {
      case 'underground': return '🅿️';
      case 'street': return '🛣️';
      case 'private': return '🏢';
      case 'shopping_center': return '🏬';
      case 'airport': return '✈️';
      case 'hospital': return '🏥';
      default: return '🅿️';
    }
  }

  private getParkingColor(parking: Parking): string {
    switch (parking.status) {
      case 'active': 
        return parking.capacity.available > 0 ? '#4CAF50' : '#f44336';
      case 'full': return '#FF9800';
      case 'maintenance': return '#9E9E9E';
      case 'inactive': return '#757575';
      default: return '#2196F3';
    }
  }

  /**
   * Parsear respuestas de APIs externas
   */
  private parseRouteResponse(response: any): RouteInfo | null {
    try {
      // Aquí adaptarías según la API de mapas que uses (Google, Mapbox, etc.)
      return {
        distance: response.distance || 0,
        duration: response.duration || 0,
        steps: response.steps || [],
        polyline: response.polyline || ''
      };
    } catch (error) {
      console.error('Error parsing route response:', error);
      return null;
    }
  }

  private parsePlacesResponse(response: any): MapMarker[] {
    try {
      return response.results?.map((place: any, index: number) => ({
        id: `place-${index}`,
        position: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng
        },
        title: place.name,
        description: place.formatted_address,
        type: MarkerType.SEARCH_RESULT,
        icon: '📍',
        color: '#FF5722',
        isVisible: true,
        data: place
      })) || [];
    } catch (error) {
      console.error('Error parsing places response:', error);
      return [];
    }
  }
}
