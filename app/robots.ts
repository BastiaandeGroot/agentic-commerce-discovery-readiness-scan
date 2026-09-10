// Wat een zoekmachine wel en niet mag indexeren.
//
// De marketingkant mag gevonden worden; alles achter een login niet. Een
// rapport-URL hoort daar nadrukkelijk bij: die draagt de uitkomst van één
// merchant, en die is van hem.

import type { MetadataRoute } from 'next';
import { SITE_URL } from '../src/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/rapport', '/inloggen', '/registreren', '/wachtwoord-vergeten', '/wachtwoord-herstellen', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
