// =================== src/app/core/models/vehicle.interface.ts ===================
export interface Vehicle {
  id: string;
  userId: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  color: string;
  type: VehicleType;
  isElectric: boolean;
  isDefault: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum VehicleType {
  CAR = 'car',
  MOTORCYCLE = 'motorcycle',
  TRUCK = 'truck',
  VAN = 'van',
  ELECTRIC = 'electric',
  HYBRID = 'hybrid',
  BICYCLE = 'bicycle'
}