# Guía de Integración - Push Notifications

## 📋 Resumen

Se han implementado exitosamente los servicios de notificaciones push para Apparcar:

✅ **PushNotificationService** - Servicio principal de notificaciones push
✅ **NotificationMockService** - Servicio de simulación para desarrollo  
✅ **Integración con parking-detail** - Nuevos métodos de notificación
✅ **Documentación completa** - README y ejemplos de uso

## 🔧 Archivos Creados

### Servicios Principales
- `src/app/core/services/push-notification.service.ts`
- `src/app/core/services/notification-mock.service.ts`

### Documentación
- `src/app/core/services/push-notifications-README.md`
- `src/app/app.component.integration.example.ts`
- `src/app/core/services/push-notification-integration.example.ts`

### Assets
- `src/assets/icons/*.png.placeholder` (6 archivos de iconos)

### Actualizaciones
- `src/app/core/services/index.ts` - Exporta nuevos servicios
- `src/app/features/parking-detail/parking-detail.ts` - Métodos de notificación

## 🚀 Cómo Usar

### 1. Inicialización en AppComponent

```typescript
// En tu app.component.ts
import { PushNotificationService, NotificationMockService } from '@core/services';

export class AppComponent implements OnInit {
  private pushService = inject(PushNotificationService);
  private mockService = inject(NotificationMockService);

  async ngOnInit() {
    // Solicitar permisos
    await this.pushService.requestPermission();
    
    // En desarrollo, iniciar simulación
    if (!environment.production) {
      this.mockService.startMockNotifications();
    }
  }
}
```

### 2. Enviar Notificaciones Específicas

```typescript
// Mensaje de chat
this.pushService.sendChatNotification(
  'María García',
  '¡Perfecto! Te veo en la plaza en 5 minutos 👍',
  'chat-channel-123'
);

// Plaza disponible
this.pushService.sendPlazaAvailableNotification(
  'Gran Vía, Madrid',
  150, // distancia en metros
  'plaza-456'
);

// Plaza reclamada
this.pushService.sendPlazaClaimedNotification(
  'Carlos López',
  'plaza-789',
  'chat-channel-789'
);

// Confirmación de plaza
this.pushService.sendPlazaConfirmedNotification(
  true, // exitoso
  10    // puntos ganados
);
```

### 3. Funcionalidades Nuevas en Parking Detail

El componente `parking-detail` ahora incluye:

✅ **onToggleAvailabilityNotifications()** - Activar alertas de disponibilidad
✅ **onShareParkingWithNotification()** - Compartir con notificación
✅ **onReservationCompleted()** - Notificación de reserva confirmada
✅ **Signals reactivos** - `notificationEnabled`, `watchingAvailability`

## ⚙️ Configuración Requerida

### 1. Service Worker (app.config.ts)

```typescript
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... otros providers
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
```

### 2. Template Principal

Asegúrate de incluir el contenedor de notificaciones:

```html
<!-- En tu app.component.html -->
<router-outlet></router-outlet>
<app-notification-container></app-notification-container>
```

### 3. Iconos de Notificación

Reemplaza los archivos `.placeholder` en `/assets/icons/` con iconos PNG reales:

- `chat-icon-192.png` - Icono para mensajes de chat
- `parking-icon-192.png` - Icono para plazas disponibles  
- `parking-claimed-192.png` - Icono para plazas reclamadas
- `check-icon-192.png` - Icono para confirmaciones
- `app-icon-192.png` - Icono general de la app
- `badge-72.png` - Badge pequeño para notificaciones

## 🎯 Características Implementadas

### PushNotificationService

- ✅ Manejo de permisos automático
- ✅ Integración con Angular Service Worker  
- ✅ Navegación automática basada en el tipo de notificación
- ✅ Configuración personalizada por tipo
- ✅ Integración con NgRx store
- ✅ Soporte para acciones en notificaciones

### NotificationMockService

- ✅ Simulación automática cada 30-60 segundos
- ✅ 4 tipos de notificaciones de prueba
- ✅ Método para tests específicos

### Integración con Componentes

- ✅ Parking Detail: Alertas de disponibilidad
- ✅ Chat: Notificaciones de mensajes  
- ✅ Plaza: Notificaciones de estado
- ✅ Reservas: Confirmaciones push

## 🔧 Próximos Pasos

### 1. Reemplazar Iconos
Crea o descarga iconos PNG de 192x192px y 72x72px para cada tipo de notificación.

### 2. Configurar Producción
```typescript
// En environment.prod.ts
export const environment = {
  production: true,
  vapidPublicKey: 'TU_CLAVE_VAPID_REAL'
};
```

### 3. Backend Integration
Implementa el endpoint para registrar tokens:

```typescript
// En push-notification.service.ts
private async sendTokenToServer(token: string): Promise<void> {
  await this.http.post('/api/notifications/register', { 
    token,
    userId: this.getCurrentUserId()
  }).toPromise();
}
```

### 4. Testing
```typescript
// Para probar notificaciones
this.mockService.startMockNotifications();
this.pushService.testNotifications();
```

## 📱 Tipos de Notificación Soportados

1. **chat_message** - Nuevos mensajes de chat
2. **plaza_available** - Plazas disponibles cercanas  
3. **plaza_claimed** - Plaza reclamada por otro usuario
4. **plaza_confirmed** - Confirmación de ocupación
5. **system** - Notificaciones del sistema

## 🐛 Troubleshooting

### Permisos Denegados
```typescript
if (this.pushService.getCurrentPermissionStatus().denied) {
  // Mostrar instrucciones para habilitar manualmente
}
```

### Service Worker No Disponible
```typescript
if (!this.swPush.isEnabled) {
  console.warn('Service Worker no está habilitado');
  // Usar fallback a notificaciones básicas
}
```

## 📖 Documentación Completa

Para más detalles, consulta:
- `push-notifications-README.md` - Documentación técnica completa
- `push-notification-integration.example.ts` - Ejemplos de integración avanzados

¡El sistema de notificaciones push está listo para usar! 🎉
