import { ParkingType } from "./parking-types.enum";

// =================== src/app/core/models/parking-search.interface.ts ===================
export interface ParkingSearchParams {
  query?: string;
  location?: SearchLocation;
  radius?: number;
  filters?: ParkingFilters;
  sortBy?: SortOption;
  limit?: number;
  offset?: number;
}

export interface SearchLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface ParkingFilters {
  type?: ParkingType[];
  maxPrice?: number;
  priceType?: 'hourly' | 'daily' | 'monthly';
  features?: FilterFeatures;
  availability?: boolean;
  rating?: number;
  distance?: number;
  schedule?: ScheduleFilter;
}

export interface FilterFeatures {
  electricCharging?: boolean;
  wheelchairAccess?: boolean;
  security?: boolean;
  covered?: boolean;
  valet?: boolean;
  carWash?: boolean;
}

export interface ScheduleFilter {
  startTime: string;
  endTime: string;
  date?: string;
}

export enum SortOption {
  DISTANCE = 'distance',
  PRICE = 'price',
  RATING = 'rating',
  AVAILABILITY = 'availability',
  NAME = 'name',
  NEWEST = 'newest'
}
