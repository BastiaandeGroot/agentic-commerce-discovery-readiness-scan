// De sitetoets aanvragen bij de server.
//
// Los van `src/collect/`, dat puur moet blijven: hier wordt werkelijk een
// verzoek gedaan. De uitkomst is al nagelopen aan de serverkant; zie
// `readSiteAnswers`.

import { authHeader } from '../auth/client';
import type { SiteCheck, SiteQuestion } from '../collect/answers';

/** Waarom de toets niet liep, in een vorm waar het scherm een zin bij heeft. */
export class SiteCheckRefused extends Error {
  constructor(readonly reason: 'forbidden' | 'not-configured' | 'failed', message?: string) {
    super(message ?? reason);
    this.name = 'SiteCheckRefused';
  }
}

export async function requestSiteCheck(site: string, questions: SiteQuestion[], categories: string[] = []): Promise<SiteCheck> {
  let response: Response;
  try {
    response = await fetch('/api/site-answers', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ site, questions, categories }),
    });
  } catch {
    throw new SiteCheckRefused('failed');
  }
  if (response.status === 403) throw new SiteCheckRefused('forbidden');
  if (response.status === 503) throw new SiteCheckRefused('not-configured');
  const body = await response.json().catch(() => undefined) as (SiteCheck & { error?: string }) | undefined;
  if (!response.ok || !body || !Array.isArray(body.answers)) {
    throw new SiteCheckRefused('failed', body?.error);
  }
  return body;
}
