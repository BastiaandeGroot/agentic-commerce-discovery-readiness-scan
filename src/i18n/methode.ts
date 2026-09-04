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
      'Steeds vaker zoekt iemand een product niet zelf, maar vraagt hij het aan een AI-assistent. Die assistent leest jouw productdata en beslist daarmee of jouw product past bij wat de klant vraagt. Deze scan meet één ding: kan jouw productcatalogus de vragen beantwoorden die een koper in jouw markt stelt. Niet hoeveel velden je gevuld hebt — of de vragen beantwoord raken.',
    backToScan: 'Terug naar de scan',

    exampleTitle: 'Een voorbeeld',
    exampleBody:
      'Stel, iemand vraagt: "ik zoek verduisterende gordijnstof van 140 cm breed die tegen zonlicht kan". Om jouw stof te kunnen aanraden, moet de assistent drie dingen uit je data kunnen halen: dat het verduisterend is, hoe breed de baan is, en of hij kleurecht is. Staat één daarvan er niet in, dan valt jouw product af — niet omdat het niet voldoet, maar omdat het niet te controleren was.',
    exampleClose:
      'Dat is wat deze scan meet: hoeveel van dat soort vragen jouw data kan beantwoorden.',

    scopeTitle: '1. Beantwoordbaarheid, geen compleetheid',
    scopeBody:
      'Een compleetheidscontrole telt gevulde velden. Dat klinkt streng en is het niet: je kunt honderd procent scoren met honderd velden waar geen koper ooit naar vraagt, en zakken op een leeg veld dat niemand nodig heeft. Wij draaien het om. We beginnen bij de vragen die kopers in jouw markt stellen, en kijken pas daarna welke gegevens nodig zijn om ze te beantwoorden.',
    scopeOut:
      'Daarom bestaat een gat in dit rapport alleen als er een vraag door onbeantwoord blijft. Een leeg veld waar geen enkele vraag op leunt, komt niet in je lijst. En een gevuld veld dat de vraag niet beantwoordt, komt er wél in.',
    scopeOwn:
      'We meten je catalogus, niet je feed naar een kanaal. Dat is met opzet: in je PIM of je webshop staat wat je wéét van je producten, en een kanaalfeed is daar een afgeleide van. Los je het in je catalogus op, dan is elk kanaal daarna een instelling.',

    promiseTitle: '2. Wat we je wel en niet vertellen',
    promiseBody:
      'We beloven niet dat je vaker gevonden wordt. Dat zou een uitspraak zijn over software van OpenAI en Google waar wij niet in kunnen kijken, en die belofte kunnen we dus niet waarmaken.',
    promiseWhat:
      'Wat we wél zeggen: van de vragen die een koper in jouw categorie stelt, beantwoordt jouw data er zoveel. Dat gaat puur over je eigen gegevens. Je kunt het nakijken, en je kunt het ons tegenspreken. En de vragen die onbeantwoord blijven, zijn meteen je to-dolijst.',
    promiseCaveat:
      'Nog iets om te weten: een assistent kijkt niet alleen naar je productdata. Hij gebruikt ook je website, reviews op andere sites, je aanbod op marktplaatsen en wat hij zelf al geleerd heeft. Jouw catalogus is een belangrijke bron, maar niet de enige.',

    tiersTitle: '3. Niet elke vraag weegt even zwaar',
    tiersBody:
      'In elke markt bestaat een aankoopfout die de koper niet kan terugdraaien. Bij stof: op maat geknipt, dus geen retour. Bij een fietsband: gemonteerd en gereden. Bij verf: het blik is open. De vragen die díe fout voorkomen wegen bij ons het zwaarst — en dat is iets anders dan de vragen waar commercieel het meest over gepraat wordt.',
    tiersCore:
      'Kritiek. Zonder antwoord hoort een assistent jouw product niet aan te raden, hoe compleet de rest ook is. Deze vragen vormen samen de eerste trede van de trechter.',
    tiersSelection:
      'Hoog, middel en laag. Ze tellen alle drie mee, maar minder zwaar. In het rapport zie je daarom twee schalen naast elkaar: het aantal beantwoorde vragen, en wat dat aan gewichtspunten waard is.',
    tiersWhy:
      'Welke fout in jouw markt onomkeerbaar is, verzinnen we niet zelf. Dat komt uit het onderzoek achter je vragenbank, en het staat op je rapport zodat je het kunt tegenspreken.',

    funnelTitle: '4. Waarom je een trechter ziet en geen cijfer',
    funnelBody:
      'Bovenaan het rapport staan drie getallen onder elkaar: hoeveel producten je hebt, hoeveel er basisgeschikt zijn, en hoeveel er volledig beantwoord zijn.',
    funnelFindable:
      'Volledig betekent: élke vraag die in die categorie speelt, is te beantwoorden uit jouw catalogus. Er is geen "bijna": één open vraag en het telt niet.',
    funnelCompetitive:
      'Basisgeschikt betekent: elke kritieke vraag is beantwoord. Een lagere lat dan volledig, maar wel de lat waaronder een assistent jouw product beter niet kan aanraden.',
    funnelNoThreshold:
      'We gebruiken bewust geen scorepercentage met een grens als "boven de 70 is goed". Zo\'n grens is verzonnen, en het is het eerste waar je terecht over gaat discussiëren. Een lijstje concrete vragen kun je nakijken; een cijfer kun je alleen geloven of niet.',
    funnelPerProtocol:
      'Daarnaast staat er een gemiddelde: hoeveel vragen een product gemiddeld beantwoordt, en hoeveel gewichtspunten dat waard is. Die twee samen, want het aantal vragen is meteen te bevatten en de punten zeggen wat het waard is.',

    questionsTitle: '5. Waar die vragen vandaan komen',
    questionsBody:
      'De vragenlijsten bestaan nog niet als je hier binnenkomt. Ze worden gemaakt zodra je je catalogus hebt aangeleverd, en ze gaan over jouw eigen categorieën — niet over een indeling die wij hebben bedacht.',
    questionsSources:
      'Ze komen uit een vragenbank voor jouw markt. Wat we bewust níét doen is vragen afleiden uit je eigen bestanden. Dat je een kenmerk bijhoudt zegt namelijk nog niet dat een koper ernaar vraagt — en zouden we jouw kolommen tot vragenlijst maken, dan meten we of je catalogus zijn eigen velden draagt in plaats van of je data een koper bedient. Wie niets bijhoudt zou dan ook niet kunnen zakken.',
    questionsBank:
      'Zo\'n bank wordt gemaakt door vijf tot acht sites in jouw markt af te lopen — categorieleiders, specialisten, merken, en vaak een Duitse speler omdat die technischer publiceert — en op te schrijven welke vragen daar terugkomen. Per vraag noteren we op hoeveel van die sites het onderwerp voorkomt. Dat is geen meting van hoe vaak klanten het vragen, maar het is wel navolgbaar, en het is een stuk sterker dan het oordeel van één winkel.',
    questionsWeight:
      'Niet elke vraag weegt even zwaar. De zwaarste zijn de vragen die de aankoopfout voorkomen die jouw koper niet kan terugdraaien: stof die op maat geknipt is en dus niet terug mag, een band die al gemonteerd is, een verpakking die open is. Blijft daar één van open, dan haalt een product de eerste trede van de trechter niet — hoe compleet de rest ook is. Dat is iets anders dan commercieel belang.',
    questionsProvisional:
      'Voor markten waar nog geen bank ligt draaien we op een voorlopige set uit vakkennis. Je krijgt dan een volledig rapport, maar in het rapport staat er duidelijk bij dat de lat beredeneerd is en niet onderzocht. En je kunt een bank laten bouwen: de app stelt de aanvraag samen, en daar zit geen product en geen kolomnaam van jou in.',
    questionsValidation:
      'Daarna kijk jij ze na, en dat is het belangrijkste moment van de hele scan. Wij kennen jouw markt niet. Je kunt vragen anders formuleren, weghalen wat niet relevant is, en zelf toevoegen wat wij gemist hebben — ook gekoppeld aan een eigen kolom uit je catalogus. Pas als jij een set bevestigt telt hij mee, en je kunt die bevestiging altijd weer intrekken.',
    questionsLog:
      'Elke wijziging leggen we vast met datum en tijd. Dat lijkt bureaucratisch, maar het is nodig: als je over een half jaar opnieuw scant en de uitkomst is anders, wil je weten of je data is verbeterd of dat de vraagstelling is veranderd.',
    questionsFuture:
      'De beste bron voor deze vragen heb je zelf al liggen: je klantenservice. Dat zijn letterlijk de vragen die klanten stellen. Daar willen we naartoe.',

    qualityTitle: '6. Een veld invullen is nog geen antwoord geven',
    qualityBody:
      'De meeste controles kijken of een verplicht veld gevuld is. Daar houdt het op. Maar een omschrijving van vier woorden is wel gevuld en beantwoordt geen enkele vraag. Daarom hanteren wij een ondergrens: onder dit aantal woorden rekenen we een veld als niet ingevuld.',
    qualityWords: 'minimaal aantal woorden',

    gapsTitle: '7. Waarom bij elk gat staat wat voor werk het is',
    gapsBody:
      '"Ontbreekt" is geen werkopdracht. Het verschil dat je nodig hebt is of het veld al bestaat in je catalogus. Bestaat het en is het leeg, dan is dit invulwerk en kan iemand er deze week mee beginnen. Bestaat het niet, dan moet er eerst een veld komen — en dat is een beslissing over je datamodel, niet een middagje typen.',
    gapMapping:
      'Het veld staat in je catalogus, maar is bij deze producten niet ingevuld. De plek bestaat al; dit is de goedkoopste winst die er is en meestal ook de grootste.',
    gapEnrichment:
      'Je catalogus kent dit kenmerk helemaal niet: er is geen kolom voor. Er moet eerst een veld bij, en daarna pas een waarde. Dat is werk voor wie over je datamodel gaat.',
    gapNoSource:
      'Het gegeven komt uit een systeem dat een productcatalogus niet draagt — reviewcijfers, retourpercentages. Dit is geen invulwerk maar een beslissing over je systemen, en het hoort ook niet als tekortkoming van je PIM te lezen.',
    gapsWhy:
      'Zonder dat onderscheid zou je lijst er even lang uitzien, maar zou je niet weten wie je moet bellen en hoe lang het duurt.',
    gapsJoin:
      'Bij elk gat staat ook welke vragen erdoor blijven liggen. Een gat zonder vraag bestaat in dit rapport niet — precies het verschil met een lijst lege velden.',
    gapsNoCatalog:
      'Lever je een export waarin een kolom helemaal ontbreekt, dan zie je dat terug als modelwerk en niet als invulwerk. Klopt dat niet, dan staat de kolomherkenning in stap 1 en kun je hem daar corrigeren.',

    fieldsTitle: '8. Het veldenregister',
    fieldsBody:
      'Om een vraag te kunnen beantwoorden moeten we jouw kolomnamen herkennen. Daarvoor houden we een register bij: per gegeven de namen waaronder het in de praktijk voorkomt, en het systeem waar het normaal vandaan komt. Dat tweede bepaalt bij wie een gat terechtkomt. Het register draagt een datum, want een naam die we toevoegen laat een kenmerk herkennen dat er altijd al stond — en dat leest als vooruitgang terwijl er niets veranderde.',
    fieldsCount: 'velden in het register',
    fieldsOwner: 'Waar een gegeven normaal vandaan komt',

    driftTitle: '9. Waarom je uitkomst kan veranderen zonder dat jij iets deed',
    driftBody:
      'Drie dingen kunnen je uitkomst verschuiven buiten je eigen data om: wij passen de scanregels aan, de vragenbank voor jouw markt wordt vernieuwd, of jij past je eigen vragenlijst aan. Alle drie gebeuren, en alle drie zijn normaal.',
    driftStamp:
      'Daarom staat onderaan elk rapport tegen welke versie van de specificaties en tegen welke versie van je vragenlijst er gemeten is. Zo kun je twee scans naast elkaar leggen en zien of je echt vooruit bent gegaan, of dat alleen de meetlat is verschoven.',

    privacyTitle: '10. Waar je bestanden blijven',
    privacyBody:
      'De hele analyse gebeurt in je eigen browser. Je catalogusexport wordt niet geüpload en wij bewaren hem niet. Sluit je het tabblad, dan is alles weg.',
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

    scopeTitle: '1. Answerability, not completeness',
    scopeBody:
      'A completeness check counts filled fields. That sounds strict and is not: you can score a hundred per cent on a hundred fields no buyer ever asks about, and fail on an empty field nobody needs. We turn it around. We start from the questions buyers in your market ask, and only then look at which data is needed to answer them.',
    scopeOut:
      'So a gap in this report exists only where a question stays unanswered because of it. An empty field no question leans on does not make your list. A filled field that does not answer the question does.',
    scopeOwn:
      'We measure your catalogue, not your feed to a channel. That is deliberate: your PIM or webshop holds what you know about your products, and a channel feed is derived from it. Fix it in the catalogue and every channel afterwards is a setting.',

    promiseTitle: '2. What we do and do not tell you',
    promiseBody:
      'We do not promise you will be found more often. That would be a claim about software at OpenAI and Google that we cannot see inside, so it is not a promise we can keep.',
    promiseWhat:
      'What we do say: of the questions a buyer in your category asks, your data answers this many. That is purely about your own data. You can check it, and you can argue with us about it. And the questions left unanswered are your to-do list.',
    promiseCaveat:
      'One more thing worth knowing: an assistant does not only look at your product data. It also uses your website, reviews on other sites, your listings on marketplaces, and what it already learned. Your catalogue is an important source, but not the only one.',

    tiersTitle: '3. Not every question weighs the same',
    tiersBody:
      'Every market has a purchase mistake the buyer cannot undo. With fabric: cut to length, so no return. With a bicycle tyre: fitted and ridden. With paint: the tin is open. The questions that prevent that mistake carry the most weight here — and that is something other than the questions that get talked about most commercially.',
    tiersCore:
      'Critical. Without an answer an assistant should not recommend your product, however complete the rest is. Together these questions form the first step of the funnel.',
    tiersSelection:
      'High, medium and low. All three count, but less heavily. That is why the report shows two scales side by side: the number of questions answered, and what that is worth in weight points.',
    tiersWhy:
      'Which mistake is irreversible in your market is not something we invent. It comes from the research behind your question bank, and it is printed on your report so you can contradict it.',

    funnelTitle: '4. Why you see a funnel and not a score',
    funnelBody:
      'At the top of the report are three numbers: how many products you have, how many have baseline fit, and how many are fully answered.',
    funnelFindable:
      'Complete means every question that matters in that category can be answered from your catalogue. There is no "almost": one open question and it does not count.',
    funnelCompetitive:
      'Baseline fit means every critical question is answered. A lower bar than complete, but the bar below which an assistant had better not recommend your product.',
    funnelNoThreshold:
      'We deliberately avoid a score with a cut-off like "above 70 is good". Such a line is invented, and it is the first thing you would rightly argue about. A list of concrete questions you can check; a number you can only believe or not.',
    funnelPerProtocol:
      'Alongside that there is an average: how many questions a product answers on average, and how many weight points that is worth. Both together, because a count of questions is immediately graspable and the points say what it is worth.',

    questionsTitle: '5. Where those questions come from',
    questionsBody:
      'The question lists do not exist yet when you arrive here. They are built once you have supplied your catalogue, and they are about your own categories — not a classification we invented.',
    questionsSources:
      'They come from a question bank for your market. What we deliberately do not do is derive questions from your own files. The fact that you record something does not yet mean a buyer asks for it — and turning your columns into the question list would measure whether your catalogue carries its own fields rather than whether your data serves a buyer. Someone who records nothing could then never fail.',
    questionsBank:
      'Such a bank is built by working through five to eight sites in your market — category leaders, specialists, brands, and often a German player because they publish more technical detail — and writing down which questions keep coming back. Per question we note on how many of those sites the topic appears. That is not a measurement of how often customers ask it, but it is traceable, and it is a good deal stronger than the judgement of one shop.',
    questionsWeight:
      'Not every question weighs the same. The heaviest are the ones that prevent the purchase mistake your buyer cannot undo: fabric cut to length and therefore non-returnable, a tyre already fitted, a package already opened. If one of those stays open, a product does not clear the first step of the funnel — however complete the rest is. That is something other than commercial importance.',
    questionsProvisional:
      'For markets where no bank exists yet we run on a provisional set from domain knowledge. You still get a full report, but the report says plainly that the bar is reasoned rather than researched. And you can have a bank built: the app composes the request, and it contains none of your products and none of your column names.',
    questionsValidation:
      'Then you review them, and that is the most important moment in the whole scan. We do not know your market. You can reword questions, remove what is irrelevant, and add what we missed yourself — including bound to one of your own catalogue columns. A set counts only once you confirm it, and you can always withdraw that confirmation.',
    questionsLog:
      'Every change is recorded with date and time. That may look bureaucratic, but it is necessary: if you scan again in six months and the outcome differs, you want to know whether your data improved or the questions changed.',
    questionsFuture:
      'The best source for these questions is already in your building: your customer service. Those are literally the questions customers ask. That is where we want to get to.',

    qualityTitle: '6. Filling a field is not the same as answering',
    qualityBody:
      'Most checks look at whether a required field is filled. That is where it stops. But a four-word description is filled and answers nothing. So we apply a floor: below this word count we treat a field as not filled in.',
    qualityWords: 'minimum word count',

    gapsTitle: '7. Why every gap says what kind of work it is',
    gapsBody:
      '"Missing" is not a work instruction. The distinction you need is whether the field already exists in your catalogue. If it exists and is empty, this is data entry and someone can start this week. If it does not exist, a field has to be created first — and that is a decision about your data model, not an afternoon of typing.',
    gapMapping:
      'The field is in your catalogue but is not filled in for these products. The place already exists; this is the cheapest win there is and usually the biggest.',
    gapEnrichment:
      'Your catalogue does not know this characteristic at all: there is no column for it. A field has to be added first, and only then a value. That is work for whoever owns your data model.',
    gapNoSource:
      'The data comes from a system a product catalogue does not carry — review scores, return rates. This is not data entry but a decision about your systems, and it should not read as a shortcoming of your PIM either.',
    gapsWhy:
      'Without that distinction your list would look just as long, but you would not know who to call or how long it takes.',
    gapsJoin:
      'Every gap also names the questions it leaves unanswered. A gap without a question does not exist in this report — precisely the difference from a list of empty fields.',
    gapsNoCatalog:
      'If you supply an export where a column is missing entirely, you see that as model work rather than data entry. If that is wrong, the column recognition sits in step 1 and you can correct it there.',

    fieldsTitle: '8. The field register',
    fieldsBody:
      'To answer a question we have to recognise your column names. For that we keep a register: per data point the names it appears under in practice, and the system it normally comes from. That second part decides where a gap lands. The register carries a date, because a name we add makes a characteristic recognisable that was always there — and that reads as progress while nothing changed.',
    fieldsCount: 'fields in the register',
    fieldsOwner: 'Where a data point normally comes from',

    driftTitle: '9. Why your result can change without you doing anything',
    driftBody:
      'Three things can shift your result outside your own data: we adjust the scan rules, the question bank for your market is renewed, or you adjust your own question list. All three happen, and all three are normal.',
    driftStamp:
      'That is why every report states the scan version, the field register, the question bank with its version, and your own question set version. So you can put two scans side by side and see whether you really improved, or whether only the yardstick moved.',

    privacyTitle: '10. Where your files stay',
    privacyBody:
      'The entire analysis happens in your own browser. Your catalogue export is not uploaded and we do not store it. Close the tab and everything is gone.',
  },
};
