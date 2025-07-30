// src/app/core/services/mock-plaza.service.ts
import { Injectable } from '@angular/core';
import { Observable, of, timer, BehaviorSubject } from 'rxjs';
import { delay, map, take } from 'rxjs/operators';
import { PlazaLibre, PlazaStatus, LocationData } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MockPlazaService {
  private plazasSubject = new BehaviorSubject<PlazaLibre[]>([]);
  public plazas$ = this.plazasSubject.asObservable();

  private mockPlazas: PlazaLibre[] = [];
  private plazaIdCounter = 1;

  constructor() {
    this.initializeMockData();
    this.startPlazaSimulation();
  }

  private initializeMockData(): void {
    // Coordenadas base para Madrid centro
    const baseLat = 40.4168;
    const baseLng = -3.7038;
    
    // Generar plazas aleatorias alrededor de Madrid
    for (let i = 0; i < 20; i++) {
      const plaza = this.generateRandomPlaza(baseLat, baseLng, i);
      this.mockPlazas.push(plaza);
    }
    
    this.plazasSubject.next([...this.mockPlazas]);
  }

  private generateRandomPlaza(baseLat: number, baseLng: number, index: number): PlazaLibre {
    // Generar ubicación aleatoria en un radio de ~2km
    const latOffset = (Math.random() - 0.5) * 0.02; // ~1km aprox
    const lngOffset = (Math.random() - 0.5) * 0.02;
    
    const statuses: PlazaStatus[] = ['available', 'claimed', 'occupied'];
    const sizes = ['small', 'medium', 'large'];
    const streets = [
      'Calle Mayor', 'Gran Vía', 'Calle Alcalá', 'Paseo del Prado', 
      'Calle Serrano', 'Calle Goya', 'Plaza España', 'Puerta del Sol',
      'Calle Fuencarral', 'Avenida Menéndez Pelayo'
    ];

    const currentTime = new Date();
    const createdTime = new Date(currentTime.getTime() - Math.random() * 60 * 60 * 1000); // Hasta 1 hora atrás

    return {
      id: `mock-plaza-${this.plazaIdCounter++}`,
      createdBy: 'mock-user',
      status: statuses[Math.floor(Math.random() * statuses.length)],
      location: {
        latitude: baseLat + latOffset,
        longitude: baseLng + lngOffset,
        address: `${streets[Math.floor(Math.random() * streets.length)]} ${Math.floor(Math.random() * 200) + 1}`,
        description: Math.random() > 0.7 ? 'Cerca del metro' : undefined
      },
      details: {
        size: sizes[Math.floor(Math.random() * sizes.length)] as 'small' | 'medium' | 'large',
        isPaid: Math.random() > 0.6,
        price: Math.random() > 0.6 ? Math.round((Math.random() * 3 + 1) * 100) / 100 : undefined,
        estimatedDuration: Math.random() > 0.5 ? Math.floor(Math.random() * 120) + 15 : undefined,
        restrictions: Math.random() > 0.8 ? 'Solo residentes 9:00-14:00' : undefined,
        description: Math.random() > 0.7 ? 'Plaza amplia y bien ubicada' : undefined
      },
      availability: {
        availableFrom: createdTime.toISOString(),
        availableUntil: new Date(createdTime.getTime() + (Math.random() * 120 + 30) * 60 * 1000).toISOString(),
        isImmediate: true
      },
      createdAt: createdTime.toISOString(),
      updatedAt: new Date(createdTime.getTime() + Math.random() * 30 * 60 * 1000).toISOString(), // Hasta 30 min después
      expiresAt: new Date(createdTime.getTime() + 60 * 60 * 1000).toISOString(), // 1 hora después
      distance: Math.round((Math.random() * 2 + 0.1) * 1000) / 1000 // 0.1 a 2.1 km
    };
  }

  private startPlazaSimulation(): void {
    // Simular cambios de estado cada 30 segundos
    timer(0, 30000).subscribe(() => {
      this.simulatePlazaChanges();
    });

    // Simular nuevas plazas cada 2 minutos
    timer(120000, 120000).subscribe(() => {
      this.simulateNewPlaza();
    });

    // Simular eliminación de plazas expiradas cada minuto
    timer(60000, 60000).subscribe(() => {
      this.removeExpiredPlazas();
    });
  }

  private simulatePlazaChanges(): void {
    const currentPlazas = [...this.mockPlazas];
    
    // Cambiar estado de 1-3 plazas aleatoriamente
    const numChanges = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numChanges && currentPlazas.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * currentPlazas.length);
      const plaza = currentPlazas[randomIndex];
      
      // Ciclo de estados: available -> claimed -> occupied -> available
      switch (plaza.status) {
        case 'available':
          if (Math.random() > 0.7) {
            plaza.status = 'claimed';
            plaza.updatedAt = new Date().toISOString();
          }
          break;
        case 'claimed':
          if (Math.random() > 0.5) {
            plaza.status = 'occupied';
            plaza.updatedAt = new Date().toISOString();
          }
          break;
        case 'occupied':
          if (Math.random() > 0.6) {
            plaza.status = 'available';
            plaza.updatedAt = new Date().toISOString();
          }
          break;
      }
    }
    
    this.mockPlazas = currentPlazas;
    this.plazasSubject.next([...this.mockPlazas]);
  }

  private simulateNewPlaza(): void {
    const baseLat = 40.4168;
    const baseLng = -3.7038;
    
    if (Math.random() > 0.5 && this.mockPlazas.length < 30) {
      const newPlaza = this.generateRandomPlaza(baseLat, baseLng, this.plazaIdCounter);
      this.mockPlazas.push(newPlaza);
      this.plazasSubject.next([...this.mockPlazas]);
      
      console.log('🆕 Nueva plaza simulada:', newPlaza.location.address);
    }
  }

  private removeExpiredPlazas(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const validPlazas = this.mockPlazas.filter(plaza => {
      const createdAt = new Date(plaza.createdAt);
      return createdAt > oneHourAgo;
    });
    
    if (validPlazas.length !== this.mockPlazas.length) {
      this.mockPlazas = validPlazas;
      this.plazasSubject.next([...this.mockPlazas]);
      console.log('🗑️ Plazas expiradas eliminadas');
    }
  }

  // API Methods
  getPlazas(): Observable<PlazaLibre[]> {
    return of([...this.mockPlazas]).pipe(delay(Math.random() * 500 + 200)); // Simular latencia de red
  }

  getPlazasNearLocation(location: LocationData, radius: number = 2000): Observable<PlazaLibre[]> {
    return this.getPlazas().pipe(
      map(plazas => {
        return plazas.filter(plaza => {
          const distance = this.calculateDistance(
            location.coordinates.latitude,
            location.coordinates.longitude,
            plaza.location.latitude,
            plaza.location.longitude
          );
          return distance <= radius;
        }).map(plaza => ({
          ...plaza,
          distance: this.calculateDistance(
            location.coordinates.latitude,
            location.coordinates.longitude,
            plaza.location.latitude,
            plaza.location.longitude
          ) / 1000 // Convertir a km
        }));
      })
    );
  }

  notifyFreePlaza(location: LocationData, details: any): Observable<PlazaLibre> {
    const newPlaza: PlazaLibre = {
      id: `user-plaza-${this.plazaIdCounter++}`,
      createdBy: 'current-user',
      status: 'available',
      location: {
        latitude: location.coordinates.latitude,
        longitude: location.coordinates.longitude,
        address: typeof location.address === 'string' ? location.address : 'Ubicación del usuario',
        description: details?.description
      },
      details: {
        size: details?.size || 'medium',
        isPaid: details?.isPaid || false,
        price: details?.price,
        estimatedDuration: details?.estimatedDuration || 30,
        restrictions: details?.restrictions,
        description: details?.description
      },
      availability: {
        availableFrom: new Date().toISOString(),
        availableUntil: new Date(Date.now() + (details?.estimatedDuration || 30) * 60 * 1000).toISOString(),
        isImmediate: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hora
      distance: 0
    };

    this.mockPlazas.push(newPlaza);
    this.plazasSubject.next([...this.mockPlazas]);

    console.log('✅ Plaza notificada por usuario:', newPlaza);
    return of(newPlaza).pipe(delay(300));
  }

  claimPlaza(plazaId: string): Observable<boolean> {
    const plaza = this.mockPlazas.find(p => p.id === plazaId);
    if (plaza && plaza.status === 'available') {
      plaza.status = 'claimed';
      plaza.updatedAt = new Date().toISOString();
      this.plazasSubject.next([...this.mockPlazas]);
      
      console.log('🎯 Plaza reclamada:', plaza.location.address);
      return of(true).pipe(delay(500));
    }
    
    return of(false).pipe(delay(300));
  }

  reportPlaza(plazaId: string, reason: string, comment?: string): Observable<boolean> {
    const plaza = this.mockPlazas.find(p => p.id === plazaId);
    if (plaza) {
      // Simular reporte - podrías cambiar el estado según el motivo
      if (reason === 'occupied') {
        plaza.status = 'occupied';
        plaza.updatedAt = new Date().toISOString();
      }
      
      this.plazasSubject.next([...this.mockPlazas]);
      console.log('📝 Plaza reportada:', plaza.location.address, 'Motivo:', reason);
      return of(true).pipe(delay(400));
    }
    
    return of(false).pipe(delay(200));
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
