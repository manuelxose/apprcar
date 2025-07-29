import { DayOfWeek } from "./common.enum";

// =================== src/app/core/models/parking-pricing.interface.ts ===================
export interface ParkingPricing {
  currency: string;
  freeMinutes?: number;
  rates: PriceRate[];
  specialRates?: SpecialRate[];
  subscriptions?: Subscription[];
}

export interface PriceRate {
  id: string;
  name: string;
  type: 'hourly' | 'daily' | 'monthly' | 'minute';
  price: number;
  maxDuration?: number;
  validDays?: DayOfWeek[];
  validHours?: TimeRange;
}

export interface SpecialRate {
  id: string;
  name: string;
  description: string;
  type: 'resident' | 'student' | 'senior' | 'disabled' | 'member';
  discount: number;
  requirements?: string[];
}

export interface Subscription {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  features: string[];
  maxVehicles?: number;
}

export interface TimeRange {
  start: string;
  end: string;
}
