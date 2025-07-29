import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private loadingCounter = 0;

  public loading$ = this.loadingSubject.asObservable();

  /**
   * Show loading indicator
   */
  show(): void {
    this.loadingCounter++;
    this.updateLoadingState();
  }

  /**
   * Hide loading indicator
   */
  hide(): void {
    if (this.loadingCounter > 0) {
      this.loadingCounter--;
    }
    this.updateLoadingState();
  }

  /**
   * Force hide all loading indicators
   */
  hideAll(): void {
    this.loadingCounter = 0;
    this.updateLoadingState();
  }

  /**
   * Get current loading state
   */
  isLoading(): boolean {
    return this.loadingSubject.value;
  }

  private updateLoadingState(): void {
    const isLoading = this.loadingCounter > 0;
    this.loadingSubject.next(isLoading);
  }
}
