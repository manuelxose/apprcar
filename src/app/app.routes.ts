import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { GeolocationService } from '@core/services/geolocation';

export const routes: Routes = [
  // Ruta por defecto - Home
  {
    path: '',
    loadComponent: () => import('./features/home/home').then(c => c.Home),
    title: 'ParkingApp - Encuentra tu parking ideal'
  },
  
  // Home explícita
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full'
  },
  
  // Lista de parkings con parámetros opcionales
  {
    path: 'parkings',
    loadComponent: () => import('./features/parking-list/parking-list').then(c => c.ParkingList),
    title: 'Parkings Disponibles'
  },
  
  // Búsqueda con parámetros
  {
    path: 'search',
    loadComponent: () => import('./features/parking-list/parking-list').then(c => c.ParkingList),
    title: 'Buscar Parkings'
  },
  
  // Detalle de parking
  {
    path: 'parking/:id',
    loadComponent: () => import('./features/parking-detail/parking-detail').then(c => c.ParkingDetailComponent),
    title: 'Detalle del Parking'
  },
  
  // Mapa
  {
    path: 'map',
    loadComponent: () => import('./features/map/map').then(c => c.MapComponent),
    title: 'Mapa de Parkings',
    canActivate: [() => {
      const geoService = inject(GeolocationService);
      // Verificar que la geolocalización esté disponible
      return geoService.isGeolocationSupported();
    }]
  },
  
  // Favoritos
  {
    path: 'favorites',
    loadComponent: () => import('./features/favorites/favorites').then(c => c.FavoritesComponent),
    title: 'Mis Favoritos'
  },
  
  // Perfil de usuario
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile').then(c => c.Profile),
    title: 'Mi Perfil'
  },
  
  // Rutas específicas del perfil
  {
    path: 'profile/settings',
    loadComponent: () => import('./features/profile/profile').then(c => c.Profile),
    title: 'Configuración'
  },
  
  {
    path: 'profile/vehicles',
    loadComponent: () => import('./features/profile/profile').then(c => c.Profile),
    title: 'Mis Vehículos'
  },
  
  {
    path: 'profile/reservations',
    loadComponent: () => import('./features/profile/profile').then(c => c.Profile),
    title: 'Mis Reservas'
  },
  
  {
    path: 'profile/payments',
    loadComponent: () => import('./features/profile/profile').then(c => c.Profile),
    title: 'Métodos de Pago'
  },
  
  // Reserva de parking
  {
    path: 'booking/:parkingId',
    loadComponent: () => import('./features/parking-detail/components/parking-booking/parking-booking').then(c => c.ParkingBookingComponent),
    title: 'Reservar Parking'
  },
  
  // Páginas de error y utilidad
  {
    path: 'not-found',
    loadComponent: () => import('./shared/components/not-found/not-found').then(c => c.NotFound),
    title: 'Página no encontrada'
  },
  
  {
    path: 'chat',
    loadChildren: () => import('./features/chat/chat.routes').then(c => c.chatRoutes),
    title: 'Chat'
  },

  // Wildcard route - debe ser la última
  {
    path: '**',
    redirectTo: '/not-found'
  }
];