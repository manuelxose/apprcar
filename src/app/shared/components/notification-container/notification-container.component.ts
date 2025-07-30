// src/app/shared/components/notification-container/notification-container.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, UINotificationMessage, NotificationAction } from '@core/services/notification.service';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-container.component.html',
  styleUrls: ['./notification-container.component.scss']
})
export class NotificationContainerComponent {
  private notificationService = inject(NotificationService);
  
  notifications = this.notificationService.uiNotifications$;

  trackByFn(index: number, item: UINotificationMessage): string {
    return item.id;
  }

  getNotificationClasses(notification: UINotificationMessage): string {
    const baseClasses = 'notification-item animate-slide-in';
    
    switch (notification.type) {
      case 'success':
        return `${baseClasses} bg-green-50 border-green-200`;
      case 'error':
        return `${baseClasses} bg-red-50 border-red-200`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 border-yellow-200`;
      case 'info':
        return `${baseClasses} bg-blue-50 border-blue-200`;
      default:
        return `${baseClasses} bg-gray-50 border-gray-200`;
    }
  }

  dismiss(id: string): void {
    this.notificationService.dismissUINotification(id);
  }

  executeAction(action: NotificationAction): void {
    action.action();
  }
}
