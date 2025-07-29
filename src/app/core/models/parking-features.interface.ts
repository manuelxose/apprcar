export interface ParkingFeatures {
  security: SecurityFeatures;
  accessibility: AccessibilityFeatures;
  services: ServiceFeatures;
  payment: PaymentFeatures;
  technology: TechnologyFeatures;
}

export interface SecurityFeatures {
  surveillance: boolean;
  lighting: boolean;
  guards: boolean;
  gatedAccess: boolean;
  emergencyButton: boolean;
}

export interface AccessibilityFeatures {
  wheelchairAccess: boolean;
  elevators: boolean;
  disabledSpots: number;
  audioInstructions: boolean;
  brailleSignage: boolean;
}

export interface ServiceFeatures {
  carWash: boolean;
  valet: boolean;
  electricCharging: boolean;
  airPump: boolean;
  restrooms: boolean;
  wifi: boolean;
  shopping: boolean;
}

export interface PaymentFeatures {
  cash: boolean;
  card: boolean;
  mobile: boolean;
  contactless: boolean;
  subscription: boolean;
  prepaid: boolean;
}

export interface TechnologyFeatures {
  app: boolean;
  reservation: boolean;
  realTimeAvailability: boolean;
  digitalPayment: boolean;
  smartParking: boolean;
  licensePlateRecognition: boolean;
}