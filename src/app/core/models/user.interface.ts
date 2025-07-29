import { UserPreferences } from "./user-preferences.interface";
import { UserProfile } from "./user-profile.interface";

// =================== src/app/core/models/user.interface.ts ===================
export interface User {
  id: string;
  email: string;
  username?: string;
  profile: UserProfile;
  preferences: UserPreferences;
  vehicles: string[]; // IDs de vehículos
  favorites: string[];
  reservations: string[];
  subscriptions: string[];
  paymentMethods: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  verificationStatus: VerificationStatus;
}

export interface VerificationStatus {
  email: boolean;
  phone: boolean;
  identity: boolean;
  paymentMethod: boolean;
}
