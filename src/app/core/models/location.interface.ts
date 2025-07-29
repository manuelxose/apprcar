// =================== src/app/core/models/location.interface.ts ===================
export interface LocationData {
  coordinates: Coordinates;
  address: AddressComponents;
  accuracy?: number;
  timestamp: Date;
  source: LocationSource;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface AddressComponents {
  formattedAddress: string;
  streetNumber?: string;
  streetName?: string;
  neighborhood?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  countryCode: string;
}

export interface GeofenceArea {
  id: string;
  name: string;
  center: Coordinates;
  radius: number;
  isActive: boolean;
  notifications: boolean;
}

export interface LocationHistory {
  id: string;
  userId: string;
  location: LocationData;
  purpose?: LocationPurpose;
  duration?: number;
  createdAt: Date;
}

export enum LocationSource {
  GPS = 'gps',
  NETWORK = 'network',
  MANUAL = 'manual',
  CACHED = 'cached',
  IP = 'ip'
}

export enum LocationPurpose {
  PARKING_SEARCH = 'parking_search',
  NAVIGATION = 'navigation',
  RESERVATION = 'reservation',
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
  EMERGENCY = 'emergency'
}