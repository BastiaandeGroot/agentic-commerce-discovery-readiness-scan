/**
 * Versie van de scanregels.
 *
 * Hoog dit op zodra een wijziging de uitkomst op ongewijzigde data kan
 * veranderen: een archetype dat een vraag krijgt, een drempel die verschuift,
 * een veld dat anders geclassificeerd wordt. Doe je dat niet, dan lijkt een
 * verschoven definitie op vooruitgang — en dat is precies wat vergelijken over
 * tijd waardeloos maakt.
 *
 * Puur cosmetische wijzigingen aan teksten of opmaak raken dit nummer niet.
 */
// 5.1.0 — een losstaande vragenset (geen basislaag) is een eigen categorie in het
// rapport, ook als de winkel hem dieper in de boom hangt. Eerst was dat een
// subrij van de tak erboven ("Meubelstoffen › Universele naaigarens").
// 5.2.0 — een categorie krijgt alleen een eigen vragenset als minstens één eigen
// vraag dekking > 0 heeft (in een bank die dekking draagt).
// 5.3.0 — een kritieke vraag die niet over het product gaat (koopzekerheid, een
// procesvraag, of niet uit kenmerken te beantwoorden) of een berekening is
// (antwoordtype afgeleid) telt als hoog, ook als een categorie haar herweegt; en
// het belang dat een beheerder corrigeerde telt mee.
export const SCAN_VERSION = '5.3.0';
