// loading.component.ts
import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LoadingType = 'spinner' | 'bar' | 'dots' | 'skeleton' | 'custom' | 'pulse';
export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LoadingColor = 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'gray';
export type ContainerMode = 'inline' | 'overlay' | 'fullscreen' | 'card';

interface SkeletonConfig {
  lines: number;
  showAvatar: boolean;
  showImage: boolean;
  variant: 'list' | 'card' | 'text' | 'table';
}

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading.html',
  styleUrls: ['./loading.scss']
})
export class Loading {
  
  // Input properties
  @Input() type: LoadingType = 'spinner';
  @Input() message = '';
  @Input() size: LoadingSize = 'md';
  @Input() color: LoadingColor = 'blue';
  @Input() containerClass = 'inline';
  @Input() mode: ContainerMode = 'inline';
  @Input() showBackground = true;
  
  // Progress bar specific
  @Input() progress = 0; // 0-100
  @Input() indeterminate = true;
  
  // Skeleton specific
  @Input() skeletonCount = 3;
  @Input() skeletonConfig: Partial<SkeletonConfig> = {};
  
  // Custom loading
  @Input() customIcon = '';
  @Input() animationDuration = '1.5s';
  
  // Reactive signals
  private _isVisible = signal(true);
  
  // Computed properties
  containerClasses = computed(() => this.getContainerClasses());
  loaderClasses = computed(() => this.getLoaderClasses());
  messageClasses = computed(() => this.getMessageClasses());
  skeletonItems = computed(() => this.getSkeletonItems());
  progressPercentage = computed(() => Math.min(100, Math.max(0, this.progress)));
  
  // Default skeleton configuration
  private defaultSkeletonConfig: SkeletonConfig = {
    lines: 3,
    showAvatar: false,
    showImage: false,
    variant: 'list'
  };
  
  // Get final skeleton configuration
  finalSkeletonConfig = computed<SkeletonConfig>(() => ({
    ...this.defaultSkeletonConfig,
    ...this.skeletonConfig
  }));
  
  /**
   * Generate container CSS classes based on mode and settings
   */
  private getContainerClasses(): string {
    const classes = ['loading-container'];
    
    // Add mode classes
    switch (this.mode) {
      case 'overlay':
        classes.push('fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center');
        break;
      case 'fullscreen':
        classes.push('fixed inset-0 z-50 bg-white flex items-center justify-center');
        break;
      case 'card':
        classes.push('bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-center min-h-[200px]');
        break;
      case 'inline':
      default:
        classes.push('flex items-center justify-center');
        break;
    }
    
    // Add background if enabled
    if (this.showBackground && this.mode === 'inline') {
      classes.push('bg-gray-50 rounded-xl p-4');
    }
    
    // Add custom container class
    if (this.containerClass) {
      classes.push(this.containerClass);
    }
    
    return classes.join(' ');
  }
  
  /**
   * Generate loader CSS classes based on type, size, and color
   */
  private getLoaderClasses(): string {
    const classes = ['loading-content'];
    
    // Add type-specific classes
    switch (this.type) {
      case 'spinner':
        classes.push('spinner-loader');
        break;
      case 'dots':
        classes.push('dots-loader');
        break;
      case 'pulse':
        classes.push('pulse-loader');
        break;
      case 'custom':
        classes.push('custom-loader');
        break;
    }
    
    // Add size classes
    classes.push(`size-${this.size}`);
    
    // Add color classes
    classes.push(`color-${this.color}`);
    
    return classes.join(' ');
  }
  
  /**
   * Generate message CSS classes
   */
  private getMessageClasses(): string {
    const classes = ['loading-message'];
    
    // Add size-based text classes
    switch (this.size) {
      case 'xs':
        classes.push('text-xs');
        break;
      case 'sm':
        classes.push('text-sm');
        break;
      case 'lg':
        classes.push('text-lg');
        break;
      case 'xl':
        classes.push('text-xl');
        break;
      case 'md':
      default:
        classes.push('text-base');
        break;
    }
    
    classes.push('text-gray-600 font-medium text-center');
    
    return classes.join(' ');
  }
  
