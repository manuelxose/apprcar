// =================== src/app/core/services/storage.service.ts ===================

import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface StorageItem<T> {
  value: T;
  timestamp: number;
  expiresAt?: number;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly PREFIX = 'parkingapp_';
  
  // Cache en memoria para acceso rápido
  private memoryCache = new Map<string, any>();
  
  // Subject para notificar cambios en el storage
  private storageChanges = new BehaviorSubject<{ key: string; value: any } | null>(null);
  public storageChanges$ = this.storageChanges.asObservable();

  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    if (this.isBrowser) {
      this.initializeStorageListener();
    }
  }

  /**
   * Guardar item en localStorage con TTL opcional
   */
  setItem<T>(key: string, value: T, ttlInMinutes?: number): boolean {
    if (!this.isBrowser) {
      // En SSR, guardamos solo en memoria cache
      this.memoryCache.set(key, value);
      return true;
    }

    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        expiresAt: ttlInMinutes ? Date.now() + (ttlInMinutes * 60 * 1000) : undefined
      };

      const serializedItem = JSON.stringify(item);
      localStorage.setItem(this.PREFIX + key, serializedItem);
      
      // Actualizar cache en memoria
      this.memoryCache.set(key, value);
      
      // Notificar cambio
      this.storageChanges.next({ key, value });
      
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  /**
   * Obtener item del localStorage
   */
  getItem<T>(key: string): T | null {
    try {
      // Verificar cache en memoria primero
      if (this.memoryCache.has(key)) {
        return this.memoryCache.get(key);
      }

      if (!this.isBrowser) {
        return null;
      }

      const serializedItem = localStorage.getItem(this.PREFIX + key);
      if (!serializedItem) return null;

      const item: StorageItem<T> = JSON.parse(serializedItem);
      
      // Verificar si el item ha expirado
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.removeItem(key);
        return null;
      }

      // Actualizar cache en memoria
      this.memoryCache.set(key, item.value);
      
      return item.value;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  /**
   * Eliminar item del localStorage
   */
  removeItem(key: string): boolean {
    try {
      if (this.isBrowser) {
        localStorage.removeItem(this.PREFIX + key);
      }
      this.memoryCache.delete(key);
      this.storageChanges.next({ key, value: null });
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }

  /**
   * Verificar si existe un item
   */
  hasItem(key: string): boolean {
    return this.getItem(key) !== null;
  }

  /**
   * Limpiar todos los items de la aplicación
   */
  clear(): boolean {
    try {
      if (this.isBrowser) {
        const keys = Object.keys(localStorage)
          .filter(key => key.startsWith(this.PREFIX));
        
        keys.forEach(key => localStorage.removeItem(key));
      }
      this.memoryCache.clear();
      
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  /**
   * Obtener todos los keys de la aplicación
   */
  getAllKeys(): string[] {
    if (!this.isBrowser) {
      return [];
    }
    return Object.keys(localStorage)
      .filter(key => key.startsWith(this.PREFIX))
      .map(key => key.replace(this.PREFIX, ''));
  }

  /**
   * Obtener tamaño usado en localStorage
   */
  getStorageSize(): number {
    if (!this.isBrowser) {
      return 0;
    }

    let totalSize = 0;
    const keys = this.getAllKeys();
    
    keys.forEach(key => {
      const item = localStorage.getItem(this.PREFIX + key);
      if (item) {
        totalSize += item.length;
      }
    });
    
    return totalSize;
  }

  /**
   * Limpiar items expirados
   */
  cleanExpiredItems(): number {
    let cleanedCount = 0;
    const keys = this.getAllKeys();
    
    keys.forEach(key => {
      const item = this.getItem(key);
      if (item === null) { // getItem returns null for expired items
        cleanedCount++;
      }
    });
    
    return cleanedCount;
  }

  /**
   * Métodos específicos para datos de la aplicación
   */
  
  // Configuraciones del usuario
  saveUserSettings(settings: any): boolean {
    return this.setItem('user_settings', settings);
  }

  getUserSettings(): any {
    return this.getItem('user_settings');
  }

  // Cache de búsquedas
  saveCachedSearch(query: string, results: any): boolean {
    return this.setItem(`search_${query}`, results, 30); // Cache por 30 minutos
  }

  getCachedSearch(query: string): any {
    return this.getItem(`search_${query}`);
  }

  // Ubicaciones recientes
  saveRecentLocation(location: any): boolean {
    const recent = this.getRecentLocations();
    const updated = [location, ...recent.slice(0, 9)]; // Mantener solo 10
    return this.setItem('recent_locations', updated);
  }

  getRecentLocations(): any[] {
    return this.getItem('recent_locations') || [];
  }

  // Datos offline
  saveOfflineData(data: any): boolean {
    return this.setItem('offline_data', data, 24 * 60); // Cache por 24 horas
  }

  getOfflineData(): any {
    return this.getItem('offline_data');
  }

  /**
   * Listener para cambios en localStorage desde otras pestañas
   */
  private initializeStorageListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key?.startsWith(this.PREFIX)) {
          const cleanKey = event.key.replace(this.PREFIX, '');
          const newValue = event.newValue ? JSON.parse(event.newValue) : null;
          
          // Actualizar cache en memoria
          if (newValue) {
            this.memoryCache.set(cleanKey, newValue.value);
          } else {
            this.memoryCache.delete(cleanKey);
          }
          
          // Notificar cambio
          this.storageChanges.next({ 
            key: cleanKey, 
            value: newValue?.value || null 
          });
        }
      });
    }
  }

  /**
   * Observable para observar cambios en una key específica
   */
  watchItem<T>(key: string): Observable<T | null> {
    return new Observable<T | null>(observer => {
      // Emitir valor actual
      observer.next(this.getItem<T>(key));
      
      // Suscribirse a cambios
      const subscription = this.storageChanges$.subscribe(change => {
        if (change?.key === key) {
          observer.next(change.value);
        }
      });
      
      return () => subscription.unsubscribe();
    }).pipe(
      catchError((): Observable<T | null> => of(null))
    );
  }
}