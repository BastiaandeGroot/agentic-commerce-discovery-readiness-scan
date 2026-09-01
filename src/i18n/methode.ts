// Teksten voor de uitlegpagina.
//
// Doelgroep is de merchant, niet de bouwer. Dus: gewone taal, concrete
// voorbeelden, en vakterm alleen als hij meteen wordt uitgelegd. De feiten
// (checklists, drempels, veldtellingen) haalt de pagina uit de code, zodat de
// uitleg niet kan gaan afwijken van wat er werkelijk gebeurt.

export const METHODE = {
  nl: {
    title: 'Wat we controleren, en waarom',
    intro:
      'Steeds vaker zoekt iemand een product niet zelf, maar vraagt hij het aan een AI-assistent. Die assistent leest jouw productdata en beslist daarmee of jouw product past bij wat de klant vraagt. Deze scan kijkt of jouw data die vraag kan beantwoorden. Op deze pagina lees je precies wat we controleren en waarom.',
    backToScan: 'Terug naar de scan',

    exampleTitle: 'Een voorbeeld',
    exampleBody:
      'Stel, iemand vraagt: "ik zoek verduisterende gordijnstof van 140 cm breed die tegen zonlicht kan". Om jouw stof te kunnen aanraden, moet de assistent drie dingen uit je data kunnen halen: dat het verduisterend is, hoe breed de baan is, en of hij kleurecht is. Staat één daarvan er niet in, dan valt jouw product af — niet omdat het niet voldoet, maar omdat het niet te controleren was.',
    exampleClose:
      'Dat is wat deze scan meet: hoeveel van dat soort vragen jouw data kan beantwoorden.',

    scopeTitle: '1. We kijken alleen naar gevonden worden',
    scopeBody:
      'Er zijn twee dingen die een AI-assistent bij jou doet: je product vinden en aanraden, en het afrekenen. Deze scan gaat alleen over het eerste. Velden die over betalen, retourafhandeling en juridische verplichtingen gaan, tellen niet mee in je uitkomst.',
    scopeOut:
      'Ze verdwijnen niet. Je krijgt ze apart te zien als waarschuwing. Want als jouw producten prima vindbaar zijn maar niemand ze kan afrekenen, wil je dat van ons horen en niet van een klant die het niet lukte.',
    scopeOwn:
      'Waar precies de grens ligt tussen "vindbaar worden" en "afrekenen" is een keuze die wij hebben gemaakt. OpenAI en Google maken die indeling zelf niet. Daarom staat er een versienummer bij: als wij die grens verleggen, kun je dat terugzien.',

    promiseTitle: '2. Wat we je wel en niet vertellen',
    promiseBody:
      'We beloven niet dat je vaker gevonden wordt. Dat zou een uitspraak zijn over software van OpenAI en Google waar wij niet in kunnen kijken, en die belofte kunnen we dus niet waarmaken.',
    promiseWhat:
      'Wat we wél zeggen: van de vragen die een koper in jouw categorie stelt, beantwoordt jouw data er zoveel. Dat gaat puur over je eigen gegevens. Je kunt het nakijken, en je kunt het ons tegenspreken. En de vragen die onbeantwoord blijven, zijn meteen je to-dolijst.',
    promiseCaveat:
      'Nog iets om te weten: een assistent kijkt niet alleen naar je feed. Hij gebruikt ook je website, reviews op andere sites, je aanbod op marktplaatsen en wat hij zelf al geleerd heeft. Jouw productdata is een belangrijke bron, maar niet de enige.',

    tiersTitle: '3. Twee soorten vragen, apart gehouden',
    tiersBody:
      'We splitsen de controle in twee delen, omdat het twee verschillende problemen zijn met twee verschillende oplossingen.',
    tiersCore:
      'Past dit product bij wat de klant vraagt? Denk aan materiaal, afmetingen, kleur, waarvoor het geschikt is. Dit is werk voor je product- of contentteam.',
    tiersSelection:
      'Word ik gekozen boven een vergelijkbaar product van iemand anders? Denk aan prijs, voorraad, een streepjescode, beoordelingen en je retourbeleid. Dit ligt vaak bij heel andere partijen: je reviewplatform, je klantenservice, je ERP.',
    tiersWhy:
      'We tellen die twee bewust niet bij elkaar op tot één rapportcijfer. Een product kan tot in detail beschreven zijn en tóch nooit gekozen worden. Als je daar één getal van maakt, zie je niet meer welke van de twee het probleem is — en dus ook niet wie je moet bellen.',

    funnelTitle: '4. Waarom je een trechter ziet en geen cijfer',
    funnelBody:
      'Bovenaan het rapport staan drie getallen onder elkaar: hoeveel producten je hebt, hoeveel er vindbaar zijn, en hoeveel er concurrerend zijn.',
    funnelFindable:
      'Vindbaar betekent: alle vragen die in die categorie spelen, zijn te beantwoorden uit jouw data.',
    funnelCompetitive:
      'Concurrerend betekent: ook prijs, voorraad, streepjescode, een beoordeling en je retourbeleid staan erbij.',
    funnelNoThreshold:
      'We gebruiken bewust geen scorepercentage met een grens als "boven de 70 is goed". Zo\'n grens is verzonnen, en het is het eerste waar je terecht over gaat discussiëren. Een lijstje concrete vragen kun je nakijken; een cijfer kun je alleen geloven of niet.',
    funnelPerProtocol:
      'Je ziet alles twee keer: één keer voor ChatGPT en één keer voor Google. Dat is geen dubbeling. De twee vragen namelijk andere dingen. ChatGPT wil bijvoorbeeld reviews in je feed hebben, Google verwacht die juist ergens anders. Één gezamenlijk getal zou dat verschil wegpoetsen.',

    questionsTitle: '5. Waar die vragen vandaan komen',
    questionsBody:
      'De vragenlijsten bestaan nog niet als je hier binnenkomt. Ze worden gemaakt zodra je je bestanden hebt aangeleverd, en ze gaan over jouw eigen categorieën — niet over een indeling die wij hebben bedacht.',
    questionsSources:
      'Ze komen uit twee hoeken. Ten eerste uit onze bibliotheek met vragen die in dat soort categorieën normaal gesproken spelen. Ten tweede uit je eigen data: als je in het PIM voor bijna elk product netjes een kenmerk als "motief" of "waterafstotend" bijhoudt, is dat blijkbaar belangrijk in jouw assortiment — en dan hoort er een vraag over te bestaan.',
    questionsValidation:
      'Daarna kijk jij ze na, en dat is het belangrijkste moment van de hele scan. Wij kennen jouw markt niet. Je kunt vragen anders formuleren, weghalen wat niet relevant is, en toevoegen wat wij gemist hebben. Pas als jij ze hebt bevestigd, draait de scan.',
    questionsLog:
      'Elke wijziging leggen we vast met datum en tijd. Dat lijkt bureaucratisch, maar het is nodig: als je over een half jaar opnieuw scant en de uitkomst is anders, wil je weten of je data is verbeterd of dat de vraagstelling is veranderd.',
    questionsFuture:
      'De beste bron voor deze vragen heb je zelf al liggen: je klantenservice. Dat zijn letterlijk de vragen die klanten stellen. Daar willen we naartoe.',

    qualityTitle: '6. Een veld invullen is nog geen antwoord geven',
    qualityBody:
      'Google en OpenAI controleren of een verplicht veld gevuld is. Daar houdt het op. Maar een omschrijving van vier woorden is wel gevuld en zegt niets. Daarom hanteren wij een ondergrens: onder dit aantal woorden rekenen we een veld als niet ingevuld.',
    qualityWords: 'minimaal aantal woorden',

    gapsTitle: '7. Waarom we ook je PIM-export vragen',
    gapsBody:
      'Dit is het deel dat je nergens anders krijgt. Google en OpenAI kijken alleen naar je feed, en kunnen dus alleen zeggen dát er iets ontbreekt. Door je feed naast je PIM-export te leggen, kunnen we zeggen waaróm het ontbreekt. En dat maakt voor jou een enorm verschil in werk.',
    gapMapping:
      'De informatie staat gewoon in je PIM, maar komt niet mee in je feed. Dit is een instelling aanpassen. Vaak een middag werk voor je feedbeheerder.',
    gapEnrichment:
      'De informatie staat nergens: niet in je feed, niet in je PIM. Iemand moet hem per product gaan invullen. Reken op maanden.',
    gapNoSource:
      'De informatie bestaat in geen enkel systeem dat je kunt uitlezen. Denk aan reviewcijfers als je geen reviewplatform hebt, of retourpercentages die alleen in je ERP zitten. Dit is geen invulwerk maar een beslissing over je systemen.',
    gapsWhy:
      'Zonder dat onderscheid zou je lijst met ontbrekende velden er even lang uitzien, maar zou je niet weten of je een middag of een half jaar bezig bent.',
    gapsJoin:
      'We koppelen je twee bestanden op meerdere kenmerken tegelijk: artikelnummer, EAN, fabrikantcode en intern id. Dat is nodig omdat feeds en PIM-systemen zelden hetzelfde nummer vooraan zetten. Zouden we op één veld koppelen en dat matcht niet, dan lijkt plotseling alles te ontbreken.',
    gapsNoCatalog:
      'Lever je alleen een feed aan, dan werkt de scan gewoon — maar dan kunnen we niet zien of iets een instelling is of echt ontbreekt. Dat staat dan ook zo in je rapport.',

    fieldsTitle: '8. Waartegen we meten',
    fieldsBody:
      'We meten tegen de officiële specificaties van OpenAI en Google, zoals die er op de datum van deze snapshot uitzagen. Die twee zijn heel verschillend van vorm: OpenAI beschrijft alle velden zelf, terwijl Google voortbouwt op de Merchant Center-feed die je waarschijnlijk al hebt. Sta je al in Google Shopping, dan ben je een stuk dichter bij Google dan bij OpenAI.',

    driftTitle: '9. Waarom je uitkomst kan veranderen zonder dat jij iets deed',
    driftBody:
      'Twee dingen kunnen je uitkomst verschuiven buiten je eigen data om: OpenAI of Google wijzigt zijn specificatie, of jij past je vragenlijst aan. Allebei gebeurt, en allebei is normaal.',
    driftStamp:
      'Daarom staat onderaan elk rapport tegen welke versie van de specificaties en tegen welke versie van je vragenlijst er gemeten is. Zo kun je twee scans naast elkaar leggen en zien of je echt vooruit bent gegaan, of dat alleen de meetlat is verschoven.',

    privacyTitle: '10. Waar je bestanden blijven',
    privacyBody:
      'De hele analyse gebeurt in je eigen browser. Je feed en je PIM-export worden niet geüpload en wij bewaren ze niet. Sluit je het tabblad, dan is alles weg.',
  },

  en: {
    title: 'What we check, and why',
    intro:
      'More and more often, someone does not search for a product themselves but asks an AI assistant. That assistant reads your product data and decides from it whether your product matches what the customer asked for. This scan checks whether your data can answer that question. This page sets out exactly what we check and why.',
    backToScan: 'Back to the scan',

    exampleTitle: 'An example',
    exampleBody:
      'Suppose someone asks: "I need blackout curtain fabric 140 cm wide that stands up to sunlight." To recommend your fabric, the assistant needs three things from your data: that it blocks light, how wide the roll is, and whether it is colourfast. If one of those is missing, your product drops out — not because it fails, but because it could not be checked.',
    exampleClose:
      'That is what this scan measures: how many questions of that kind your data can answer.',

    scopeTitle: '1. We only look at being found',
    scopeBody:
      'An AI assistant does two things with your shop: it finds and recommends your product, and it handles checkout. This scan is only about the first. Fields about payment, returns handling and legal obligations do not count towards your result.',
    scopeOut:
      'They do not vanish, though. You get them separately as a warning. Because if your products are perfectly findable but nobody can check out, you want to hear that from us and not from a customer who failed to buy.',
    scopeOwn:
      'Where exactly the line sits between "being found" and "checking out" is a choice we made. OpenAI and Google do not draw that line themselves. That is why it carries a version number: if we move it, you can see that.',

    promiseTitle: '2. What we do and do not tell you',
    promiseBody:
      'We do not promise you will be found more often. That would be a claim about software at OpenAI and Google that we cannot see inside, so it is not a promise we can keep.',
    promiseWhat:
      'What we do say: of the questions a buyer in your category asks, your data answers this many. That is purely about your own data. You can check it, and you can argue with us about it. And the questions left unanswered are your to-do list.',
    promiseCaveat:
      'One more thing worth knowing: an assistant does not only look at your feed. It also uses your website, reviews on other sites, your listings on marketplaces, and what it already learned. Your product data is an important source, but not the only one.',

    tiersTitle: '3. Two kinds of question, kept apart',
    tiersBody:
      'We split the check in two, because these are two different problems with two different fixes.',
    tiersCore:
      'Does this product match what the customer asked for? Think material, dimensions, colour, what it is suitable for. This is work for your product or content team.',
    tiersSelection:
      'Am I picked over a comparable product from someone else? Think price, stock, a barcode, ratings and your return policy. This often sits with quite different parties: your reviews platform, your customer service, your ERP.',
    tiersWhy:
      'We deliberately do not add the two together into one grade. A product can be described in perfect detail and still never be chosen. Turn that into a single number and you can no longer see which of the two is the problem — and so not who to call.',

    funnelTitle: '4. Why you see a funnel and not a score',
    funnelBody:
      'At the top of the report are three numbers: how many products you have, how many are findable, and how many are competitive.',
    funnelFindable:
      'Findable means every question that matters in that category can be answered from your data.',
    funnelCompetitive:
      'Competitive means price, stock, barcode, a rating and your return policy are there too.',
    funnelNoThreshold:
      'We deliberately avoid a score with a cut-off like "above 70 is good". Such a line is invented, and it is the first thing you would rightly argue about. A list of concrete questions you can check; a number you can only believe or not.',
    funnelPerProtocol:
      'You see everything twice: once for ChatGPT and once for Google. That is not duplication. The two ask for different things. ChatGPT wants reviews inside your feed, for instance, while Google expects them elsewhere. One combined number would paper over that difference.',

    questionsTitle: '5. Where those questions come from',
    questionsBody:
      'The question lists do not exist yet when you arrive here. They are built once you have supplied your files, and they are about your own categories — not a classification we invented.',
    questionsSources:
      'They come from two directions. First, our library of questions that normally matter in that kind of category. Second, your own data: if your PIM diligently records something like "pattern" or "water resistant" for almost every product, then it evidently matters in your range — and there should be a question about it.',
    questionsValidation:
      'Then you review them, and that is the most important moment in the whole scan. We do not know your market. You can reword questions, remove what is irrelevant, and add what we missed. Only once you confirm them does the scan run.',
    questionsLog:
      'Every change is recorded with date and time. That may look bureaucratic, but it is necessary: if you scan again in six months and the outcome differs, you want to know whether your data improved or the questions changed.',
    questionsFuture:
      'The best source for these questions is already in your building: your customer service. Those are literally the questions customers ask. That is where we want to get to.',

    qualityTitle: '6. Filling a field is not the same as answering',
    qualityBody:
      'Google and OpenAI check whether a required field is filled. That is where it stops. But a four-word description is filled and says nothing. So we apply a floor: below this word count we treat a field as not filled in.',
    qualityWords: 'minimum word count',

    gapsTitle: '7. Why we also ask for your PIM export',
    gapsBody:
      'This is the part you get nowhere else. Google and OpenAI only look at your feed, so they can only tell you that something is missing. By reading your feed alongside your PIM export, we can tell you why it is missing. And that makes an enormous difference to your workload.',
    gapMapping:
      'The information is sitting in your PIM but does not travel into your feed. This is a setting to change. Often an afternoon for whoever manages your feed.',
    gapEnrichment:
      'The information is nowhere: not in your feed, not in your PIM. Someone has to fill it in product by product. Expect months.',
    gapNoSource:
      'The information exists in no system you can read. Think ratings when you have no reviews platform, or return rates that live only in your ERP. This is not data entry but a decision about your systems.',
    gapsWhy:
      'Without that distinction your list of missing fields would look just as long, but you would not know whether you are facing an afternoon or half a year.',
    gapsJoin:
      'We join your two files on several identifiers at once: article number, EAN, manufacturer code and internal id. That is necessary because feeds and PIM systems rarely lead with the same number. Join on one field and miss, and suddenly everything looks missing.',
    gapsNoCatalog:
      'Supply only a feed and the scan works fine — but then we cannot see whether something is a setting or genuinely absent. The report says so where that applies.',

    fieldsTitle: '8. What we measure against',
    fieldsBody:
      'We measure against the official specifications from OpenAI and Google as they stood on the date of this snapshot. The two differ in shape: OpenAI describes every field itself, while Google builds on the Merchant Center feed you probably already run. If you are already in Google Shopping, you are considerably closer to Google than to OpenAI.',

    driftTitle: '9. Why your result can change without you doing anything',
    driftBody:
      'Two things can shift your result outside your own data: OpenAI or Google changes its specification, or you adjust your question list. Both happen, and both are normal.',
    driftStamp:
      'That is why every report states which version of the specifications and which version of your question list it was measured against. So you can put two scans side by side and see whether you really improved, or whether only the yardstick moved.',

    privacyTitle: '10. Where your files stay',
    privacyBody:
      'The entire analysis happens in your own browser. Your feed and PIM export are not uploaded and we do not store them. Close the tab and everything is gone.',
  },
};
