// src/app/store/plaza/plaza.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { PlazaLibre, LocationData, PlazaFilters, PlazaStatus } from '@core/models';
import * as PlazaActions from './plaza.actions';

export interface PlazaState extends EntityState<PlazaLibre> {
  userLocation: LocationData | null;
  filters: PlazaFilters;
  loading: boolean;
  error: string | null;
  notifying: boolean;
  claiming: boolean;
  claimedPlazaId: string | null;
  lastUpdate: string | null;
}

export const plazaAdapter: EntityAdapter<PlazaLibre> = createEntityAdapter<PlazaLibre>({
  selectId: (plaza: { id: any; }) => plaza.id,
  sortComparer: (a: PlazaLibre, b: PlazaLibre) => {
    // Ordenar por proximidad y tiempo de creación
    if (a.distance !== b.distance) {
      return (a.distance || 0) - (b.distance || 0);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
});

const initialState: PlazaState = plazaAdapter.getInitialState({
  userLocation: null,
  filters: {
    radius: 1000, // metros
    maxAge: 10, // minutos
    showOnlyAvailable: true,
    includePaid: false
  },
  loading: false,
  error: null,
  notifying: false,
  claiming: false,
  claimedPlazaId: null,
  lastUpdate: null
});

export const plazaReducer = createReducer(
  initialState,

  // Notificar plaza libre
  on(PlazaActions.notifyFreeParkingSpot, (state) => ({
    ...state,
    notifying: true,
    error: null
  })),

  on(PlazaActions.notifyFreeParkingSpotSuccess, (state, { plaza }) => 
    plazaAdapter.addOne(plaza, {
      ...state,
      notifying: false,
      error: null,
      lastUpdate: new Date().toISOString()
    })
  ),

  on(PlazaActions.notifyFreeParkingSpotFailure, (state, { error }) => ({
    ...state,
    notifying: false,
    error
  })),

  // Cancelar notificación
  on(PlazaActions.cancelPlazaNotificationSuccess, (state, { plazaId }) =>
    plazaAdapter.removeOne(plazaId, state)
  ),

  // Cargar plazas cercanas
  on(PlazaActions.loadNearbyFreePlazas, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(PlazaActions.loadNearbyFreePlazasSuccess, (state, { plazas }) =>
    plazaAdapter.setAll(plazas, {
      ...state,
      loading: false,
      error: null,
      lastUpdate: new Date().toISOString()
    })
  ),

  on(PlazaActions.loadNearbyFreePlazasFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Reclamar plaza
  on(PlazaActions.claimParkingSpot, (state, { plazaId }) => ({
    ...state,
    claiming: true,
    claimedPlazaId: plazaId,
    error: null
  })),

  on(PlazaActions.claimParkingSpotSuccess, (state, { plazaId, userId }) =>
    plazaAdapter.updateOne(
      {
        id: plazaId,
        changes: {
          status: 'claimed' as PlazaStatus,
          claimedBy: userId,
          claimedAt: new Date().toISOString()
        }
      },
      {
        ...state,
        claiming: false,
        error: null
      }
    )
  ),

  on(PlazaActions.claimParkingSpotFailure, (state, { error }) => ({
    ...state,
    claiming: false,
    claimedPlazaId: null,
    error
  })),

  // Confirmar ocupación
  on(PlazaActions.confirmParkingOccupiedSuccess, (state, { confirmation }) =>
    plazaAdapter.updateOne(
      {
        id: confirmation.plazaId,
        changes: {
          status: 'occupied' as PlazaStatus,
          confirmedAt: confirmation.confirmedAt,
          successful: confirmation.successful
        }
      },
      state
    )
  ),

  // Reportar no disponible
  on(PlazaActions.reportPlazaUnavailableSuccess, (state, { plazaId }) =>
    plazaAdapter.updateOne(
      {
        id: plazaId,
        changes: {
          status: 'unavailable' as PlazaStatus,
          reportedAt: new Date().toISOString()
        }
      },
      state
    )
  ),

  // Actualizar ubicación del usuario
  on(PlazaActions.updateUserLocation, (state, { location }) => ({
    ...state,
    userLocation: location
  })),

  // Filtros
  on(PlazaActions.setPlazaFilters, (state, { filters }) => ({
    ...state,
    filters: { ...state.filters, ...filters }
  })),

  on(PlazaActions.clearPlazaFilters, (state) => ({
    ...state,
    filters: {
      radius: 1000,
      maxAge: 10,
      showOnlyAvailable: true,
      includePaid: false
    }
  })),

  // Real-time updates
  on(PlazaActions.newPlazaNotificationReceived, (state, { plaza }) =>
    plazaAdapter.addOne(plaza, {
      ...state,
      lastUpdate: new Date().toISOString()
    })
  ),

  on(PlazaActions.plazaStatusUpdated, (state, { plazaId, status }) =>
    plazaAdapter.updateOne(
      {
        id: plazaId,
        changes: { status, updatedAt: new Date().toISOString() }
      },
      state
    )
  ),

  on(PlazaActions.plazaExpired, (state, { plazaId }) =>
    plazaAdapter.removeOne(plazaId, state)
  )
);
