// src/app/core/models/auth.interface.ts
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  acceptTerms: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  password?: string; // Solo en backend, se remueve en frontend
  firstName: string;
  lastName: string;
  phone: string;
  profileImage: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  preferences: UserPreferences;
  gamification: UserGamification;
  vehicles: Vehicle[];
}

export interface UserPreferences {
  notifications: {
    push: boolean;
    email: boolean;
    newPlazaAlert: boolean;
    chatMessages: boolean;
  };
  privacy: {
    showLocationToOthers: boolean;
    allowDirectMessages: boolean;
  };
}

export interface UserGamification {
  points: number;
  level: string;
  reputation: number;
  badges: string[];
  totalPlazasShared: number;
  totalPlazasUsed: number;
  totalConfirmations: number;
}

export interface Vehicle {
  id: string;
  type: 'car' | 'motorcycle' | 'truck' | 'electric';
  brand: string;
  model: string;
  color: string;
  licensePlate: string;
  isDefault: boolean;
}