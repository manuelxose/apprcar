// =================== src/app/shared/pipes/price.pipe.ts ===================

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'price',
  standalone: true
})
export class PricePipe implements PipeTransform {
  
  transform(
    value: number | null | undefined, 
    currency: string = 'EUR', 
    showSymbol: boolean = true,
    precision: number = 2,
    locale: string = 'es-ES'
  ): string {
    
    if (value === null || value === undefined || isNaN(value)) {
      return showSymbol ? '-- €' : '--';
    }

    const price = Math.abs(value);

    try {
      // Usar Intl.NumberFormat para formateo correcto según locale
      const formatter = new Intl.NumberFormat(locale, {
        style: showSymbol ? 'currency' : 'decimal',
        currency: currency,
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
      });

      return formatter.format(price);
    } catch (error) {
      // Fallback manual si hay error con Intl
      const formattedPrice = price.toFixed(precision);
      return showSymbol ? `${formattedPrice} €` : formattedPrice;
    }
  }
}

// Pipe adicional para formateo de precios con contexto
@Pipe({
  name: 'priceWithContext',
  standalone: true
})
export class PriceWithContextPipe implements PipeTransform {
  
  transform(
    value: number | null | undefined,
    type: 'hourly' | 'daily' | 'monthly' | 'minute' = 'hourly',
    currency: string = 'EUR'
  ): string {
    
    if (value === null || value === undefined || isNaN(value)) {
      return '-- €';
    }

    const price = Math.abs(value);
    const formatter = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const formattedPrice = formatter.format(price);

    switch (type) {
      case 'hourly':
        return `${formattedPrice}/h`;
      case 'daily':
        return `${formattedPrice}/día`;
      case 'monthly':
        return `${formattedPrice}/mes`;
      case 'minute':
        return `${formattedPrice}/min`;
      default:
        return formattedPrice;
    }
  }
}