// src/app/core/services/notification-mock.service.ts
import { Injectable, inject } from '@angular/core';
import { timer, interval } from 'rxjs';
import { UnifiedNotificationService } from './unified-notification.service';

/**
 * Servicio para simular notificaciones push en desarrollo
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationMockService {
  private notificationService = inject(UnifiedNotificationService);

  private mockNotifications = [
    {
      type: 'chat_message',
      title: 'María García',
      body: '¡Perfecto! Te veo en la plaza en 5 minutos 👍',
      channelId: 'user-maria'
    },
    {
      type: 'plaza_available',
      title: '🅿️ Plaza libre cerca',
      body: 'Nueva plaza disponible en Calle Gran Vía (a 200m)',
      plazaId: 'plaza-123'
    },
    {
      type: 'plaza_claimed',
      title: '⏰ Plaza reclamada',
      body: 'Carlos López va hacia tu plaza. ¡Coordínate!',
      plazaId: 'plaza-456',
      channelId: 'plaza-456'
    },
    {
      type: 'plaza_confirmed',
      title: '✅ ¡Éxito!',
      body: 'Plaza ocupada correctamente. +10 puntos',
      successful: true,
      points: 10
    }
  ];

  /**
   * Iniciar simulación de notificaciones aleatorias
   */
  startMockNotifications(): void {
    console.log('🚀 Iniciando simulación de notificaciones push...');

    // Enviar primera notificación después de 5 segundos
    timer(5000).subscribe(() => {
      this.sendRandomNotification();
    });

    // Luego enviar notificaciones cada 30-60 segundos
    interval(45000).subscribe(() => {
      if (Math.random() > 0.3) { // 70% de probabilidad
        this.sendRandomNotification();
      }
    });
  }

  private sendRandomNotification(): void {
    const mock = this.mockNotifications[
      Math.floor(Math.random() * this.mockNotifications.length)
    ];

    switch (mock.type) {
      case 'chat_message':
        this.notificationService.sendChatNotification(
          mock.title,
          mock.body,
          mock.channelId!
        );
        break;

      case 'plaza_available':
        this.notificationService.sendPlazaAvailableNotification(
          'Gran Vía, Madrid',
          Math.floor(Math.random() * 500) + 100,
          mock.plazaId!
        );
        break;

      case 'plaza_claimed':
        this.notificationService.sendPlazaClaimedNotification(
          'Carlos López',
          mock.plazaId!,
          mock.channelId!
        );
        break;

      case 'plaza_confirmed':
        this.notificationService.sendPlazaConfirmedNotification(
          mock.successful!,
          mock.points
        );
        break;
    }
  }

  /**
   * Enviar notificación de prueba específica
   */
  sendTestNotification(type: string): void {
    const mock = this.mockNotifications.find(n => n.type === type);
    if (mock) {
      console.log(`Enviando notificación de prueba: ${type}`);
      // Lógica similar al método anterior
    }
  }
}
