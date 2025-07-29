import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Static routes that should be prerendered
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'parkings',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'search',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'map',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'favorites',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'profile',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'profile/settings',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'profile/vehicles',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'profile/reservations',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'profile/payments',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'not-found',
    renderMode: RenderMode.Prerender
  },
  // Dynamic routes that should use SSR
  {
    path: 'parking/**',
    renderMode: RenderMode.Server
  },
  {
    path: 'booking/**',
    renderMode: RenderMode.Server
  },
  // Fallback for any other routes
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