  /**
   * Generate skeleton items array
   */
  private getSkeletonItems(): number[] {
    return Array(this.skeletonCount).fill(0).map((_, i) => i);
  }
  
  /**
   * Get spinner size in pixels based on size prop
   */
  getSpinnerSize(): string {
    const sizeMap = {
      xs: '16px',
      sm: '24px',
      md: '32px',
      lg: '48px',
      xl: '64px'
    };
    return sizeMap[this.size];
  }
  
  /**
   * Get color classes for different elements
   */
  getColorClasses(element: 'spinner' | 'bar' | 'dot' | 'skeleton' = 'spinner'): string {
    const colorMaps = {
      spinner: {
        blue: 'border-blue-600',
        green: 'border-green-600',
        purple: 'border-purple-600',
        amber: 'border-amber-600',
        red: 'border-red-600',
        gray: 'border-gray-600'
      },
      bar: {
        blue: 'bg-blue-600',
        green: 'bg-green-600',
        purple: 'bg-purple-600',
        amber: 'bg-amber-600',
        red: 'bg-red-600',
        gray: 'bg-gray-600'
      },
      dot: {
        blue: 'bg-blue-600',
        green: 'bg-green-600',
        purple: 'bg-purple-600',
        amber: 'bg-amber-600',
        red: 'bg-red-600',
        gray: 'bg-gray-600'
      },
      skeleton: {
        blue: 'bg-blue-200',
        green: 'bg-green-200',
        purple: 'bg-purple-200',
        amber: 'bg-amber-200',
        red: 'bg-red-200',
        gray: 'bg-gray-200'
      }
    };
    
    return colorMaps[element][this.color] || colorMaps[element].blue;
  }
  
  /**
   * Get progress bar gradient classes
   */
  getProgressGradient(): string {
    const gradients = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      amber: 'from-amber-500 to-amber-600',
      red: 'from-red-500 to-red-600',
      gray: 'from-gray-500 to-gray-600'
    };
    
    return `bg-gradient-to-r ${gradients[this.color]}`;
  }
  
  /**
   * Get skeleton line width classes for variation
   */
  getSkeletonLineWidth(index: number): string {
    const widths = ['w-full', 'w-4/5', 'w-3/4', 'w-2/3', 'w-3/5'];
    return widths[index % widths.length];
  }
  
  /**
   * Track by function for skeleton items
   */
  trackByIndex(index: number): number {
    return index;
  }
  
  /**
   * Show/hide the loading component
   */
  show(): void {
    this._isVisible.set(true);
  }
  
  hide(): void {
    this._isVisible.set(false);
  }
  
  /**
   * Check if component is visible
   */
  isVisible(): boolean {
    return this._isVisible();
  }
  
  /**
   * Toggle visibility
   */
  toggle(): void {
    this._isVisible.update(visible => !visible);
  }
  
  /**
   * Get custom icon SVG path or return default
   */
  getCustomIcon(): string {
    if (this.customIcon) {
      return this.customIcon;
    }
    
    // Default parking icon
    return 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7z m5 0V5a2 2 0 00-2-2H8a2 2 0 00-2 2v2z';
  }
  
  /**
   * Get skeleton variant specific classes
   */
  getSkeletonVariantClasses(): string {
    const variant = this.finalSkeletonConfig().variant;
    
    switch (variant) {
      case 'card':
        return 'bg-white rounded-2xl p-4 shadow-sm border border-gray-100';
      case 'table':
        return 'bg-white border-b border-gray-100';
      case 'text':
        return 'space-y-2';
      case 'list':
      default:
        return 'bg-white rounded-xl p-4 shadow-sm border border-gray-100';
    }
  }
  
  /**
   * Check if should show avatar in skeleton
   */
  shouldShowAvatar(): boolean {
    return this.finalSkeletonConfig().showAvatar;
  }
  
  /**
   * Check if should show image in skeleton
   */
  shouldShowImage(): boolean {
    return this.finalSkeletonConfig().showImage;
  }
  
  /**
   * Get number of skeleton lines
   */
  getSkeletonLines(): number {
    return this.finalSkeletonConfig().lines;
  }
}