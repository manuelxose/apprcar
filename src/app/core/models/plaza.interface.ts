// src/app/core/models/plaza.interface.ts
export interface PlazaLibre {
  id: string;
  createdBy: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    description?: string;
  };
  status: PlazaStatus;
  details: {
    size: 'small' | 'medium' | 'large';
    description?: string;
    isPaid: boolean;
    price?: number;
    restrictions?: string;
    estimatedDuration?: number; // minutos
  };
  availability: {
    availableFrom: string; // ISO date
    availableUntil?: string; // ISO date
    isImmediate: boolean;
  };
  createdAt: string;
  updatedAt?: string;
  expiresAt: string;
  claimedBy?: string;
  claimedAt?: string;
  confirmedAt?: string;
  reportedAt?: string;
  successful?: boolean;
  distance?: number; // metros desde ubicación del usuario
  score?: number; // puntuación basada en distancia, tiempo, etc.
}

export type PlazaStatus = 
  | 'pending'      // Recién creada, esperando validación
  | 'available'    // Disponible para reclamar
  | 'claimed'      // Reclamada por alguien
  | 'occupied'     // Confirmada como ocupada
  | 'unavailable'  // Reportada como no disponible
  | 'expired';     // Expirada por tiempo

export interface PlazaNotification {
  id: string;
  plazaId: string;
  userId: string;
  type: 'new_plaza' | 'plaza_claimed' | 'plaza_available' | 'plaza_expired';
  message: string;
  createdAt: string;
  read: boolean;
}

export interface PlazaConfirmation {
  id: string;
  plazaId: string;
  userId: string;
  successful: boolean;
  feedback?: string;
  rating?: number; // 1-5 estrellas para el usuario que compartió
  confirmedAt: string;
}

export interface PlazaFilters {
  radius: number; // metros
  maxAge: number; // minutos
  showOnlyAvailable: boolean;
  includePaid: boolean;
  sizePreference?: 'small' | 'medium' | 'large';
  maxPrice?: number;
}
