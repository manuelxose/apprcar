// src/app/core/services/mock-parking.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { 
  Parking, 
  ParkingSearchParams, 
  PaginatedResponse,
  ParkingType,
  ParkingStatus
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class MockParkingService {
  private parkingsSubject = new BehaviorSubject<Parking[]>([]);
  public parkings$ = this.parkingsSubject.asObservable();

  private mockParkings: Parking[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const currentDate = new Date();
    
    this.mockParkings = [
      {
        id: 'parking-1',
        name: 'Parking Centro Comercial Príncipe Pío',
        description: 'Aparcamiento cubierto en el centro comercial con fácil acceso',
        address: 'Paseo de la Florida, 2, Madrid',
        location: {
          latitude: 40.4089,
          longitude: -3.7176,
          city: 'Madrid',
          country: 'España',
          postalCode: '28008',
          district: 'Moncloa-Aravaca'
        },
        type: ParkingType.SHOPPING_CENTER,
        status: ParkingStatus.ACTIVE,
        capacity: {
          total: 500,
          available: 120,
          reserved: 30,
          occupied: 350,
          spots: {
            regular: 450,
            disabled: 15,
            electric: 25,
            motorcycle: 10,
            large: 0
          }
        },
        pricing: {
          currency: 'EUR',
          freeMinutes: 30,
          rates: [
            {
              id: 'hourly-1',
              name: 'Tarifa por horas',
              type: 'hourly',
              price: 2.50,
              maxDuration: 240
            },
            {
              id: 'daily-1',
              name: 'Tarifa diaria',
              type: 'daily',
              price: 18.00
            }
          ]
        },
        features: {
          security: {
            surveillance: true,
            lighting: true,
            guards: true,
            gatedAccess: true,
            emergencyButton: false
          },
          accessibility: {
            wheelchairAccess: true,
            elevators: true,
            disabledSpots: 15,
            audioInstructions: false,
            brailleSignage: false
          },
          services: {
            carWash: true,
            valet: false,
            electricCharging: true,
            airPump: false,
            restrooms: true,
            wifi: true,
            shopping: false
          },
          payment: {
            cash: true,
            card: true,
            mobile: true,
            contactless: true,
            subscription: false,
            prepaid: false
          },
          technology: {
            app: true,
            reservation: false,
            realTimeAvailability: true,
            digitalPayment: true,
            smartParking: false,
            licensePlateRecognition: false
          }
        },
        schedule: {
          is24Hours: true,
          schedule: [],
          holidays: [],
          exceptions: []
        },
        contact: {
          phone: '+34 91 123 4567',
          email: 'info@parkingprincipepio.com'
        },
        rating: {
          average: 4.2,
          totalReviews: 156,
          distribution: {
            5: 65,
            4: 42,
            3: 28,
            2: 15,
            1: 6
          },
          lastUpdated: currentDate
        },
        createdAt: currentDate,
        updatedAt: currentDate
      },
      {
        id: 'parking-2',
        name: 'Parking Plaza Mayor',
        description: 'Aparcamiento subterráneo cerca de la Plaza Mayor',
        address: 'Plaza Mayor, 1, Madrid',
        location: {
          latitude: 40.4155,
          longitude: -3.7074,
          city: 'Madrid',
          country: 'España',
          postalCode: '28012',
          district: 'Centro'
        },
        type: ParkingType.UNDERGROUND,
        status: ParkingStatus.ACTIVE,
        capacity: {
          total: 200,
          available: 45,
          reserved: 10,
          occupied: 145,
          spots: {
            regular: 180,
            disabled: 8,
            electric: 10,
            motorcycle: 2,
            large: 0
          }
        },
        pricing: {
          currency: 'EUR',
          freeMinutes: 15,
          rates: [
            {
              id: 'hourly-2',
              name: 'Tarifa por horas',
              type: 'hourly',
              price: 3.20,
              maxDuration: 180
            },
            {
              id: 'daily-2',
              name: 'Tarifa diaria',
              type: 'daily',
              price: 25.00
            }
          ]
        },
        features: {
          security: {
            surveillance: true,
            lighting: true,
            guards: false,
            gatedAccess: false,
            emergencyButton: true
          },
          accessibility: {
            wheelchairAccess: true,
            elevators: true,
            disabledSpots: 8,
            audioInstructions: false,
            brailleSignage: false
          },
          services: {
            carWash: false,
            valet: false,
            electricCharging: true,
            airPump: false,
            restrooms: false,
            wifi: false,
            shopping: false
          },
          payment: {
            cash: true,
            card: true,
            mobile: false,
            contactless: true,
            subscription: false,
            prepaid: false
          },
          technology: {
            app: false,
            reservation: false,
            realTimeAvailability: false,
            digitalPayment: false,
            smartParking: false,
            licensePlateRecognition: false
          }
        },
        schedule: {
          is24Hours: false,
          schedule: [],
          holidays: [],
          exceptions: []
        },
        contact: {
          phone: '+34 91 234 5678'
        },
        rating: {
          average: 3.8,
          totalReviews: 89,
          distribution: {
            5: 25,
            4: 28,
            3: 20,
            2: 12,
            1: 4
          },
          lastUpdated: currentDate
        },
        createdAt: currentDate,
        updatedAt: currentDate
      },
      {
        id: 'parking-3',
        name: 'Parking Gran Vía',
        description: 'Aparcamiento público en pleno centro de Madrid',
        address: 'Gran Vía, 45, Madrid',
        location: {
          latitude: 40.4206,
          longitude: -3.7033,
          city: 'Madrid',
          country: 'España',
          postalCode: '28013',
          district: 'Centro'
        },
        type: ParkingType.PUBLIC,
        status: ParkingStatus.ACTIVE,
        capacity: {
          total: 150,
          available: 20,
          reserved: 5,
          occupied: 125,
          spots: {
            regular: 135,
            disabled: 5,
            electric: 8,
            motorcycle: 2,
            large: 0
          }
        },
        pricing: {
          currency: 'EUR',
          rates: [
            {
              id: 'hourly-3',
              name: 'Tarifa por horas',
              type: 'hourly',
              price: 2.80,
              maxDuration: 120
            }
          ]
        },
        features: {
          security: {
            surveillance: true,
            lighting: true,
            guards: false,
            gatedAccess: false,
            emergencyButton: false
          },
          accessibility: {
            wheelchairAccess: true,
            elevators: false,
            disabledSpots: 5,
            audioInstructions: false,
            brailleSignage: false
          },
          services: {
            carWash: false,
            valet: false,
            electricCharging: true,
            airPump: false,
            restrooms: false,
            wifi: false,
            shopping: false
          },
          payment: {
            cash: true,
            card: true,
            mobile: false,
            contactless: false,
            subscription: false,
            prepaid: false
          },
          technology: {
            app: false,
            reservation: false,
            realTimeAvailability: false,
            digitalPayment: false,
            smartParking: false,
            licensePlateRecognition: false
          }
        },
        schedule: {
          is24Hours: false,
          schedule: [],
          holidays: [],
          exceptions: []
        },
        rating: {
          average: 4.0,
          totalReviews: 203,
          distribution: {
            5: 85,
            4: 67,
            3: 35,
            2: 12,
            1: 4
          },
          lastUpdated: currentDate
        },
        createdAt: currentDate,
        updatedAt: currentDate
      }
    ];

    this.parkingsSubject.next([...this.mockParkings]);
  }

  searchParkings(params: ParkingSearchParams): Observable<PaginatedResponse<Parking>> {
    console.log('🔍 Búsqueda de parkings con parámetros:', params);
    
    return of(this.mockParkings).pipe(
      delay(Math.random() * 300 + 200), // Simular latencia
      map(parkings => {
        let filteredParkings = [...parkings];

        // Filtrar por ubicación si se proporciona
        if (params.location) {
          filteredParkings = filteredParkings.map(parking => ({
            ...parking,
            distance: this.calculateDistance(
              params.location!.latitude,
              params.location!.longitude,
              parking.location.latitude,
              parking.location.longitude
            )
          }));

          // Filtrar por radio si se especifica
          if (params.radius) {
            filteredParkings = filteredParkings.filter(p => 
              (p as any).distance <= params.radius!
            );
          }

          // Ordenar por distancia
          filteredParkings.sort((a, b) => 
            ((a as any).distance || 0) - ((b as any).distance || 0)
          );
        }

        // Filtrar por query de texto
        if (params.query) {
          const query = params.query.toLowerCase();
          filteredParkings = filteredParkings.filter(p => 
            p.name.toLowerCase().includes(query) ||
            p.address.toLowerCase().includes(query) ||
            (p.description?.toLowerCase().includes(query))
          );
        }

        // Aplicar paginación
        const offset = params.offset || 0;
        const limit = params.limit || 10;
        const paginatedResults = filteredParkings.slice(offset, offset + limit);

        const response: PaginatedResponse<Parking> = {
          success: true,
          data: paginatedResults,
          meta: {
            page: Math.floor(offset / limit) + 1,
            limit,
            total: filteredParkings.length,
            hasNext: offset + limit < filteredParkings.length,
            hasPrevious: offset > 0
          }
        };

        return response;
      })
    );
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  }
}
