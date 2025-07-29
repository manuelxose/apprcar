// app.component.ts - Componente principal modernizado con Tailwind CSS
import { Component, inject, OnDestroy, OnInit, PLATFORM_ID, signal, computed } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { GeolocationService } from '@core/services/geolocation';
import { StorageService } from '@core/services/storage';
import { Subject, filter, takeUntil } from 'rxjs';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Header } from '@shared/components/header/header';
import { BottomNav} from '@shared/components/bottom-nav/bottom-nav';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    CommonModule, 
    Header, 
    BottomNav
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private geoService = inject(GeolocationService);
  private storageService = inject(StorageService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Reactive signals for app state
  isLoading = signal<boolean>(false);
  isNavigating = signal<boolean>(false);
  showOverlay = signal<boolean>(false);
  isMobile = signal<boolean>(false);
  isOnline = signal<boolean>(true);
  showScrollTop = signal<boolean>(false);
  
  // Navigation state
  currentRoute = signal<string>('');
  currentPageTitle = signal<string>('Apparcar');
  showBackButton = signal<boolean>(false);
  hideBottomNavTemporarily = signal<boolean>(false);
  
  // Toast notifications
  activeToasts = signal<Toast[]>([]);
  
  // Computed properties
  hasUnreadNotifications = computed(() => {
    // TODO: Connect to notification service
    return true; // Mock value
  });

/**
   * Enhanced showBottomNav computed with better logic
   */
  showBottomNav = computed(() => {
    const route = this.currentRoute();
    
    // Routes where bottom nav should be hidden
    const hiddenRoutes = [
      '/login',
      '/register', 
      '/onboarding',
      '/booking',
      '/chat/' // Hide on individual chat conversations
    ];
    
    // Check if current route should hide bottom nav
    const shouldHide = hiddenRoutes.some(hiddenRoute => {
      if (hiddenRoute.endsWith('/')) {
        return route.startsWith(hiddenRoute);
      }
      return route === hiddenRoute;
    });
    
    // Show only on mobile and when not hidden
    return this.isMobile() && !shouldHide && !this.hideBottomNavTemporarily();
  });

  // Routes that should show back button
  private readonly ROUTES_WITH_BACK_BUTTON = [
    '/parking/',
    '/booking/',
    '/profile/settings',
    '/profile/vehicles',
    '/profile/reservations',
    '/chat/',
    '/notifications'
  ];

  constructor() {
    this.initializeApp();
    this.setupRouterEvents();
    this.setupOnlineStatus();
    this.setupScrollListener();
  }

  ngOnInit(): void {
    this.detectMobileDevice();
    this.initializeLocation();
    this.loadUserTheme();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize app core functionality
   */
  private initializeApp(): void {
    if (!this.isBrowser) return;

    // Set initial online status
    this.isOnline.set(navigator.onLine);
  }

  /**
   * Setup router event listeners
   */
  private setupRouterEvents(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.handleRouteChange(event.urlAfterRedirects);
      });
  }

  /**
   * Handle route changes and update app state
   */
  private handleRouteChange(url: string): void {
    this.currentRoute.set(url);
    this.updatePageTitle(url);
    this.updateBackButtonVisibility(url);
    this.scrollToTop();
    this.isNavigating.set(false);
  }

