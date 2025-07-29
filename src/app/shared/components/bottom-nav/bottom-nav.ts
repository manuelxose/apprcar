// ===== BOTTOM NAV COMPONENT - MODERNIZADO =====

// src/app/shared/components/bottom-nav/bottom-nav.component.ts
import { Component, Input, Output, EventEmitter, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface NavItem {
  route: string;
  iconPath: string; // SVG path instead of string
  label: string;
  badge?: number;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-nav.html',
  styleUrls: ['./bottom-nav.scss']
})
export class BottomNav implements OnChanges {
  @Input() currentRoute = '';
  @Input() hasNotifications = false;
  @Output() navigationClick = new EventEmitter<string>();

  private router = inject(Router);

  // Navigation items con SVG paths
  navItems: NavItem[] = [
    {
      route: '/',
      iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      label: 'Inicio',
      badge: 0
    },
    {
      route: '/map',
      iconPath: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
      label: 'Mapa',
      badge: 0
    },
    {
      route: '/favorites',
      iconPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
      label: 'Favoritos',
      badge: 0
    },
    {
      route: '/profile',
      iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      label: 'Perfil',
      badge: 0
    }
  ];

  ngOnChanges(): void {
    this.updateNotificationStatus();
  }

  /**
   * Determina si una ruta está activa
   */
  isActiveRoute(route: string): boolean {
    if (route === '/') {
      return this.currentRoute === '' || this.currentRoute === '/';
    }
    return this.currentRoute.startsWith(route);
  }

  /**
   * Clases CSS para el botón nav item
   */
  getNavItemClasses(route: string): string {
    const isActive = this.isActiveRoute(route);
    
    if (isActive) {
      return 'bg-gradient-to-b from-blue-50 to-blue-100/50 shadow-lg shadow-blue-500/10 ring-1 ring-blue-200/50';
    }
    
    return 'hover:bg-gray-50 active:bg-gray-100';
  }

  /**
   * Clases CSS para el icono
   */
  getIconClasses(route: string): string {
    const isActive = this.isActiveRoute(route);
    
    if (isActive) {
      return 'text-blue-600 drop-shadow-sm';
    }
    
    return 'text-gray-500 group-hover:text-gray-700';
  }

  /**
   * Clases CSS para el label
   */
  getLabelClasses(route: string): string {
    const isActive = this.isActiveRoute(route);
    
    if (isActive) {
      return 'text-blue-600 font-semibold';
    }
    
    return 'text-gray-500 group-hover:text-gray-700';
  }

  /**
   * Maneja el click en un item de navegación
   */
  onNavClick(route: string): void {
    // Prevent navigation to same route
    if (this.isActiveRoute(route)) {
      return;
    }
    
    // Add haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    this.navigationClick.emit(route);
    this.router.navigate([route]);
  }

  /**
   * Genera aria-label para accesibilidad
   */
  getAriaLabel(item: NavItem): string {
    let label = `Navegar a ${item.label}`;
    
    if (item.badge && item.badge > 0) {
      label += `. ${item.badge} notificaciones`;
    }
    
    if (this.isActiveRoute(item.route)) {
      label += '. Página actual';
    }
    
    return label;
  }

  /**
   * TrackBy function para optimizar el renderizado
   */
  trackNavItem(index: number, item: NavItem): string {
    return item.route;
  }

  /**
   * Actualiza el badge de un item específico
   */
  updateBadge(route: string, count: number): void {
    const item = this.navItems.find(nav => nav.route === route);
    if (item) {
      item.badge = count;
    }
  }

  /**
   * Actualiza los badges según notificaciones
   */
  updateNotificationStatus(): void {
    if (this.hasNotifications) {
      // Example: Update chat/messages badge
      this.updateBadge('/chat', 1);
    } else {
      // Clear notification badges
      this.navItems.forEach(item => {
        if (item.route !== '/') { // Keep home badge if needed
          item.badge = 0;
        }
      });
    }
  }

  /**
   * Limpia todos los badges
   */
  clearAllBadges(): void {
    this.navItems.forEach(item => {
      item.badge = 0;
    });
  }
}