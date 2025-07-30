// src/app/features/plaza/components/notify-plaza-button/notify-plaza-button.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { GeolocationService } from '@core/services/geolocation.service';
import { UnifiedNotificationService } from '@core/services/unified-notification.service';
import { NotifyPlazaModalComponent } from '../notify-plaza-modal/notify-plaza-modal.component';
import { UserLocation, PlazaNotificationData } from '@shared/interfaces';

@Component({
  selector: 'app-notify-plaza-button',
  standalone: true,
  imports: [
    CommonModule,
    NotifyPlazaModalComponent
  ],
  templateUrl: './notify-plaza-button.component.html',
  styleUrls: ['./notify-plaza-button.component.scss']
})
export class NotifyPlazaButtonComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly geolocationService = inject(GeolocationService);
  private readonly UnifiedNotificationService = inject(UnifiedNotificationService);

  // Signals
  showModal = signal(false);
  userLocation = signal<UserLocation | null>(null);
  notifying = signal(false);
  isAuthenticated = signal(true); // Simplified for now
  activePlaza = signal<any>(null); // Simplified for now

  // Computed properties
  canNotify = computed(() => {
    return this.isAuthenticated() && this.userLocation() !== null && !this.notifying();
  });

  hasActivePlaza = computed(() => {
    return this.activePlaza() !== null;
  });

  ngOnInit() {
    this.loadUserLocation();
  }

  private loadUserLocation() {
    this.geolocationService.getCurrentPosition().subscribe({
      next: (location: UserLocation) => this.userLocation.set(location),
      error: (error: any) => {
        console.error('Error getting location:', error);
        this.UnifiedNotificationService.showError('No se pudo obtener la ubicación');
      }
    });
  }

  openNotifyModal() {
    if (this.canNotify()) {
      this.showModal.set(true);
    }
  }

  closeModal() {
    this.showModal.set(false);
  }

  getTooltipText(): string {
    if (!this.isAuthenticated()) {
      return 'Inicia sesión para notificar plazas';
    }
    if (!this.userLocation()) {
      return 'Obteniendo ubicación...';
    }
    if (this.notifying()) {
      return 'Notificando plaza...';
    }
    if (this.hasActivePlaza()) {
      return 'Cancelar notificación activa';
    }
    return 'Notificar plaza libre';
  }

  getCurrentPlazaDescription(): string {
    const plaza = this.activePlaza();
    if (!plaza) return '';
    return plaza.description || 'Plaza compartida activa';
  }

  getTimeRemaining(): string {
    const plaza = this.activePlaza();
    if (!plaza) return '';
    
    const now = new Date();
    const expiresAt = new Date(plaza.expiresAt);
    const diffMs = expiresAt.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expirada';
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m restantes`;
    }
    return `${minutes}m restantes`;
  }

  cancelActivePlaza() {
    // TODO: Implement cancel plaza action
    this.activePlaza.set(null);
    this.UnifiedNotificationService.showSuccess('Plaza cancelada');
  }

  onNotifyPlaza(data: PlazaNotificationData) {
    this.notifying.set(true);
    
    // TODO: Implement actual plaza notification logic
    // This should dispatch an action to create the plaza notification
    console.log('Notifying plaza:', data);
    
    // Simulate API call
    setTimeout(() => {
      this.notifying.set(false);
      this.activePlaza.set({
        id: Date.now().toString(),
        ...data,
        expiresAt: new Date(Date.now() + (data.estimatedDuration || 30) * 60 * 1000)
      });
      this.UnifiedNotificationService.showSuccess('¡Plaza notificada exitosamente!');
    }, 1500);
  }
}
