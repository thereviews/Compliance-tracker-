import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/settings',
        '/signin',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/invite',
        '/auth/',
        '/api/',
      ],
    },
    sitemap: 'https://compliancetracker-app.com/sitemap.xml',
  };
}
