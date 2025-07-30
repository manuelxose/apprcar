# Push Notifications Integration - Parking App

## Descripción
Se ha implementado un sistema completo de notificaciones push para la aplicación de parking, integrando tanto las funcionalidades de plazas individuales (PlazaService) como parkings comerciales (ParkingService).

## Servicios Implementados

### 1. PushNotificationService
**Ubicación**: `src/app/core/services/push-notification.service.ts`

**Funcionalidades principales**:
- Gestión de permisos de notificaciones
- Registro y manejo de tokens VAPID
- Envío de notificaciones locales y remotas
- Manejo de clics en notificaciones
- Integración con Angular Service Worker

**Tipos de notificaciones soportadas**:
- `chat_message`: Mensajes de chat entre usuarios
- `plaza_available`: Nueva plaza disponible cerca
- `plaza_claimed`: Plaza reclamada por otro usuario
- `plaza_confirmed`: Confirmación de plaza ocupada
- `favorite_added`: Parking agregado a favoritos
- `reservation_confirmed`: Reserva confirmada
- `reservation_cancelled`: Reserva cancelada
- `parking_available`: Parking comercial disponible
- `system`: Notificaciones del sistema

### 2. NotificationMockService
**Ubicación**: `src/app/core/services/notification-mock.service.ts`

**Propósito**: Servicio para desarrollo que simula notificaciones aleatorias para probar la funcionalidad.

**Características**:
- Generación automática de notificaciones de prueba
- Simulación de diferentes tipos de notificaciones
- Control de frecuencia e intervalo

## Integraciones

### PlazaService
**Métodos integrados**:
- `claimParkingSpot()`: Envía notificación cuando se reclama una plaza
- `confirmPlazaOccupationWithChat()`: Notifica confirmación de ocupación

**Tipos de notificaciones**:
- Notificación al reclamar plaza
- Notificación de confirmación exitosa/fallida
- Puntos ganados por plaza exitosa

### ParkingService  
**Métodos integrados**:
- `createReservation()`: Notifica cuando se confirma una reserva
- `cancelReservation()`: Notifica cancelación de reserva
- `addToFavorites()`: Notifica cuando se agrega a favoritos
- `enableAvailabilityNotifications()`: Activa notificaciones de disponibilidad

**Tipos de notificaciones**:
- Confirmación de reservas
- Cancelación de reservas
- Favoritos agregados
- Disponibilidad de espacios

## Configuración

### Permisos
El servicio gestiona automáticamente los permisos de notificación:
- Solicita permisos al usuario
- Verifica estado de permisos
- Maneja denegaciones y concesiones

### VAPID Keys
Para notificaciones push remotas, configurar en `environment.ts`:
```typescript
vapidKeys: {
  publicKey: 'TU_CLAVE_PUBLICA_VAPID',
  privateKey: 'TU_CLAVE_PRIVADA_VAPID'
}
```

### Service Worker
Las notificaciones utilizan el Angular Service Worker para:
- Registrar el service worker
- Manejar notificaciones en background
- Gestionar clics y acciones de notificaciones

## Uso en Componentes

### Ejemplo 1: Activar notificaciones en parking-detail
```typescript
// En parking-detail.ts
onToggleAvailabilityNotifications(): void {
  this.parkingService.enableAvailabilityNotifications(this.parkingId());
}
```

### Ejemplo 2: Verificar estado de notificaciones
```typescript
// En cualquier componente
constructor() {
  const isEnabled = this.pushNotificationService.areNotificationsEnabled();
  console.log('Notificaciones habilitadas:', isEnabled);
}
```

### Ejemplo 3: Inicializar servicio mock para desarrollo
```typescript
// En desarrollo
constructor() {
  this.notificationMockService.startMockNotifications();
}
```

## Estructura de Datos

### PushNotificationPayload
```typescript
interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
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
  actions?: NotificationAction[];
}
```

## Flujo de Trabajo

1. **Inicialización**: Los servicios se inicializan automáticamente
2. **Permisos**: Se solicitan permisos de notificación al usuario
3. **Registro**: Se registra el service worker para notificaciones
4. **Integración**: Los servicios PlazaService y ParkingService envían notificaciones automáticamente
5. **Manejo**: Las notificaciones se muestran y gestionan según configuración

## Testing

### Modo Desarrollo
- Usar `NotificationMockService` para generar notificaciones de prueba
- Configurar frecuencia y tipos específicos
- Verificar comportamiento sin interacción real

### Modo Producción
- Integrar con backend real para notificaciones remotas
- Configurar VAPID keys válidas
- Testear en dispositivos móviles reales

## Beneficios

1. **Experiencia del Usuario**: Notificaciones en tiempo real mejoran la UX
2. **Retención**: Los usuarios se mantienen informados incluso fuera de la app
3. **Coordinación**: Facilita comunicación entre usuarios de plazas
4. **Confirmaciones**: Retroalimentación inmediata de acciones importantes
5. **Modularidad**: Sistema extensible para nuevos tipos de notificaciones

## Próximos Pasos

1. Integrar con backend real para notificaciones remotas
2. Implementar analytics de notificaciones
3. Agregar configuraciones de usuario para personalizar notificaciones
4. Implementar notificaciones programadas (recordatorios)
5. Mejorar targeting geográfico para notificaciones de proximidad
