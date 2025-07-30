// src/app/core/services/push-notification.service.ts
import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { SwPush } from '@angular/service-worker';
import { Router } from '@angular/router';

import { NotificationService } from './notification.service';
import * as AuthSelectors from '@store/auth/auth.selectors';
import * as ChatActions from '@features/chat/store/chat.actions';
import * as PlazaActions from '@store/plaza/plaza.actions';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: {
    type: 'chat_message' | 'plaza_available' | 'plaza_claimed' | 'plaza_confirmed' | 'system' | 
          'favorite_added' | 'reservation_confirmed' | 'reservation_cancelled' | 'parking_available';
    url?: string;
    channelId?: string;
    plazaId?: string;
    parkingId?: string;
    reservationId?: string;
    userId?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private store = inject(Store);
  private swPush = inject(SwPush);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  // VAPID key para Firebase (en producción sería de variables de entorno)
  private readonly VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40j8cyijNDhOHohwQnV5VR3yFFAJvSJCJxDZqvN3qEEtqxL7K1gcQ5j3qRhE';

  // Subjects para manejar el estado
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private permissionSubject = new BehaviorSubject<NotificationPermissionStatus>({
    granted: false,
    denied: false,
    default: true
  });

  // Observables públicos
  token$ = this.tokenSubject.asObservable();
  permission$ = this.permissionSubject.asObservable();

  // Configuración de notificaciones por tipo
  private notificationConfig = {
    chat_message: {
      icon: '/assets/icons/chat-icon-192.png',
      badge: '/assets/icons/badge-72.png',
      actions: [
        { action: 'reply', title: 'Responder', icon: '/assets/icons/reply-icon.png' },
        { action: 'view', title: 'Ver chat', icon: '/assets/icons/view-icon.png' }
      ]
    },
    plaza_available: {
      icon: '/assets/icons/parking-icon-192.png',
      badge: '/assets/icons/badge-72.png',
      actions: [
        { action: 'navigate', title: 'Ver en mapa', icon: '/assets/icons/map-icon.png' },
        { action: 'dismiss', title: 'Descartar', icon: '/assets/icons/dismiss-icon.png' }
      ]
    },
    plaza_claimed: {
      icon: '/assets/icons/parking-claimed-192.png',
      badge: '/assets/icons/badge-72.png',
      actions: [
        { action: 'chat', title: 'Abrir chat', icon: '/assets/icons/chat-icon.png' }
      ]
    },
    plaza_confirmed: {
      icon: '/assets/icons/check-icon-192.png',
      badge: '/assets/icons/badge-72.png'
    },
    favorite_added: {
      icon: '/assets/icons/star-icon-192.png',
      badge: '/assets/icons/badge-72.png',
      actions: [
        { action: 'view', title: 'Ver favoritos', icon: '/assets/icons/view-icon.png' }
      ]
    },
    reservation_confirmed: {
      icon: '/assets/icons/check-icon-192.png',
      badge: '/assets/icons/badge-72.png',
      actions: [
        { action: 'view', title: 'Ver reserva', icon: '/assets/icons/view-icon.png' }
      ]
    },
    reservation_cancelled: {
      icon: '/assets/icons/cancel-icon-192.png',
      badge: '/assets/icons/badge-72.png'
    },
    parking_available: {
      icon: '/assets/icons/parking-icon-192.png',
      badge: '/assets/icons/badge-72.png',
      actions: [
        { action: 'navigate', title: 'Ver parking', icon: '/assets/icons/map-icon.png' },
        { action: 'reserve', title: 'Reservar', icon: '/assets/icons/reserve-icon.png' }
      ]
    },
    system: {
      icon: '/assets/icons/app-icon-192.png',
      badge: '/assets/icons/badge-72.png'
    }
  };

  constructor() {
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    // Verificar soporte de Service Worker
    if (!this.swPush.isEnabled) {
      console.warn('Service Worker no está habilitado para push notifications');
      return;
    }

    // Verificar estado actual de permisos
    await this.checkPermissionStatus();

    // Configurar listeners para clics en notificaciones
    this.setupNotificationClickHandlers();

    // Si ya tenemos permisos, intentar obtener token
    if (this.getCurrentPermissionStatus().granted) {
      await this.subscribeToPush();
    }
  }

  /**
   * Solicitar permisos de notificación al usuario
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        throw new Error('Este navegador no soporta notificaciones');
      }

      if (Notification.permission === 'granted') {
        await this.subscribeToPush();
        return true;
      }

      if (Notification.permission === 'denied') {
        throw new Error('Los permisos de notificación están denegados');
      }

      // Solicitar permiso
      const permission = await Notification.requestPermission();
      
      await this.checkPermissionStatus();

      if (permission === 'granted') {
        await this.subscribeToPush();
        this.notificationService.showSuccess(
          'Notificaciones activadas correctamente',
          '¡Perfecto!'
        );
        return true;
      } else {
        this.notificationService.showWarning(
          'Para recibir notificaciones de plazas libres, activa los permisos en la configuración del navegador'
        );
        return false;
      }

    } catch (error) {
      console.error('Error al solicitar permisos:', error);
      this.notificationService.showError(
        error instanceof Error ? error.message : 'Error al activar notificaciones'
      );
      return false;
    }
  }

  /**
   * Suscribirse a notificaciones push
   */
  private async subscribeToPush(): Promise<void> {
    try {
      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY
      });

      // Extraer token de la suscripción (simulado)
      const token = this.extractTokenFromSubscription(subscription);
      this.tokenSubject.next(token);

      console.log('Suscripción push exitosa:', token);

      // En producción, enviar token al servidor
      await this.sendTokenToServer(token);

    } catch (error) {
      console.error('Error al suscribirse a push:', error);
      throw error;
    }
  }

  /**
   * Desactivar notificaciones push
   */
  async unsubscribeFromPush(): Promise<void> {
    try {
      await this.swPush.unsubscribe();
      this.tokenSubject.next(null);
      
      this.notificationService.showInfo('Notificaciones desactivadas');
      
    } catch (error) {
      console.error('Error al desuscribirse:', error);
      throw error;
    }
  }

  /**
   * Verificar estado de permisos
   */
  private async checkPermissionStatus(): Promise<void> {
    const permission = Notification.permission;
    
    const status: NotificationPermissionStatus = {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    };

    this.permissionSubject.next(status);
  }

  /**
   * Mostrar notificación local (cuando app está en foreground)
   */
  showLocalNotification(payload: PushNotificationPayload): void {
    if (!this.getCurrentPermissionStatus().granted) {
      console.warn('No hay permisos para mostrar notificaciones');
      return;
    }

    // Si la app está en foreground, mostrar notificación in-app
    if (document.visibilityState === 'visible') {
      this.showInAppNotification(payload);
    } else {
      // Si está en background, mostrar notificación del sistema
      this.showSystemNotification(payload);
    }
  }

  /**
   * Mostrar notificación in-app personalizada
   */
  private showInAppNotification(payload: PushNotificationPayload): void {
    // Usar nuestro NotificationService para mostrar en la UI
    const type = payload.data?.type;
    
    switch (type) {
      case 'chat_message':
        this.notificationService.showInfo(
          payload.body,
          `💬 ${payload.title}`,
          5000
        );
        break;
      
      case 'plaza_available':
        this.notificationService.showSuccess(
          payload.body,
          `🅿️ ${payload.title}`,
          8000
        );
        break;
      
      case 'plaza_claimed':
        this.notificationService.showWarning(
          payload.body,
          `⏰ ${payload.title}`,
          6000
        );
        break;
      
      case 'plaza_confirmed':
        this.notificationService.showSuccess(
          payload.body,
          `✅ ${payload.title}`,
          4000
        );
        break;
      
      default:
        this.notificationService.showInfo(payload.body, payload.title);
    }

    // Disparar acciones de NgRx si es necesario
    this.processNotificationData(payload);
  }

  /**
   * Mostrar notificación del sistema
   */
  private showSystemNotification(payload: PushNotificationPayload): void {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const config = this.notificationConfig[payload.data?.type || 'system'];
    
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || config.icon,
      badge: payload.badge || config.badge,
      data: payload.data,
      requireInteraction: true,
      silent: false
    });

    // Manejar clic en la notificación
    notification.onclick = () => {
      window.focus();
      this.handleNotificationClick(payload);
      notification.close();
    };
  }

  /**
   * Configurar manejo de clics en notificaciones
   */
  private setupNotificationClickHandlers(): void {
    // Listener para clics en notificaciones del service worker
    this.swPush.notificationClicks.subscribe(({ action, notification }) => {
      console.log('Notification click:', action, notification);
      
      const payload = notification.data as PushNotificationPayload['data'];
      
      if (action) {
        this.handleNotificationAction(action, payload);
      } else {
        this.handleNotificationClick({ data: payload } as PushNotificationPayload);
      }
    });

    // Listener para mensajes del service worker
    this.swPush.messages.subscribe((message: any) => {
      console.log('Push message received:', message);
      this.processIncomingPushMessage(message);
    });
  }

  /**
   * Manejar clic en notificación
   */
  private handleNotificationClick(payload: PushNotificationPayload): void {
    const data = payload.data;
    if (!data) return;

    switch (data.type) {
      case 'chat_message':
        if (data.channelId) {
          this.router.navigate(['/chat', data.channelId]);
        } else {
          this.router.navigate(['/chat']);
        }
        break;

      case 'plaza_available':
        if (data.plazaId) {
          this.router.navigate(['/map'], { 
            queryParams: { highlight: data.plazaId }
          });
        } else {
          this.router.navigate(['/map']);
        }
        break;

      case 'plaza_claimed':
        if (data.channelId) {
          this.router.navigate(['/chat', data.channelId]);
        }
        break;

      case 'plaza_confirmed':
        this.router.navigate(['/profile'], { 
          queryParams: { tab: 'history' }
        });
        break;

      default:
        if (data.url) {
          this.router.navigateByUrl(data.url);
        }
    }
  }

  /**
   * Manejar acciones específicas de notificaciones
   */
  private handleNotificationAction(action: string, data: any): void {
    switch (action) {
      case 'reply':
        // Abrir chat y focus en input
        this.router.navigate(['/chat', data.channelId], {
          queryParams: { action: 'reply' }
        });
        break;

      case 'view':
        this.router.navigate(['/chat', data.channelId]);
        break;

      case 'navigate':
        this.router.navigate(['/map'], {
          queryParams: { highlight: data.plazaId }
        });
        break;

      case 'chat':
        this.router.navigate(['/chat', data.channelId]);
        break;

      case 'dismiss':
        // Solo cerrar la notificación
        break;
    }
  }

  /**
   * Procesar datos de notificación y disparar acciones NgRx
   */
  private processNotificationData(payload: PushNotificationPayload): void {
    const data = payload.data;
    if (!data) return;

    switch (data.type) {
      case 'chat_message':
        if (data.channelId && data['message']) {
          this.store.dispatch(ChatActions.messageReceived({ 
            message: data['message'] 
          }));
        }
        break;

      case 'plaza_available':
        if (data['plaza']) {
          this.store.dispatch(PlazaActions.newPlazaNotificationReceived({ 
            plaza: data['plaza'] 
          }));
        }
        break;

      case 'plaza_claimed':
        if (data.plazaId && data.userId) {
          this.store.dispatch(PlazaActions.plazaStatusUpdated({ 
            plazaId: data.plazaId, 
            status: 'claimed' 
          }));
        }
        break;
    }
  }

  /**
   * Procesar mensaje push entrante
   */
  private processIncomingPushMessage(message: any): void {
    console.log('Processing push message:', message);
    
    // Crear payload de notificación
    const payload: PushNotificationPayload = {
      title: message.notification?.title || 'Apparcar',
      body: message.notification?.body || 'Nueva notificación',
      data: message.data
    };

    // Mostrar notificación
    this.showLocalNotification(payload);
  }

  /**
   * Obtener token actual
   */
  getCurrentToken(): string | null {
    return this.tokenSubject.value;
  }

  /**
   * Obtener estado actual de permisos
   */
  getCurrentPermissionStatus(): NotificationPermissionStatus {
    return this.permissionSubject.value;
  }

  /**
   * Verificar si las notificaciones están habilitadas
   */
  areNotificationsEnabled(): boolean {
    return this.getCurrentPermissionStatus().granted && this.getCurrentToken() !== null;
  }

  // Métodos para diferentes tipos de notificaciones de Apparcar

  /**
   * Enviar notificación de nuevo mensaje de chat
   */
  sendChatNotification(senderName: string, message: string, channelId: string): void {
    const payload: PushNotificationPayload = {
      title: senderName,
      body: message,
      data: {
        type: 'chat_message',
        channelId,
        url: `/chat/${channelId}`
      }
    };

    this.showLocalNotification(payload);
  }

  /**
   * Enviar notificación de plaza disponible cercana
   */
  sendPlazaAvailableNotification(address: string, distance: number, plazaId: string): void {
    const payload: PushNotificationPayload = {
      title: '🅿️ Plaza libre cerca de ti',
      body: `Plaza disponible en ${address} (a ${distance}m)`,
      data: {
        type: 'plaza_available',
        plazaId,
        url: `/map?highlight=${plazaId}`
      }
    };

    this.showLocalNotification(payload);
  }

  /**
   * Enviar notificación de plaza reclamada
   */
  sendPlazaClaimedNotification(claimerName: string, plazaId: string, channelId: string): void {
    const payload: PushNotificationPayload = {
      title: '⏰ Tu plaza ha sido reclamada',
      body: `${claimerName} va hacia tu plaza. ¡Coordínate por chat!`,
      data: {
        type: 'plaza_claimed',
        plazaId,
        channelId,
        url: `/chat/${channelId}`
      }
    };

    this.showLocalNotification(payload);
  }

  /**
   * Enviar notificación de confirmación de plaza
   */
  sendPlazaConfirmedNotification(successful: boolean, points?: number): void {
    const payload: PushNotificationPayload = {
      title: successful ? '✅ Plaza ocupada con éxito' : '❌ Plaza no disponible',
      body: successful 
        ? `¡Gracias por usar Apparcar! ${points ? `+${points} puntos` : ''}`
        : 'La plaza no estaba disponible. Sigue buscando.',
      data: {
        type: 'plaza_confirmed',
        successful,
        points,
        url: '/profile?tab=history'
      }
    };

    this.showLocalNotification(payload);
  }

  // Métodos privados auxiliares

  private extractTokenFromSubscription(subscription: PushSubscription): string {
    // En una implementación real, esto extraería el token de Firebase
    // Por ahora, generar un token simulado basado en la suscripción
    const endpoint = subscription.endpoint;
    const hash = btoa(endpoint).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
    return `apparcar_token_${hash}`;
  }

  private async sendTokenToServer(token: string): Promise<void> {
    // En producción, esto enviaría el token al backend
    console.log('Token enviado al servidor (simulado):', token);
    
    // Simular envío al servidor
    try {
      // Aquí iría la llamada HTTP real
      // await this.http.post('/api/notifications/register', { token }).toPromise();
      
      // Por ahora, solo guardarlo localmente
      localStorage.setItem('apparcar_push_token', token);
      
    } catch (error) {
      console.error('Error enviando token al servidor:', error);
    }
  }
}
