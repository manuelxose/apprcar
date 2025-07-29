import { ParkingFilters } from "./parking-search.interface";
import { SortOption } from "./parking-search.interface";

// =================== src/app/core/models/user-preferences.interface.ts ===================
export interface UserPreferences {
  notifications: NotificationPreferences;
  search: SearchPreferences;
  privacy: PrivacyPreferences;
  accessibility: AccessibilityPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  reservationReminders: boolean;
  promotions: boolean;
  parkingUpdates: boolean;
  newsletter: boolean;
}

export interface SearchPreferences {
  defaultRadius: number;
  preferredSortBy: SortOption;
  autoLocation: boolean;
  savedLocations: SavedLocation[];
  quickFilters: ParkingFilters;
}

export interface SavedLocation {
  id: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  isDefault: boolean;
}

export interface PrivacyPreferences {
  shareLocation: boolean;
  shareActivity: boolean;
  allowAnalytics: boolean;
  allowMarketing: boolean;
  dataRetention: DataRetentionOption;
}

export enum DataRetentionOption {
  ONE_YEAR = '1_year',
  TWO_YEARS = '2_years',
  FIVE_YEARS = '5_years',
  INDEFINITE = 'indefinite'
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  voiceNavigation: boolean;
  reducedMotion: boolean;
}
