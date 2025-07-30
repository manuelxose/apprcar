import { Component, Input, Output, EventEmitter, signal, computed, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { PlazaFilters, LocationData } from '@core/models';

@Component({
  selector: 'app-map-controls',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './map-controls.component.html',
  styleUrls: ['./map-controls.component.scss']
})
export class MapControlsComponent implements OnInit, OnChanges {
  @Input() filters: PlazaFilters = {
    radius: 1000,
    maxAge: 10,
    showOnlyAvailable: true,
    includePaid: false
  };
  @Input() userLocation: LocationData | null = null;
  @Input() plazaCount = 0;

  @Output() filtersChange = new EventEmitter<PlazaFilters>();
  @Output() centerOnUser = new EventEmitter<void>();
  @Output() refreshPlazas = new EventEmitter<void>();

  private fb = new FormBuilder();
  
  isExpanded = signal(false);
  selectedSize = signal<string | null>(null);

  filtersForm = this.fb.group({
    radius: [this.filters.radius],
    maxAge: [this.filters.maxAge],
    showOnlyAvailable: [this.filters.showOnlyAvailable],
    includePaid: [this.filters.includePaid],
    maxPrice: [5]
  });

  ngOnInit() {
    this.filtersForm.patchValue(this.filters);
  }

  ngOnChanges() {
    if (this.filters) {
      this.filtersForm.patchValue(this.filters, { emitEvent: false });
    }
  }

  toggleExpanded(): void {
    this.isExpanded.set(!this.isExpanded());
  }

  getRadiusText(): string {
    const radius = this.filtersForm.get('radius')?.value || 1000;
    return radius >= 1000 ? `${(radius / 1000).toFixed(1)}km` : `${radius}m`;
  }

  getAgeText(): string {
    const age = this.filtersForm.get('maxAge')?.value || 10;
    return age >= 60 ? `${(age / 60).toFixed(1)}h` : `${age}min`;
  }

  getPriceText(): string {
    const price = this.filtersForm.get('maxPrice')?.value || 0;
    return price === 0 ? 'Gratis' : `${price}€/h`;
  }

  selectSize(size: string | null): void {
    this.selectedSize.set(size);
    this.onFilterChange();
  }

  getSizeButtonClass(size: string | null): string {
    const isSelected = this.selectedSize() === size;
    return isSelected 
      ? 'border-blue-500 bg-blue-50 text-blue-700' 
      : 'border-gray-200 hover:border-gray-300 text-gray-600';
  }

  onRadiusChange(): void {
    this.debounceFilterChange();
  }

  onAgeChange(): void {
    this.debounceFilterChange();
  }

  onPriceChange(): void {
    this.debounceFilterChange();
  }

  onFilterChange(): void {
    this.debounceFilterChange();
  }

  private debounceFilterChange = this.debounce(() => {
    this.applyFilters();
  }, 300);

  applyFilters(): void {
    const formValue = this.filtersForm.value;
    const selectedSizeValue = this.selectedSize();
    const validSizes = ['small', 'medium', 'large'] as const;
    const sizePreference = selectedSizeValue && validSizes.includes(selectedSizeValue as any) 
      ? selectedSizeValue as typeof validSizes[number] 
      : undefined;

    const newFilters: PlazaFilters = {
      radius: formValue.radius || 1000,
      maxAge: formValue.maxAge || 10,
      showOnlyAvailable: formValue.showOnlyAvailable || false,
      includePaid: formValue.includePaid || false,
      sizePreference,
      maxPrice: formValue.includePaid ? (formValue.maxPrice || undefined) : undefined
    };

    this.filtersChange.emit(newFilters);
  }

  resetFilters(): void {
    const defaultFilters: PlazaFilters = {
      radius: 1000,
      maxAge: 10,
      showOnlyAvailable: true,
      includePaid: false
    };

    this.filtersForm.patchValue(defaultFilters);
    this.selectedSize.set(null);
    this.filtersChange.emit(defaultFilters);
  }

  private debounce(func: Function, wait: number) {
    let timeout: any;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}
