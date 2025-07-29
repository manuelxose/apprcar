// =================== src/app/core/services/mock-data.service.ts ===================

import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Parking, User, Vehicle, ParkingReservation } from '@core/models';
import vigoParkingsData from '@assets/data/vigo-parkings.json';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  
  private parkings: Parking[] = this.loadParkings();
  
  /**
   * Obtener parkings de Vigo desde el JSON
   */
  getVigoParkings(): Observable<Parking[]> {
    return of(this.parkings).pipe(delay(500)); // Simular latencia de red
  }

  /**
   * Obtener parking por ID
   */
  getParkingById(id: string): Observable<Parking | null> {
    const parking = this.parkings.find(p => p.id === id) || null;
    return of(parking).pipe(delay(300));
  }

  /**
   * Buscar parkings por texto
   */
  searchParkings(query: string): Observable<Parking[]> {
    const results = this.parkings.filter(parking => 
      parking.name.toLowerCase().includes(query.toLowerCase()) ||
      parking.address.toLowerCase().includes(query.toLowerCase()) ||
      parking.description?.toLowerCase().includes(query.toLowerCase())
    );
    return of(results).pipe(delay(400));
  }

  /**
   * Obtener usuario mock
   */
  getMockUser(): Observable<User> {
    const mockUser: User = {
      id: 'user-001',
      email: 'usuario@example.com',
      username: 'usuario_vigo',
      profile: {
        firstName: 'María',
        lastName: 'García',
        avatar: '/assets/images/avatars/default-avatar.png',
        phone: '+34 666 123 456',
        address: {
          street: 'Calle Gran Vía, 25',
          city: 'Vigo',
          country: 'España',
          postalCode: '36204',
          coordinates: {
            latitude: 42.2289,
            longitude: -8.7003
          }
        },
        language: 'es',
        timezone: 'Europe/Madrid'
      },
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: false,
          reservationReminders: true,
          promotions: false,
          parkingUpdates: true,
          newsletter: false
        },
        search: {
          defaultRadius: 1000,
          preferredSortBy: 'distance' as any,
          autoLocation: true,
          savedLocations: [
            {
              id: 'loc-001',
              name: 'Casa',
              address: 'Calle Gran Vía, 25, Vigo',
              coordinates: { latitude: 42.2289, longitude: -8.7003 },
              isDefault: true
            },
            {
              id: 'loc-002',
              name: 'Trabajo',
              address: 'Plaza de España, 1, Vigo',
              coordinates: { latitude: 42.2406, longitude: -8.7207 },
              isDefault: false
            }
          ],
          quickFilters: {
            features: {
              electricCharging: true,
              wheelchairAccess: false
            }
          }
        },
        privacy: {
          shareLocation: true,
          shareActivity: false,
          allowAnalytics: true,
          allowMarketing: false,
          dataRetention: 'TWO_YEARS' as any
        },
        accessibility: {
          highContrast: false,
          largeText: false,
          screenReader: false,
          voiceNavigation: false,
          reducedMotion: false
        }
      },
      vehicles: ['vehicle-001'],
      favorites: ['vigo-001', 'vigo-003'],
      reservations: ['reservation-001'],
      subscriptions: [],
      paymentMethods: ['payment-001'],
      createdAt: new Date('2023-06-15T10:00:00Z'),
      updatedAt: new Date('2024-01-20T14:30:00Z'),
      lastLoginAt: new Date('2024-01-20T09:15:00Z'),
      isActive: true,
      verificationStatus: {
        email: true,
        phone: true,
        identity: false,
        paymentMethod: true
      }
    };

    return of(mockUser).pipe(delay(200));
  }

  /**
   * Obtener vehículos del usuario
   */
  getMockVehicles(): Observable<Vehicle[]> {
    const mockVehicles: Vehicle[] = [
      {
        id: 'vehicle-001',
        userId: 'user-001',
        licensePlate: '1234 ABC',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Azul',
        type: 'car' as any,
        isElectric: false,
        isDefault: true,
        notes: 'Coche familiar principal',
        createdAt: new Date('2023-06-15T10:00:00Z'),
        updatedAt: new Date('2023-06-15T10:00:00Z')
      },
      {
        id: 'vehicle-002',
        userId: 'user-001',
        licensePlate: '5678 DEF',
        make: 'Tesla',
        model: 'Model 3',
        year: 2022,
        color: 'Blanco',
        type: 'electric' as any,
        isElectric: true,
        isDefault: false,
        notes: 'Coche eléctrico para ciudad',
        createdAt: new Date('2024-01-10T12:00:00Z'),
        updatedAt: new Date('2024-01-10T12:00:00Z')
      }
    ];

    return of(mockVehicles).pipe(delay(300));
  }

  /**
   * Obtener reservas del usuario
   */
  getMockReservations(): Observable<ParkingReservation[]> {
    const mockReservations: ParkingReservation[] = [
      {
        id: 'reservation-001',
        userId: 'user-001',
        parkingId: 'vigo-001',
        spotNumber: 'A-15',
        startTime: new Date('2024-01-21T10:00:00Z'),
        endTime: new Date('2024-01-21T12:00:00Z'),
        estimatedPrice: 3.60,
        actualPrice: 3.60,
        status: 'confirmed' as any,
        vehicleInfo: {
          licensePlate: '1234 ABC',
          make: 'Toyota',
          model: 'Corolla',
          color: 'Azul',
          type: 'car' as any
        },
        paymentInfo: {
          method: 'credit_card' as any,
          transactionId: 'txn-123456',
          amount: 3.60,
          currency: 'EUR',
          paidAt: new Date('2024-01-20T15:30:00Z')
        },
        createdAt: new Date('2024-01-20T15:30:00Z'),
        updatedAt: new Date('2024-01-20T15:30:00Z'),
        notes: 'Cita médica en el centro'
      }
    ];

    return of(mockReservations).pipe(delay(400));
  }

  /**
   * Cargar parkings desde el JSON
   */
  private loadParkings(): Parking[] {
    try {
      return vigoParkingsData.parkings.map((parking: { createdAt: string | number | Date; updatedAt: string | number | Date; rating: { lastUpdated: string | number | Date; }; }) => ({
        ...parking,
        createdAt: new Date(parking.createdAt),
        updatedAt: new Date(parking.updatedAt),
        rating: {
          ...parking.rating,
          lastUpdated: new Date(parking.rating.lastUpdated)
        }
      })) as Parking[];
    } catch (error) {
      console.error('Error loading parkings data:', error);
      return [];
    }
  }

  /**
   * Simular cambios en disponibilidad en tiempo real
   */
  getRealtimeAvailability(parkingId: string): Observable<{available: number; total: number}> {
    const parking = this.parkings.find(p => p.id === parkingId);
    if (!parking) {
      return of({available: 0, total: 0});
    }

    // Simular pequeños cambios aleatorios en disponibilidad
    const variation = Math.floor(Math.random() * 10) - 5; // -5 a +5
    const newAvailable = Math.max(0, Math.min(
      parking.capacity.total - parking.capacity.occupied,
      parking.capacity.available + variation
    ));

    return of({
      available: newAvailable,
      total: parking.capacity.total
    }).pipe(delay(200));
  }
}