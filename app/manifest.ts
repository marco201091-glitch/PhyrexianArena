import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Phyrexian Arena – EDH Tracker',
    short_name: 'Phyrexian Arena',
    description: 'Track Commander games live from any phone or tablet.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#0a0a0f',
    orientation: 'any',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
