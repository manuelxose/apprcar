// =================== src/environments/environment.prod.ts ===================
// Environment configuration for production

export const environment = {
  production: true,
  apiUrl: 'https://api.parkingapp.com/api',
  mockDataEnabled: false, // Disable mock data in production
  
  // Default map location
  defaultCity: {
    latitude: 42.2406,
    longitude: -8.7207
  },
  
  // External services
  googleMapsApiKey: 'YOUR_PRODUCTION_GOOGLE_MAPS_API_KEY',
  stripePublicKey: 'YOUR_PRODUCTION_STRIPE_PUBLIC_KEY',
  vapidPublicKey: 'YOUR_PRODUCTION_VAPID_PUBLIC_KEY', // For web push notifications
  
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
    ttl: 600000, // 10 minutes
    maxSize: 200
  },
  
  // Logging
  logging: {
    level: 'error',
    enableConsole: false,
    enableRemote: true
  }
};
