// Of er een Supabase-project aangesloten is, en welk.
//
// Apart van de client omdat de vraag "is dit ingericht?" op meer plekken speelt
// dan alleen daar: een scherm dat inloggen aanbiedt terwijl er geen dienst
// achter zit, laat iemand een wachtwoord bedenken voor een account dat nergens
// terechtkomt. Dat is erger dan eerlijk zeggen dat het nog niet aanstaat.
//
// De twee waarden dragen met opzet `NEXT_PUBLIC_`: ze horen in de browser thuis
// en zijn ontworpen om zichtbaar te zijn. Wat iemand ermee mag, bepaalt row
// level security in de database — niet de geheimhouding van deze sleutel.

/**
 * Next vervangt deze twee bij het bouwen door hun waarde. Dat werkt alleen als
 * ze letterlijk zo in de code staan; via een variabele opzoeken levert
 * `undefined` op in de browser.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * De instellingen, of `null` als er geen project aangesloten is.
 *
 * Bewust geen exception: de app moet zonder Supabase blijven draaien. De scan
 * zelf heeft er niets mee te maken en werkt volledig in de browser; alleen
 * bewaren en inloggen vallen weg, en die schermen zeggen dat dan zelf.
 */
export function supabaseConfig(): SupabaseConfig | null {
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
