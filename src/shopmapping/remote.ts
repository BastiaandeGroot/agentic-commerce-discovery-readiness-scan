// De koppelingen van dezelfde webshop ophalen, over accounts heen.
//
// Mislukt dit, dan is er gewoon niets om over te nemen: het is een hulp en geen
// voorwaarde. Zie `app/api/shop-mapping/route.ts` voor wat er terugkomt.

import { authHeader } from '../auth/client';
import type { Mapping } from '../questions/mapping';

export async function requestShopMappings(site: string, columns: string[]): Promise<Mapping[]> {
  try {
    const response = await fetch('/api/shop-mapping', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ site, columns }),
    });
    if (!response.ok) return [];
    const body = await response.json() as { mappings?: unknown };
    return Array.isArray(body.mappings) ? body.mappings as Mapping[] : [];
  } catch {
    return [];
  }
}
