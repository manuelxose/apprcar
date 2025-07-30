import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlazaLibre, PlazaStatus } from '../../../../core/models/plaza.interface';
import { LocationData } from '../../../../core/models/location.interface';
import { GeolocationService } from '../../../../core/services/geolocation.service';

export interface PlazaReportData {
  plazaId: string;
  reason: string;
  comment?: string;
}

@Component({
  selector: 'plaza-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plaza-detail-modal.component.html',
  styleUrl: './plaza-detail-modal.component.scss'
})
export class PlazaDetailModalComponent {
  @Input() isOpen = false;
  @Input() plaza: PlazaLibre | null = null;
  @Input() userLocation: LocationData | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() claim = new EventEmitter<string>();
  @Output() navigate = new EventEmitter<PlazaLibre>();
  @Output() report = new EventEmitter<PlazaReportData>();

  private geolocationService = inject(GeolocationService);

  showReportModal = signal(false);
  reportReason = signal('');
  reportComment = signal('');

  readonly reportReasons = [
    { value: 'occupied', label: 'Plaza ocupada' },
    { value: 'blocked', label: 'Plaza bloqueada' },
    { value: 'maintenance', label: 'En mantenimiento' },
    { value: 'not_exists', label: 'No existe la plaza' },
    { value: 'other', label: 'Otro motivo' }
  ];

  onClose(): void {
    this.close.emit();
  }

  onClaimPlaza(): void {
    if (this.plaza) {
      this.claim.emit(this.plaza.id);
    }
  }

  onNavigateToPlaza(): void {
    if (this.plaza) {
      this.navigate.emit(this.plaza);
    }
  }

  onReportPlaza(): void {
    this.showReportModal.set(true);
  }

  onSubmitReport(): void {
    if (this.plaza && this.reportReason()) {
      this.report.emit({
        plazaId: this.plaza.id,
        reason: this.reportReason(),
        comment: this.reportComment() || undefined
      });
      this.closeReportModal();
    }
  }

  closeReportModal(): void {
    this.showReportModal.set(false);
    this.reportReason.set('');
    this.reportComment.set('');
  }

  getDistance(): number | null {
    if (!this.plaza || !this.userLocation) return null;
    
    const userLoc = {
      latitude: this.userLocation.coordinates.latitude,
      longitude: this.userLocation.coordinates.longitude
    };
    
    const plazaLoc = {
      latitude: this.plaza.location.latitude,
      longitude: this.plaza.location.longitude
    };
    
    return this.geolocationService.calculateDistance(userLoc, plazaLoc);
  }

  getEstimatedWalkTime(): string {
    const distance = this.getDistance();
    if (!distance) return '--';
    
    // Velocidad promedio caminando: 5 km/h
    const walkingSpeed = 5;
    const timeInHours = distance / walkingSpeed;
    const timeInMinutes = Math.round(timeInHours * 60);
    
    return `${timeInMinutes} min`;
  }

  getPlazaStatusColor(): string {
    if (!this.plaza) return 'gray';
    
    switch (this.plaza.status) {
      case 'available':
        return 'green';
      case 'claimed':
        return 'yellow';
      case 'occupied':
        return 'red';
      default:
        return 'gray';
    }
  }

  getPlazaStatusText(): string {
    if (!this.plaza) return '';
    
    switch (this.plaza.status) {
      case 'available':
        return 'Disponible';
      case 'claimed':
        return 'Reclamada';
      case 'occupied':
        return 'Ocupada';
      default:
        return 'Desconocido';
    }
  }

  getTimeAgo(): string {
    if (!this.plaza?.updatedAt) return '';
    
    const now = new Date();
    const updated = new Date(this.plaza.updatedAt);
    const diffInMinutes = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Hace un momento';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays}d`;
  }

  isClaimable(): boolean {
    return this.plaza?.status === 'available';
  }

  canNavigate(): boolean {
    return !!this.plaza && !!this.userLocation;
  }

  // Methods called from template
  onBackdropClick(event: Event): void {
    // Close modal when clicking backdrop
    this.close.emit();
  }

  getPlazaIcon(): string {
    if (!this.plaza) return '🚗';
    
    switch (this.plaza.details.size) {
      case 'small':
        return '🚗';
      case 'medium':
        return '🚐';
      case 'large':
        return '🚛';
      default:
        return '🚗';
    }
  }

  getLocationText(): string {
    if (!this.plaza) return '';
    return this.plaza.location.address || 'Ubicación no disponible';
  }

  getStatusBadgeClass(): string {
    if (!this.plaza) return '';
    
    switch (this.plaza.status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'claimed':
        return 'bg-yellow-100 text-yellow-800';
      case 'occupied':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(): string {
    return this.getPlazaStatusText();
  }

  getDistanceText(): string {
    const distance = this.getDistance();
    if (!distance) return '--';
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  }

  getTimeText(): string {
    return this.getTimeAgo();
  }

  getSizeText(): string {
    if (!this.plaza) return '';
    
    switch (this.plaza.details.size) {
      case 'small':
        return 'Pequeña';
      case 'medium':
        return 'Mediana';
      case 'large':
        return 'Grande';
      default:
        return 'Estándar';
    }
  }

  getPriceText(): string {
    if (!this.plaza?.details.price) return 'Precio no especificado';
    return `${this.plaza.details.price}€/h`;
  }

  getUserInitials(): string {
    // Mock user data - replace with actual user service
    return 'U';
  }

  getUserRating(): string {
    // Mock user rating - replace with actual user service
    return '4.5';
  }

  getUserPlazasShared(): number {
    // Mock shared plazas count - replace with actual user service
    return 12;
  }

  getStatusAlertClass(): string {
    if (!this.plaza) return '';
    
    switch (this.plaza.status) {
      case 'claimed':
        return 'bg-yellow-50 border border-yellow-200 text-yellow-800';
      case 'occupied':
        return 'bg-red-50 border border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border border-gray-200 text-gray-800';
    }
  }

  getStatusMessage(): string {
    if (!this.plaza) return '';
    
    switch (this.plaza.status) {
      case 'claimed':
        return 'Esta plaza ya ha sido reclamada por otro usuario';
      case 'occupied':
        return 'Esta plaza está ocupada actualmente';
      default:
        return 'Estado desconocido';
    }
  }

  isClaiming(): boolean {
    // This should be connected to a service that tracks claiming state
    return false;
  }

  onNavigate(): void {
    this.onNavigateToPlaza();
  }

  onShare(): void {
    if (this.plaza) {
      // Implement sharing functionality
      const shareText = `¡Encontré una plaza de parking ${this.plaza.details.size} en ${this.getLocationText()}!`;
      
      if (navigator.share) {
        navigator.share({
          title: 'Plaza de parking',
          text: shareText,
          url: window.location.href
        }).catch(console.error);
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText).catch(console.error);
      }
    }
  }

  onReport(): void {
    this.onReportPlaza();
  }
}
