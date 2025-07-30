export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  timestamp?: number;
}

export interface PlazaNotificationData {
  location: UserLocation;
  type: PlazaType;
  availability: PlazaAvailability;
  scheduledTime?: Date | null;
  description?: string;
  isAccessible?: boolean;
  hasMeter?: boolean;
  estimatedDuration?: number;
  price?: number | null;
  contact?: string;
  estimatedArrival?: Date | null;
}

export type PlazaType = 'street' | 'parking_lot' | 'private' | 'commercial';

export type PlazaAvailability = 'immediate' | 'soon' | 'scheduled';

export interface Plaza {
  id: string;
  location: UserLocation;
  type: PlazaType;
  availability: PlazaAvailability;
  scheduledTime?: Date;
  description?: string;
  isAccessible: boolean;
  hasMeter: boolean;
  estimatedDuration: number;
  price?: number;
  contact?: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface NearbyPlaza extends Plaza {
  distance: number;
  timeToArrival?: number;
}
