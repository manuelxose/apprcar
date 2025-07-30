// src/app/features/auth/login/login.component.ts
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';

import { Loading } from '@shared/components/loading/loading';
import * as AuthActions from '@store/auth/auth.actions';
import * as AuthSelectors from '@store/auth/auth.selectors';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    Loading
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private router = inject(Router);

  // Signals
  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);
  submitted = signal(false);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  get emailErrors() {
    return this.loginForm.get('email')?.errors && this.loginForm.get('email')?.invalid;
  }

  get passwordErrors() {
    return this.loginForm.get('password')?.errors && this.loginForm.get('password')?.invalid;
  }

  ngOnInit() {
    // Suscribirse al estado de autenticación
    this.store.select(AuthSelectors.selectAuthLoading)
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading.set(loading));

    this.store.select(AuthSelectors.selectAuthError)
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error.set(error));

    // Si ya está autenticado, redirigir
    this.store.select(AuthSelectors.selectIsAuthenticated)
      .pipe(takeUntil(this.destroy$))
      .subscribe(authenticated => {
        if (authenticated) {
          this.router.navigate(['/']);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit() {
    this.submitted.set(true);
    
    if (this.loginForm.valid) {
      const credentials = this.loginForm.value;
      this.store.dispatch(AuthActions.login({ credentials }));
    }
  }
}
