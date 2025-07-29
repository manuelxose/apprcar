// =================== src/app/shared/directives/touch.directive.ts ===================

import { 
  Directive, 
  ElementRef, 
  EventEmitter, 
  HostListener, 
  Input, 
  Output, 
  OnDestroy,
  inject
} from '@angular/core';

export interface TouchEvent {
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe';
  direction?: 'left' | 'right' | 'up' | 'down';
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  deltaX?: number;
  deltaY?: number;
  duration?: number;
  target: HTMLElement;
}

@Directive({
  selector: '[appTouch]',
  standalone: true
})
export class TouchDirective implements OnDestroy {
  private el = inject(ElementRef);

  @Input() touchSensitivity: number = 10; // Minimum pixels for swipe
  @Input() longPressDelay: number = 500; // Milliseconds for long press
  @Input() doubleTapDelay: number = 300; // Milliseconds between taps for double tap
  @Input() enableRipple: boolean = false; // Add ripple effect

  @Output() appTouch = new EventEmitter<TouchEvent>();
  @Output() tap = new EventEmitter<TouchEvent>();
  @Output() doubleTap = new EventEmitter<TouchEvent>();
  @Output() longPress = new EventEmitter<TouchEvent>();
  @Output() swipe = new EventEmitter<TouchEvent>();
  @Output() swipeLeft = new EventEmitter<TouchEvent>();
  @Output() swipeRight = new EventEmitter<TouchEvent>();
  @Output() swipeUp = new EventEmitter<TouchEvent>();
  @Output() swipeDown = new EventEmitter<TouchEvent>();

  private startX: number = 0;
  private startY: number = 0;
  private startTime: number = 0;
  private longPressTimer: any;
  private lastTapTime: number = 0;
  private tapCount: number = 0;
  private isLongPress: boolean = false;

  constructor() {
    // Add touch-friendly class
    this.el.nativeElement.classList.add('touch-enabled');
    
    // Add basic touch styles
    const element = this.el.nativeElement;
    element.style.userSelect = 'none';
    element.style.webkitUserSelect = 'none';
    element.style.webkitTouchCallout = 'none';
    element.style.cursor = 'pointer';
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: any): void {
    if (event.touches && event.touches.length === 1) {
      const touch = event.touches[0];
      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.startTime = Date.now();
      this.isLongPress = false;

      // Start long press timer
      this.longPressTimer = setTimeout(() => {
        this.isLongPress = true;
        this.emitLongPress();
      }, this.longPressDelay);

      // Add ripple effect if enabled
      if (this.enableRipple) {
        this.createRipple(touch.clientX, touch.clientY);
      }
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: any): void {
    // Cancel long press if finger moves
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: any): void {
    if (event.changedTouches && event.changedTouches.length === 1) {
      const touch = event.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();
      const duration = endTime - this.startTime;

      // Clear long press timer
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      // If it was a long press, don't process other gestures
      if (this.isLongPress) {
        return;
      }

      const deltaX = endX - this.startX;
      const deltaY = endY - this.startY;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Check for swipe gesture
      if (absDeltaX > this.touchSensitivity || absDeltaY > this.touchSensitivity) {
        this.handleSwipe(deltaX, deltaY, absDeltaX, absDeltaY, endTime, duration);
      } else {
        // Handle tap gestures
        this.handleTap(endTime, duration);
      }
    }
  }

  // Mouse events fallback for desktop
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if ('ontouchstart' in window) return; // Skip if touch is available

    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startTime = Date.now();
    this.isLongPress = false;

    this.longPressTimer = setTimeout(() => {
      this.isLongPress = true;
      this.emitLongPress();
    }, this.longPressDelay);

    if (this.enableRipple) {
      this.createRipple(event.clientX, event.clientY);
    }
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    if ('ontouchstart' in window) return; // Skip if touch is available

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (!this.isLongPress) {
      const endTime = Date.now();
      const duration = endTime - this.startTime;
      this.handleTap(endTime, duration);
    }
  }

  private handleSwipe(deltaX: number, deltaY: number, absDeltaX: number, absDeltaY: number, endTime: number, duration: number): void {
    let direction: 'left' | 'right' | 'up' | 'down';

    if (absDeltaX > absDeltaY) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    const touchEvent: TouchEvent = {
      type: 'swipe',
      direction,
      startX: this.startX,
      startY: this.startY,
      endX: this.startX + deltaX,
      endY: this.startY + deltaY,
      deltaX,
      deltaY,
      duration,
      target: this.el.nativeElement
    };

    this.appTouch.emit(touchEvent);
    this.swipe.emit(touchEvent);

    // Emit specific direction events
    switch (direction) {
      case 'left':
        this.swipeLeft.emit(touchEvent);
        break;
      case 'right':
        this.swipeRight.emit(touchEvent);
        break;
      case 'up':
        this.swipeUp.emit(touchEvent);
        break;
      case 'down':
        this.swipeDown.emit(touchEvent);
        break;
    }
  }

  private handleTap(endTime: number, duration: number): void {
    this.tapCount++;

    const touchEvent: TouchEvent = {
      type: 'tap',
      startX: this.startX,
      startY: this.startY,
      duration,
      target: this.el.nativeElement
    };

    // Check for double tap
    if (this.tapCount === 1) {
      setTimeout(() => {
        if (this.tapCount === 1) {
          // Single tap
          this.appTouch.emit(touchEvent);
          this.tap.emit(touchEvent);
        } else if (this.tapCount === 2) {
          // Double tap
          const doubleTapEvent: TouchEvent = {
            ...touchEvent,
            type: 'double-tap'
          };
          this.appTouch.emit(doubleTapEvent);
          this.doubleTap.emit(doubleTapEvent);
        }
        this.tapCount = 0;
      }, this.doubleTapDelay);
    }

    this.lastTapTime = endTime;
  }

  private emitLongPress(): void {
    const touchEvent: TouchEvent = {
      type: 'long-press',
      startX: this.startX,
      startY: this.startY,
      duration: this.longPressDelay,
      target: this.el.nativeElement
    };

    this.appTouch.emit(touchEvent);
    this.longPress.emit(touchEvent);
  }

  private createRipple(x: number, y: number): void {
    const element = this.el.nativeElement;
    const rect = element.getBoundingClientRect();
    
    const ripple = document.createElement('div');
    ripple.className = 'touch-ripple';
    
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (x - rect.left - size / 2) + 'px';
    ripple.style.top = (y - rect.top - size / 2) + 'px';
    
    // Add styles
    Object.assign(ripple.style, {
      position: 'absolute',
      borderRadius: '50%',
      background: 'rgba(0, 0, 0, 0.1)',
      transform: 'scale(0)',
      animation: 'ripple-animation 0.6s linear',
      pointerEvents: 'none',
      zIndex: '1000'
    });

    // Add CSS animation if not exists
    if (!document.querySelector('#ripple-styles')) {
      const style = document.createElement('style');
      style.id = 'ripple-styles';
      style.textContent = `
        @keyframes ripple-animation {
          to {
            transform: scale(2);
            opacity: 0;
          }
        }
        .touch-enabled {
          position: relative;
          overflow: hidden;
        }
      `;
      document.head.appendChild(style);
    }

    element.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  ngOnDestroy(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }
}