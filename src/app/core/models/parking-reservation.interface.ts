import { PaymentInfo } from "./payment.interface";
import { VehicleType } from "./vehicle.interface";

// =================== src/app/core/models/parking-reservation.interface.ts ===================
export interface ParkingReservation {
  id: string;
  userId: string;
  parkingId: string;
  spotNumber?: string;
  startTime: Date;
  endTime: Date;
  estimatedPrice: number;
  actualPrice?: number;
  status: ReservationStatus;
  vehicleInfo: VehicleInfo;
  paymentInfo?: PaymentInfo;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
  notes?: string;
}

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  EXPIRED = 'expired'
}

export interface VehicleInfo {
  licensePlate: string;
  make?: string;
  model?: string;
  color?: string;
  type: VehicleType;
}