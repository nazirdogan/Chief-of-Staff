import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Donna',
    short_name: 'Donna',
    description: 'See everything. Miss nothing.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1B1F3A',
    theme_color: '#1B1F3A',
    orientation: 'any',
    categories: ['productivity', 'business'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
