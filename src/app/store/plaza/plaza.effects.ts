// src/app/store/plaza/plaza.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';

import { PlazaService } from '@core/services/plaza.service';
import * as PlazaActions from './plaza.actions';

@Injectable()
export class PlazaEffects {
  private actions$ = inject(Actions);
  private plazaService = inject(PlazaService);

  loadNearbyFreePlazas$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlazaActions.loadNearbyFreePlazas),
      tap(action => console.log('Loading nearby plazas for:', action.location.coordinates)),
      switchMap(action =>
        this.plazaService.getNearbyFreePlazas(action.location, {
          radius: action.radius || 1000,
          maxAge: 10,
          showOnlyAvailable: true,
          includePaid: false
        }).pipe(
          tap(plazas => console.log('Loaded plazas:', plazas.length)),
          map(plazas => PlazaActions.loadNearbyFreePlazasSuccess({ plazas })),
          catchError(error => {
            console.error('Error loading plazas:', error);
            return of(PlazaActions.loadNearbyFreePlazasFailure({ 
              error: error.message || 'Error loading plazas' 
            }));
          })
        )
      )
    )
  );

  claimParkingSpot$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlazaActions.claimParkingSpot),
      switchMap(action =>
        this.plazaService.claimParkingSpot(action.plazaId).pipe(
          map(result => PlazaActions.claimParkingSpotSuccess({ 
            plazaId: action.plazaId,
            userId: result.userId 
          })),
          catchError(error => 
            of(PlazaActions.claimParkingSpotFailure({ 
              error: error.message || 'Error claiming plaza' 
            }))
          )
        )
      )
    )
  );

  reportPlazaUnavailable$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlazaActions.reportPlazaUnavailable),
      switchMap(action =>
        this.plazaService.reportPlazaUnavailable(
          action.plazaId, 
          action.reason, 
          action.comment
        ).pipe(
          map(() => PlazaActions.reportPlazaUnavailableSuccess({ 
            plazaId: action.plazaId 
          })),
          catchError(error => 
            of(PlazaActions.reportPlazaUnavailableFailure({ 
              error: error.message || 'Error reporting plaza' 
            }))
          )
        )
      )
    )
  );
}
