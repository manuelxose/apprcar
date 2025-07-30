// src/app/store/plaza/plaza.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap, withLatestFrom } from 'rxjs/operators';

import { PlazaService } from '@core/services/plaza.service';
import { PlazaChatIntegrationService } from '@core/services/plaza-chat-integration.service';
import { User } from '@core/models';
import * as PlazaActions from './plaza.actions';
import * as AuthSelectors from '@store/auth/auth.selectors';

@Injectable()
export class PlazaEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private plazaService = inject(PlazaService);
  private plazaChatIntegration = inject(PlazaChatIntegrationService);

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

  // Crear chat automático al reclamar plaza
  createPlazaChat$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlazaActions.claimParkingSpotSuccess),
      withLatestFrom(
        this.store.select(AuthSelectors.selectCurrentUser)
      ),
      tap(([action, currentUser]) => {
        if (currentUser) {
          // Obtener información de la plaza y el usuario que la compartió
          // En un caso real, necesitarías obtener esta info del estado o servicio
          const mockSharerUser: Partial<User> = {
            id: 'sharer-user-id',
            email: 'sharer@example.com',
            profile: {
              firstName: 'Usuario',
              lastName: 'Compartidor',
              language: 'es',
              timezone: 'Europe/Madrid'
            }
          } as User;
          
          this.plazaChatIntegration.createPlazaChatOnClaim(
            action.plazaId,
            mockSharerUser as User,
            currentUser
          );

          // Programar auto-cierre del chat después de 2 horas
          this.plazaChatIntegration.scheduleAutoChatClosure(action.plazaId, 120);
        }
      })
    ),
    { dispatch: false }
  );

  // Enviar notificación de confirmación
  confirmPlazaOccupied$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PlazaActions.reportPlazaUnavailableSuccess),
      tap(({ plazaId }) => {
        // Asumimos que reportar como no disponible significa que fue ocupada exitosamente
        this.plazaChatIntegration.sendPlazaConfirmationMessage(plazaId, true);
        this.plazaChatIntegration.handlePlazaExchangeCompleted(plazaId, true);
      })
    ),
    { dispatch: false }
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
