// De publieke pagina's, voor zoekmachines.
//
// Zonder datum per pagina: die zou uit een klok moeten komen en dan verandert
// hij bij elke build zonder dat er iets veranderd is. Een sitemap die elke dag
// zegt dat alles nieuw is, wordt genegeerd.

import type { MetadataRoute } from 'next';
import { PUBLIC_PATHS, SITE_URL } from '../src/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    changeFrequency: 'monthly' as const,
    priority: path === '/' ? 1 : 0.7,
  }));
}
