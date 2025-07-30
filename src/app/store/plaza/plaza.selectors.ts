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
  (state) => state ? selectAllPlazas(state) : []
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
    if (!state?.userLocation) return plazas;
    
    return plazas.filter(plaza => 
      (plaza.distance || 0) <= state.filters.radius
    );
  }
);

export const selectClaimedPlaza = createSelector(
  selectPlazaState,
  (state) => {
    if (!state) return null;
    const entities = selectPlazaEntities(state);
    return state.claimedPlazaId ? entities[state.claimedPlazaId] : null;
  }
);

export const selectPlazaFilters = createSelector(
  selectPlazaState,
  (state) => state?.filters || {
    radius: 1000,
    maxAge: 10,
    showOnlyAvailable: true,
    includePaid: false
  }
);

export const selectUserLocation = createSelector(
  selectPlazaState,
  (state) => state?.userLocation || null
);

export const selectPlazaLoading = createSelector(
  selectPlazaState,
  (state) => state?.loading || false
);

export const selectPlazaNotifying = createSelector(
  selectPlazaState,
  (state) => state?.notifying || false
);

export const selectPlazaClaiming = createSelector(
  selectPlazaState,
  (state) => state?.claiming || false
);

export const selectPlazaError = createSelector(
  selectPlazaState,
  (state) => state?.error || null
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
