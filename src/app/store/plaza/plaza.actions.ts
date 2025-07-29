// src/app/store/plaza/plaza.actions.ts
import { createAction, props } from '@ngrx/store';
import { PlazaLibre, PlazaNotification, PlazaConfirmation, LocationData, PlazaFilters, PlazaStatus } from '@core/models';

// Notificar nueva plaza libre
export const notifyFreeParkingSpot = createAction(
  '[Plaza] Notify Free Parking Spot',
  props<{ 
    location: LocationData; 
    details?: {
      description?: string;
      size?: 'small' | 'medium' | 'large';
      timeAvailable?: number; // minutos
      isPaid?: boolean;
      restrictions?: string;
    };
  }>()
);

export const notifyFreeParkingSpotSuccess = createAction(
  '[Plaza] Notify Free Parking Spot Success',
  props<{ plaza: PlazaLibre }>()
);

export const notifyFreeParkingSpotFailure = createAction(
  '[Plaza] Notify Free Parking Spot Failure',
  props<{ error: string }>()
);

// Cancelar notificación de plaza
export const cancelPlazaNotification = createAction(
  '[Plaza] Cancel Plaza Notification',
  props<{ plazaId: string }>()
);

export const cancelPlazaNotificationSuccess = createAction(
  '[Plaza] Cancel Plaza Notification Success',
  props<{ plazaId: string }>()
);

// Cargar plazas libres cercanas
export const loadNearbyFreePlazas = createAction(
  '[Plaza] Load Nearby Free Plazas',
  props<{ location: LocationData; radius?: number }>()
);

export const loadNearbyFreePlazasSuccess = createAction(
  '[Plaza] Load Nearby Free Plazas Success',
  props<{ plazas: PlazaLibre[] }>()
);

export const loadNearbyFreePlazasFailure = createAction(
  '[Plaza] Load Nearby Free Plazas Failure',
  props<{ error: string }>()
);

// Reclamar/reservar plaza
export const claimParkingSpot = createAction(
  '[Plaza] Claim Parking Spot',
  props<{ plazaId: string }>()
);

export const claimParkingSpotSuccess = createAction(
  '[Plaza] Claim Parking Spot Success',
  props<{ plazaId: string; userId: string }>()
);

export const claimParkingSpotFailure = createAction(
  '[Plaza] Claim Parking Spot Failure',
  props<{ error: string }>()
);

// Confirmar ocupación de plaza
export const confirmParkingOccupied = createAction(
  '[Plaza] Confirm Parking Occupied',
  props<{ 
    plazaId: string; 
    successful: boolean; 
    feedback?: string;
  }>()
);

export const confirmParkingOccupiedSuccess = createAction(
  '[Plaza] Confirm Parking Occupied Success',
  props<{ confirmation: PlazaConfirmation }>()
);

// Reportar plaza no disponible
export const reportPlazaUnavailable = createAction(
  '[Plaza] Report Plaza Unavailable',
  props<{ 
    plazaId: string; 
    reason: 'already_taken' | 'not_found' | 'restricted' | 'other';
    comment?: string;
  }>()
);

export const reportPlazaUnavailableSuccess = createAction(
  '[Plaza] Report Plaza Unavailable Success',
  props<{ plazaId: string }>()
);

// Actualizar ubicación del usuario
export const updateUserLocation = createAction(
  '[Plaza] Update User Location',
  props<{ location: LocationData }>()
);

// Filtros y búsqueda
export const setPlazaFilters = createAction(
  '[Plaza] Set Plaza Filters',
  props<{ filters: PlazaFilters }>()
);

export const clearPlazaFilters = createAction('[Plaza] Clear Plaza Filters');

// WebSocket/Real-time events
export const newPlazaNotificationReceived = createAction(
  '[Plaza] New Plaza Notification Received',
  props<{ plaza: PlazaLibre }>()
);

export const plazaStatusUpdated = createAction(
  '[Plaza] Plaza Status Updated',
  props<{ plazaId: string; status: PlazaStatus }>()
);

export const plazaExpired = createAction(
  '[Plaza] Plaza Expired',
  props<{ plazaId: string }>()
);
