import { Component, Input, Output, EventEmitter, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

// Servicios
import { NotificationService } from '@core/services/notification.service';

// Modelos
import { 
  Parking, 
  ParkingReservation,
  VehicleType,
  PaymentMethod,
  PriceRate,
  LocationData 
} from '@core/models';

export interface BookingStep {
  id: 'time' | 'vehicle' | 'payment';
  title: string;
  completed: boolean;
}

@Component({
  selector: 'app-parking-booking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './parking-booking.html',
  styleUrls: ['./parking-booking.scss']
})
export class ParkingBookingComponent implements OnInit {
  @Input() parking!: Parking;
  @Input() userLocation: LocationData | null = null;
  @Output() reservationComplete = new EventEmitter<ParkingReservation>();

  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  // Signals
  currentStep = signal<number>(0);
  isLoading = signal(false);
  selectedRate = signal<PriceRate | null>(null);
  estimatedPrice = signal(0);
  showCardFields = signal(true);

  // Formularios
  timeForm!: FormGroup;
  vehicleForm!: FormGroup;
  paymentForm!: FormGroup;

  // Computed
  steps = signal<BookingStep[]>([
    { id: 'time', title: 'Fecha y hora', completed: false },
    { id: 'vehicle', title: 'Vehículo', completed: false },
    { id: 'payment', title: 'Pago', completed: false }
  ]);

  canProceedToNext = computed(() => {
    const step = this.currentStep();
    switch (step) {
      case 0: return this.timeForm?.valid && this.estimatedPrice() >= 0;
      case 1: return this.vehicleForm?.valid;
      case 2: return this.paymentForm?.valid;
      default: return false;
    }
  });

  canCompleteBooking = computed(() => {
    return this.timeForm?.valid && 
           this.vehicleForm?.valid && 
           this.paymentForm?.valid &&
           this.estimatedPrice() >= 0 &&
           this.parking.capacity.available > 0;
  });

  durationText = computed(() => {
    if (!this.timeForm?.valid) return '';
    
    const formValue = this.timeForm.value;
    if (!formValue.startDate || !formValue.startTime || !formValue.endDate || !formValue.endTime) {
      return '';
    }

    const startDateTime = this.combineDateTime(formValue.startDate, formValue.startTime);
    const endDateTime = this.combineDateTime(formValue.endDate, formValue.endTime);
    const durationMinutes = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60);
    
    if (durationMinutes <= 0) return 'Tiempo inválido';
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = Math.floor(durationMinutes % 60);
    
    if (hours === 0) return `${minutes} minutos`;
    if (minutes === 0) return `${hours} hora${hours > 1 ? 's' : ''}`;
    return `${hours}h ${minutes}min`;
  });

  // Opciones
  vehicleTypes = [
    { value: VehicleType.CAR, label: 'Coche', icon: '🚗' },
    { value: VehicleType.MOTORCYCLE, label: 'Motocicleta', icon: '🏍️' },
    { value: VehicleType.VAN, label: 'Furgoneta', icon: '🚐' },
    { value: VehicleType.ELECTRIC, label: 'Eléctrico', icon: '⚡' }
  ];

  paymentMethods = [
    { value: PaymentMethod.CREDIT_CARD, label: 'Tarjeta de crédito', icon: '💳' },
    { value: PaymentMethod.MOBILE_PAYMENT, label: 'Pago móvil', icon: '📱' },
    { value: PaymentMethod.DIGITAL_WALLET, label: 'Cartera digital', icon: '💰' }
  ];

  ngOnInit(): void {
    this.initializeForms();
    this.setupFormValidation();
  }

  private initializeForms(): void {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Formulario de tiempo
    this.timeForm = this.fb.group({
      startDate: [this.formatDate(now), Validators.required],
      startTime: [this.formatTime(now), Validators.required],
      endDate: [this.formatDate(twoHoursLater), Validators.required],
      endTime: [this.formatTime(twoHoursLater), Validators.required],
      rateType: ['', Validators.required]
    });

    // Formulario de vehículo
    this.vehicleForm = this.fb.group({
      licensePlate: ['', [Validators.required, Validators.pattern(/^[A-Z0-9\s-]{6,10}$/)]],
      vehicleType: [VehicleType.CAR, Validators.required],
      make: [''],
      model: [''],
      color: ['']
    });

    // Formulario de pago
    this.paymentForm = this.fb.group({
      paymentMethod: [PaymentMethod.CREDIT_CARD, Validators.required],
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      expiryDate: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      cardholder: ['', Validators.required],
      saveCard: [false]
    });
  }

  private setupFormValidation(): void {
    // Recalcular precio cuando cambie el tiempo o la tarifa
    this.timeForm.valueChanges.subscribe(() => {
      this.calculatePrice();
    });

    // Mostrar/ocultar campos de tarjeta según método de pago
    this.paymentForm.get('paymentMethod')?.valueChanges.subscribe(method => {
      const cardFields = ['cardNumber', 'expiryDate', 'cvv', 'cardholder'];
      const isCardPayment = method === PaymentMethod.CREDIT_CARD;
      
      this.showCardFields.set(isCardPayment);
      
      if (isCardPayment) {
        cardFields.forEach(field => {
          this.paymentForm.get(field)?.setValidators([Validators.required]);
        });
        // Añadir validadores específicos
        this.paymentForm.get('cardNumber')?.setValidators([
          Validators.required, 
          Validators.pattern(/^\d{16}$/)
        ]);
        this.paymentForm.get('expiryDate')?.setValidators([
          Validators.required, 
          Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)
        ]);
        this.paymentForm.get('cvv')?.setValidators([
          Validators.required, 
          Validators.pattern(/^\d{3,4}$/)
        ]);
      } else {
        cardFields.forEach(field => {
          this.paymentForm.get(field)?.clearValidators();
        });
      }
      
      cardFields.forEach(field => {
        this.paymentForm.get(field)?.updateValueAndValidity();
      });
    });
  }

  private calculatePrice(): void {
    const formValue = this.timeForm.value;
    if (!formValue.startDate || !formValue.startTime || !formValue.endDate || !formValue.endTime) {
      this.estimatedPrice.set(0);
      return;
    }

    const startDateTime = this.combineDateTime(formValue.startDate, formValue.startTime);
    const endDateTime = this.combineDateTime(formValue.endDate, formValue.endTime);
    const durationMinutes = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60);
    
    if (durationMinutes <= 0) {
      this.estimatedPrice.set(0);
      return;
    }

    const selectedRateId = formValue.rateType;
    const rate = this.getAvailableRates().find(r => r.id === selectedRateId);
    
    if (!rate) {
      this.estimatedPrice.set(0);
      this.selectedRate.set(null);
      return;
    }

    this.selectedRate.set(rate);

    let totalPrice = 0;

    switch (rate.type) {
      case 'hourly':
        const hours = Math.ceil(durationMinutes / 60);
        totalPrice = hours * rate.price;
        break;
      case 'daily':
        const days = Math.ceil(durationMinutes / (24 * 60));
        totalPrice = days * rate.price;
        break;
      case 'minute':
        totalPrice = durationMinutes * rate.price;
        break;
      default:
        totalPrice = rate.price;
    }

    // Aplicar tiempo gratuito si existe
    if (this.parking.pricing?.freeMinutes && durationMinutes <= this.parking.pricing.freeMinutes) {
      totalPrice = 0;
    }

    this.estimatedPrice.set(Math.max(0, totalPrice));
  }

  // Métodos públicos para navegación
  goToNextStep(): void {
    const current = this.currentStep();
    if (current < this.steps().length - 1 && this.canProceedToNext()) {
      // Marcar step actual como completado
      this.steps.update(steps => {
        steps[current].completed = true;
        return [...steps];
      });
      
      this.currentStep.set(current + 1);
    }
  }

  goToPreviousStep(): void {
    const current = this.currentStep();
    if (current > 0) {
      this.currentStep.set(current - 1);
    }
  }

  goToStep(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex < this.steps().length) {
      this.currentStep.set(stepIndex);
    }
  }

  async submitReservation(): Promise<void> {
    if (!this.canCompleteBooking()) return;

    this.isLoading.set(true);

    try {
      // Simular llamada API
      await this.delay(2000);

      const timeValue = this.timeForm.value;
      const vehicleValue = this.vehicleForm.value;
      const paymentValue = this.paymentForm.value;

      const reservation: ParkingReservation = {
        id: 'res-' + Date.now(),
        userId: 'user-001', // En una app real, esto vendría del servicio de autenticación
        parkingId: this.parking.id,
        startTime: this.combineDateTime(timeValue.startDate, timeValue.startTime),
        endTime: this.combineDateTime(timeValue.endDate, timeValue.endTime),
        estimatedPrice: this.estimatedPrice(),
        status: 'confirmed' as any,
        vehicleInfo: {
          licensePlate: vehicleValue.licensePlate,
          make: vehicleValue.make,
          model: vehicleValue.model,
          color: vehicleValue.color,
          type: vehicleValue.vehicleType
        },
        paymentInfo: {
          method: paymentValue.paymentMethod,
          amount: this.estimatedPrice(),
          currency: 'EUR',
          paidAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: `Reserva realizada desde la app móvil`
      };

      this.reservationComplete.emit(reservation);
      this.notificationService.showSuccess(
        'Tu reserva ha sido procesada exitosamente',
        '¡Reserva completada!'
      );

    } catch (error) {
      console.error('Error creating reservation:', error);
      this.notificationService.showError(
        'No se pudo procesar tu reserva. Inténtalo de nuevo.',
        'Error en la reserva'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  // Métodos auxiliares
  getAvailableRates(): PriceRate[] {
    return this.parking.pricing?.rates || [];
  }

  getRateLabel(rate: PriceRate): string {
    const unit = this.getRateUnit(rate.type);
    return `${rate.name} - €${rate.price.toFixed(2)}/${unit}`;
  }

  private getRateUnit(type: string): string {
    const units: { [key: string]: string } = {
      hourly: 'h',
      daily: 'día',
      monthly: 'mes',
      minute: 'min'
    };
    return units[type] || type;
  }

  private combineDateTime(date: string, time: string): Date {
    const dateObj = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    dateObj.setHours(hours, minutes, 0, 0);
    return dateObj;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Getters para template
  get currentStepData() {
    return this.steps()[this.currentStep()];
  }

  get isLastStep() {
    return this.currentStep() === this.steps().length - 1;
  }

  get isFirstStep() {
    return this.currentStep() === 0;
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) return 'Este campo es obligatorio';
    if (field.errors['pattern']) {
      switch (fieldName) {
        case 'licensePlate': return 'Formato de matrícula inválido';
        case 'cardNumber': return 'Número de tarjeta inválido';
        case 'expiryDate': return 'Formato: MM/YY';
        case 'cvv': return 'CVV inválido';
        default: return 'Formato inválido';
      }
    }

    return 'Error en el campo';
  }
}