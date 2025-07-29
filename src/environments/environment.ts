// =================== src/environments/environment.ts ===================
// Environment configuration for development

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  
  // Default map location
  defaultCity: {
    latitude: 42.2406,
    longitude: -8.7207
  },
  
  // External services
  googleMapsApiKey: '',
  stripePublicKey: '',
  vapidPublicKey: '', // For web push notifications
  
  // Feature flags
  features: {
    enableNotifications: true,
    enableGeolocation: true,
    enablePayments: true,
    enableRealtimeUpdates: true
  },
  
  // App configuration
  app: {
    name: 'Parking App',
    version: '1.0.0',
    defaultRadius: 1000, // meters
    maxSearchRadius: 5000, // meters
    refreshInterval: 30000, // 30 seconds
    requestTimeout: 10000 // 10 seconds
  },
  
  // Cache configuration
  cache: {
    ttl: 300000, // 5 minutes
    maxSize: 100
  },
  
  // Logging
  logging: {
    level: 'debug',
    enableConsole: true,
    enableRemote: false
  }
};
