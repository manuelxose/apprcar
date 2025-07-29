// =================== src/app/core/models/payment.interface.ts ===================
export interface PaymentInfo {
  method: PaymentMethod;
  transactionId?: string;
  amount: number;
  currency: string;
  paidAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
}

export interface PaymentMethodDetails {
  id: string;
  userId: string;
  type: PaymentMethod;
  name: string;
  details: CardDetails | DigitalWalletDetails | BankDetails;
  isDefault: boolean;
  isActive: boolean;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardDetails {
  lastFourDigits: string;
  brand: CardBrand;
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
}

export interface DigitalWalletDetails {
  provider: DigitalWalletProvider;
  accountId: string;
}

export interface BankDetails {
  bankName: string;
  accountType: BankAccountType;
  lastFourDigits: string;
}

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  MOBILE_PAYMENT = 'mobile_payment',
  DIGITAL_WALLET = 'digital_wallet',
  SUBSCRIPTION = 'subscription',
  PREPAID = 'prepaid'
}

export enum CardBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMERICAN_EXPRESS = 'amex',
  DISCOVER = 'discover',
  OTHER = 'other'
}

export enum DigitalWalletProvider {
  PAYPAL = 'paypal',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  SAMSUNG_PAY = 'samsung_pay'
}

export enum BankAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings'
}
