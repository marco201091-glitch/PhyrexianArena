import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MTG Tracker & Analytics',
    short_name: 'MTG Tracker',
    description: 'Life counter, deck analytics, match history, and playgroup tools for Commander.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#429f4a',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
