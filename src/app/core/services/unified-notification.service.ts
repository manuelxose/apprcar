// src/app/core/services/unified-notification.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { SwPush } from '@angular/service-worker';
import { Router } from '@angular/router';

import * as AuthSelectors from '@store/auth/auth.selectors';
import * as ChatActions from '@features/chat/store/chat.actions';
import * as PlazaActions from '@store/plaza/plaza.actions';

// ===== INTERFACES =====

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: {
    type: NotificationType;
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

export interface UINotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

export interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export type NotificationType = 
  | 'chat_message' 
  | 'plaza_available' 
  | 'plaza_claimed' 
  | 'plaza_confirmed' 
  | 'system'
  | 'favorite_added' 
  | 'reservation_confirmed' 
  | 'reservation_cancelled' 
  | 'parking_available'
  | 'payment_required'
  | 'reservation_expiring';

interface NotificationConfig {
  defaultDuration: number;
  maxNotifications: number;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

@Injectable({
  providedIn: 'root'
})
export class UnifiedNotificationService {
  private store = inject(Store);
  private swPush = inject(SwPush);
  private router = inject(Router);

  // VAPID key para Firebase (en producción sería de variables de entorno)
  private readonly VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40j8cyijNDhOHohwQnV5VR3yFFAJvSJCJxDZqvN3qEEtqxL7K1gcQ5j3qRhE';

  // ===== PUSH NOTIFICATION STATE =====
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private permissionSubject = new BehaviorSubject<NotificationPermissionStatus>({
    granted: false,
    denied: false,
    default: true
  });

  token$ = this.tokenSubject.asObservable();
  permission$ = this.permissionSubject.asObservable();

  // ===== SYSTEM NOTIFICATION STATE =====
  isSupported = signal(typeof Notification !== 'undefined');
  permission = signal<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  // ===== UI NOTIFICATION STATE =====
  private uiNotifications = signal<UINotificationMessage[]>([]);
  private config: NotificationConfig = {
    defaultDuration: 5000,
    maxNotifications: 5,
    position: 'top-right'
  };

  uiNotifications$ = this.uiNotifications.asReadonly();

  // ===== NOTIFICATION CONFIGURATIONS =====
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
    reservation_expiring: {
      icon: '/assets/icons/notification-warning.png',
      badge: '/assets/icons/badge-72.png',
      actions: [
        { action: 'extend', title: 'Extender', icon: '/assets/icons/extend-icon.png' },
        { action: 'cancel', title: 'Cancelar', icon: '/assets/icons/cancel-icon.png' }
      ]
    },
    payment_required: {
      icon: '/assets/icons/notification-payment.png',
      badge: '/assets/icons/badge-72.png',
      actions: [
        { action: 'pay', title: 'Pagar Ahora', icon: '/assets/icons/payment-icon.png' }
      ]
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

  // ===== INITIALIZATION =====

  private async initializeService(): Promise<void> {
    // Inicializar notificaciones del sistema
    if (typeof Notification !== 'undefined') {
      this.permission.set(Notification.permission);
    }

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
      await this.subscribeToNotifications();
    }
  }

  // ===== PERMISSION MANAGEMENT =====

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') {
      return 'denied';
    }

    let permission = Notification.permission;
    
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    this.permission.set(permission);
    await this.updatePermissionStatus();

    if (permission === 'granted') {
      await this.subscribeToNotifications();
    }

    return permission;
  }

  private async checkPermissionStatus(): Promise<void> {
    if (typeof Notification === 'undefined') {
      this.permissionSubject.next({
        granted: false,
        denied: true,
        default: false
      });
      return;
    }

    const permission = Notification.permission;
    await this.updatePermissionStatus();
  }

  private async updatePermissionStatus(): Promise<void> {
    if (typeof Notification === 'undefined') return;

    const permission = Notification.permission;
    const status: NotificationPermissionStatus = {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    };

    this.permissionSubject.next(status);
  }

  getCurrentPermissionStatus(): NotificationPermissionStatus {
    return this.permissionSubject.value;
  }

  areNotificationsEnabled(): boolean {
    return this.getCurrentPermissionStatus().granted;
  }

  isPermissionGranted(): boolean {
    return this.permission() === 'granted';
  }

  // ===== SERVICE WORKER INTEGRATION =====

  private async subscribeToNotifications(): Promise<void> {
    if (!this.swPush.isEnabled) {
      console.warn('Service Worker no está habilitado');
      return;
    }

    try {
      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY
      });

      if (subscription) {
        const token = JSON.stringify(subscription);
        this.tokenSubject.next(token);
        
        // Aquí enviarías el token al servidor
        // await this.sendTokenToServer(token);
        
        console.log('Push notification subscription successful:', subscription);
      }
    } catch (error) {
      console.error('Error al suscribirse a notificaciones push:', error);
    }
  }

  private setupNotificationClickHandlers(): void {
    if (!this.swPush.isEnabled) return;

    // Escuchar clicks en notificaciones
    this.swPush.notificationClicks.subscribe(({ action, notification }) => {
      this.handleNotificationClick(action, notification.data);
    });

    // Escuchar notificaciones recibidas
    this.swPush.messages.subscribe((message: any) => {
      this.handleIncomingMessage(message);
    });
  }

  private handleNotificationClick(action: string, data: any): void {
    switch (action) {
      case 'reply':
        if (data.channelId) {
          this.router.navigate(['/chat', data.channelId]);
        }
        break;
      case 'view':
        if (data.url) {
          this.router.navigate([data.url]);
        }
        break;
      case 'navigate':
        this.router.navigate(['/map']);
        break;
      case 'chat':
        if (data.channelId) {
          this.router.navigate(['/chat', data.channelId]);
        }
        break;
      case 'extend':
        this.router.navigate(['/profile/reservations']);
        break;
      case 'pay':
        this.router.navigate(['/payments']);
        break;
      case 'reserve':
        if (data.parkingId) {
          this.router.navigate(['/parking', data.parkingId]);
        }
        break;
      default:
        if (data.url) {
          this.router.navigate([data.url]);
        }
        break;
    }
  }

  private handleIncomingMessage(message: any): void {
    // Procesar mensaje push entrante
    console.log('Mensaje push recibido:', message);
  }

  // ===== PUSH NOTIFICATION METHODS =====

  async showLocalNotification(payload: PushNotificationPayload): Promise<void> {
    if (!this.areNotificationsEnabled()) {
      console.warn('Push notifications no están habilitadas');
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
      this.handleNotificationClick('default', payload.data);
      notification.close();
    };

    // Auto cerrar después de 10 segundos
    setTimeout(() => {
      notification.close();
    }, 10000);
  }

  // ===== UI NOTIFICATION METHODS =====

  showSuccess(message: string, title?: string, duration?: number, actions?: NotificationAction[]): void {
    this.addUINotification({
      type: 'success',
      title,
      message,
      duration: duration ?? this.config.defaultDuration,
      actions
    });
  }

  showError(message: string, title?: string, duration?: number, actions?: NotificationAction[]): void {
    this.addUINotification({
      type: 'error',
      title,
      message,
      duration: duration ?? 8000, // Errores duran más
      actions
    });
  }

  showWarning(message: string, title?: string, duration?: number, actions?: NotificationAction[]): void {
    this.addUINotification({
      type: 'warning',
      title,
      message,
      duration: duration ?? 6000,
      actions
    });
  }

  showInfo(message: string, title?: string, duration?: number, actions?: NotificationAction[]): void {
    this.addUINotification({
      type: 'info',
      title,
      message,
      duration: duration ?? this.config.defaultDuration,
      actions
    });
  }

  dismissUINotification(id: string): void {
    const currentNotifications = this.uiNotifications();
    const filteredNotifications = currentNotifications.filter(n => n.id !== id);
    this.uiNotifications.set(filteredNotifications);
  }

  dismissAllUINotifications(): void {
    this.uiNotifications.set([]);
  }

  private addUINotification(notification: Omit<UINotificationMessage, 'id'>): void {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification: UINotificationMessage = {
      ...notification,
      id,
      dismissible: true
    };

    const currentNotifications = this.uiNotifications();
    
    // Limitar número máximo de notificaciones
    let updatedNotifications = [...currentNotifications, newNotification];
    if (updatedNotifications.length > this.config.maxNotifications) {
      updatedNotifications = updatedNotifications.slice(-this.config.maxNotifications);
    }
    
    this.uiNotifications.set(updatedNotifications);

    // Auto dismiss si tiene duración
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.dismissUINotification(id);
      }, notification.duration);
    }
  }

  // ===== PARKING-SPECIFIC NOTIFICATION METHODS =====

  // Chat notifications
  async sendChatNotification(senderName: string, message: string, channelId: string): Promise<void> {
    await this.showLocalNotification({
      title: `Mensaje de ${senderName}`,
      body: message,
      data: {
        type: 'chat_message',
        channelId,
        message,
        url: `/chat/${channelId}`
      }
    });

    this.showInfo(`${senderName}: ${message}`, 'Nuevo Mensaje', 5000, [
      {
        label: 'Responder',
        action: () => this.router.navigate(['/chat', channelId]),
        primary: true
      }
    ]);
  }

  // Plaza notifications
  async sendPlazaAvailableNotification(address: string, distance: number, plazaId: string): Promise<void> {
    await this.showLocalNotification({
      title: 'Plaza Disponible',
      body: `Nueva plaza en ${address} (${distance}m)`,
      data: {
        type: 'plaza_available',
        plazaId,
        address,
        distance,
        url: '/map'
      }
    });

    this.showInfo(`Nueva plaza en ${address} (${distance}m)`, 'Plaza Disponible', 10000, [
      {
        label: 'Ver en Mapa',
        action: () => this.router.navigate(['/map']),
        primary: true
      }
    ]);
  }

  async sendPlazaClaimedNotification(claimerName: string, plazaId: string, channelId: string): Promise<void> {
    await this.showLocalNotification({
      title: 'Plaza Reclamada',
      body: `${claimerName} está interesado en tu plaza`,
      data: {
        type: 'plaza_claimed',
        plazaId,
        channelId,
        claimerName,
        url: `/chat/${channelId}`
      }
    });

    this.showInfo(`${claimerName} está interesado en tu plaza`, 'Plaza Reclamada', 8000, [
      {
        label: 'Abrir Chat',
        action: () => this.router.navigate(['/chat', channelId]),
        primary: true
      }
    ]);
  }

  async sendPlazaConfirmedNotification(successful: boolean, points?: number): Promise<void> {
    const title = successful ? 'Plaza Confirmada' : 'Plaza No Disponible';
    const body = successful 
      ? `¡Plaza confirmada! ${points ? `+${points} puntos` : ''}`
      : 'La plaza no estaba disponible';

    await this.showLocalNotification({
      title,
      body,
      data: {
        type: 'plaza_confirmed',
        successful,
        points
      }
    });

    if (successful) {
      this.showSuccess(body, title);
    } else {
      this.showWarning(body, title);
    }
  }

  // Parking notifications
  async notifyReservationConfirmed(parkingName: string, reservationId: string): Promise<void> {
    await this.showLocalNotification({
      title: 'Reserva Confirmada',
      body: `Tu reserva en ${parkingName} ha sido confirmada`,
      data: {
        type: 'reservation_confirmed',
        reservationId,
        parkingName,
        url: '/profile/reservations'
      }
    });

    this.showSuccess(
      `Tu reserva en ${parkingName} ha sido confirmada`,
      'Reserva Confirmada',
      8000,
      [{
        label: 'Ver Reserva',
        action: () => this.router.navigate(['/profile/reservations']),
        primary: true
      }]
    );
  }

  async notifyParkingAvailable(parkingName: string, address: string, parkingId?: string): Promise<void> {
    await this.showLocalNotification({
      title: 'Parking Disponible',
      body: `${parkingName} tiene espacios disponibles`,
      data: {
        type: 'parking_available',
        parkingId,
        parkingName,
        address,
        url: parkingId ? `/parking/${parkingId}` : '/map'
      }
    });

    this.showInfo(
      `${parkingName} tiene espacios disponibles`,
      'Parking Disponible',
      10000,
      [
        {
          label: 'Ver Parking',
          action: () => this.router.navigate(parkingId ? ['/parking', parkingId] : ['/map']),
          primary: true
        },
        ...(parkingId ? [{
          label: 'Reservar',
          action: () => this.router.navigate(['/parking', parkingId])
        }] : [])
      ]
    );
  }

  async notifyReservationExpiring(parkingName: string, minutesLeft: number): Promise<void> {
    await this.showLocalNotification({
      title: 'Reserva por Expirar',
      body: `Tu reserva en ${parkingName} expira en ${minutesLeft} minutos`,
      data: {
        type: 'reservation_expiring',
        parkingName,
        minutesLeft,
        url: '/profile/reservations'
      }
    });

    this.showWarning(
      `Tu reserva en ${parkingName} expira en ${minutesLeft} minutos`,
      'Reserva por Expirar',
      0, // No auto-dismiss
      [
        {
          label: 'Extender',
          action: () => this.router.navigate(['/profile/reservations']),
          primary: true
        },
        {
          label: 'Cerrar',
          action: () => this.dismissAllUINotifications()
        }
      ]
    );
  }

  async notifyPaymentRequired(parkingName: string, amount: number): Promise<void> {
    await this.showLocalNotification({
      title: 'Pago Requerido',
      body: `Debes pagar €${amount.toFixed(2)} por tu estadía en ${parkingName}`,
      data: {
        type: 'payment_required',
        parkingName,
        amount,
        url: '/payments'
      }
    });

    this.showError(
      `Debes pagar €${amount.toFixed(2)} por tu estadía en ${parkingName}`,
      'Pago Requerido',
      0, // No auto-dismiss
      [{
        label: 'Pagar Ahora',
        action: () => this.router.navigate(['/payments']),
        primary: true
      }]
    );
  }

  async notifyFavoriteAdded(parkingName: string, parkingId: string): Promise<void> {
    await this.showLocalNotification({
      title: 'Favorito Agregado',
      body: `${parkingName} ha sido agregado a tus favoritos`,
      data: {
        type: 'favorite_added',
        parkingId,
        parkingName,
        url: '/favorites'
      }
    });

    this.showSuccess(
      `${parkingName} ha sido agregado a tus favoritos`,
      'Favorito Agregado',
      3000,
      [{
        label: 'Ver Favoritos',
        action: () => this.router.navigate(['/favorites']),
        primary: true
      }]
    );
  }

  // ===== UTILITY METHODS =====

  async testNotification(): Promise<void> {
    await this.showLocalNotification({
      title: 'Test de Notificaciones',
      body: 'Las notificaciones están funcionando correctamente',
      data: { 
        type: 'system',
        test: true
      }
    });

    this.showSuccess(
      'Las notificaciones están funcionando correctamente',
      'Test de Notificaciones'
    );
  }

  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  // Método para procesar acciones de store cuando se reciben notificaciones
  private handleNotificationReceived(payload: PushNotificationPayload): void {
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
        if (data.plazaId) {
          // Usar la acción existente o simplificar
          console.log('Plaza claimed notification received:', {
            plazaId: data.plazaId,
            claimerName: data['claimerName'] || 'Usuario',
            channelId: data.channelId || ''
          });
        }
        break;

      case 'plaza_confirmed':
        if (data.plazaId) {
          // Usar la acción existente o simplificar
          console.log('Plaza confirmed notification received:', {
            plazaId: data.plazaId,
            successful: data['successful'] || false,
            points: data['points'] || 0
          });
        }
        break;
    }
  }
}
