import { Injectable, signal } from '@angular/core';

// Interfaces para notificaciones push del sistema
interface SystemNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

// Interfaces para notificaciones de la UI
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

// Configuración para diferentes tipos de notificaciones
interface NotificationConfig {
  defaultDuration: number;
  maxNotifications: number;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // ===== SYSTEM NOTIFICATIONS =====
  // State para notificaciones push del sistema
  isSupported = signal(typeof Notification !== 'undefined');
  permission = signal<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  // ===== UI NOTIFICATIONS =====
  // State para notificaciones de la UI
  private uiNotifications = signal<UINotificationMessage[]>([]);
  private config: NotificationConfig = {
    defaultDuration: 5000,
    maxNotifications: 5,
    position: 'top-right'
  };

  // Signal público para componentes
  uiNotifications$ = this.uiNotifications.asReadonly();

  constructor() {
    this.initializeSystemNotifications();
  }

  // ===== SYSTEM NOTIFICATIONS METHODS =====
  
  private initializeSystemNotifications(): void {
    if (typeof Notification !== 'undefined') {
      this.permission.set(Notification.permission);
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') {
      return 'denied';
    }

    let permission = Notification.permission;
    
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    this.permission.set(permission);
    return permission;
  }

  async showSystemNotification(data: SystemNotificationData): Promise<void> {
    if (this.permission() !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    if (typeof Notification === 'undefined') {
      console.warn('Notifications not supported');
      return;
    }

    try {
      const notification = new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/assets/icons/icon-192x192.png',
        badge: data.badge || '/assets/icons/icon-72x72.png',
        data: data.data,
        tag: data.tag,
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false
      });

      notification.onclick = () => {
        if (data.data?.url) {
          window.open(data.data.url, '_blank');
        }
        notification.close();
      };

      // Handle vibration separately for web
      if (data.vibrate && 'vibrate' in navigator) {
        navigator.vibrate(data.vibrate);
      }

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);

    } catch (error) {
      console.error('Error showing system notification:', error);
    }
  }

  // ===== UI NOTIFICATIONS METHODS =====

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

  // ===== PARKING-SPECIFIC NOTIFICATIONS =====

  async notifyReservationConfirmed(parkingName: string, reservationId: string): Promise<void> {
    // Notificación del sistema
    await this.showSystemNotification({
      title: 'Reserva Confirmada',
      body: `Tu reserva en ${parkingName} ha sido confirmada`,
      icon: '/assets/icons/notification-confirmed.png',
      data: {
        type: 'reservation_confirmed',
        reservationId,
        url: `/profile/reservations`
      },
      tag: 'reservation_confirmed',
      vibrate: [500]
    });

    // Notificación de la UI como backup
    this.showSuccess(
      `Tu reserva en ${parkingName} ha sido confirmada`,
      'Reserva Confirmada',
      8000,
      [{
        label: 'Ver Reserva',
        action: () => window.location.href = `/profile/reservations`,
        primary: true
      }]
    );
  }

  async notifyParkingAvailable(parkingName: string, address: string): Promise<void> {
    // Notificación del sistema
    await this.showSystemNotification({
      title: 'Plaza Disponible',
      body: `Se liberó una plaza en ${parkingName}, ${address}`,
      icon: '/assets/icons/notification-available.png',
      data: {
        type: 'parking_available',
        url: '/map'
      },
      tag: 'parking_available',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200]
    });

    // Notificación de la UI como backup
    this.showInfo(
      `Se liberó una plaza en ${parkingName}, ${address}`,
      'Plaza Disponible',
      10000,
      [{
        label: 'Ver en Mapa',
        action: () => window.location.href = '/map',
        primary: true
      }]
    );
  }

  async notifyReservationExpiring(parkingName: string, minutesLeft: number): Promise<void> {
    await this.showSystemNotification({
      title: 'Reserva por Expirar',
      body: `Tu reserva en ${parkingName} expira en ${minutesLeft} minutos`,
      icon: '/assets/icons/notification-warning.png',
      data: {
        type: 'reservation_expiring',
        url: '/profile/reservations'
      },
      tag: 'reservation_expiring',
      requireInteraction: true,
      vibrate: [300, 200, 300]
    });

    this.showWarning(
      `Tu reserva en ${parkingName} expira en ${minutesLeft} minutos`,
      'Reserva por Expirar',
      0, // No auto-dismiss
      [
        {
          label: 'Extender',
          action: () => window.location.href = '/profile/reservations',
          primary: true
        },
        {
          label: 'Cancelar',
          action: () => this.dismissAllUINotifications()
        }
      ]
    );
  }

  async notifyPaymentRequired(parkingName: string, amount: number): Promise<void> {
    await this.showSystemNotification({
      title: 'Pago Requerido',
      body: `Debes pagar €${amount.toFixed(2)} por tu estadía en ${parkingName}`,
      icon: '/assets/icons/notification-payment.png',
      data: {
        type: 'payment_required',
        url: '/payments'
      },
      tag: 'payment_required',
      requireInteraction: true,
      vibrate: [500, 300, 500, 300, 500]
    });

    this.showError(
      `Debes pagar €${amount.toFixed(2)} por tu estadía en ${parkingName}`,
      'Pago Requerido',
      0, // No auto-dismiss
      [{
        label: 'Pagar Ahora',
        action: () => window.location.href = '/payments',
        primary: true
      }]
    );
  }

  async testNotification(): Promise<void> {
    await this.showSystemNotification({
      title: 'Test de Notificaciones',
      body: 'Las notificaciones están funcionando correctamente',
      icon: '/assets/icons/icon-192x192.png',
      data: { type: 'test' }
    });

    this.showSuccess(
      'Las notificaciones están funcionando correctamente',
      'Test de Notificaciones'
    );
  }

  // ===== UTILITY METHODS =====

  isPermissionGranted(): boolean {
    return this.permission() === 'granted';
  }

  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  // Método para mostrar notificaciones con ambos sistemas
  async showBothNotifications(
    systemData: SystemNotificationData,
    uiType: 'success' | 'error' | 'warning' | 'info',
    uiMessage: string,
    uiTitle?: string,
    uiDuration?: number,
    uiActions?: NotificationAction[]
  ): Promise<void> {
    // Sistema
    if (this.isPermissionGranted()) {
      await this.showSystemNotification(systemData);
    }
    
    // UI
    switch (uiType) {
      case 'success':
        this.showSuccess(uiMessage, uiTitle, uiDuration, uiActions);
        break;
      case 'error':
        this.showError(uiMessage, uiTitle, uiDuration, uiActions);
        break;
      case 'warning':
        this.showWarning(uiMessage, uiTitle, uiDuration, uiActions);
        break;
      case 'info':
        this.showInfo(uiMessage, uiTitle, uiDuration, uiActions);
        break;
    }
  }
}
