// Het adres waarop deze app staat.
//
// Op één plek, want drie dingen leunen erop: de metadata (die relatieve
// afbeeldingen naar volledige URL's moet uitschrijven), de robots.txt en de
// sitemap. Zou elk daarvan zijn eigen adres kennen, dan gaan ze een keer uit de
// pas lopen — en dat merk je pas als iemand een gedeelde link opent.
//
// Als omgevingsvariabele met het live adres als terugval, zodat een testomgeving
// niet naar productie wijst.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL
  ?? 'https://agentic-commerce-discovery-readiness-scan.onrender.com';

/**
 * De pagina's die een bezoeker zonder account kan bereiken.
 *
 * Alleen deze horen in de sitemap. Wat erachter zit — dashboard, rapport,
 * inloggen — is van één account en heeft in een zoekmachine niets te zoeken.
 */
export const PUBLIC_PATHS = ['/', '/methode', '/over', '/prijzen', '/scan', '/demo'] as const;
