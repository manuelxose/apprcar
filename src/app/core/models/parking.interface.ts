import { ParkingSchedule } from "./parking-schedule.interface";
import { ParkingFeatures } from "./parking-features.interface";
import { ParkingPricing } from "./parking-pricing.interface";
import { ParkingType, ParkingStatus } from "./parking-types.enum";

// =================== src/app/core/models/parking.interface.ts ===================
export interface Parking {
  id: string;
  name: string;
  description?: string;
  address: string;
  location: ParkingLocation;
  type: ParkingType;
  status: ParkingStatus;
  capacity: ParkingCapacity;
  pricing: ParkingPricing;
  features: ParkingFeatures;
  schedule: ParkingSchedule;
  contact?: ParkingContact;
  images?: string[];
  rating: Rating;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParkingLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  city: string;
  country: string;
  postalCode?: string;
  district?: string;
}

export interface ParkingCapacity {
  total: number;
  available: number;
  reserved: number;
  occupied: number;
  spots: SpotDetails;
}

export interface SpotDetails {
  regular: number;
  disabled: number;
  electric: number;
  motorcycle: number;
  large: number;
}

export interface ParkingContact {
  phone?: string;
  email?: string;
  website?: string;
  emergency?: string;
}

export interface Rating {
  average: number;
  totalReviews: number;
  distribution: RatingDistribution;
  lastUpdated: Date;
}

export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}