import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';

// Store
import { Store } from '@ngrx/store';

// Servicios
import { GeolocationService } from '@core/services/geolocation.service';
import { NotificationService } from '@core/services/notification.service';

// Interfaces
import { UserLocation, PlazaNotificationData, PlazaType, PlazaAvailability } from '@shared/interfaces';

@Component({
  selector: 'app-notify-plaza-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './notify-plaza-modal.component.html',
  styleUrls: ['./notify-plaza-modal.component.scss']
})
export class NotifyPlazaModalComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly geolocationService = inject(GeolocationService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  // Inputs y Outputs
  @Input() isOpen = false;
  @Input() userLocation: UserLocation | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<PlazaNotificationData>();

  // Signals
  currentStep = signal<'location' | 'details' | 'confirmation'>('location');
  selectedLocation = signal<UserLocation | null>(null);
  estimatedArrival = signal<Date | null>(null);
  isSubmitting = signal(false);

  // Store selectors - simplified
  userProfile = signal<any>(null);
  nearbyPlazas = signal<any[]>([]);
  loading = signal(false);

  // Form
  plazaForm: FormGroup;

  // Computed values
  canProceed = computed(() => {
    const step = this.currentStep();
    switch (step) {
      case 'location':
        return this.selectedLocation() !== null;
      case 'details':
        return this.plazaForm.valid;
      case 'confirmation':
        return true;
      default:
        return false;
    }
  });

  hasNearbyPlazas = computed(() => {
    const plazas = this.nearbyPlazas();
    return Array.isArray(plazas) && plazas.length > 0;
  });

  // Opciones del formulario
  plazaTypes: { value: PlazaType; label: string; icon: string }[] = [
    { value: 'street', label: 'Calle', icon: '🛣️' },
    { value: 'parking_lot', label: 'Parking', icon: '🅿️' },
    { value: 'private', label: 'Privado', icon: '🏠' },
    { value: 'commercial', label: 'Centro Comercial', icon: '🏬' }
  ];

  availabilityOptions: { value: PlazaAvailability; label: string; description: string }[] = [
    { 
      value: 'immediate', 
      label: 'Inmediato', 
      description: 'Salgo ahora mismo' 
    },
    { 
      value: 'soon', 
      label: 'Pronto', 
      description: 'En 5-15 minutos' 
    },
    { 
      value: 'scheduled', 
      label: 'Programado', 
      description: 'A una hora específica' 
    }
  ];

  constructor() {
    this.plazaForm = this.fb.group({
      type: ['street', Validators.required],
      availability: ['immediate', Validators.required],
      scheduledTime: [null],
      description: ['', [Validators.maxLength(200)]],
      isAccessible: [false],
      hasMeter: [false],
      estimatedDuration: [30, [Validators.min(5), Validators.max(480)]],
      price: [null, [Validators.min(0)]],
      contact: ['', [Validators.maxLength(100)]]
    });

    // Reactivity para disponibilidad programada
    this.plazaForm.get('availability')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        const scheduledTimeControl = this.plazaForm.get('scheduledTime');
        if (value === 'scheduled') {
          scheduledTimeControl?.setValidators([Validators.required]);
        } else {
          scheduledTimeControl?.clearValidators();
          scheduledTimeControl?.setValue(null);
        }
        scheduledTimeControl?.updateValueAndValidity();
      });
  }

  ngOnInit() {
    // Inicializar con ubicación actual si está disponible
    if (this.userLocation) {
      this.selectedLocation.set(this.userLocation);
      this.currentStep.set('details');
    }

    // Cargar plazas cercanas - simplified for now
    if (this.userLocation) {
      // TODO: Load nearby plazas when store is available
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Navegación del modal
  nextStep() {
    const currentStep = this.currentStep();
    
    switch (currentStep) {
      case 'location':
        if (this.selectedLocation()) {
          this.currentStep.set('details');
        }
        break;
      case 'details':
        if (this.plazaForm.valid) {
          this.calculateEstimatedArrival();
          this.currentStep.set('confirmation');
        }
        break;
    }
  }

  previousStep() {
    const currentStep = this.currentStep();
    
    switch (currentStep) {
      case 'details':
        this.currentStep.set('location');
        break;
      case 'confirmation':
        this.currentStep.set('details');
        break;
    }
  }

  // Gestión de ubicación
  async useCurrentLocation() {
    try {
      this.geolocationService.getCurrentPosition().subscribe({
        next: (location: UserLocation) => {
          this.selectedLocation.set(location);
          this.nextStep();
        },
        error: (error: any) => {
          this.notificationService.showError('No se pudo obtener la ubicación actual');
        }
      });
    } catch (error) {
      this.notificationService.showError('No se pudo obtener la ubicación actual');
    }
  }

  selectLocationFromMap(location: UserLocation) {
    this.selectedLocation.set(location);
  }

  // Cálculo de tiempo estimado
  private calculateEstimatedArrival() {
    const availability = this.plazaForm.get('availability')?.value;
    const scheduledTime = this.plazaForm.get('scheduledTime')?.value;
    
    let arrivalTime: Date;
    
    switch (availability) {
      case 'immediate':
        arrivalTime = new Date();
        break;
      case 'soon':
        arrivalTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
        break;
      case 'scheduled':
        arrivalTime = new Date(scheduledTime);
        break;
      default:
        arrivalTime = new Date();
    }
    
    this.estimatedArrival.set(arrivalTime);
  }

  // Envío del formulario
  async onSubmit() {
    if (!this.canProceed() || !this.selectedLocation()) {
      return;
    }

    this.isSubmitting.set(true);

    try {
      const formValue = this.plazaForm.value;
      const location = this.selectedLocation()!;
      
      const notificationData: PlazaNotificationData = {
        location,
        type: formValue.type,
        availability: formValue.availability,
        scheduledTime: formValue.scheduledTime,
        description: formValue.description,
        isAccessible: formValue.isAccessible,
        hasMeter: formValue.hasMeter,
        estimatedDuration: formValue.estimatedDuration,
        price: formValue.price,
        contact: formValue.contact,
        estimatedArrival: this.estimatedArrival()
      };

      this.confirm.emit(notificationData);
      this.resetModal();
      this.closeModal();

    } catch (error) {
      this.notificationService.showError('Error al procesar la notificación');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Gestión del modal
  closeModal() {
    this.resetModal();
    this.close.emit();
  }

  private resetModal() {
    this.currentStep.set('location');
    this.selectedLocation.set(null);
    this.estimatedArrival.set(null);
    this.isSubmitting.set(false);
    this.plazaForm.reset({
      type: 'street',
      availability: 'immediate',
      estimatedDuration: 30,
      isAccessible: false,
      hasMeter: false
    });
  }

  // Utilidades
  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 'location':
        return 'Seleccionar Ubicación';
      case 'details':
        return 'Detalles de la Plaza';
      case 'confirmation':
        return 'Confirmar Notificación';
      default:
        return '';
    }
  }

  getProgressPercentage(): number {
    switch (this.currentStep()) {
      case 'location':
        return 33;
      case 'details':
        return 66;
      case 'confirmation':
        return 100;
      default:
        return 0;
    }
  }

  // Helper methods for template
  getMinDateTime(): string {
    return new Date().toISOString().slice(0, 16);
  }

  getSelectedPlazaTypeLabel(): string {
    const selectedType = this.plazaForm.get('type')?.value;
    return this.plazaTypes.find(t => t.value === selectedType)?.label || '';
  }

  getSelectedAvailabilityLabel(): string {
    const selectedAvailability = this.plazaForm.get('availability')?.value;
    return this.availabilityOptions.find(a => a.value === selectedAvailability)?.label || '';
  }

  getNearbyPlazasCount(): number {
    return this.nearbyPlazas().length;
  }
}
