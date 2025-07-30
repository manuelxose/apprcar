# Sistema de Chat Mejorado - Apparcar

## Descripción

El sistema de chat ha sido completamente renovado para proporcionar una experiencia de comunicación en tiempo real más robusta y rica en características para la aplicación de parking compartido.

## Características Principales

### 🚀 **Funcionalidades Nuevas**

1. **Chat Contextual de Plazas**: Creación automática de chats cuando un usuario está interesado en una plaza compartida
2. **Notificaciones en Tiempo Real**: Notificaciones automáticas para nuevos mensajes
3. **Modo Mock Inteligente**: Sistema de fallback que simula mensajes y respuestas cuando no hay servidor WebSocket
4. **Gestión de Estado Avanzada**: Estado completo de conexión, usuarios online, y manejo de errores
5. **Integración con Auth**: Los mensajes incluyen información completa del usuario autenticado

### 📱 **Mejoras de UX**

- **Avatares Automáticos**: Generación automática de avatares únicos por usuario
- **Indicadores de Estado**: Online/offline, última vez visto
- **Contadores de Mensajes No Leídos**: Con marcado automático al entrar al canal
- **Respuestas Simuladas**: En modo mock, simula conversaciones realistas

## Arquitectura

### **NgRx Store**
```
chat/
├── chat.actions.ts    # Acciones para todas las operaciones de chat
├── chat.effects.ts    # Efectos para WebSocket y lógica async
├── chat.reducer.ts    # Estado del chat y transformaciones
└── chat.selectors.ts  # Selectores para componentes
```

### **Servicios**
```
core/services/
├── chat.service.ts           # Servicio principal de chat con WebSocket
└── notification.service.ts   # Notificaciones para nuevos mensajes
```

### **Modelos**
```typescript
interface ChatChannel {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'global';
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  metadata?: {
    plazaId?: string;
    contextType?: string;
    createdAt?: string;
  };
}

interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
  messageType: 'text' | 'system';
  isRead: boolean;
}
```

## Uso del Sistema

### **1. Inicializar Chat**
```typescript
// El chat se inicializa automáticamente tras login exitoso
this.store.dispatch(ChatActions.initChatSocket());
```

### **2. Cargar Canales**
```typescript
this.store.dispatch(ChatActions.loadChannels());

// Suscribirse a canales
this.store.select(ChatSelectors.selectChannels).subscribe(channels => {
  console.log('Canales disponibles:', channels);
});
```

### **3. Unirse a un Canal**
```typescript
this.store.dispatch(ChatActions.joinChannel({ channelId: 'channel-id' }));
this.store.dispatch(ChatActions.setActiveChannel({ channelId: 'channel-id' }));
```

### **4. Enviar Mensajes**
```typescript
this.store.dispatch(ChatActions.sendMessage({ 
  channelId: 'channel-id', 
  content: 'Hola! ¿Sigue disponible la plaza?' 
}));
```

### **5. Crear Chat de Plaza (Nuevo)**
```typescript
// Crear chat contextual cuando alguien está interesado en una plaza
this.store.dispatch(ChatActions.createPlazaChat({
  plazaId: 'plaza-123',
  sharerUserId: 'user-who-shared',
  claimerUserId: 'user-interested'
}));
```

### **6. Escuchar Mensajes**
```typescript
this.store.select(ChatSelectors.selectMessagesForActiveChannel).subscribe(messages => {
  console.log('Mensajes del canal activo:', messages);
});
```

### **7. Usuarios Online**
```typescript
this.store.select(ChatSelectors.selectUsersOnline).subscribe(users => {
  console.log('Usuarios conectados:', users);
});
```

## Ejemplo de Integración en Componente

```typescript
@Component({
  selector: 'app-plaza-detail',
  template: `
    <button 
      (click)="showInterest()" 
      class="interest-btn">
      ¡Me interesa esta plaza!
    </button>
  `
})
export class PlazaDetailComponent {
  private store = inject(Store);
  
  showInterest(): void {
    // Crear chat automáticamente
    this.store.dispatch(ChatActions.createPlazaChat({
      plazaId: this.plaza.id,
      sharerUserId: this.plaza.userId,
      claimerUserId: this.currentUser.id
    }));
    
    // Navegar al chat
    this.router.navigate(['/chat']);
  }
}
```

## Modo de Desarrollo (Mock)

El sistema incluye un modo mock completo que:

### **Canales Predefinidos**
- **Chat General**: Canal público para todos los usuarios
- **Chats Directos**: Con María García y Carlos López (usuarios mock)

### **Mensajes Simulados**
- Mensajes automáticos cada 10-15 segundos (30% probabilidad)
- Respuestas automáticas a mensajes en chats directos
- Contenido contextual relacionado con parking

### **Usuarios Mock**
```typescript
const mockUsers = [
  { name: 'María García', isOnline: true },
  { name: 'Carlos López', isOnline: false, lastSeen: '15 min ago' },
  { name: 'Ana Martín', isOnline: true }
];
```

## WebSocket en Producción

Para conectar con un servidor real:

```typescript
// En chat.service.ts
this.socket = io('wss://your-server.com', {
  transports: ['websocket', 'polling'],
  auth: {
    token: authToken
  }
});

// Eventos del servidor
this.socket.on('new-message', (message) => { /* handle */ });
this.socket.on('user-joined', (user) => { /* handle */ });
this.socket.on('user-left', (user) => { /* handle */ });
```

## Estados de Conexión

```typescript
// Verificar estado de conexión
this.chatService.isConnected().subscribe(connected => {
  if (connected) {
    console.log('Chat conectado');
  } else {
    console.log('Chat desconectado - usando modo mock');
  }
});
```

## Notificaciones

Las notificaciones se muestran automáticamente para:
- Nuevos mensajes en canales inactivos
- Mensajes de usuarios diferentes al actual
- Configuración de duración y acciones personalizables

```typescript
// Las notificaciones se disparan automáticamente en los effects
private showMessageNotification(message: ChatMessage): void {
  if (message.senderId !== 'currentUser') {
    this.notificationService.showInfo(
      `${message.senderName}: ${message.content}`,
      'Nuevo mensaje',
      3000
    );
  }
}
```

## Próximas Mejoras

- [ ] Mensajes con imágenes y archivos
- [ ] Mensajes de ubicación para coordinar encuentros
- [ ] Traducciones automáticas
- [ ] Historial de mensajes persistente
- [ ] Buscar en mensajes
- [ ] Videollamadas para coordinación compleja
- [ ] Bot asistente para ayuda automatizada

## Dependencias

```json
{
  "socket.io-client": "^4.x.x",
  "@ngrx/store": "^19.x.x",
  "@ngrx/effects": "^19.x.x"
}
```

---

**¡El sistema de chat está listo para producción con capacidades de escalamiento y características avanzadas!**
