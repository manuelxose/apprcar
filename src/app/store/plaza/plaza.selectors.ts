// src/app/store/plaza/plaza.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { plazaAdapter, PlazaState } from './plaza.reducer';

export const selectPlazaState = createFeatureSelector<PlazaState>('plaza');

const {
  selectIds: selectPlazaIds,
  selectEntities: selectPlazaEntities,
  selectAll: selectAllPlazas,
  selectTotal: selectTotalPlazas
} = plazaAdapter.getSelectors();

export const selectAllFreePlazas = createSelector(
  selectPlazaState,
  selectAllPlazas
);

export const selectAvailablePlazas = createSelector(
  selectAllFreePlazas,
  (plazas) => plazas.filter(plaza => 
    plaza.status === 'available' || plaza.status === 'pending'
  )
);

export const selectNearbyPlazas = createSelector(
  selectAvailablePlazas,
  selectPlazaState,
  (plazas, state) => {
    if (!state.userLocation) return plazas;
    
    return plazas.filter(plaza => 
      (plaza.distance || 0) <= state.filters.radius
    );
  }
);

export const selectClaimedPlaza = createSelector(
  selectPlazaState,
  selectPlazaEntities,
  (state, entities) => 
    state.claimedPlazaId ? entities[state.claimedPlazaId] : null
);

export const selectPlazaFilters = createSelector(
  selectPlazaState,
  (state) => state.filters
);

export const selectUserLocation = createSelector(
  selectPlazaState,
  (state) => state.userLocation
);

export const selectPlazaLoading = createSelector(
  selectPlazaState,
  (state) => state.loading
);

export const selectPlazaNotifying = createSelector(
  selectPlazaState,
  (state) => state.notifying
);

export const selectPlazaClaiming = createSelector(
  selectPlazaState,
  (state) => state.claiming
);

export const selectPlazaError = createSelector(
  selectPlazaState,
  (state) => state.error
);

export const selectPlazaStats = createSelector(
  selectAllFreePlazas,
  selectAvailablePlazas,
  (allPlazas, availablePlazas) => ({
    total: allPlazas.length,
    available: availablePlazas.length,
    claimed: allPlazas.filter(p => p.status === 'claimed').length,
    occupied: allPlazas.filter(p => p.status === 'occupied').length
  })
);
