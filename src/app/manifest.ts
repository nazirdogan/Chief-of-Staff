import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chief of Staff',
    short_name: 'Chief of Staff',
    description: 'Your AI-powered personal intelligence layer',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9f7f4',
    theme_color: '#3a3429',
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
