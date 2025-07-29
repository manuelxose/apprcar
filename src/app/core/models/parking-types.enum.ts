// =================== src/app/core/models/parking-types.enum.ts ===================
export enum ParkingType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  STREET = 'street',
  UNDERGROUND = 'underground',
  BUILDING = 'building',
  SHOPPING_CENTER = 'shopping_center',
  AIRPORT = 'airport',
  TRAIN_STATION = 'train_station',
  HOSPITAL = 'hospital',
  UNIVERSITY = 'university'
}

export enum ParkingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  FULL = 'full',
  TEMPORARILY_CLOSED = 'temporarily_closed',
  PERMANENTLY_CLOSED = 'permanently_closed'
}
