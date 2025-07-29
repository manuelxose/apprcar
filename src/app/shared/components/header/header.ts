// header.component.ts
import { Component, signal, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class Header {
  @Input() showBackButton = false;
  @Input() title = '';
  @Input() isLoading = false;
  
  @Output() menuClick = new EventEmitter<void>();
  @Output() backClick = new EventEmitter<void>();
  
  private router = inject(Router);
  
  // Signals for reactive state
  currentRoute = signal<string>('/');
  isProfileMenuOpen = signal<boolean>(false);
  notificationCount = signal<number>(3); // Mock data
  currentUser = signal<any>({ name: 'Juan Pérez', email: 'juan@example.com' }); // Mock data
  showPageTitle = signal<boolean>(false);

  // Navigation items for desktop
 navigationItems = signal([
    {
      route: '/',
      label: 'Inicio',
      iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      route: '/map',
      label: 'Mapa',
      iconPath: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
    },
    {
      route: '/parkings',
      label: 'Parkings',
      iconPath: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
    },
    {
      route: '/favorites',
      label: 'Favoritos',
      iconPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
    },
    {
      route: '/profile',
      label: 'Perfil',
      iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    }
  ]);


  // Mobile navigation items (bottom tab bar)
  mobileNavigationItems = signal([
    {
      label: 'Mapa',
      route: '/',
      iconPath: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z'
    },
    {
      label: 'Parkings',
      route: '/parkings',
      iconPath: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7z m5 0V5a2 2 0 00-2-2H8a2 2 0 00-2 2v2z'
    },
    {
      label: 'Chat',
      route: '/chat',
      iconPath: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
    },
    {
      label: 'Perfil',
      route: '/profile',
      iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0z M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    }
  ]);

  // Profile menu items
  profileMenuItems = signal([
    {
      label: 'Mi Perfil',
      action: 'profile',
      iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0z M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    },
    {
      label: 'Mis Vehículos',
      action: 'vehicles',
      iconPath: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7z'
    },
    {
      label: 'Configuración',
      action: 'settings',
      iconPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
    },
    {
      label: 'Cerrar Sesión',
      action: 'logout',
      iconPath: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
    }
  ]);

  constructor() {
    // Listen to route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute.set(event.urlAfterRedirects);
      });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.isProfileMenuOpen.set(false);
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update(current => !current);
  }

  toggleNotifications(): void {
    // TODO: Implement notifications panel
    console.log('Toggle notifications');
  }

  handleProfileMenuClick(action: string): void {
    this.isProfileMenuOpen.set(false);
    
    switch (action) {
      case 'profile':
        this.navigateTo('/profile');
        break;
      case 'vehicles':
        this.navigateTo('/vehicles');
        break;
      case 'settings':
        this.navigateTo('/settings');
        break;
      case 'logout':
        // TODO: Implement logout logic
        console.log('Logout');
        break;
    }
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (!user?.name) return 'U';
    
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  }

  getNavItemClasses(route: string): string {
    const isActive = this.currentRoute() === route;
    const baseClasses = 'px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ease-in-out';
    
    if (isActive) {
      return `${baseClasses} bg-blue-600 text-white shadow-lg shadow-blue-600/25`;
    }
    return `${baseClasses} text-gray-600 hover:text-blue-600 hover:bg-blue-50`;
  }

  getMobileNavItemClasses(route: string): string {
    const isActive = this.currentRoute() === route;
    const baseClasses = 'flex flex-col items-center py-2 px-1 rounded-xl transition-all duration-200 ease-in-out';
    
    if (isActive) {
      return `${baseClasses} text-blue-600 bg-blue-50`;
    }
    return `${baseClasses} text-gray-500`;
  }

  getCurrentPageTitle(): string {
    const route = this.currentRoute();
    const titleMap: { [key: string]: string } = {
      '/': 'Mapa',
      '/parkings': 'Parkings Disponibles',
      '/chat': 'Chat',
      '/profile': 'Mi Perfil',
      '/vehicles': 'Mis Vehículos',
      '/settings': 'Configuración'
    };
    
    return titleMap[route] || '';
  }

  onMenuClick(): void {
    this.menuClick.emit();
  }

  onBackClick(): void {
    this.backClick.emit();
  }
}