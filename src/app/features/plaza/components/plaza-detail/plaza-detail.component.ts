// Plaza Detail Component - Funcional
import { Component, Input, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, combineLatest } from 'rxjs';

// Core services
import { PlazaService } from '@core/services/plaza.service';
import { PlazaChatIntegrationService } from '@core/services/plaza-chat-integration.service';
import { AuthService } from '@core/services/auth.service';

// Models
import { PlazaLibre, User, SortOption, DataRetentionOption } from '@core/models';

interface ReportForm {
  issueType: string;
  description: string;
}

@Component({
  selector: 'app-plaza-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plaza-detail.component.html',
  styleUrls: ['./plaza-detail.component.scss']
})
export class PlazaDetailComponent implements OnInit, OnDestroy {
  @Input() plazaId!: string;
  
  // Services
  private plazaService = inject(PlazaService);
  private plazaChatIntegration = inject(PlazaChatIntegrationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  // Signals
  plaza = signal<PlazaLibre | null>(null);
  currentUser = signal<User | null>(null);
  isLoading = signal(false);
  hasActiveChat = signal(false);
  unreadMessages = signal(0);
  
  // State
  isPlazaClaimed = signal(false);
  isAtPlaza = signal(false);
  estimatedArrival = signal(5);
  showReportModal = signal(false);
  
  // Report form
  reportForm: ReportForm = {
    issueType: 'not_available',
    description: ''
  };
  
  // Cleanup
  private destroy$ = new Subject<void>();
  
  // Computed properties
  statusClass = computed(() => {
    const status = this.plaza()?.status;
    return `status-${status}`;
  });

  ngOnInit(): void {
    this.loadPlazaData();
    this.loadUserData();
    this.checkChatStatus();
    this.subscribeToPlazaUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Data Loading
  private loadPlazaData(): void {
    if (!this.plazaId) return;
    
    this.isLoading.set(true);
    
    // En un entorno real, esto cargaría desde un servicio
    // Por ahora simulamos con datos mock
    setTimeout(() => {
      const mockPlaza: PlazaLibre = {
        id: this.plazaId,
        createdBy: 'user-456',
        location: {
          latitude: 40.4168,
          longitude: -3.7038,
          address: 'Calle Mayor, 123, Madrid',
          description: 'Cerca del metro'
        },
        status: 'available',
        details: {
          size: 'medium',
          description: 'Plaza amplia, fácil acceso',
          isPaid: true,
          price: 2.5,
          restrictions: 'No caravanas',
          estimatedDuration: 60
        },
        availability: {
          availableFrom: new Date().toISOString(),
          availableUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          isImmediate: true
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        distance: 150,
        score: 85
      };
      
      this.plaza.set(mockPlaza);
      this.isLoading.set(false);
      
      // Check if user has claimed this plaza
      this.checkPlazaClaimStatus();
    }, 500);
  }

  private loadUserData(): void {
    // En un entorno real, obtener del AuthService
    const mockUser: User = {
      id: 'current-user-123',
      email: 'user@example.com',
      profile: {
        firstName: 'Juan',
        lastName: 'Pérez',
        avatar: 'https://via.placeholder.com/100',
        language: 'es',
        timezone: 'Europe/Madrid'
      },
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: false,
          reservationReminders: true,
          promotions: false,
          parkingUpdates: true,
          newsletter: false
        },
        search: {
          defaultRadius: 1000,
          preferredSortBy: SortOption.DISTANCE,
          autoLocation: true,
          savedLocations: [],
          quickFilters: {
            maxPrice: 10,
            features: {
              electricCharging: false,
              wheelchairAccess: false,
              security: true,
              covered: false,
              valet: false,
              carWash: false
            },
            availability: true
          }
        },
        privacy: {
          shareLocation: true,
          shareActivity: false,
          allowAnalytics: true,
          allowMarketing: false,
          dataRetention: DataRetentionOption.ONE_YEAR
        },
        accessibility: {
          highContrast: false,
          largeText: false,
          screenReader: false,
          voiceNavigation: false,
          reducedMotion: false
        }
      },
      vehicles: [],
      favorites: [],
      reservations: [],
      subscriptions: [],
      paymentMethods: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      isActive: true,
      verificationStatus: {
        email: true,
        phone: false,
        identity: false,
        paymentMethod: true
      }
    };
    
    this.currentUser.set(mockUser);
  }

  private checkChatStatus(): void {
    this.plazaChatIntegration.hasActivePlazaChat(this.plazaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(hasChat => {
        this.hasActiveChat.set(hasChat);
        
        if (hasChat) {
          // Simular mensajes no leídos
          this.unreadMessages.set(Math.floor(Math.random() * 5));
        }
      });
  }

  private checkPlazaClaimStatus(): void {
    const plaza = this.plaza();
    const currentUser = this.currentUser();
    
    if (plaza && currentUser) {
      this.isPlazaClaimed.set(plaza.claimedBy === currentUser.id);
      // Simular si el usuario está en la plaza
      this.isAtPlaza.set(false);
    }
  }

  private subscribeToPlazaUpdates(): void {
    // En un entorno real, esto se suscribiría a actualizaciones en tiempo real
    // Por ahora, simulamos actualizaciones periódicas
  }

  // Actions
  async claimPlaza(): Promise<void> {
    const currentUser = this.currentUser();
    if (!currentUser || this.isLoading()) return;

    this.isLoading.set(true);
    
    try {
      // Usar el servicio integrado que crea el chat automáticamente
      await this.plazaService.claimParkingSpotWithChat(this.plazaId, currentUser).toPromise();
      
      // Actualizar estado local
      this.isPlazaClaimed.set(true);
      this.hasActiveChat.set(true);
      
      // Actualizar la plaza
      const plaza = this.plaza();
      if (plaza) {
        plaza.status = 'claimed';
        plaza.claimedBy = currentUser.id;
        plaza.claimedAt = new Date().toISOString();
        this.plaza.set({ ...plaza });
      }
      
      console.log('Plaza reclamada y chat creado automáticamente');
      
    } catch (error) {
      console.error('Error reclamando plaza:', error);
      alert('Error al reclamar la plaza. Inténtalo de nuevo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  openPlazaChat(): void {
    this.plazaChatIntegration.navigateToPlazaChat(this.plazaId);
    this.unreadMessages.set(0); // Reset unread count
  }

  sendQuickMessage(message: string): void {
    // En un entorno real, esto enviaría el mensaje a través del servicio de chat
    console.log(`Enviando mensaje rápido: ${message}`);
    this.plazaChatIntegration.sendArrivalNotification(this.plazaId, this.currentUser()?.id || '', 0);
  }

  notifyArrival(): void {
    const currentUser = this.currentUser();
    if (!currentUser) return;

    this.plazaService.notifyArrivalWithChat(this.plazaId, this.estimatedArrival());
    
    // Simular que el usuario está llegando
    setTimeout(() => {
      this.isAtPlaza.set(true);
    }, this.estimatedArrival() * 60 * 1000); // Convert minutes to milliseconds
    
    console.log(`Notificación de llegada enviada: ${this.estimatedArrival()} minutos`);
  }

  confirmOccupation(successful: boolean): void {
    this.plazaService.confirmPlazaOccupationWithChat(this.plazaId, successful)
      .subscribe({
        next: (result) => {
          console.log('Ocupación confirmada:', result);
          
          // Actualizar estado
          const plaza = this.plaza();
          if (plaza) {
            plaza.status = successful ? 'occupied' : 'available';
            plaza.successful = successful;
            plaza.confirmedAt = new Date().toISOString();
            this.plaza.set({ ...plaza });
          }
          
          if (successful) {
            // Redirigir después de confirmar
            setTimeout(() => {
              this.router.navigate(['/']);
            }, 2000);
          }
        },
        error: (error) => {
          console.error('Error confirmando ocupación:', error);
        }
      });
  }

  // Report Modal
  openReportModal(): void {
    this.showReportModal.set(true);
  }

  closeReportModal(): void {
    this.showReportModal.set(false);
    this.reportForm = {
      issueType: 'not_available',
      description: ''
    };
  }

  async submitReport(): Promise<void> {
    const currentUser = this.currentUser();
    if (!currentUser || !this.reportForm.description.trim()) return;

    try {
      const issueDescription = `${this.getIssueTypeLabel(this.reportForm.issueType)}: ${this.reportForm.description}`;
      
      await this.plazaService.reportPlazaIssueWithChat(
        this.plazaId,
        currentUser,
        issueDescription
      ).toPromise();
      
      console.log('Problema reportado y chat de emergencia creado');
      this.closeReportModal();
      
      // Navegar al chat de emergencia
      setTimeout(() => {
        this.openPlazaChat();
      }, 500);
      
    } catch (error) {
      console.error('Error reportando problema:', error);
      alert('Error al reportar el problema. Inténtalo de nuevo.');
    }
  }

  // Utility Methods
  getStatusLabel(): string {
    const status = this.plaza()?.status;
    const labels: Record<string, string> = {
      'available': 'Disponible',
      'claimed': 'Reclamada',
      'occupied': 'Ocupada',
      'unavailable': 'No disponible',
      'expired': 'Expirada'
    };
    return labels[status || ''] || 'Desconocido';
  }

  getStatusClass(): string {
    return this.statusClass();
  }

  getSizeLabel(size: string): string {
    const labels: Record<string, string> = {
      'small': 'Pequeña',
      'medium': 'Mediana',
      'large': 'Grande'
    };
    return labels[size] || size;
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'No especificado';
    
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  }

  private getIssueTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'not_available': 'Plaza no disponible',
      'wrong_location': 'Ubicación incorrecta',
      'access_blocked': 'Acceso bloqueado',
      'other': 'Otro problema'
    };
    return labels[type] || type;
  }
}
