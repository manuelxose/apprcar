// src/app/features/plaza/services/plaza-chat-integration.service.ts
import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ChatService } from '@core/services/chat.service';
import { User } from '@core/models';
import { ChatChannel } from '@core/models/chat.interface';
import * as ChatActions from '../../features/chat/store/chat.actions';

@Injectable({
  providedIn: 'root'
})
export class PlazaChatIntegrationService {
  private store = inject(Store);
  private chatService = inject(ChatService);
  private router = inject(Router);

  /**
   * Crear chat automático cuando alguien reclama una plaza
   */
  createPlazaChatOnClaim(
    plazaId: string, 
    sharerUser: User, 
    claimerUser: User
  ): Observable<ChatChannel> {
    console.log(`Creando chat para plaza ${plazaId} entre ${sharerUser.profile.firstName} y ${claimerUser.profile.firstName}`);
    
    // Crear canal de chat contextual
    const chatObservable = this.chatService.createPlazaChat(plazaId, sharerUser, claimerUser);
    
    // Dispatch acción para actualizar el store
    chatObservable.subscribe(channel => {
      this.store.dispatch(ChatActions.createPlazaChatSuccess({ channel }));
      
      // Enviar mensaje de bienvenida automático
      setTimeout(() => {
        this.sendWelcomeMessage(channel.id, sharerUser, claimerUser);
      }, 500);
    });

    return chatObservable;
  }

  /**
   * Enviar mensaje de bienvenida cuando se crea un chat de plaza
   */
  private sendWelcomeMessage(
    channelId: string, 
    sharerUser: User, 
    claimerUser: User
  ): void {
    const welcomeMessage = `🎉 ¡Chat creado! ${sharerUser.profile.firstName} ha compartido su plaza con ${claimerUser.profile.firstName}. 
    
¡Coordinaos para el intercambio! Podéis usar los botones rápidos de abajo para comunicaros fácilmente.`;

    this.store.dispatch(ChatActions.sendMessage({ 
      channelId, 
      content: welcomeMessage
    }));
  }

  /**
   * Enviar mensaje automático de sistema cuando se confirma una plaza
   */
  sendPlazaConfirmationMessage(plazaId: string, successful: boolean): void {
    const channelId = `plaza-${plazaId}`;
    const content = successful 
      ? '✅ ¡Plaza ocupada con éxito! Gracias por usar Apparcar.'
      : '❌ La plaza no pudo ser ocupada. ¿Necesitas ayuda para encontrar otra?';

    this.store.dispatch(ChatActions.sendMessage({ 
      channelId, 
      content: `🤖 Sistema: ${content}` 
    }));
  }

  /**
   * Notificar en el chat cuando el usuario está llegando
   */
  sendArrivalNotification(plazaId: string, userId: string, estimatedArrival: number): void {
    const channelId = `plaza-${plazaId}`;
    const content = `🚗 El usuario está llegando a la plaza (ETA: ${estimatedArrival} minutos)`;

    this.store.dispatch(ChatActions.sendMessage({ 
      channelId, 
      content 
    }));
  }

  /**
   * Enviar notificación cuando el usuario ha llegado a la plaza
   */
  sendArrivedNotification(plazaId: string, userId: string): void {
    const channelId = `plaza-${plazaId}`;
    const content = `📍 ¡El usuario ha llegado a la plaza! Es momento de coordinar el intercambio.`;

    this.store.dispatch(ChatActions.sendMessage({ 
      channelId, 
      content 
    }));
  }

  /**
   * Enviar notificación cuando se libera la plaza
   */
  sendPlazaReleasedNotification(plazaId: string, userId: string): void {
    const channelId = `plaza-${plazaId}`;
    const content = `🚪 La plaza ha sido liberada. ¡Ya puedes ocuparla!`;

    this.store.dispatch(ChatActions.sendMessage({ 
      channelId, 
      content 
    }));
  }

