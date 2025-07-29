import { Injectable, signal } from '@angular/core';

interface NotificationData {
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

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // State
  isSupported = signal(typeof Notification !== 'undefined');
  permission = signal<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  constructor() {
    this.initializeNotifications();
  }

  private initializeNotifications(): void {
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

  async showLocalNotification(data: NotificationData): Promise<void> {
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
      console.error('Error showing notification:', error);
    }
  }

  // Parking-specific notifications
  async notifyReservationConfirmed(parkingName: string, reservationId: string): Promise<void> {
    await this.showLocalNotification({
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
  }

  async notifyParkingAvailable(parkingName: string, address: string): Promise<void> {
    await this.showLocalNotification({
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
  }

  async testNotification(): Promise<void> {
    await this.showLocalNotification({
      title: 'Test de Notificaciones',
      body: 'Las notificaciones están funcionando correctamente',
      icon: '/assets/icons/icon-192x192.png',
      data: { type: 'test' }
    });
  }

  isPermissionGranted(): boolean {
    return this.permission() === 'granted';
  }
}