/**
   * Enhanced page title mapping
   */
  private updatePageTitle(route: string): void {
    const titleMap: { [key: string]: string } = {
      '/': 'Inicio',
      '/map': 'Mapa',
      '/parkings': 'Parkings', 
      '/favorites': 'Favoritos',
      '/profile': 'Perfil',
      '/chat': 'Mensajes',
      '/notifications': 'Notificaciones',
      '/settings': 'Configuración'
    };

    // Handle dynamic routes
    let title = 'Apparcar';
    
    if (titleMap[route]) {
      title = titleMap[route];
    } else if (route.startsWith('/parking/')) {
      title = 'Detalle de Parking';
    } else if (route.startsWith('/chat/')) {
      title = 'Chat';
    } else if (route.startsWith('/profile/')) {
      title = 'Perfil';
    }

    this.currentPageTitle.set(title);
  }


  /**
   * Update back button visibility
   */
  private updateBackButtonVisibility(route: string): void {
    const shouldShow = this.ROUTES_WITH_BACK_BUTTON.some(r => route.startsWith(r));
    this.showBackButton.set(shouldShow);
  }

  /**
   * Setup online/offline status monitoring
   */
  private setupOnlineStatus(): void {
    if (!this.isBrowser) return;

    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.showToast({
        type: 'success',
        title: 'Conexión restaurada',
        message: 'Ya puedes usar todas las funciones'
      });
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
      this.showToast({
        type: 'warning',
        title: 'Sin conexión',
        message: 'Algunas funciones pueden no estar disponibles'
      });
    });
  }

  /**
   * Setup scroll listener for scroll-to-top button
   */
  private setupScrollListener(): void {
    if (!this.isBrowser) return;

    window.addEventListener('scroll', () => {
      this.showScrollTop.set(window.scrollY > 300);
    });
  }

  /**
   * Detect mobile device
   */
  private detectMobileDevice(): void {
    if (!this.isBrowser) {
      this.isMobile.set(false);
      return;
    }
    
    this.isMobile.set(window.innerWidth <= 768);
    
    window.addEventListener('resize', () => {
      this.isMobile.set(window.innerWidth <= 768);
    });
  }

  /**
   * Initialize geolocation services
   */
  private initializeLocation(): void {
    if (this.geoService.isGeolocationSupported()) {
      this.geoService.getCurrentPosition()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (location: any) => {
            console.log('📍 Location obtained:', location);
          },
          error: (error: any) => {
            console.warn('⚠️ Location error:', error);
          }
        });
    }
  }

  /**
   * Load user theme preferences
   */
  private loadUserTheme(): void {
    if (!this.isBrowser) return;
    
    const savedTheme = this.storageService.getItem<string>('theme');
    if (savedTheme) {
      document.body.setAttribute('data-theme', savedTheme);
    }
  }


  /**
   * Event handlers
   */
  onMenuClick(): void {
    console.log('Menu clicked');
    // TODO: Implement side menu
  }

  onBackClick(): void {
    if (!this.isBrowser) return;
    window.history.back();
  }

/**
   * Enhanced bottom nav click handler
   */
  onBottomNavClick(route: string): void {
    // Prevent navigation to same route
    if (this.currentRoute() === route) {
      return;
    }

    // Add loading state
    this.isNavigating.set(true);
    
    // Scroll to top before navigation
    this.scrollToTop();
    
    // Navigate
    this.router.navigate([route]).then(() => {
      this.isNavigating.set(false);
    }).catch(() => {
      this.isNavigating.set(false);
    });
  }

  closeOverlay(): void {
    this.showOverlay.set(false);
  }

 /**
   * Enhanced scroll to top with smooth behavior
   */
  scrollToTop(): void {
    if (!this.isBrowser) return;
    
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  }

  /**
   * Public methods for global state control
   */
  showGlobalLoading(): void {
    this.isLoading.set(true);
  }

  hideGlobalLoading(): void {
    this.isLoading.set(false);
  }

  showGlobalOverlay(): void {
    this.showOverlay.set(true);
  }

  hideGlobalOverlay(): void {
    this.showOverlay.set(false);
  }

  /**
   * Toast notification methods
   */
  showToast(options: Omit<Toast, 'id' | 'timestamp'>): void {
    const toast: Toast = {
      ...options,
      id: Date.now().toString(),
      timestamp: new Date()
    };

    this.activeToasts.update(toasts => [...toasts, toast]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      this.dismissToast(toast.id);
    }, 5000);
  }

  dismissToast(id: string): void {
    this.activeToasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  trackToast(index: number, toast: Toast): string {
    return toast.id;
  }


  /**
   * Get main content CSS classes
   */
  getMainContentClasses(): string {
    const classes = ['main-content'];
    
    if (this.showBottomNav()) {
      classes.push('with-bottom-nav');
    }
    
    if (this.isMobile()) {
      classes.push('mobile-layout');
    }
    
    return classes.join(' ');
  }

  

  

 

  /**
   * Method to temporarily hide bottom nav (useful for modals, etc.)
   */
  temporarilyHideBottomNav(hide: boolean = true): void {
    this.hideBottomNavTemporarily.set(hide);
  }

  




}

// Toast interface
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: Date;
}