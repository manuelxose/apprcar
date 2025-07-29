// =================== src/app/core/models/user-profile.interface.ts ===================
export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: UserAddress;
  language: string;
  timezone: string;
}

export interface UserAddress {
  street: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}