// =================== src/app/core/services/parking.service.ts ===================

import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, map, catchError, of, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '@environments/environment';
import { 
  Parking, 
  ParkingSearchParams, 
  ParkingReservation, 
  PaginatedResponse,
  ApiResponse 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ParkingService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private readonly API_URL = `${environment.apiUrl}/parkings`;
  
  // Estado global de parkings
  private parkingsSubject = new BehaviorSubject<Parking[]>([]);
  public parkings$ = this.parkingsSubject.asObservable();
  
  private selectedParkingSubject = new BehaviorSubject<Parking | null>(null);
  public selectedParking$ = this.selectedParkingSubject.asObservable();
  
  private favoritesSubject = new BehaviorSubject<Set<string>>(new Set());
  public favorites$ = this.favoritesSubject.asObservable();

  constructor() {
    this.loadFavorites();
  }

  /**
   * Buscar parkings con parámetros avanzados
   */
  searchParkings(params: ParkingSearchParams): Observable<PaginatedResponse<Parking>> {
    let httpParams = new HttpParams();
    
    if (params.query) httpParams = httpParams.set('query', params.query);
    if (params.location) {
      httpParams = httpParams.set('lat', params.location.latitude.toString());
      httpParams = httpParams.set('lng', params.location.longitude.toString());
    }
    if (params.radius) httpParams = httpParams.set('radius', params.radius.toString());
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.offset) httpParams = httpParams.set('offset', params.offset.toString());
    
    // Filtros
    if (params.filters) {
      if (params.filters.type?.length) {
        httpParams = httpParams.set('types', params.filters.type.join(','));
      }
      if (params.filters.maxPrice) {
        httpParams = httpParams.set('maxPrice', params.filters.maxPrice.toString());
      }
      if (params.filters.priceType) {
        httpParams = httpParams.set('priceType', params.filters.priceType);
      }
      if (params.filters.availability !== undefined) {
        httpParams = httpParams.set('availability', params.filters.availability.toString());
      }
      if (params.filters.rating) {
        httpParams = httpParams.set('minRating', params.filters.rating.toString());
      }
      
      // Filtros de características
      if (params.filters.features) {
        Object.entries(params.filters.features).forEach(([key, value]) => {
          if (value) httpParams = httpParams.set(key, 'true');
        });
      }
    }

    return this.http.get<PaginatedResponse<Parking>>(`${this.API_URL}/search`, { params: httpParams })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.parkingsSubject.next(response.data);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obtener parkings cercanos basado en ubicación actual
   */
  getNearbyParkings(lat: number, lng: number, radius: number = 1000): Observable<Parking[]> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lng', lng.toString())
      .set('radius', radius.toString());

    return this.http.get<ApiResponse<Parking[]>>(`${this.API_URL}/nearby`, { params })
      .pipe(
        map(response => response.data || []),
        tap(parkings => this.parkingsSubject.next(parkings)),
        catchError(() => of([]))
      );
  }

  /**
   * Obtener detalles de un parking específico
   */
  getParkingById(id: string): Observable<Parking | null> {
    return this.http.get<ApiResponse<Parking>>(`${this.API_URL}/${id}`)
      .pipe(
        map(response => response.data || null),
        tap(parking => {
          if (parking) this.selectedParkingSubject.next(parking);
        }),
        catchError(() => of(null))
      );
  }

  /**
   * Verificar disponibilidad en tiempo real
   */
  checkAvailability(parkingId: string): Observable<{ available: number; total: number }> {
    return this.http.get<ApiResponse<{ available: number; total: number }>>(`${this.API_URL}/${parkingId}/availability`)
      .pipe(
        map(response => response.data || { available: 0, total: 0 }),
        catchError(() => of({ available: 0, total: 0 }))
      );
  }

  /**
   * Crear una reserva
   */
  createReservation(reservationData: Partial<ParkingReservation>): Observable<ParkingReservation | null> {
    return this.http.post<ApiResponse<ParkingReservation>>(`${this.API_URL}/reservations`, reservationData)
      .pipe(
        map(response => response.data || null),
        catchError(this.handleError)
      );
  }

  /**
   * Obtener reservas del usuario
   */
  getUserReservations(userId: string): Observable<ParkingReservation[]> {
    return this.http.get<ApiResponse<ParkingReservation[]>>(`${this.API_URL}/reservations/user/${userId}`)
      .pipe(
        map(response => response.data || []),
        catchError(() => of([]))
      );
  }

  /**
   * Cancelar una reserva
   */
  cancelReservation(reservationId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/reservations/${reservationId}`)
      .pipe(
        map(response => response.success),
        catchError(() => of(false))
      );
  }

  /**
   * Gestión de favoritos
   */
  addToFavorites(parkingId: string): void {
    const favorites = this.favoritesSubject.value;
    favorites.add(parkingId);
    this.favoritesSubject.next(new Set(favorites));
    this.saveFavorites();
  }

  removeFromFavorites(parkingId: string): void {
    const favorites = this.favoritesSubject.value;
    favorites.delete(parkingId);
    this.favoritesSubject.next(new Set(favorites));
    this.saveFavorites();
  }

  isFavorite(parkingId: string): boolean {
    return this.favoritesSubject.value.has(parkingId);
  }

  getFavoritesParkings(): Observable<Parking[]> {
    const favoriteIds = Array.from(this.favoritesSubject.value);
    if (favoriteIds.length === 0) return of([]);

    const params = new HttpParams().set('ids', favoriteIds.join(','));
    return this.http.get<ApiResponse<Parking[]>>(`${this.API_URL}/batch`, { params })
      .pipe(
        map(response => response.data || []),
        catchError(() => of([]))
      );
  }

  /**
   * Obtener parkings populares
   */
  getPopularParkings(limit: number = 10): Observable<Parking[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ApiResponse<Parking[]>>(`${this.API_URL}/popular`, { params })
      .pipe(
        map(response => response.data || []),
        catchError(() => of([]))
      );
  }

  /**
   * Métodos privados
   */
  private saveFavorites(): void {
    if (isPlatformBrowser(this.platformId)) {
      const favorites = Array.from(this.favoritesSubject.value);
      localStorage.setItem('parking_favorites', JSON.stringify(favorites));
    }
  }

  private loadFavorites(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    try {
      const saved = localStorage.getItem('parking_favorites');
      if (saved) {
        const favorites = JSON.parse(saved);
        this.favoritesSubject.next(new Set(favorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }

  private handleError = (error: any): Observable<any> => {
    console.error('ParkingService error:', error);
    return of(null);
  };
}
