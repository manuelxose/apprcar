// src/app/core/services/index.ts - Barrel exports for services

// Unified notification service - replaces old notification services
export * from './unified-notification.service';

// Export with common name for backward compatibility
export { UnifiedNotificationService as NotificationService } from './unified-notification.service';
export { UnifiedNotificationService as PushNotificationService } from './unified-notification.service';

// Other services
export * from './notification-mock.service';
export * from './storage';
export * from './chat.service';
export * from './plaza.service';
export * from './plaza-chat-integration.service';
export * from './auth.service';
export * from './geolocation';
// Add other services here as needed
