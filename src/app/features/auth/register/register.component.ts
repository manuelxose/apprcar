// src/app/features/auth/register/register.component.ts
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';

import { Loading } from '@shared/components/loading/loading';
import * as AuthActions from '@store/auth/auth.actions';
import * as AuthSelectors from '@store/auth/auth.selectors';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    Loading
  ],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss']
 
})
export class RegisterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private router = inject(Router);

  // Signals
  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);
  submitted = signal(false);

  registerForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    acceptTerms: [false, [Validators.requiredTrue]]
  }, {
    validators: [this.passwordMatchValidator]
  });

  // Computed properties
  passwordStrength = computed(() => {
    const password = this.registerForm.get('password')?.value || '';
    let strength = 0;
    
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return strength;
  });

  passwordStrengthText = computed(() => {
    const strength = this.passwordStrength();
    const texts = ['Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
    return texts[strength] || 'Muy débil';
  });

  // Form getters
  get firstNameErrors() {
    return this.registerForm.get('firstName')?.errors && this.registerForm.get('firstName')?.invalid;
  }

  get lastNameErrors() {
    return this.registerForm.get('lastName')?.errors && this.registerForm.get('lastName')?.invalid;
  }

  get emailErrors() {
    return this.registerForm.get('email')?.errors && this.registerForm.get('email')?.invalid;
  }

  get passwordErrors() {
    return this.registerForm.get('password')?.errors && this.registerForm.get('password')?.invalid;
  }

  get confirmPasswordErrors() {
    return this.registerForm.get('confirmPassword')?.errors && this.registerForm.get('confirmPassword')?.invalid;
  }

  get termsErrors() {
    return this.registerForm.get('acceptTerms')?.errors && this.registerForm.get('acceptTerms')?.invalid;
  }

  ngOnInit() {
    // Suscribirse al estado de autenticación
    this.store.select(AuthSelectors.selectIsRegistering)
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

  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      confirmPassword.setErrors(null);
      return null;
    }
  }

  onSubmit() {
    this.submitted.set(true);
    
    if (this.registerForm.valid) {
      const formData = this.registerForm.value;
      const { confirmPassword, acceptTerms, ...registerData } = formData;
      
      this.store.dispatch(AuthActions.register({ data: registerData }));
    }
  }
}
