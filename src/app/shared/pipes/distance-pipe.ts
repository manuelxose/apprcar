// =================== src/app/shared/pipes/distance.pipe.ts ===================

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'distance',
  standalone: true
})
export class DistancePipe implements PipeTransform {
  
  transform(value: number | null | undefined, unit: 'auto' | 'm' | 'km' = 'auto'): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '--';
    }

    const distance = Math.abs(value);

    switch (unit) {
      case 'm':
        return `${Math.round(distance)}m`;
      
      case 'km':
        return `${(distance / 1000).toFixed(1)}km`;
      
      case 'auto':
      default:
        if (distance < 1000) {
          return `${Math.round(distance)}m`;
        } else if (distance < 10000) {
          return `${(distance / 1000).toFixed(1)}km`;
        } else {
          return `${Math.round(distance / 1000)}km`;
        }
    }
  }
}