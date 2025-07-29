import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { delay, map, tap, finalize } from 'rxjs';

import { StorageService as Storage } from '@core/services/storage';
import { MockDataService as MockData } from '@core/services/mock-data';
import { User } from '@core/models';

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  user: User;
  token: string;
  expiresIn: number;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  private storageService = inject(Storage);
  private mockDataService = inject(MockData);

  // State
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  isAuthenticated = signal(false);
  isLoading = signal(false);

  constructor() {
    this.checkExistingSession();
  }

  private checkExistingSession(): void {
    const sessionToken = this.storageService.getItem<string>('session_token');
    const sessionExpiry = this.storageService.getItem<string>('session_expiry');

    if (sessionToken && sessionExpiry && new Date() < new Date(sessionExpiry)) {
      this.isAuthenticated.set(true);
      this.loadCurrentUser();
    }
  }

  private loadCurrentUser(): void {
    this.mockDataService.getMockUser()
      .subscribe({
        next: (user) => {
          this.currentUserSubject.next(user);
        },
        error: () => {
          this.logout();
        }
      });
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    this.isLoading.set(true);

    // Simular autenticación
    return this.simulateLogin(credentials).pipe(
      tap((response) => {
        this.handleSuccessfulLogin(response, credentials.rememberMe);
      }),
      finalize(() => {
        this.isLoading.set(false);
      })
    );
  }

  private simulateLogin(credentials: LoginCredentials): Observable<LoginResponse> {
    // Credenciales demo
    const validCredentials = [
      { email: 'usuario@parkingapp.com', password: 'demo123' },
      { email: 'admin@parkingapp.com', password: 'admin123' },
      { email: 'test@test.com', password: 'test123' }
    ];

    const isValid = validCredentials.some(
      cred => cred.email === credentials.email && cred.password === credentials.password
    );

    if (!isValid) {
      return throwError(() => new Error('Credenciales inválidas'));
    }

    return this.mockDataService.getMockUser().pipe(
      delay(1000), // Simular latencia
      map((user) => ({
        user,
        token: 'mock_jwt_token_' + Date.now(),
        expiresIn: 3600000, // 1 hora
        refreshToken: 'mock_refresh_token_' + Date.now()
      }))
    );
  }

  private handleSuccessfulLogin(response: LoginResponse, rememberMe = false): void {
    const expiryTime = new Date(Date.now() + response.expiresIn);

    // Guardar sesión
    this.storageService.setItem('session_token', response.token);
    this.storageService.setItem('session_expiry', expiryTime.toISOString());
    this.storageService.setItem('refresh_token', response.refreshToken);
    this.storageService.setItem('user_id', response.user.id);

    if (rememberMe) {
      this.storageService.setItem('remember_me', true);
    }

    // Actualizar estado
    this.isAuthenticated.set(true);
    this.currentUserSubject.next(response.user);
  }

  logout(): void {
    // Limpiar sesión
    this.storageService.removeItem('session_token');
    this.storageService.removeItem('session_expiry');
    this.storageService.removeItem('refresh_token');
    this.storageService.removeItem('user_id');
    this.storageService.removeItem('remember_me');

    // Actualizar estado
    this.isAuthenticated.set(false);
    this.currentUserSubject.next(null);

    // Redirigir al login
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<string> {
    const refreshToken = this.storageService.getItem<string>('refresh_token');
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    // Simular refresh token
    return of('new_mock_jwt_token_' + Date.now()).pipe(
      delay(500),
      tap((newToken) => {
        const expiryTime = new Date(Date.now() + 3600000); // 1 hora
        this.storageService.setItem('session_token', newToken);
        this.storageService.setItem('session_expiry', expiryTime.toISOString());
      })
    );
  }

  isSessionValid(): boolean {
    const sessionToken = this.storageService.getItem<string>('session_token');
    const sessionExpiry = this.storageService.getItem<string>('session_expiry');

    return !!(sessionToken && sessionExpiry && new Date() < new Date(sessionExpiry));
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Lógica simple de roles basada en email
    if (role === 'admin') {
      return user.email === 'admin@parkingapp.com';
    }

    return true; // Todos los usuarios autenticados tienen rol básico
  }
}
