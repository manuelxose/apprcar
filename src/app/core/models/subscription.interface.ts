// =================== src/app/core/models/subscription.interface.ts ===================
export interface UserSubscription {
  id: string;
  userId: string;
  subscriptionId: string;
  parkingId: string;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  autoRenew: boolean;
  paymentMethodId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}