  /**
   * Enviar recordatorio de cortesía al finalizar el intercambio
   */
  sendCourtesyReminder(plazaId: string): void {
    const channelId = `plaza-${plazaId}`;
    const content = `🙏 ¡Recordad valorar vuestra experiencia! Esto ayuda a mantener una comunidad de confianza en Apparcar.`;

    // Enviar con delay para dar tiempo al intercambio
    setTimeout(() => {
      this.store.dispatch(ChatActions.sendMessage({ 
        channelId, 
        content 
      }));
    }, 30000); // 30 segundos después
  }

  /**
   * Manejar la finalización del intercambio de plaza
   */
  handlePlazaExchangeCompleted(plazaId: string, successful: boolean): void {
    this.sendPlazaConfirmationMessage(plazaId, successful);
    
    if (successful) {
      this.sendCourtesyReminder(plazaId);
    }
  }

  /**
   * Navegar directamente al chat de una plaza específica
   */
  navigateToPlazaChat(plazaId: string): void {
    const channelId = `plaza-${plazaId}`;
    this.store.dispatch(ChatActions.setActiveChannel({ channelId }));
    this.router.navigate(['/chat', channelId]);
  }

  /**
   * Crear chat de emergencia para incidencias con la plaza
   */
  createEmergencyPlazaChat(
    plazaId: string, 
    reporterUser: User, 
    issueDescription: string
  ): Observable<ChatChannel> {
    console.log(`Creando chat de emergencia para plaza ${plazaId}: ${issueDescription}`);
    
    // Crear canal especial para emergencias
    const emergencyChannelId = `emergency-plaza-${plazaId}-${Date.now()}`;
    
    const emergencyChannel: ChatChannel = {
      id: emergencyChannelId,
      name: `🚨 Incidencia - Plaza ${plazaId}`,
      type: 'direct',
      participants: [reporterUser.id, 'support'],
      unreadCount: 0,
      isOnline: true,
      metadata: {
        contextType: 'plaza_emergency',
        contextId: plazaId,
        priority: 'high',
        issueDescription,
        createdAt: new Date().toISOString()
      }
    };

    // Agregar al store
    this.store.dispatch(ChatActions.createPlazaChatSuccess({ channel: emergencyChannel }));

    // Enviar mensaje inicial de emergencia
    setTimeout(() => {
      const emergencyMessage = `🚨 INCIDENCIA REPORTADA
      
Plaza: ${plazaId}
Reportado por: ${reporterUser.profile.firstName} ${reporterUser.profile.lastName}
Descripción: ${issueDescription}

Un agente de soporte se pondrá en contacto contigo en breve.`;

      this.store.dispatch(ChatActions.sendMessage({ 
        channelId: emergencyChannelId, 
        content: emergencyMessage
      }));
    }, 300);

    return new Observable(observer => {
      observer.next(emergencyChannel);
      observer.complete();
    });
  }

  /**
   * Obtener el ID del canal de chat para una plaza específica
   */
  getPlazaChatChannelId(plazaId: string): string {
    return `plaza-${plazaId}`;
  }

  /**
   * Verificar si existe un chat activo para una plaza
   */
  hasActivePlazaChat(plazaId: string): Observable<boolean> {
    const channelId = this.getPlazaChatChannelId(plazaId);
    
    return this.store.select(state => {
      // Verificar si existe el canal en el store
      const chatState = (state as any).chat;
      return chatState?.channels?.some((channel: ChatChannel) => channel.id === channelId) || false;
    });
  }

  /**
   * Cerrar automáticamente el chat de plaza después de un tiempo determinado
   */
  scheduleAutoChatClosure(plazaId: string, delayMinutes: number = 60): void {
    const channelId = this.getPlazaChatChannelId(plazaId);
    
    setTimeout(() => {
      // Enviar mensaje de cierre
      const closureMessage = `📝 Este chat se cerrará automáticamente en 5 minutos. Si necesitas seguir comunicándote, puedes crear un nuevo chat.`;
      
      this.store.dispatch(ChatActions.sendMessage({ 
        channelId, 
        content: closureMessage
      }));

      // Cerrar el chat después de 5 minutos más
      setTimeout(() => {
        this.store.dispatch(ChatActions.leaveChannel({ channelId }));
      }, 5 * 60 * 1000); // 5 minutos más

    }, delayMinutes * 60 * 1000); // Delay inicial en minutos
  }
}
