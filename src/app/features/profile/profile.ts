// profile.component.ts
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// Shared components - modernized with Tailwind
import { Loading } from '@shared/components/loading/loading';

// Services
import { MockDataService } from '@core/services/mock-data';
import { StorageService } from '@core/services/storage';
import { ParkingService } from '@core/services/parking';

// Models
import { 
  User, 
  Vehicle, 
  ParkingReservation, 
  PaymentMethodDetails,
  PaymentMethod,
  VehicleType,
  ReservationStatus,
  NotificationPreferences
} from '@core/models';

// Interfaces
interface ProfileTab {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

interface UserStats {
  vehicles: number;
  activeReservations: number;
  completedReservations: number;
  totalSpent: number;
}

interface ProfileSection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  action?: () => void;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    Loading
  ],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private mockDataService = inject(MockDataService);
  private storageService = inject(StorageService);
  private parkingService = inject(ParkingService);

  // Reactive state
  user = signal<User | null>(null);
  vehicles = signal<Vehicle[]>([]);  
  reservations = signal<ParkingReservation[]>([]);
  paymentMethods = signal<PaymentMethodDetails[]>([]);
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  activeTab = signal<string>('profile');
  showMenu = signal<boolean>(false);

  // Forms
  profileForm!: FormGroup;
  preferencesForm!: FormGroup;
  notificationsForm!: FormGroup;

  // Computed properties
  userName = computed(() => {
    const user = this.user();
    if (!user) return '';
    return `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
  });

  userInitials = computed(() => {
    const user = this.user();
    if (!user) return 'U';
    const firstName = user.profile?.firstName || '';
    const lastName = user.profile?.lastName || '';
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  });

  userStats = computed<UserStats>(() => ({
    vehicles: this.vehicles().length,
    activeReservations: this.activeReservations().length,
    completedReservations: this.completedReservations().length,
    totalSpent: this.calculateTotalSpent()
  }));

  activeReservations = computed(() => 
    this.reservations().filter(r => 
      r.status === ReservationStatus.ACTIVE || 
      r.status === ReservationStatus.CONFIRMED
    )
  );

  completedReservations = computed(() => 
    this.reservations().filter(r => r.status === ReservationStatus.COMPLETED)
  );

  defaultVehicle = computed(() => 
    this.vehicles().find(v => v.isDefault)
  );

  defaultPaymentMethod = computed(() => 
    this.paymentMethods().find(p => p.isDefault)
  );

  // Tabs configuration
  tabs = computed<ProfileTab[]>(() => [
    { 
      id: 'profile', 
      label: 'Perfil', 
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0z M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    },
    { 
      id: 'vehicles', 
      label: 'Vehículos', 
      icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7z m5 0V5a2 2 0 00-2-2H8a2 2 0 00-2 2v2z',
      count: this.vehicles().length
    },
    { 
      id: 'reservations', 
      label: 'Reservas', 
      icon: 'M8 7V3a1 1 0 012 0v4h4V3a1 1 0 012 0v4h3a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h3z',
      count: this.activeReservations().length
    },
    { 
      id: 'payments', 
      label: 'Pagos', 
      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
      count: this.paymentMethods().length
    },
    { 
      id: 'settings', 
      label: 'Configuración', 
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
    }
  ]);

  // Profile sections for quick actions
  profileSections = computed<ProfileSection[]>(() => [
    {
      id: 'personal-info',
      title: 'Información personal',
      subtitle: 'Nombre, email, teléfono',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0z M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      action: () => this.setActiveTab('profile')
    },
    {
      id: 'vehicles',
      title: 'Mis vehículos',
      subtitle: `${this.vehicles().length} vehículos registrados`,
      icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7z',
      action: () => this.setActiveTab('vehicles')
    },
    {
      id: 'payment-methods',
      title: 'Métodos de pago',
      subtitle: `${this.paymentMethods().length} métodos guardados`,
      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
      action: () => this.setActiveTab('payments')
    },
    {
      id: 'preferences',
      title: 'Preferencias',
      subtitle: 'Notificaciones y privacidad',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      action: () => this.setActiveTab('settings')
    }
  ]);

  // Vehicle types for forms
  readonly vehicleTypes = [
    { value: VehicleType.CAR, label: 'Coche' },
    { value: VehicleType.MOTORCYCLE, label: 'Moto' },
    { value: VehicleType.ELECTRIC, label: 'Coche eléctrico' },
    { value: VehicleType.TRUCK, label: 'Furgoneta' },
    { value: VehicleType.VAN, label: 'Furgoneta' },
    { value: VehicleType.HYBRID, label: 'Híbrido' },
    { value: VehicleType.BICYCLE, label: 'Bicicleta' }
  ];

  ngOnInit(): void {
    this.initializeForms();
    this.loadUserData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Initialization
  private initializeForms(): void {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      language: ['es'],
      timezone: ['Europe/Madrid']
    });

    this.notificationsForm = this.fb.group({
      emailNotifications: [true],
      pushNotifications: [true],
      smsNotifications: [false],
      reservationReminders: [true],
      promotions: [false],
      parkingUpdates: [true]
    });

    this.preferencesForm = this.fb.group({
      defaultRadius: [1000],
      autoLocation: [true],
      shareLocation: [true],
      shareActivity: [false],
      allowAnalytics: [true],
      allowMarketing: [false],
      highContrast: [false],
      largeText: [false],
      screenReader: [false],
      reducedMotion: [false]
    });
  }

  private async loadUserData(): Promise<void> {
    try {
      this.loading.set(true);

      // Load user data
      const userData = await this.mockDataService.getMockUser().toPromise();
      if (userData) {
        this.user.set(userData);
        this.populateForms(userData);
        
        // Load related data
        await Promise.all([
          this.loadVehicles(userData.id),
          this.loadReservations(userData.id),
          this.loadPaymentMethods(userData.id)
        ]);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private populateForms(user: User): void {
    this.profileForm.patchValue({
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      email: user.email,
      phone: user.profile?.phone || '',
      language: user.profile?.language || 'es',
      timezone: user.profile?.timezone || 'Europe/Madrid'
    });

    if (user.preferences?.notifications) {
      this.notificationsForm.patchValue(user.preferences.notifications);
    }

    if (user.preferences) {
      this.preferencesForm.patchValue({
        defaultRadius: user.preferences.search?.defaultRadius || 1000,
        autoLocation: user.preferences.search?.autoLocation || true,
        shareLocation: user.preferences.privacy?.shareLocation || true,
        shareActivity: user.preferences.privacy?.shareActivity || false,
        allowAnalytics: user.preferences.privacy?.allowAnalytics || true,
        allowMarketing: user.preferences.privacy?.allowMarketing || false,
        highContrast: user.preferences.accessibility?.highContrast || false,
        largeText: user.preferences.accessibility?.largeText || false,
        screenReader: user.preferences.accessibility?.screenReader || false,
        reducedMotion: user.preferences.accessibility?.reducedMotion || false
      });
    }
  }

  private async loadVehicles(userId: string): Promise<void> {
    try {
      const vehicles = await this.mockDataService.getMockVehicles().toPromise();
      if (vehicles) {
        const userVehicles = vehicles.filter(v => this.user()?.vehicles?.includes(v.id));
        this.vehicles.set(userVehicles);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  }

  private async loadReservations(userId: string): Promise<void> {
    try {
      const reservations = await this.mockDataService.getMockReservations().toPromise();
      if (reservations) {
        const userReservations = reservations.filter(r => r.userId === userId);
        this.reservations.set(userReservations);
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
    }
  }

  private async loadPaymentMethods(userId: string): Promise<void> {
    try {
      // Mock payment methods data
      const mockPaymentMethods: PaymentMethodDetails[] = [
        {
          id: '1',
          userId: userId,
          type: PaymentMethod.CREDIT_CARD,
          name: 'Tarjeta Visa terminada en 4242',
          details: {
            lastFourDigits: '4242',
            brand: 'visa' as any,
            expiryMonth: 12,
            expiryYear: 2025,
            holderName: 'Usuario Ejemplo'
          },
          isDefault: true,
          isActive: true,
          createdAt: new Date('2023-01-15'),
          updatedAt: new Date('2023-01-15')
        },
        {
          id: '2',
          userId: userId,
          type: PaymentMethod.DIGITAL_WALLET,
          name: 'PayPal',
          details: {
            provider: 'paypal' as any,
            accountId: this.user()?.email || ''
          },
          isDefault: false,
          isActive: true,
          createdAt: new Date('2023-02-20'),
          updatedAt: new Date('2023-02-20')
        }
      ];
      
      this.paymentMethods.set(mockPaymentMethods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  }

  // Event handlers
  setActiveTab(tabId: string): void {
    this.activeTab.set(tabId);
  }

  toggleMenu(): void {
    this.showMenu.update(show => !show);
  }

  closeMenu(): void {
    this.showMenu.set(false);
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.saving.set(true);

    try {
      const formData = this.profileForm.value;
      await this.simulateApiCall(1000);

      const currentUser = this.user()!;
      const updatedUser: User = {
        ...currentUser,
        email: formData.email,
        profile: {
          ...currentUser.profile,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          language: formData.language,
          timezone: formData.timezone
        },
        updatedAt: new Date()
      };

      this.user.set(updatedUser);
      this.showSuccessMessage('Perfil actualizado correctamente');

    } catch (error) {
      this.showErrorMessage('Error al guardar el perfil');
    } finally {
      this.saving.set(false);
    }
  }

  async saveNotifications(): Promise<void> {
    if (this.notificationsForm.invalid) return;

    this.saving.set(true);

    try {
      const formData = this.notificationsForm.value;
      await this.simulateApiCall(800);

      const currentUser = this.user()!;
      const updatedUser: User = {
        ...currentUser,
        preferences: {
          ...currentUser.preferences,
          notifications: {
            ...currentUser.preferences?.notifications,
            ...formData
          }
        },
        updatedAt: new Date()
      };

      this.user.set(updatedUser);
      this.showSuccessMessage('Preferencias de notificaciones guardadas');

    } catch (error) {
      this.showErrorMessage('Error al guardar las preferencias');
    } finally {
      this.saving.set(false);
    }
  }

  async savePreferences(): Promise<void> {
    if (this.preferencesForm.invalid) return;

    this.saving.set(true);

    try {
      const formData = this.preferencesForm.value;
      await this.simulateApiCall(800);

      const currentUser = this.user()!;
      const updatedUser: User = {
        ...currentUser,
        preferences: {
          ...currentUser.preferences,
          search: {
            defaultRadius: formData.defaultRadius,
            autoLocation: formData.autoLocation,
            preferredSortBy: currentUser.preferences?.search?.preferredSortBy || 'distance' as any,
            savedLocations: currentUser.preferences?.search?.savedLocations || [],
            quickFilters: currentUser.preferences?.search?.quickFilters || {}
          },
          privacy: {
            shareLocation: formData.shareLocation,
            shareActivity: formData.shareActivity,
            allowAnalytics: formData.allowAnalytics,
            allowMarketing: formData.allowMarketing,
            dataRetention: currentUser.preferences?.privacy?.dataRetention || 'two_years' as any
          },
          accessibility: {
            highContrast: formData.highContrast,
            largeText: formData.largeText,
            screenReader: formData.screenReader,
            voiceNavigation: false,
            reducedMotion: formData.reducedMotion
          }
        },
        updatedAt: new Date()
      };

      this.user.set(updatedUser);
      this.storageService.setItem('user_preferences', updatedUser.preferences);
      this.showSuccessMessage('Configuración guardada correctamente');

    } catch (error) {
      this.showErrorMessage('Error al guardar la configuración');
    } finally {
      this.saving.set(false);
    }
  }

  addVehicle(): void {
    // TODO: Implement add vehicle functionality
    this.showInfoMessage('Función de añadir vehículo próximamente');
  }

  editVehicle(vehicle: Vehicle): void {
    // TODO: Implement edit vehicle functionality
    this.showInfoMessage(`Editar ${vehicle.make} ${vehicle.model} próximamente`);
  }

  removeVehicle(vehicle: Vehicle): void {
    // TODO: Implement remove vehicle functionality
    this.showInfoMessage(`Eliminar ${vehicle.make} ${vehicle.model} próximamente`);
  }

  addPaymentMethod(): void {
    // TODO: Implement add payment method functionality
    this.showInfoMessage('Función de añadir método de pago próximamente');
  }

  removePaymentMethod(paymentMethod: PaymentMethodDetails): void {
    // TODO: Implement remove payment method functionality
    this.showInfoMessage('Función de eliminar método de pago próximamente');
  }

  exportData(): void {
    const userData = {
      user: this.user(),
      vehicles: this.vehicles(),
      reservations: this.reservations(),
      paymentMethods: this.paymentMethods()
    };
    
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apparcar-data-${new Date().getTime()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    this.showSuccessMessage('Datos exportados correctamente');
  }

  logout(): void {
    // TODO: Implement logout functionality
    this.showInfoMessage('Cerrando sesión...');
  }

  deleteAccount(): void {
    // TODO: Implement account deletion with confirmation
    this.showErrorMessage('Esta acción requiere confirmación adicional');
  }

  // Utility methods
  private calculateTotalSpent(): number {
    return this.completedReservations()
      .reduce((total, reservation) => total + (reservation.estimatedPrice || 0), 0);
  }

  private async simulateApiCall(delay: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private showSuccessMessage(message: string): void {
    // TODO: Implement toast notification
    console.log('✅', message);
  }

  private showErrorMessage(message: string): void {
    // TODO: Implement toast notification
    console.log('❌', message);
  }

  private showInfoMessage(message: string): void {
    // TODO: Implement toast notification
    console.log('ℹ️', message);
  }

  // Template helper methods
  getVehicleTypeLabel(type: VehicleType): string {
    const typeMap: Record<VehicleType, string> = {
      [VehicleType.CAR]: 'Coche',
      [VehicleType.MOTORCYCLE]: 'Moto',
      [VehicleType.ELECTRIC]: 'Coche eléctrico',
      [VehicleType.TRUCK]: 'Furgoneta',
      [VehicleType.BICYCLE]: 'Bicicleta',
      [VehicleType.VAN]: 'Furgoneta',
      [VehicleType.HYBRID]: 'Híbrido'
    };
    return typeMap[type] || type;
  }

  getReservationStatusLabel(status: ReservationStatus): string {
    const statusMap: Record<ReservationStatus, string> = {
      [ReservationStatus.PENDING]: 'Pendiente',
      [ReservationStatus.CONFIRMED]: 'Confirmada',
      [ReservationStatus.ACTIVE]: 'Activa',
      [ReservationStatus.COMPLETED]: 'Completada',
      [ReservationStatus.CANCELLED]: 'Cancelada',
      [ReservationStatus.NO_SHOW]: 'No presentado',
      [ReservationStatus.EXPIRED]: 'Expirada'
    };
    return statusMap[status] || status;
  }

  getReservationStatusColor(status: ReservationStatus): string {
    const colorMap: Record<ReservationStatus, string> = {
      [ReservationStatus.PENDING]: 'text-amber-600 bg-amber-50',
      [ReservationStatus.CONFIRMED]: 'text-blue-600 bg-blue-50',
      [ReservationStatus.ACTIVE]: 'text-green-600 bg-green-50',
      [ReservationStatus.COMPLETED]: 'text-gray-600 bg-gray-50',
      [ReservationStatus.CANCELLED]: 'text-red-600 bg-red-50',
      [ReservationStatus.NO_SHOW]: 'text-orange-600 bg-orange-50',
      [ReservationStatus.EXPIRED]: 'text-gray-600 bg-gray-50'
    };
    return colorMap[status] || 'text-gray-600 bg-gray-50';
  }

  getPaymentMethodIcon(method: PaymentMethodDetails): string {
    if (method.type === PaymentMethod.CREDIT_CARD || method.type === PaymentMethod.DEBIT_CARD) {
      return 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z';
    }
    return 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1';
  }

  trackByTabId(index: number, tab: ProfileTab): string {
    return tab.id;
  }

  trackBySectionId(index: number, section: ProfileSection): string {
    return section.id;
  }

  trackByVehicleId(index: number, vehicle: Vehicle): string {
    return vehicle.id;
  }

  trackByReservationId(index: number, reservation: ParkingReservation): string {
    return reservation.id;
  }

  trackByPaymentId(index: number, payment: PaymentMethodDetails): string {
    return payment.id;
  }
}