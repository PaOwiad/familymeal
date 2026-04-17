// ═══════════════════════════════════════════
// SUPABASE CONFIG
// ═══════════════════════════════════════════
const SUPABASE_URL  = 'https://tazphkvsdfqcneogeqhm.supabase.co';   
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhenBoa3ZzZGZxY25lb2dlcWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjMxOTQsImV4cCI6MjA5MTg5OTE5NH0.melmqa_ylqhUey7gllyDHH6qk8W9op1lq5EEVLuZvYQ'; 
const sb = (SUPABASE_URL !== 'YOUR_SUPABASE_URL')
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON, { db: { schema: 'edu' } })
  : null; // offline-Modus: nur localStorage

'use strict';
// ═══════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════
const MDL = 'claude-sonnet-4-20250514';
const API = 'https://api.anthropic.com/v1/messages';

// ═══════════════════════════════════════════
// PHASE 3: HARDCODED API KEY
// Hier einen fixen Key eintragen (optional).
// Nur mit Admin-PIN sichtbar/änderbar.
// Leer lassen ('') = Nutzer muss eigenen Key eingeben.
// ═══════════════════════════════════════════
const HARDCODED_API_KEY = '';

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
const ST = {
  apiKey:'', profiles:[], activeProfile:0,
  user_config:    {id:'',name:'',profile_type:'z1',level:'A1'},
  learning_state: {current_topic:'',difficulty_offset:0},
  progress:       {learn:0,listen:0,exam:0},
  lang:'en', xp:0, streak:0, done:0,
  skills:{h:0,l:0,s:0,w:0,r:0,m:0},
  currentScenario:'restaurant',
  currentExamType:'reading',
};

// ═══════════════════════════════════════════
// PHASE 1a — BACKBONE: Themen-Datenstruktur
// Alle Inhalte erhalten type: 'lp21' | 'adult'
// Zyklus-Engine: Zyklus → Schuljahr → Niveau → Inhalte
// ═══════════════════════════════════════════

// Zyklus-Mapping: Schuljahr → {zyklus, niveau, label}
const ZYKLUS_MAP = {
  // Zyklus 1: Kindergarten (KG1/KG2) + 1. + 2. Klasse
  // Hier: KG1=0, KG2=0.5 nicht abgebildet → Klasse 1 & 2 = Z1
  'kg1': {zyklus:1, niveau:'A1', label:'Kindergarten 1 (Z1)'},
  'kg2': {zyklus:1, niveau:'A1', label:'Kindergarten 2 (Z1)'},
  1: {zyklus:1, niveau:'A1', label:'1. Klasse (Z1)'},
  2: {zyklus:1, niveau:'A1', label:'2. Klasse (Z1)'},
  // Zyklus 2: 3.–6. Klasse
  3: {zyklus:2, niveau:'A1', label:'3. Klasse (Z2)'},
  4: {zyklus:2, niveau:'A2', label:'4. Klasse (Z2)'},
  5: {zyklus:2, niveau:'A2', label:'5. Klasse (Z2)'},
  6: {zyklus:2, niveau:'B1', label:'6. Klasse (Z2)'},
  // Zyklus 3: 7.–9. Klasse (Sek I)
  7: {zyklus:3, niveau:'B1', label:'7. Klasse (Z3)'},
  8: {zyklus:3, niveau:'B1', label:'8. Klasse (Z3)'},
  9: {zyklus:3, niveau:'B2', label:'9. Klasse (Z3)'},
 10: {zyklus:3, niveau:'B2', label:'10. Klasse (Sek)'},
 11: {zyklus:3, niveau:'C1', label:'11. Klasse (Gym)'},
};

// Profil-Typ → Kategorie
const PTYPE_CATEGORY = {
  z1:'lp21', z2:'lp21', z3:'lp21', hs:'lp21', adult:'adult'
};

// Backbone-Datenstruktur: {sprache → einheit → thema → {vokabeln, texte, grammatik, type}}
// Phase 1a: Struktur definiert, Inhalte werden in Phase 2 befüllt
const EDU_BACKBONE = {
  en: {
    type: 'lp21',
    einheiten: [
      // ── KG1 / KG2 — Spielerischer Einstieg ──
      {id:'en-kg-u1', zyklus:1, klassen:['kg1','kg2',1,2], niveau:'A1', thema:'Hello & Goodbye',
       vokabeln:['hello','hi','bye','goodbye','good morning','good night','please','thank you','yes','no'],
       grammatik:"Hello! / Goodbye! — einfache Begrüssungen", type:'lp21'},
      {id:'en-kg-u2', zyklus:1, klassen:['kg1','kg2',1,2], niveau:'A1', thema:'Colors',
       vokabeln:['red','blue','yellow','green','orange','pink','purple','white','black','brown'],
       grammatik:"It is + color / I like + color", type:'lp21'},
      {id:'en-kg-u3', zyklus:1, klassen:['kg1','kg2',1], niveau:'A1', thema:'Numbers 1–10',
       vokabeln:['one','two','three','four','five','six','seven','eight','nine','ten'],
       grammatik:"I have + number", type:'lp21'},
      // ── Klasse 1–2 ──
      {id:'en-z1-u1', zyklus:1, klassen:[1,2], niveau:'A1', thema:'Greetings & Introductions',
       vokabeln:['hello','goodbye','my name is','how are you','I am fine','please','thank you','yes','no','friend'],
       grammatik:"Simple present: I am, You are", type:'lp21'},
      {id:'en-z1-u2', zyklus:1, klassen:[1,2], niveau:'A1', thema:'Colors & Numbers',
       vokabeln:['red','blue','green','yellow','one','two','three','four','five','ten'],
       grammatik:"This is + color/number", type:'lp21'},
      {id:'en-z1-u3', zyklus:1, klassen:[1,2], niveau:'A1', thema:'Family',
       vokabeln:['mother','father','sister','brother','family','grandma','grandpa','baby','cat','dog'],
       grammatik:"My + family member", type:'lp21'},
      {id:'en-z1-u4', zyklus:1, klassen:[2], niveau:'A1', thema:'Animals',
       vokabeln:['cat','dog','bird','fish','horse','cow','elephant','lion','rabbit','duck'],
       grammatik:"It is a + animal", type:'lp21'},
      // ── Zyklus 2: 3.–4. Klasse (Einstieg Englisch, A1) ──
      {id:'en-z2-u1a', zyklus:2, klassen:[3,4], niveau:'A1', thema:'Hello & My World',
       vokabeln:['hello','goodbye','my name','how old','I am','please','thank you','yes','no','friend'],
       grammatik:"I am / My name is / I am ... years old", type:'lp21'},
      {id:'en-z2-u2a', zyklus:2, klassen:[3,4], niveau:'A1', thema:'My School',
       vokabeln:['school','teacher','pencil','book','bag','table','chair','board','lesson','class'],
       grammatik:"This is a... / These are...", type:'lp21'},
      {id:'en-z2-u3a', zyklus:2, klassen:[3,4], niveau:'A1', thema:'My Body & Health',
       vokabeln:['head','eyes','nose','mouth','hand','foot','big','small','sick','healthy'],
       grammatik:"I have got / He has got + body part", type:'lp21'},
      {id:'en-z2-u4a', zyklus:2, klassen:[3,4], niveau:'A1', thema:'Food & Drinks',
       vokabeln:['apple','bread','milk','water','banana','cake','cheese','egg','juice','sandwich'],
       grammatik:"I like / I don't like + food", type:'lp21'},
      // ── Zyklus 2: 5.–6. Klasse (A2) ──
      {id:'en-z2-u1', zyklus:2, klassen:[5,6], niveau:'A2', thema:'School & Daily Life',
       vokabeln:['school','teacher','pencil','book','homework','friend','lunch','sport','music','classroom'],
       grammatik:"Present simple: do/does, questions", type:'lp21'},
      {id:'en-z2-u2', zyklus:2, klassen:[5,6], niveau:'A2', thema:'Free Time & Hobbies',
       vokabeln:['football','swimming','reading','cycling','drawing','computer','cinema','music','dance','game'],
       grammatik:"I like/love/enjoy + -ing", type:'lp21'},
      {id:'en-z2-u3', zyklus:2, klassen:[5,6], niveau:'A2', thema:'Food & Eating',
       vokabeln:['breakfast','lunch','dinner','apple','bread','water','milk','vegetables','pizza','hungry'],
       grammatik:"Would you like...? I would like...", type:'lp21'},
      {id:'en-z2-u4', zyklus:2, klassen:[5,6], niveau:'A2', thema:'Travel & Holidays',
       vokabeln:['holiday','beach','mountains','hotel','suitcase','passport','airplane','train','weather','souvenir'],
       grammatik:"Past simple: was/were, went", type:'lp21'},
      {id:'en-z2-u5', zyklus:2, klassen:[5,6], niveau:'A2', thema:'Nature & Environment',
       vokabeln:['forest','river','pollution','recycling','animal','weather','climate','nature','protect','planet'],
       grammatik:"Should/shouldn't + infinitive", type:'lp21'},
      {id:'en-z2-u6', zyklus:2, klassen:[6], niveau:'B1', thema:'People & Personalities',
       vokabeln:['friendly','creative','shy','brave','honest','ambitious','curious','patient','confident','generous'],
       grammatik:"Adjectives to describe people; comparative", type:'lp21'},
      {id:'en-z3-u1', zyklus:3, klassen:[7,8,9], niveau:'B1', thema:'Society & Media',
       vokabeln:['social media','news','opinion','advertisement','influence','teenager','pressure','online','privacy','digital'],
       grammatik:"Present perfect: have/has + past participle", type:'lp21'},
      {id:'en-z3-u2', zyklus:3, klassen:[7,8,9], niveau:'B1', thema:'Work & Future',
       vokabeln:['job','career','application','interview','skills','salary','company','future','plan','experience'],
       grammatik:"Will/going to + infinitive (future)", type:'lp21'},
      {id:'en-z3-u3', zyklus:3, klassen:[7,8,9], niveau:'B1', thema:'Environment & Climate',
       vokabeln:['climate change','renewable energy','carbon footprint','global warming','sustainable','recycle','deforestation','pollution','solution','responsibility'],
       grammatik:"Conditional: if + present, will + infinitive", type:'lp21'},
      {id:'en-z3-u4', zyklus:3, klassen:[8,9], niveau:'B2', thema:'Global Issues',
       vokabeln:['poverty','inequality','human rights','democracy','conflict','migration','cooperation','justice','politics','development'],
       grammatik:"Passive voice: is/are/was + past participle", type:'lp21'},
    ]
  },
  fr: {
    type: 'lp21',
    einheiten: [
      {id:'fr-z2-u1', zyklus:2, klassen:[5,6], niveau:'A1', thema:'Bonjour & Se presenter',
       vokabeln:['bonjour','au revoir','je m’appelle','s’il vous plaît','merci','oui','non','ami','famille','classe'],
       grammatik:"Present etre/avoir: je suis, j'ai", type:'lp21'},
      {id:'fr-z2-u2', zyklus:2, klassen:[5,6], niveau:'A1', thema:'La famille & les animaux',
       vokabeln:['mère','père','frère','soeur','grand-mère','grand-père','chat','chien','lapin','oiseau'],
       grammatik:"Mon/ma/mes + famille", type:'lp21'},
      {id:'fr-z2-u3', zyklus:2, klassen:[5,6], niveau:'A2', thema:"L ecole et la vie quotidienne",
       vokabeln:['ecole','professeur','cahier','livre','devoir','sport','musique','cantine','classe','recreation'],
       grammatik:"Present regulier: -er verbes (parler, manger)", type:'lp21'},
      {id:'fr-z2-u4', zyklus:2, klassen:[6], niveau:'A2', thema:'Les loisirs & le sport',
       vokabeln:['football','natation','lecture','velo','dessin','cinema','musique','danse','jeu','vacances'],
       grammatik:"J'aime / j'adore + infinitif", type:'lp21'},
      {id:'fr-z2-u5', zyklus:2, klassen:[6], niveau:'A2', thema:'La nourriture & les repas',
       vokabeln:['petit-dejeuner','dejeuner','diner','pomme','pain','eau','lait','legumes','fromage','delicieux'],
       grammatik:"Tu veux...? Je voudrais... / du, de la, de l'", type:'lp21'},
      {id:'fr-z2-u6', zyklus:2, klassen:[6], niveau:'A2', thema:'La maison & les pieces',
       vokabeln:['maison','cuisine','salon','chambre','salle de bain','jardin','escalier','fenetre','porte','meuble'],
       grammatik:"Il y a + article + nom / C'est + adj.", type:'lp21'},
      {id:'fr-z3-u1', zyklus:3, klassen:[7,8,9], niveau:'A2', thema:'La ville & les transports',
       vokabeln:['ville','metro','bus','gare','magasin','pharmacie','hopital','tourner','traverser','direction'],
       grammatik:"Imperatif: tourne, prends, vas-y", type:'lp21'},
      {id:'fr-z3-u2', zyklus:3, klassen:[7,8,9], niveau:'B1', thema:'Les medias & la societe',
       vokabeln:['reseaux sociaux','actualites','opinion','publicite','influence','adolescent','numerique','pression','vie privee','information'],
       grammatik:"Passe compose: avoir/etre + participe passe", type:'lp21'},
      {id:'fr-z3-u3', zyklus:3, klassen:[7,8,9], niveau:'B1', thema:"L'environnement & l'ecologie",
       vokabeln:['environnement','rechauffement','recyclage','energie','pollution','foret','planete','durable','proteger','solution'],
       grammatik:"Il faut + infinitif / on devrait + infinitif", type:'lp21'},
      {id:'fr-z3-u4', zyklus:3, klassen:[8,9], niveau:'B1', thema:"Le travail & l'avenir",
       vokabeln:['metier','emploi','entreprise','competences','salaire','avenir','formation','candidature','entretien','projet'],
       grammatik:"Futur simple: je ferai, j'irai, je serai", type:'lp21'},
      {id:'fr-z3-u5', zyklus:3, klassen:[8,9], niveau:'B1', thema:'La sante & le corps',
       vokabeln:['sante','medecin','medicament','maladie','hopital','douleur','symptome','ordonnance','guerir','bien-etre'],
       grammatik:"Subjonctif: il faut que tu sois / que tu aies", type:'lp21'},
    ]
  },
  it: {
    type: 'lp21',
    einheiten: [
      {id:'it-z2-u1', zyklus:2, klassen:[5,6], niveau:'A1', thema:'Ciao & Presentarsi',
       vokabeln:['ciao','arrivederci','mi chiamo','come ti chiami','per favore','grazie','si','no','amico','famiglia'],
       grammatik:"Presente essere/avere: io sono, ho", type:'lp21'},
      {id:'it-z2-u2', zyklus:2, klassen:[5,6], niveau:'A1', thema:'La famiglia & gli animali',
       vokabeln:['madre','padre','fratello','sorella','nonna','nonno','gatto','cane','coniglio','uccello'],
       grammatik:"Il mio/la mia/i miei + famiglia", type:'lp21'},
      {id:'it-z2-u3', zyklus:2, klassen:[5,6], niveau:'A2', thema:'La scuola & la vita quotidiana',
       vokabeln:['scuola','professore','quaderno','libro','compiti','sport','musica','mensa','classe','ricreazione'],
       grammatik:"Presente regolare: -are verbi (parlare, mangiare)", type:'lp21'},
      {id:'it-z2-u4', zyklus:2, klassen:[6], niveau:'A2', thema:'Il tempo libero & lo sport',
       vokabeln:['calcio','nuoto','lettura','bicicletta','disegno','cinema','musica','danza','gioco','vacanze'],
       grammatik:"Mi piace / adoro + infinito", type:'lp21'},
      {id:'it-z2-u5', zyklus:2, klassen:[6], niveau:'A2', thema:'Il cibo & i pasti',
       vokabeln:['colazione','pranzo','cena','mela','pane','acqua','latte','verdura','formaggio','delizioso'],
       grammatik:"Vuoi...? Vorrei... / del, della, dello", type:'lp21'},
      {id:'it-z2-u6', zyklus:2, klassen:[6], niveau:'A2', thema:'La casa & le stanze',
       vokabeln:['casa','cucina','soggiorno','camera','bagno','giardino','scale','finestra','porta','mobile'],
       grammatik:"C'e + articolo + nome / Ci sono + nom plurale", type:'lp21'},
      {id:'it-z3-u1', zyklus:3, klassen:[7,8,9], niveau:'A2', thema:'La citta & i trasporti',
       vokabeln:['citta','metropolitana','autobus','stazione','negozio','farmacia','ospedale','girare','attraversare','direzione'],
       grammatik:"Imperativo: gira, prendi, vai", type:'lp21'},
      {id:'it-z3-u2', zyklus:3, klassen:[7,8,9], niveau:'B1', thema:'I media & la societa',
       vokabeln:['social media','notizie','opinione','pubblicita','influenza','adolescente','digitale','pressione','privacy','informazione'],
       grammatik:"Passato prossimo: avere/essere + participio", type:'lp21'},
      {id:'it-z3-u3', zyklus:3, klassen:[7,8,9], niveau:'B1', thema:"L'ambiente & l'ecologia",
       vokabeln:['ambiente','riscaldamento','riciclo','energia','inquinamento','foresta','pianeta','sostenibile','proteggere','soluzione'],
       grammatik:"Si deve + infinito / bisogna + infinito", type:'lp21'},
      {id:'it-z3-u4', zyklus:3, klassen:[8,9], niveau:'B1', thema:'Il lavoro & il futuro',
       vokabeln:['lavoro','mestiere','azienda','competenze','stipendio','futuro','formazione','candidatura','colloquio','progetto'],
       grammatik:"Futuro semplice: faro, andro, saro", type:'lp21'},
      {id:'it-z3-u5', zyklus:3, klassen:[8,9], niveau:'B1', thema:'La salute & il corpo',
       vokabeln:['salute','medico','medicina','malattia','ospedale','dolore','sintomo','ricetta','guarire','benessere'],
       grammatik:"Congiuntivo: e importante che tu sia / che tu abbia", type:'lp21'},
    ]
  },
  es: {
    type: 'lp21',
    einheiten: [
      {id:'es-z2-u1', zyklus:2, klassen:[5,6], niveau:'A1', thema:'Hola & Presentarse',
       vokabeln:['hola','adios','me llamo','como te llamas','por favor','gracias','si','no','amigo','familia'],
       grammatik:"Presente ser/tener: yo soy, tengo", type:'lp21'},
      {id:'es-z2-u2', zyklus:2, klassen:[5,6], niveau:'A1', thema:'La familia & los animales',
       vokabeln:['madre','padre','hermano','hermana','abuela','abuelo','gato','perro','conejo','pajaro'],
       grammatik:"Mi/mis + familia", type:'lp21'},
      {id:'es-z2-u3', zyklus:2, klassen:[5,6], niveau:'A2', thema:'La escuela & la vida diaria',
       vokabeln:['escuela','profesor','cuaderno','libro','deberes','deporte','musica','comedor','clase','recreo'],
       grammatik:"Presente regular: -ar verbos (hablar, comer)", type:'lp21'},
      {id:'es-z2-u4', zyklus:2, klassen:[6], niveau:'A2', thema:'El tiempo libre & el deporte',
       vokabeln:['futbol','natacion','lectura','bicicleta','dibujo','cine','musica','baile','juego','vacaciones'],
       grammatik:"Me gusta / encanta + infinitivo", type:'lp21'},
      {id:'es-z2-u5', zyklus:2, klassen:[6], niveau:'A2', thema:'La comida & las comidas',
       vokabeln:['desayuno','almuerzo','cena','manzana','pan','agua','leche','verduras','queso','delicioso'],
       grammatik:"Quieres...? Quiero... / un poco de, mucho de", type:'lp21'},
      {id:'es-z2-u6', zyklus:2, klassen:[6], niveau:'A2', thema:'La casa & las habitaciones',
       vokabeln:['casa','cocina','salon','dormitorio','bano','jardin','escalera','ventana','puerta','mueble'],
       grammatik:"Hay + articulo + nombre / Es/son + adj.", type:'lp21'},
      {id:'es-z3-u1', zyklus:3, klassen:[7,8,9], niveau:'A2', thema:'La ciudad & los transportes',
       vokabeln:['ciudad','metro','autobus','estacion','tienda','farmacia','hospital','girar','cruzar','direccion'],
       grammatik:"Imperativo: gira, toma, ve", type:'lp21'},
      {id:'es-z3-u2', zyklus:3, klassen:[7,8,9], niveau:'B1', thema:'Los medios & la sociedad',
       vokabeln:['redes sociales','noticias','opinion','publicidad','influencia','adolescente','digital','presion','privacidad','informacion'],
       grammatik:"Preterito perfecto: he/has/ha + participio", type:'lp21'},
      {id:'es-z3-u3', zyklus:3, klassen:[7,8,9], niveau:'B1', thema:'El medio ambiente & la ecologia',
       vokabeln:['medio ambiente','calentamiento','reciclaje','energia','contaminacion','bosque','planeta','sostenible','proteger','solucion'],
       grammatik:"Hay que + infinitivo / se debe + infinitivo", type:'lp21'},
      {id:'es-z3-u4', zyklus:3, klassen:[8,9], niveau:'B1', thema:'El trabajo & el futuro',
       vokabeln:['trabajo','profesion','empresa','competencias','salario','futuro','formacion','candidatura','entrevista','proyecto'],
       grammatik:"Futuro simple: hare, ire, sere", type:'lp21'},
      {id:'es-z3-u5', zyklus:3, klassen:[8,9], niveau:'B1', thema:'La salud & el cuerpo',
       vokabeln:['salud','medico','medicamento','enfermedad','hospital','dolor','sintoma','receta','curar','bienestar'],
       grammatik:"Subjuntivo: es importante que seas / que tengas", type:'lp21'},
    ]
  },
  de: {
    type: 'lp21',
    einheiten: [
      {id:'de-z1-u1', zyklus:1, klassen:[1,2], niveau:'A1', thema:'Begruessung & Vorstellen',
       vokabeln:['hallo','tschuess','ich heisse','wie heisst du','bitte','danke','ja','nein','Freund','Familie'],
       grammatik:"Ich bin / Du bist / Er ist", type:'lp21'},
      {id:'de-z1-u2', zyklus:1, klassen:[1,2], niveau:'A1', thema:'Farben & Zahlen',
       vokabeln:['rot','blau','gruen','gelb','eins','zwei','drei','vier','fuenf','zehn'],
       grammatik:"Das ist + Farbe/Zahl", type:'lp21'},
      {id:'de-z2-u1', zyklus:2, klassen:[3,4,5,6], niveau:'A2', thema:'Schule & Alltag',
       vokabeln:['Schule','Lehrer','Heft','Buch','Hausaufgaben','Freund','Mittagessen','Sport','Musik','Klasse'],
       grammatik:"Praesens regelmaessige Verben: ich lerne, du lernst", type:'lp21'},
      {id:'de-z2-u2', zyklus:2, klassen:[3,4,5,6], niveau:'A2', thema:'Freizeit & Hobbys',
       vokabeln:['Fussball','Schwimmen','Lesen','Fahrrad','Zeichnen','Kino','Musik','Tanzen','Spiel','Ferien'],
       grammatik:"Ich mag/liebe + Nomen; gerne + Verb", type:'lp21'},
      {id:'de-z3-u1', zyklus:3, klassen:[7,8,9], niveau:'B1', thema:'Medien & Gesellschaft',
       vokabeln:['soziale Medien','Nachrichten','Meinung','Werbung','Einfluss','Jugendliche','digital','Druck','Privatsphaere','Information'],
       grammatik:"Perfekt: haben/sein + Partizip II", type:'lp21'},
      {id:'de-z3-u2', zyklus:3, klassen:[7,8,9], niveau:'B1', thema:'Umwelt & Zukunft',
       vokabeln:['Umwelt','Klimawandel','Recycling','Energie','Verschmutzung','Wald','Planet','nachhaltig','schuetzen','Loesung'],
       grammatik:"Konjunktiv II: wuerde + Infinitiv / sollte + Infinitiv", type:'lp21'},
    ]
  },
  adult: {
    type: 'adult',
    module: {
      pruefung:    {type:'adult', label:'DELF / Cambridge / Goethe', active:false},
      business:    {type:'adult', label:'Business & Berufsalltag',   active:false},
      konversation:{type:'adult', label:'Konversation & Rollenspiele',active:false},
      reise:       {type:'adult', label:'Reise & Alltagsthemen',     active:false},
    }
  }
};

// ── Zyklus-Engine ──
// Gibt {zyklus, niveau, isAdult, category} für das aktive Profil zurück
function getZyklusInfo() {
  const p = ST.profiles[ST.activeProfile];
  if (!p) return {zyklus:1, niveau:'A1', isAdult:false, category:'lp21'};
  const isAdult = p.type === 'adult';
  if (isAdult) return {zyklus:null, niveau:p.level||'B1', isAdult:true, category:'adult'};
  // Support kg1/kg2 string keys as well as numeric class levels
  const lvl = p.level;
  const zm = ZYKLUS_MAP[lvl] || ZYKLUS_MAP[parseInt(lvl)] || ZYKLUS_MAP[1];
  return {zyklus:zm.zyklus, niveau:zm.niveau, isAdult:false, category:'lp21', schuljahr:lvl, label:zm.label};
}

// Filtert Inhalte nach Profil-Typ (lp21 oder adult)
// Sichtbarkeitsregel: LP21-Inhalte immer sichtbar für Zyklus 1/2/3
//                    Adult-Module nur sichtbar wenn Profil = Adult
function canSeeContent(contentType) {
  const info = getZyklusInfo();
  if (contentType === 'lp21') return !info.isAdult; // Kinder sehen LP21
  if (contentType === 'adult') return info.isAdult;  // Erwachsene sehen Adult
  return true;
}

// Gibt das automatische Sprachniveau für eine Klasse/Zyklus zurück
function getAutoNiveau(lang, schuljahr) {
  if (!schuljahr) return 'B1';
  const zm = ZYKLUS_MAP[schuljahr] || ZYKLUS_MAP[parseInt(schuljahr)] || ZYKLUS_MAP[1];
  // Sprachspezifische Anpassungen: FR/IT/ES starten später
  if (lang === 'fr' || lang === 'it' || lang === 'es') {
    if (zm.zyklus === 1) return null; // Nicht unterrichtet in Z1
    if (zm.zyklus === 2) {
      const sj = parseInt(schuljahr) || 0;
      if (sj < 5) return null; // FR/IT/ES erst ab 5. Klasse (LP21)
      return sj >= 6 ? 'A2' : 'A1';
    }
    return zm.niveau;
  }
  return zm.niveau;
}

// ═══════════════════════════════════════════
// PHASE 2c — EINHEITEN-FORTSCHRITT
// Speichert pro Sprache + Einheit wie viele Übungen gemacht
// ═══════════════════════════════════════════

// Fortschritt einer Einheit laden (0–100%)
function getEinheitPct(lang, einheitId) {
  const key = 'edu_unit_' + lang;
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  return data[einheitId] || 0;
}

// Fortschritt einer Einheit speichern
function saveEinheitPct(lang, einheitId, pct) {
  const key = 'edu_unit_' + lang;
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  data[einheitId] = Math.min(100, Math.max(0, pct));
  localStorage.setItem(key, JSON.stringify(data));
}

// Fortschritt einer Einheit um einen Schritt erhöhen (bei Übungsabschluss)
function tickEinheit(lang, einheitId) {
  const cur = getEinheitPct(lang, einheitId);
  const next = Math.min(100, cur + 20); // 5 Übungen = 100%
  saveEinheitPct(lang, einheitId, next);
  return next;
}

// Alle Einheiten einer Sprache für den aktuellen Zyklus/Klasse filtern
function getEinheitenForProfile(lang) {
  const backbone = EDU_BACKBONE[lang];
  if (!backbone || !backbone.einheiten) return [];
  const zi = getZyklusInfo();
  if (zi.isAdult) return backbone.einheiten; // Adult sieht alle
  const schuljahr = zi.schuljahr; // Keep as original (string or number)
  const schuljahrNum = parseInt(schuljahr) || 0;
  return backbone.einheiten.filter(e => {
    if (!e.klassen) return e.zyklus === zi.zyklus;
    // Check both string match (kg1/kg2) and numeric match
    return e.klassen.some(k =>
      k === schuljahr ||           // exact string match ('kg1' === 'kg1')
      k === schuljahrNum ||        // numeric match (3 === 3)
      String(k) === String(schuljahr) // string coercion fallback
    );
  });
}

// Einheiten-Grid HTML für ein Sprach-Panel generieren
function buildEinheitenGrid(lang, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const einheiten = getEinheitenForProfile(lang);
  if (!einheiten.length) {
    const zi = getZyklusInfo();
    const sj = parseInt(zi.schuljahr) || 0;
    const langStart = {fr:5, it:5, es:5, de:3, en:1};
    const start = langStart[lang] || 1;
    const langNames = {fr:'Français',it:'Italiano',es:'Español',de:'Deutsch DAZ',en:'English'};
    const lname = langNames[lang] || lang;
    if (!zi.isAdult && sj < start) {
      el.innerHTML = `<div style="color:var(--text3);font-size:13px;padding:.75rem;background:rgba(56,189,248,.05);border:1px solid rgba(56,189,248,.15);border-radius:var(--r);">
        📚 <strong>${lname}</strong> beginnt im LP21 ab der <strong>${start}. Klasse</strong>.<br>
        <span style="font-size:12px;">Dein Profil: ${sj}. Klasse. Bitte Profil anpassen oder Zyklus 2 (ab 5. Kl.) wählen.</span>
      </div>`;
    } else {
      el.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:.5rem;">Keine Einheiten für dieses Schuljahr verfügbar.</div>';
    }
    return;
  }
  el.innerHTML = einheiten.map(e => {
    const pct = getEinheitPct(lang, e.id);
    const col = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--gold)' : 'var(--blue)';
    return `<div class="unit-card" data-lang="${lang}" data-uid="${e.id}" style="cursor:pointer"
      onclick="selectEinheit('${lang}','${e.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
        <span style="font-size:12px;font-weight:700;color:var(--text)">${e.thema}</span>
        <span style="font-size:10px;font-weight:700;color:${col}">${pct}%</span>
      </div>
      <div style="height:4px;background:var(--bg);border-radius:2px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${col};border-radius:2px;transition:width .4s;"></div>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px;">${e.niveau} · ${e.grammatik}</div>
    </div>`;
  }).join('');
}

// Einheit auswählen und im Panel anzeigen
function selectEinheit(lang, einheitId) {
  const backbone = EDU_BACKBONE[lang];
  if (!backbone) return;
  const einheit = backbone.einheiten.find(e => e.id === einheitId);
  if (!einheit) return;
  // Panel-ID ermitteln
  const panelId = lang === 'de' ? 'daf-main' : lang + '-main';
  const detailId = lang + '-unit-detail';
  const el = document.getElementById(detailId);
  if (!el) return;
  const pct = getEinheitPct(lang, einheitId);
  el.innerHTML = `
    <div style="background:var(--bg3);border-radius:var(--r);padding:1rem;margin-bottom:1rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem;">
        <div style="font-size:15px;font-weight:700;">${einheit.thema}</div>
        <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;background:rgba(56,189,248,.15);color:var(--blue);">${einheit.niveau}</span>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:.75rem;">📐 ${einheit.grammatik}</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:.5rem;">📇 Vokabeln: ${einheit.vokabeln.slice(0,5).join(', ')}${einheit.vokabeln.length>5?'…':''}</div>
      <div style="height:6px;background:var(--bg2);border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:var(--green);border-radius:3px;"></div>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px;">${pct}% abgeschlossen</div>
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.75rem;">KI-Übungen zur Einheit</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1rem;">
      <button class="btn btn-p" onclick="runEinheitUebung('${lang}','${einheitId}','lektionstext')">📖 Lektionstext</button>
      <button class="btn btn-p" onclick="runEinheitUebung('${lang}','${einheitId}','grammatik')">📐 Grammatik</button>
      <button class="btn btn-p" onclick="runEinheitUebung('${lang}','${einheitId}','vokabeln')">📇 Vokabeln</button>
      <button class="btn btn-p" onclick="runEinheitUebung('${lang}','${einheitId}','lesen')">👁️ Lesen</button>
      <button class="btn btn-p" onclick="runEinheitUebung('${lang}','${einheitId}','hoeren')">👂 Hören</button>
      <button class="btn btn-p" onclick="runEinheitUebung('${lang}','${einheitId}','schreiben')">✍️ Schreiben</button>
    </div>
    <div id="${lang}-unit-exercise-out"></div>`;
  // Accordion öffnen falls zu
  const accHdr = el.closest('.acc-body')?.previousElementSibling;
  if (accHdr && !accHdr.classList.contains('open')) toggleAcc(accHdr);
  el.scrollIntoView({behavior:'smooth', block:'nearest'});
}

// ═══════════════════════════════════════════
// PHASE 5 — LEKTIONSTEXTE & VOKABELVERKNÜPFUNG
// runEinheitUebung(lang, einheitId, typ)
// Typen: 'lesen' | 'vokabeln' | 'schreiben' | 'grammatik' | 'hoeren'
// ═══════════════════════════════════════════
async function runEinheitUebung(lang, einheitId, typ) {
  const backbone = EDU_BACKBONE[lang];
  if (!backbone) return;
  const einheit = backbone.einheiten.find(e => e.id === einheitId);
  if (!einheit) return;
  const outId = lang + '-unit-exercise-out';
  const out = document.getElementById(outId);
  if (!out) return;

  const key = ST.apiKey || localStorage.getItem('edu_api_key') || '';
  if (!key) {
    out.innerHTML = `<div class="card" style="color:var(--gold);font-size:14px;">⚠️ API-Schlüssel fehlt — unter <strong>Konto → API</strong> hinterlegen.</div>`;
    return;
  }

  const LANG_NAMES = {en:'English',fr:'Français',it:'Italiano',es:'Español',de:'Deutsch'};
  const INSTR_LANG = {en:'English',fr:'Français',it:'Italiano',es:'Español',de:'Deutsch'};
  const langName = LANG_NAMES[lang] || lang;
  const instrLang = INSTR_LANG[lang] || lang;
  const vokStr = einheit.vokabeln.join(', ');
  const diff = ST.learning_state?.difficulty_offset || 0;
  const diffLbl = getDiffLabel(diff, lang);
  const effectiveNiveau = getEffectiveNiveau(einheit.niveau, diff);

  out.innerHTML = sp();

  // ── PHASE 2: LEKTIONSTEXT — Vokabeln + Grammatik verknüpft ──
  if (typ === 'lektionstext') {
    const zi = getZyklusInfo();
    const sj = parseInt(zi.schuljahr) || 1;
    const sys = `You are a ${langName} teacher creating a LP21-aligned lesson text for Swiss school (class ${sj}, level ${effectiveNiveau}). Difficulty: ${diffLbl}.
Unit theme: "${einheit.thema}".
Grammar focus: ${einheit.grammatik}.
All vocabulary to integrate: ${vokStr}.

Create a complete lesson text with the following structure. Respond ONLY valid JSON (no markdown):
{
  "title": "catchy title in ${instrLang}",
  "intro": "1-sentence context in Deutsch explaining what learners will read",
  "text": "connected text in ${instrLang} (150-200 words) using ALL vocabulary naturally. Use the grammar focus point at least 3 times. Use \\n\\n for paragraphs.",
  "vocab_list": [{"word":"...","translation":"Deutsch","example":"short example sentence in ${instrLang}"}],
  "grammar_explanation": "clear Deutsch explanation of ${einheit.grammatik} in 2-3 sentences with examples",
  "exercises": [
    {"type":"gap","instruction":"Fülle die Lücken aus","sentences":[{"text":"sentence with ___ gap","answer":"correct word"},{"text":"...","answer":"..."},{"text":"...","answer":"..."}]},
    {"type":"translate","instruction":"Übersetze ins ${instrLang}","sentences":[{"de":"German sentence","answer":"${instrLang} answer"},{"de":"...","answer":"..."},{"de":"...","answer":"..."}]}
  ],
  "speaking_prompt": "one open question in ${instrLang} for learners to discuss or answer"
}`;
    try {
      const raw = await claudeEx([{role:'user',content:'Generate lesson text.'}], sys, 2000);
      const d = JSON.parse(raw.replace(/```json|```/g,'').trim());
      let html = `<div class="card">
        <div class="ctitle" style="font-size:17px;">${d.title} <span class="tag tag-lp">LP21</span> <span class="tag tag-ai">Phase 2</span></div>
        ${d.intro?`<div style="font-size:13px;color:var(--text2);margin-bottom:1rem;padding:8px 12px;background:rgba(56,189,248,.05);border-radius:var(--r);">💡 ${d.intro}</div>`:''}

        <div style="padding:14px 16px;background:var(--bg3);border-radius:var(--r);font-size:15px;line-height:2;margin-bottom:1.25rem;border-left:3px solid var(--blue);">
          ${(d.text||'').replace(/\n\n/g,'</p><p style="margin-top:10px;">').replace(/^/,'<p>').replace(/$/,'</p>')}
          <button class="btn" style="display:block;margin-top:.75rem;padding:5px 14px;font-size:12px;" onclick="speak(this.previousElementSibling.textContent,'${lang}')">🔊 Vorlesen</button>
        </div>`;

      // Vokabelliste
      if (d.vocab_list?.length) {
        html += `<div style="margin-bottom:1.25rem;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:.06em;margin-bottom:.75rem;">📇 Vokabeln der Einheit</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;">
            ${d.vocab_list.map(v=>`<div style="padding:8px 12px;background:var(--bg3);border-radius:var(--r);border:1px solid var(--border);">
              <div style="font-weight:700;font-size:13px;color:var(--blue);">${v.word}</div>
              <div style="font-size:12px;color:var(--text2);">${v.translation}</div>
              <div style="font-size:11px;color:var(--text3);font-style:italic;margin-top:2px;">${v.example||''}</div>
            </div>`).join('')}
          </div>
        </div>`;
      }

      // Grammatik-Erklärung
      if (d.grammar_explanation) {
        html += `<div style="margin-bottom:1.25rem;padding:12px 14px;background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.2);border-radius:var(--r);">
          <div style="font-size:11px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">📐 Grammatik: ${einheit.grammatik}</div>
          <div style="font-size:13px;line-height:1.8;">${d.grammar_explanation}</div>
        </div>`;
      }

      // Übungen
      (d.exercises||[]).forEach((ex, ei) => {
        if (ex.type === 'gap' && ex.sentences) {
          html += `<div style="margin-bottom:1.25rem;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:.06em;margin-bottom:.75rem;">✏️ ${ex.instruction}</div>`;
          ex.sentences.forEach((s, si) => {
            const id = `p2-gap-${lang}-${einheitId}-${ei}-${si}`;
            html += `<div style="margin-bottom:.625rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:14px;flex:1;">${si+1}. ${(s.text||'').replace('___',`<input id="${id}" class="inp" style="width:130px;display:inline-block;padding:5px 10px;vertical-align:middle;" placeholder="…" data-ans="${(s.answer||'').replace(/"/g,"'")}" />`)}</span>
              <button class="btn" style="padding:5px 11px;font-size:12px;" onclick="checkFill('${id}')">✓</button>
              <span id="${id}-fb" style="font-size:12px;min-width:20px;"></span>
            </div>`;
          });
          html += `</div>`;
        } else if (ex.type === 'translate' && ex.sentences) {
          html += `<div style="margin-bottom:1.25rem;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:.06em;margin-bottom:.75rem;">🔄 ${ex.instruction}</div>`;
          ex.sentences.forEach((s, si) => {
            const id = `p2-tr-${lang}-${einheitId}-${ei}-${si}`;
            html += `<div style="margin-bottom:.75rem;">
              <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${si+1}. ${s.de}</div>
              <div style="display:flex;gap:8px;align-items:center;">
                <input id="${id}" class="inp" style="flex:1;" placeholder="…" data-ans="${(s.answer||'').replace(/"/g,"'")}" />
                <button class="btn" style="padding:5px 11px;font-size:12px;" onclick="checkFill('${id}')">✓</button>
                <span id="${id}-fb" style="font-size:12px;min-width:20px;"></span>
              </div>
            </div>`;
          });
          html += `</div>`;
        }
      });

      // Sprechaufgabe
      if (d.speaking_prompt) {
        html += `<div style="padding:12px 14px;background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.2);border-radius:var(--r);">
          <div style="font-size:11px;font-weight:700;color:var(--purple);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;">🗣️ Sprechaufgabe</div>
          <div style="font-size:14px;" id="${lang}-sp-${einheitId}">${d.speaking_prompt}</div>
          <button class="btn" style="margin-top:.5rem;padding:5px 12px;font-size:12px;" data-spk-id="${lang}-sp-${einheitId}" data-spk-lang="${lang}" onclick="var el=document.getElementById(this.dataset.spkId);if(el)speak(el.textContent,this.dataset.spkLang)">🔊 Vorlesen</button>
        </div>`;
      }

      html += `</div>`;
      out.innerHTML = html;
      const np = tickEinheit(lang, einheitId);
      addXP(20, 'l', 'learn');
      toast('📖 Lektionstext geladen · ' + Math.round(np) + '% fertig');
    } catch(e) {
      out.innerHTML = `<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`;
    }
    return;
  }

  if (typ === 'lesen') {
    const sys = `You are a ${langName} teacher (LP21). Unit: "${einheit.thema}". Level: ${effectiveNiveau}. Difficulty: ${diffLbl}.
Key vocabulary to embed: ${vokStr}.
Grammar focus: ${einheit.grammatik}.
Write a short reading text in ${instrLang} (120-160 words) using the key vocabulary naturally.
Respond ONLY valid JSON:
{"title":"...","text":"full text in ${instrLang} (use \\n\\n for paragraph breaks)","vocab_used":["word1","word2","word3","word4","word5"],"gap_fill":{"instruction":"Fill in the gaps","sentences":[{"text":"sentence with ___ gap","answer":"correct word","hint":""},{"text":"...","answer":"...","hint":""},{"text":"...","answer":"...","hint":""},{"text":"...","answer":"...","hint":""}]},"comprehension":[{"q":"question in ${instrLang}","options":["a","b","c","d"],"correct":0},{"q":"...","options":["...","...","...","..."],"correct":1},{"q":"...","options":["...","...","...","..."],"correct":2}],"grammar_note":"one sentence in Deutsch: ${einheit.grammatik}"}`;
    try {
      const raw = await claude([{role:'user',content:'Generate.'}], sys);
      const d = JSON.parse(raw.replace(/```json|```/g,'').trim());
      let html = `<div class="card">
        <div class="ctitle">${d.title} <span class="tag tag-lp">LP21</span> <span class="tag tag-ai">KI</span></div>
        <div style="padding:14px 16px;background:var(--bg3);border-radius:var(--r);font-size:15px;line-height:2;margin-bottom:1.25rem;border-left:3px solid var(--blue);">
          ${(d.text||'').replace(/\n\n/g,'</p><p style="margin-top:10px;">').replace(/^/,'<p>').replace(/$/,'</p>')}
          <button class="btn" style="display:block;margin-top:.75rem;padding:5px 14px;font-size:12px;" onclick="speak(document.getElementById('${outId}').querySelector('[style*=border-left]').innerText,'${lang}')">🔊 Vorlesen</button>
        </div>`;
      if (d.vocab_used?.length) html += `<div style="margin-bottom:1rem;padding:8px 12px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);border-radius:var(--r);"><div style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:5px;">📇 Schlüsselvokabeln</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${d.vocab_used.map(v=>`<span style="padding:2px 9px;background:var(--bg2);border-radius:5px;font-size:12px;">${v}</span>`).join('')}</div></div>`;
      if (d.grammar_note) html += `<div style="margin-bottom:1rem;padding:8px 12px;background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.2);border-radius:var(--r);font-size:13px;"><strong style="color:var(--blue);">📐 ${einheit.grammatik}:</strong> ${d.grammar_note}</div>`;
      if (d.gap_fill?.sentences?.length) {
        html += `<div style="margin-bottom:1.25rem;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:.06em;margin-bottom:.75rem;">Lückentext: ${d.gap_fill.instruction}</div>`;
        d.gap_fill.sentences.forEach((s,si) => {
          const id = `lk-${lang}-${einheitId}-${si}`;
          const txt = (s.text||'').replace('___',`<input id="${id}" class="inp" style="width:140px;display:inline-block;padding:5px 10px;vertical-align:middle;" placeholder="…" data-ans="${(s.answer||'').replace(/"/g,"'")}" />`);
          html += `<div style="margin-bottom:.75rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span style="font-size:14px;flex:1;">${txt}</span><button class="btn" style="padding:5px 11px;font-size:12px;" onclick="checkFill('${id}')">✓</button><span id="${id}-fb" style="font-size:12px;min-width:20px;"></span></div>`;
        });
        html += `</div>`;
      }
      if (d.comprehension?.length) {
        html += `<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:.06em;margin-bottom:.75rem;">Verständnisfragen</div>`;
        d.comprehension.forEach((q,qi) => { html += `<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div><div class="mcopts">${(q.options||[]).map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div></div>`; });
        html += `</div>`;
      }
      html += `</div>`;
      out.innerHTML = html;
      _attachMCHandlers(out, lang, einheitId);
      addXP(10,'l','learn');
    } catch(e) { out.innerHTML = `<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`; }

  } else if (typ === 'vokabeln') {
    const sys = `You are a ${langName} vocabulary teacher (LP21). Unit: "${einheit.thema}". Level: ${einheit.niveau}.
Key vocabulary: ${vokStr}.
Respond ONLY valid JSON:
{"title":"Vokabeln: ${einheit.thema}","cards":[{"word":"word in ${instrLang}","translation":"German translation","example":"short example in ${instrLang}","pos":"noun/verb/adj"}],"match_quiz":[{"word":"word in ${instrLang}","options":["correct German","wrong1","wrong2","wrong3"],"correct":0},{"word":"...","options":["...","...","...","..."],"correct":0},{"word":"...","options":["...","...","...","..."],"correct":0},{"word":"...","options":["...","...","...","..."],"correct":0},{"word":"...","options":["...","...","...","..."],"correct":0}]}`;
    try {
      const raw = await claude([{role:'user',content:'Generate.'}], sys);
      const d = JSON.parse(raw.replace(/```json|```/g,'').trim());
      const cards = d.cards || [];
      const cid = `vc-${lang}-${einheitId}`;
      let html = `<div class="card"><div class="ctitle">${d.title} <span class="tag tag-new">Vokabeln</span></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;">
          <span style="font-size:12px;color:var(--text3);" id="${cid}-counter">Karte 1 / ${cards.length}</span>
          <div style="display:flex;gap:6px;">
            <button class="btn" style="padding:5px 12px;font-size:12px;" onclick="_vcPrev('${cid}',${cards.length})">← Zurück</button>
            <button class="btn" style="padding:5px 12px;font-size:12px;" onclick="_vcNext('${cid}',${cards.length})">Weiter →</button>
          </div>
        </div>
        <div id="${cid}-cards" style="position:relative;height:180px;margin-bottom:1rem;">
          ${cards.map((c,i)=>`<div class="fw" id="${cid}-card-${i}" style="position:absolute;inset:0;height:180px;max-width:100%;display:${i===0?'block':'none'};" onclick="this.classList.toggle('fl')"><div class="fi2"><div class="ff"><div style="font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px;">${c.word}</div><div style="font-size:11px;color:var(--text3);font-style:italic;">${c.pos||''}</div><div style="font-size:11px;color:var(--text3);margin-top:8px;">🔊 Zum Umdrehen klicken</div><button class="btn" style="margin-top:8px;padding:4px 10px;font-size:11px;" onclick="event.stopPropagation();speak(this.closest('.fw').querySelector('.ff div').textContent,'${lang}')">🔊</button></div><div class="ff fb2"><div style="font-size:20px;font-weight:700;color:var(--gold);margin-bottom:6px;">${c.translation}</div><div style="font-size:13px;color:var(--text2);font-style:italic;text-align:center;">"${c.example||''}"</div></div></div></div>`).join('')}
        </div>`;
      if (d.match_quiz?.length) {
        html += `<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:.06em;margin-bottom:.75rem;">Match-Quiz</div>`;
        d.match_quiz.forEach((q,qi) => { html += `<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. <span style="color:var(--blue);">${q.word}</span></div><div class="mcopts">${(q.options||[]).map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div></div>`; });
        html += `</div>`;
      }
      html += `</div>`;
      out.innerHTML = html;
      _attachMCHandlers(out, lang, einheitId);
      addXP(8,'l','learn');
    } catch(e) { out.innerHTML = `<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`; }

  } else if (typ === 'schreiben') {
    const sys = `You are a ${langName} writing teacher (LP21). Unit: "${einheit.thema}". Level: ${einheit.niveau}.
Key vocabulary: ${vokStr}. Grammar: ${einheit.grammatik}.
Respond ONLY valid JSON:
{"title":"Schreiben: ${einheit.thema}","prompt":"writing task in ${instrLang} (2-3 sentences)","hints":["hint 1 in Deutsch","hint 2","hint 3"],"min_words":40,"max_words":80,"model_phrases":["phrase in ${instrLang} — German meaning","...","..."]}`;
    try {
      const raw = await claude([{role:'user',content:'Generate.'}], sys);
      const d = JSON.parse(raw.replace(/```json|```/g,'').trim());
      const wid = `sw-${lang}-${einheitId}`;
      let html = `<div class="card"><div class="ctitle">${d.title} <span class="tag tag-ai">KI-Bewertung</span></div>
        <div style="padding:12px 14px;background:rgba(56,189,248,.07);border:1px solid rgba(56,189,248,.2);border-radius:var(--r);font-size:14px;line-height:1.75;margin-bottom:1rem;">${d.prompt}</div>`;
      if (d.model_phrases?.length) html += `<div style="margin-bottom:.875rem;padding:8px 12px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:var(--r);"><div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:5px;">💡 Nützliche Phrasen</div>${d.model_phrases.map(p=>`<div style="font-size:12px;color:var(--text2);margin-bottom:2px;">${p}</div>`).join('')}</div>`;
      if (d.hints?.length) html += `<div style="margin-bottom:.875rem;display:flex;flex-wrap:wrap;gap:5px;">${d.hints.map(h=>`<span style="padding:3px 10px;background:var(--bg3);border-radius:5px;font-size:12px;color:var(--text3);">💡 ${h}</span>`).join('')}</div>`;
      html += `<textarea class="inp" id="${wid}-inp" rows="5" placeholder="Schreibe hier auf ${instrLang}…" style="resize:vertical;margin-bottom:.5rem;"></textarea>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;">
          <span style="font-size:11px;color:var(--text3);"><span id="${wid}-wc">0</span> Wörter · Ziel: ${d.min_words||30}–${d.max_words||60}</span>
          <button class="btn btn-g" id="${wid}-chk">Korrigieren ↗</button>
        </div><div id="${wid}-fb"></div></div>`;
      out.innerHTML = html;
      document.getElementById(wid+'-inp')?.addEventListener('input',function(){ const wc=this.value.trim().split(/\s+/).filter(w=>w.length>0).length; const el=document.getElementById(wid+'-wc'); if(el)el.textContent=wc; });
      document.getElementById(wid+'-chk')?.addEventListener('click',async function(){
        const txt=document.getElementById(wid+'-inp')?.value.trim(); if(!txt)return;
        const fb=document.getElementById(wid+'-fb'); fb.innerHTML=sp();
        try {
          const r2=await claude([{role:'user',content:'Check.'}],`${langName} teacher. Unit:"${einheit.thema}". Level:${einheit.niveau}. Task:"${d.prompt}". Student:"${txt}". Vocab:${vokStr}. Respond ONLY JSON:{"score":0-100,"grade":"A-F","content":"Deutsch feedback","language":"Deutsch feedback","vocab_used":["used words"],"improvement":"one tip Deutsch"}`);
          const ev=JSON.parse(r2.replace(/\`\`\`json|\`\`\`/g,'').trim());
          const col=ev.score>=70?'var(--green)':ev.score>=50?'var(--gold)':'var(--red)';
          fb.innerHTML=`<div class="rescard ${ev.score>=70?'res-g':ev.score>=50?'res-m':'res-b'}"><div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;"><strong style="color:${col};font-size:18px;">${ev.grade}</strong><div style="flex:1;height:8px;background:var(--bg3);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${ev.score}%;background:${col};border-radius:4px;transition:width .5s;"></div></div><span style="font-size:13px;font-weight:700;color:${col};">${ev.score}/100</span></div><div style="font-size:13px;margin-bottom:4px;">📝 ${ev.content}</div><div style="font-size:13px;margin-bottom:4px;">📐 ${ev.language}</div>${ev.vocab_used?.length?`<div style="font-size:12px;color:var(--green);margin-bottom:4px;">✅ Verwendet: ${ev.vocab_used.join(', ')}</div>`:''}<div style="font-size:12px;color:${col};">💡 ${ev.improvement}</div></div>`;
          const np=tickEinheit(lang,einheitId); addXP(Math.round(ev.score/10),'w','learn'); toast('✅ '+ev.grade+' · '+Math.round(np)+'% fertig'); buildEinheitenGrid(lang,lang+'-einheiten-grid');
        } catch(e2){fb.textContent='Fehler: '+e2.message;}
      });
      addXP(5,'w','learn');
    } catch(e) { out.innerHTML = `<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`; }

  } else if (typ === 'grammatik') {
    const gid = `eu-gram-${lang}-${einheitId}`;
    out.innerHTML = `<div id="${gid}"></div>`;
    await loadGrammarBlock(lang, 'einheit', einheit.grammatik + ' — Kontext: ' + einheit.thema, gid);
    tickEinheit(lang, einheitId);
    buildEinheitenGrid(lang, lang + '-einheiten-grid');

  } else if (typ === 'hoeren') {
    const sys = `You are a ${langName} listening teacher (LP21). Unit: "${einheit.thema}". Level: ${effectiveNiveau}. Key vocabulary: ${vokStr}. Difficulty: ${diffLbl}.
Respond ONLY valid JSON:
{"title":"Hören: ${einheit.thema}","script":"dialogue or monologue in ${instrLang} (80-120 words, use \\n for speaker changes)","key_expressions":[{"expr":"expression in ${instrLang}","meaning":"German"}],"questions":[{"q":"question in ${instrLang}","options":["a","b","c"],"correct":0},{"q":"...","options":["...","...","..."],"correct":1},{"q":"...","options":["...","...","..."],"correct":2}]}`;
    try {
      const raw = await claude([{role:'user',content:'Generate.'}], sys);
      const d = JSON.parse(raw.replace(/```json|```/g,'').trim());
      let html = `<div class="card"><div class="ctitle">${d.title} <span class="tag tag-ai">KI + TTS</span></div>
        <div style="padding:12px 14px;background:var(--bg3);border-radius:var(--r);font-size:14px;line-height:1.9;margin-bottom:1rem;border-left:3px solid var(--purple);">
          <div style="font-size:11px;font-weight:700;color:var(--purple);text-transform:uppercase;margin-bottom:8px;">📢 Hörtext</div>
          ${(d.script||'').replace(/\n/g,'<br>')}
          <button class="btn" style="margin-top:.75rem;padding:5px 14px;font-size:12px;" onclick="speak(this.parentElement.innerText,'${lang}')">🔊 Vorlesen</button>
        </div>`;
      if (d.key_expressions?.length) html += `<div style="margin-bottom:1rem;padding:8px 12px;background:rgba(168,85,247,.06);border:1px solid rgba(168,85,247,.2);border-radius:var(--r);"><div style="font-size:11px;font-weight:700;color:var(--purple);margin-bottom:5px;">🗣️ Schlüsselausdrücke</div><div style="display:flex;flex-wrap:wrap;gap:6px;">${d.key_expressions.map(ex=>`<span style="padding:3px 10px;background:var(--bg2);border-radius:5px;font-size:12px;"><span style="color:var(--purple);">${ex.expr}</span> → ${ex.meaning}</span>`).join('')}</div></div>`;
      if (d.questions?.length) {
        html += `<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:.06em;margin-bottom:.75rem;">Hörverständnis</div>`;
        d.questions.forEach((q,qi) => { html += `<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div><div class="mcopts">${(q.options||[]).map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div></div>`; });
        html += `</div>`;
      }
      html += `</div>`;
      out.innerHTML = html;
      _attachMCHandlers(out, lang, einheitId);
      addXP(10,'l','learn');
    } catch(e) { out.innerHTML = `<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`; }
  }
}

// MC-Handler mit Fortschritts-Tick
function _attachMCHandlers(container, lang, einheitId) {
  container.querySelectorAll('.mcopts').forEach(opts => {
    opts.querySelectorAll('.mcopt').forEach(btn => btn.addEventListener('click', function(){
      const c=parseInt(this.dataset.c), i=parseInt(this.dataset.i);
      opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');const np=tickEinheit(lang,einheitId);addXP(10,'r','learn');toast('✅ Richtig! '+Math.round(np)+'% fertig');buildEinheitenGrid(lang,lang+'-einheiten-grid');}
      else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    }));
  });
}

// Vokabelkarten-Navigation
function _vcNext(cid, total) {
  const c=document.getElementById(cid+'-cards');if(!c)return;
  let idx=c._idx||0;
  const cur=document.getElementById(cid+'-card-'+idx);if(cur){cur.style.display='none';cur.classList.remove('fl');}
  idx=(idx+1)%total;c._idx=idx;
  const nxt=document.getElementById(cid+'-card-'+idx);if(nxt)nxt.style.display='block';
  const lbl=document.getElementById(cid+'-counter');if(lbl)lbl.textContent='Karte '+(idx+1)+' / '+total;
}
function _vcPrev(cid, total) {
  const c=document.getElementById(cid+'-cards');if(!c)return;
  let idx=c._idx||0;
  const cur=document.getElementById(cid+'-card-'+idx);if(cur){cur.style.display='none';cur.classList.remove('fl');}
  idx=(idx-1+total)%total;c._idx=idx;
  const prv=document.getElementById(cid+'-card-'+idx);if(prv)prv.style.display='block';
  const lbl=document.getElementById(cid+'-counter');if(lbl)lbl.textContent='Karte '+(idx+1)+' / '+total;
}

// Sidebar-Sichtbarkeit nach Profil aktualisieren
// Adult-Bereich wird in Phase 3 (UX-Redesign) vollständig aktiviert
function updateSidebarByProfile() {
  const info = getZyklusInfo();
  // Adult-spezifische Sidebar-Einträge (noch nicht vorhanden, Platzhalter)
  document.querySelectorAll('[data-profile-type]').forEach(el => {
    const req = el.dataset.profileType; // 'lp21' oder 'adult'
    el.style.display = canSeeContent(req) ? '' : 'none';
  });
  // Zyklus-Info im Dashboard anzeigen (Phase 1a: sanfte Ergänzung)
  const zyklusEl = document.getElementById('dash-zyklus-info');
  if (zyklusEl) {
    if (info.isAdult) {
      zyklusEl.textContent = '🎓 Sprachkurs Erwachsene · Niveau ' + info.niveau;
    } else {
      zyklusEl.textContent = '📚 ' + (info.label||'') + ' · Zyklus ' + info.zyklus + ' · ' + info.niveau;
    }
  }
}

// Mathe adaptive state
const MZ = {
  z1:{type:'addition',skill:1,correct:0,wrong:0,score:0,streak:0,task:null},
  z2:{type:'mal',skill:1,correct:0,wrong:0,score:0,task:null},
  speed:{running:false,score:0,correct:0,timer:null,timeLeft:30,task:null},
};

const LANG_NAMES = {en:'English',de:'Deutsch',fr:'Français',it:'Italiano',es:'Español'};
const LANG_BCP   = {en:'en-US',de:'de-DE',fr:'fr-FR',it:'it-IT',es:'es-ES'};
const SCEN_NAMES = {restaurant:'im Restaurant',hotel:'im Hotel',airport:'am Flughafen',shop:'beim Einkaufen',arzt:'beim Arzt',schule:'in der Schule'};
const LT_LEVELS  = ['A1','A1','A2','A2','B1','B1','B2','B2','C1','C2'];

const BADGES_DEF = [
  {id:'first',   ico:'🌟',name:'Erster Schritt',  desc:'Erste Übung',          cond:()=>ST.done>=1},
  {id:'streak3', ico:'🔥',name:'3-Tage-Serie',    desc:'3 Tage hintereinander', cond:()=>ST.streak>=3},
  {id:'xp100',   ico:'⭐',name:'100 XP',          desc:'100 XP erreicht',       cond:()=>ST.xp>=100},
  {id:'xp500',   ico:'💫',name:'500 XP',          desc:'500 XP erreicht',       cond:()=>ST.xp>=500},
  {id:'xp1000',  ico:'🚀',name:'1000 XP',         desc:'1000 XP erreicht',      cond:()=>ST.xp>=1000},
  {id:'spk10',   ico:'🎙️',name:'Sprachprofi',      desc:'Sprechen 20%+',         cond:()=>ST.skills.s>=20},
  {id:'gram50',  ico:'📐',name:'Grammar Master',  desc:'Grammatik 50%+',        cond:()=>ST.skills.r>=50},
  {id:'lst50',   ico:'👂',name:'Listening Pro',   desc:'Hören 50%+',            cond:()=>ST.skills.h>=50},
  {id:'wrt50',   ico:'✍️',name:'Writer',          desc:'Schreiben 50%+',        cond:()=>ST.skills.w>=50},
  {id:'math50',  ico:'🔢',name:'Mathe-Ass',       desc:'Mathe 50%+',            cond:()=>ST.skills.m>=50},
  {id:'ltdone',  ico:'🎯',name:'Getestet',        desc:'Level-Test gemacht',     cond:()=>false},
  {id:'champ',   ico:'🏆',name:'Champion',        desc:'50+ Übungen',            cond:()=>ST.done>=50},
  {id:'speed',   ico:'⚡',name:'Speed-Mathlete',  desc:'Mathe-Speed gespielt',   cond:()=>false},
];

let chatHistory=[], vkUnit=0, vkTranche=0, vkList=[], vkIdx=0, vkLearned=0, vkStreak=0, vkFlipped=false;
let activeRec=null, spkTarget=null;
let gmWords=[], gmIdx=0, gmScore=0, gmStreak=0;
let htText='', ltIdx=0, ltScore=0, ltDetected='A1';
let kbText='', kbPos=0, kbErrors=0, kbStartTime=null, kbTimer=null;
let earnedBadges=[];
let setupPType='z1';

// ═══════════════════════════════════════════
// DOM READY
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {

  document.body.classList.add('setup-open');

  // Auto-boot: Profile laden falls vorhanden
  const _sp=localStorage.getItem('edu_profiles');
  const _sk=localStorage.getItem('edu_api_key');
  if(_sp&&_sk){ ST.apiKey=_sk; ST.profiles=JSON.parse(_sp); }
  renderSetupProfilePick();
  updateLevelOpts();
  // Supabase-Sync im Hintergrund
  sbSyncProfiles().then(()=>{ renderSetupProfilePick(); });

  // ── NAME QUICKPICK ──
  const snInput=document.getElementById('sn');
  const nqEl=document.getElementById('name-quickpick');
  function renderNameQuickpick(){
    const saved=JSON.parse(localStorage.getItem('edu_saved_names')||'[]');
    if(saved.length===0){nqEl.style.display='none';return;}
    nqEl.style.display='flex';
    nqEl.innerHTML=saved.map(n=>`<button class="nqchip" data-n="${n}">${n}</button>`).join('');
    nqEl.querySelectorAll('.nqchip').forEach(b=>b.addEventListener('click',function(){snInput.value=this.dataset.n;}));
  }
  renderNameQuickpick();

  // SIDEBAR navigation — mit data-sub Support für Sprach-Unterabschnitte
  document.querySelectorAll('.si[data-p]').forEach(b=>b.addEventListener('click',function(){
    nav(this.dataset.p);
    const sub = this.dataset.sub;
    if(sub){
      setTimeout(()=>{
        const panel = document.getElementById('panel-'+this.dataset.p);
        if(!panel) return;
        // Bevorzugt: data-section Attribut auf acc-hdr
        let found = panel.querySelector('.acc-hdr[data-section="'+sub+'"]');
        // Fallback: ID-matching
        if(!found) {
          panel.querySelectorAll('.acc-hdr').forEach(hdr=>{
            if(hdr.id && hdr.id.includes(sub)) found = hdr;
          });
        }
        if(found) {
          if(!found.classList.contains('open')){ found.click(); }
          found.scrollIntoView({behavior:'smooth',block:'start'});
        }
      }, 80);
    }
  }));

  // TOPBAR user chip → profile
  document.getElementById('tchip').addEventListener('click',()=>nav('profile'));

  // Dashboard fach cards
  document.querySelectorAll('.fcard[data-nav]').forEach(c=>c.addEventListener('click',()=>nav(c.dataset.nav)));

  // DIFF buttons (delegated)
  document.addEventListener('click',function(e){
    const db=e.target.closest('.db'); if(!db||!db.dataset.d)return;
    db.closest('.drow').querySelectorAll('.db').forEach(b=>b.classList.remove('on'));
    db.classList.add('on'); ST.learning_state.difficulty_offset=parseInt(db.dataset.d);
  });

  // QUITALBRIEF
  document.getElementById('qchips').addEventListener('click',function(e){
    if(e.target.classList.contains('qchip')) document.getElementById('qtopic').value=e.target.textContent;
  });
  document.getElementById('btnquital').addEventListener('click',runQuital);

  // LEVEL TEST
  document.getElementById('btnlt').addEventListener('click',startLT);
  document.getElementById('btnltapp').addEventListener('click',applyLT);
  document.getElementById('btnltre').addEventListener('click',startLT);

  // HÖREN
  document.getElementById('btnlht').addEventListener('click',loadHT);
  document.getElementById('btnpht').addEventListener('click',()=>{if(htText)speak(htText,ST.lang);});

  // LESEN
  document.getElementById('btnlst').addEventListener('click',loadStory);

  // SPRECHEN
  document.getElementById('btnlspk').addEventListener('click',loadSpk);
  document.getElementById('btntts').addEventListener('click',()=>{if(spkTarget)speak(spkTarget,ST.lang);});
  document.getElementById('spkmic').addEventListener('click',toggleSpkMic);

  // SCHREIBEN
  document.getElementById('btnlwr').addEventListener('click',loadWritePrompt);
  document.getElementById('btncwr').addEventListener('click',checkWriting);

  // GRAMMATIK
  document.getElementById('btngramchk').addEventListener('click',checkGram);
  document.getElementById('graminp').addEventListener('keydown',e=>{if(e.key==='Enter')checkGram();});
  document.getElementById('grammic').addEventListener('click',toggleGramMic);
  document.getElementById('btngramex').addEventListener('click',loadGramEx);

  // VOKABELN
  document.getElementById('vkcard').addEventListener('click',flipVK);
  document.getElementById('vkfb').addEventListener('click',flipVK);
  document.getElementById('vknew').addEventListener('click',()=>selectVKUnit(vkUnit,vkTranche));
  document.getElementById('vkno').addEventListener('click',()=>rateVK(false));
  document.getElementById('vkyes').addEventListener('click',()=>rateVK(true));
  document.getElementById('vk-next-tranche').addEventListener('click',()=>{
    const lang=ST.lang||'en';const db=VKDB[lang];
    if(!db||!db[vkUnit])return;
    const maxTranches=Math.ceil(db[vkUnit].length/10);
    if(vkTranche+1<maxTranches){selectVKUnit(vkUnit,vkTranche+1);}
    else if(vkUnit+1<VK_UNITS.length){selectVKUnit(vkUnit+1,0);}
    else{toast('🎉 Alle Einheiten abgeschlossen!');}
  });
  document.getElementById('vk-repeat-tranche').addEventListener('click',()=>selectVKUnit(vkUnit,vkTranche));
  document.getElementById('vktts').addEventListener('click',e=>{e.stopPropagation();speak(document.getElementById('vkw').textContent,ST.lang);});

  // ROLLENSPIEL
  document.getElementById('scgrid').addEventListener('click',function(e){
    const pn=e.target.closest('.pnode[data-s]'); if(!pn)return;
    document.querySelectorAll('#scgrid .pnode').forEach(p=>p.classList.remove('actn'));
    pn.classList.add('actn'); ST.currentScenario=pn.dataset.s;
    chatHistory=[];document.getElementById('chatwin').innerHTML='';startRole();
  });
  document.getElementById('btnschat').addEventListener('click',sendChat);
  document.getElementById('chatinp').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat();});
  document.getElementById('rolemic').addEventListener('click',toggleRoleMic);

  // MATHE Z1 adaptive
  document.querySelectorAll('[data-mz1]').forEach(b=>b.addEventListener('click',function(){
    MZ.z1.type=this.dataset.mz1; MZ.z1.correct=0; MZ.z1.wrong=0; nextMZ1();
  }));
  document.getElementById('mz1-ok-btn').addEventListener('click',checkMZ1);
  document.getElementById('mz1-ans').addEventListener('keydown',e=>{if(e.key==='Enter')checkMZ1();});

  // MATHE Z2 adaptive
  document.querySelectorAll('[data-mz2]').forEach(b=>b.addEventListener('click',function(){
    MZ.z2.type=this.dataset.mz2; MZ.z2.correct=0; MZ.z2.wrong=0; nextMZ2();
  }));
  document.getElementById('mz2-ok-btn').addEventListener('click',checkMZ2);
  document.getElementById('mz2-ans').addEventListener('keydown',e=>{if(e.key==='Enter')checkMZ2();});

  // MATHE SEK
  document.getElementById('btnmsek').addEventListener('click',loadMathSek);

  // DEUTSCH (Phase 6 — Sprint 8: KB-Handler)
  // KB2: Sprechen
  document.getElementById('de-kb2-gen-btn')?.addEventListener('click', loadDeutschKB2);
  // KB3: Lesen
  document.getElementById('de-kb3-gen-btn')?.addEventListener('click', loadDeutschKB3);
  // Zyklus-Filter
  document.getElementById('de-zyklus-filter')?.addEventListener('click', function(e){
    const btn = e.target.closest('[data-dz]'); if(!btn) return;
    this.querySelectorAll('[data-dz]').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
  });


  // NMG (neue Handler weiter unten im DOMContentLoaded — hier legacy-safe)
  document.getElementById('btnnmg')?.addEventListener('click',loadNMG);

  // INFORMATIK (neue Handler weiter unten — legacy-safe)
  document.getElementById('btninfo')?.addEventListener('click',loadInfo);

  // GAME
  document.getElementById('btnnewgame').addEventListener('click',startGame);

  // MATHE SPEED
  document.getElementById('btnmspstart').addEventListener('click',startMathSpeed);
  document.getElementById('btnmsprestart').addEventListener('click',startMathSpeed);
  document.getElementById('msp-ok-btn').addEventListener('click',checkMathSpeed);
  document.getElementById('msp-ans').addEventListener('keydown',e=>{if(e.key==='Enter')checkMathSpeed();});

  // TASTATUR
  document.getElementById('btnkbload').addEventListener('click',loadKB);
  document.getElementById('btnkbrestart').addEventListener('click',restartKB);
  document.getElementById('kbinp').addEventListener('input',handleKBInput);

  // PRÜFUNG
  document.querySelectorAll('.pnode[data-ex]').forEach(pn=>{
    pn.addEventListener('click',function(){
      document.querySelectorAll('.pnode[data-ex]').forEach(p=>p.classList.remove('actn'));
      this.classList.add('actn'); ST.currentExamType=this.dataset.ex;
    });
  });
  document.getElementById('btnexam').addEventListener('click',startExam);

  // PROFILE
  document.getElementById('btnaddprof').addEventListener('click',addProfile);
  document.getElementById('btnreset').addEventListener('click',resetApp);
  // Phase 2: neue Reset-Buttons
  document.getElementById('btnresetprogress')?.addEventListener('click',resetProgress);
  document.getElementById('btnnewyear')?.addEventListener('click',newSchoolYear);
  document.getElementById('btndelactive')?.addEventListener('click',delActiveProfile);
});

// ═══════════════════════════════════════════
// SETUP HELPERS
// ═══════════════════════════════════════════
function showSetupScreen(id){
  ['ss-pick','ss1','ss2'].forEach(s=>{
    const el=document.getElementById(s);
    if(el) el.classList.toggle('on', s===id);
  });
  document.getElementById('setup').scrollTop=0;
}
function setupPTypeSel(el){
  const btn=el.closest ? el.closest('.pto') : el;
  if(!btn||!btn.dataset.t) return;
  setupPType=btn.dataset.t;
  document.querySelectorAll('#ptgrid .pto').forEach(x=>x.classList.remove('on'));
  btn.classList.add('on');
  updateLevelOpts();
  // Supabase-Sync im Hintergrund
  sbSyncProfiles().then(()=>{ renderSetupProfilePick(); });
}
function setupLvlSel(el){
  const btn=el.closest('.lvlbtn'); if(!btn) return;
  document.querySelectorAll('#slvl-custom .lvlbtn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('slvl').value=btn.dataset.val;
}
function setupWeiter(){
  if(!document.getElementById('sn').value.trim()){toast('⚠️ Bitte Namen eingeben');return;}
  // Hardcoded Key vorhanden → Setup-Screen ss2 überspringen
  if(HARDCODED_API_KEY){ST.apiKey=HARDCODED_API_KEY;localStorage.setItem('edu_api_key',HARDCODED_API_KEY);finishSetupDirect();return;}
  const k=localStorage.getItem('edu_api_key');
  if(k&&k.startsWith('sk-ant')){ST.apiKey=k;finishSetupDirect();return;}
  showSetupScreen('ss2');
}
function setupFinish(){
  const k=document.getElementById('sapi').value.trim();
  const pin=document.getElementById('sadminpin').value.trim();
  if(!k.startsWith('sk-ant')){toast('⚠️ Ungültiger API-Schlüssel');return;}
  if(pin.length<4){toast('⚠️ PIN muss mindestens 4 Stellen haben');return;}
  ST.apiKey=k;
  localStorage.setItem('edu_api_key',k);
  localStorage.setItem('edu_admin_pin',btoa(pin));
  finishSetupDirect();
}

// ═══════════════════════════════════════════
// LEVEL OPTIONS
// ═══════════════════════════════════════════
function updateLevelOpts(){
  const lbl=document.getElementById('sllbl');
  const container=document.getElementById('slvl-custom');
  const hidden=document.getElementById('slvl');
  const t=setupPType;
  let opts=[];
  if(t==='z1'){lbl.textContent='Klasse';opts=[
    {val:'kg1',label:'Kindergarten 1'},
    {val:'kg2',label:'Kindergarten 2'},
    {val:'1',label:'1. Klasse'},
    {val:'2',label:'2. Klasse'}
  ];}
  else if(t==='z2'){lbl.textContent='Klasse';opts=[3,4,5,6].map(n=>({val:String(n),label:n+'. Klasse'}));}
  else if(t==='z3'){lbl.textContent='Klasse';opts=[7,8,9,10,11].map(n=>({val:String(n),label:n+'. Klasse'}));}
  else if(t==='hs'){lbl.textContent='Schuljahr Kind';opts=[
    {val:'kg1',label:'Kindergarten 1'},
    {val:'kg2',label:'Kindergarten 2'},
    ...[1,2,3,4,5,6,7,8,9].map(n=>({val:String(n),label:n+'. Klasse'}))
  ];}
  else{lbl.textContent='Sprachniveau';opts=['A1','A2','B1','B2','C1','C2'].map(l=>({val:l,label:l}));}
  hidden.value=opts[0].val;
  container.innerHTML=opts.map((o,i)=>
    `<button type="button" class="lvlbtn${i===0?' on':''}" data-val="${o.val}" onclick="setupLvlSel(event.target)">${o.label}</button>`
  ).join('');
}

// ═══════════════════════════════════════════
// SETUP FINISH
// ═══════════════════════════════════════════
function finishSetupDirect(){
  const name=document.getElementById('sn').value.trim()||'Lernender';
  const level=document.getElementById('slvl').value;
  const lang='en';
  const profile={
    id:(typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():Date.now().toString(),
    name,type:setupPType,level,lang,
    xp:0,streak:0,done:0,progress:{learn:0,listen:0,exam:0},
    skills:{h:0,l:0,s:0,w:0,r:0,m:0},badges:[]
  };
  if(name&&name!=='Lernender'){
    const saved=JSON.parse(localStorage.getItem('edu_saved_names')||'[]');
    if(!saved.includes(name)){saved.unshift(name);if(saved.length>8)saved.pop();localStorage.setItem('edu_saved_names',JSON.stringify(saved));}
  }
  // Falls App bereits läuft: Profil anhängen, nicht ersetzen
  const appRunning=document.getElementById('app').style.display==='flex';
  if(appRunning){
    ST.profiles.push(profile);
    localStorage.setItem('edu_profiles',JSON.stringify(ST.profiles));
    sbSaveProfile(profile); // → Supabase (async, kein await nötig)
    applyProfile(ST.profiles.length-1);
    document.getElementById('setup').style.display='none';
    document.body.classList.remove('setup-open');
    updateTop();updateDash();renderProfiles();renderBadges();
    toast('✅ Profil «'+name+'» erstellt!');
    nav('profile');
  } else {
    ST.profiles=[profile];
    localStorage.setItem('edu_profiles',JSON.stringify(ST.profiles));
    sbSaveProfile(profile); // → Supabase (async, kein await nötig)
    applyProfile(0);
    document.getElementById('setup').style.display='none';
    document.body.classList.remove('setup-open');
    launchApp();
  }
}

function applyProfile(idx){
  const p=ST.profiles[idx]; if(!p)return;
  ST.activeProfile=idx; ST.lang=p.lang||'en'; ST.xp=p.xp||0; ST.streak=p.streak||0; ST.done=p.done||0;
  ST.progress=p.progress||{learn:0,listen:0,exam:0}; ST.skills=p.skills||{h:0,l:0,s:0,w:0,r:0,m:0};
  earnedBadges=p.badges||[];
  ST.user_config={id:p.id,name:p.name,profile_type:p.type,level:p.level};
  // Phase 1a: Niveau automatisch nach Zyklus-Engine (LP21-Backbone)
  if(p.type==='adult'){
    ST.user_config.level=p.level;
    ST.user_config.category='adult';
  } else {
    const yr=p.level;
    const zm=ZYKLUS_MAP[yr]||ZYKLUS_MAP[parseInt(yr)]||ZYKLUS_MAP[1];
    ST.user_config.level=zm.niveau;
    ST.user_config.zyklus=zm.zyklus;
    ST.user_config.schuljahr=yr;
    ST.user_config.category='lp21';
  }
  if(document.getElementById('app').style.display==='flex') { updateSidebarByProfile(); hsUpdateSidebarVisibility(); }
  sbSyncVocabProgress(ST.lang||'en'); // → Supabase Vocab Sync
}

function saveProfile(){
  const p=ST.profiles[ST.activeProfile]; if(!p)return;
  p.xp=ST.xp;p.streak=ST.streak;p.done=ST.done;p.progress=ST.progress;p.skills=ST.skills;p.badges=earnedBadges;
  localStorage.setItem('edu_profiles',JSON.stringify(ST.profiles));
}

// ═══════════════════════════════════════════
// LAUNCH
// ═══════════════════════════════════════════
function launchApp(){
  const appEl=document.getElementById('app');
  appEl.style.display='flex';
  loadHardcodedKey();
  updateTop();updateDash();buildPath();loadVK();loadSpk();startRole();startGame();nextMZ1();nextMZ2();renderProfiles();renderBadges();showApiDisp();
  initLangSwitcher();
  initAdminPanel();
  updateSidebarByProfile(); // Phase 1a
  updateDashByProfile();     // Phase 1c: Dashboard + Difficulty
  setTimeout(validateApiKey, 800); // Startup-Validierung nach kurzem Delay
  renderSjArchiv();
  hsUpdateSidebarVisibility();
  vokiUpdateVKDB(); // Sprint 12: eigene Sets in VKDB laden
}

function updateTop(){
  const p=ST.profiles[ST.activeProfile]; if(!p)return;
  document.getElementById('tnm').textContent=p.name;
  document.getElementById('tav').textContent=p.name[0].toUpperCase();
  document.getElementById('tlvl').textContent=ST.user_config.level;
  document.getElementById('txp').textContent=ST.xp+' XP';
  document.getElementById('txpf').style.width=Math.min(100,ST.xp%100)+'%';
}

function updateDash(){
  const h=new Date().getHours();
  const gr=h<12?'Guten Morgen':h<17?'Guten Tag':'Guten Abend';
  const p=ST.profiles[ST.activeProfile];
  document.getElementById('dhi').textContent=gr+(p?', '+p.name+'!':'!');
  document.getElementById('ds').textContent=ST.streak;
  document.getElementById('dx').textContent=ST.xp;
  document.getElementById('dd').textContent=ST.done;
  document.getElementById('dl').textContent=ST.user_config.level;
  ['l','li','e'].forEach(k=>{
    const map={l:'learn',li:'listen',e:'exam'};
    document.getElementById('pr-'+k).textContent=ST.progress[map[k]]||0;
    document.getElementById('pf-'+k).style.width=Math.min(100,ST.progress[map[k]]||0)+'%';
  });
  ['h','l','s','w','r','m'].forEach(k=>{
    document.getElementById('sk-'+k).style.width=ST.skills[k]+'%';
    document.getElementById('sp-'+k).textContent=ST.skills[k]+'%';
  });
  // Sprach-Wechsler-Highlight aktualisieren
  document.querySelectorAll('#lang-switcher .langbtn').forEach(b=>b.classList.toggle('on',b.dataset.lang===(ST.lang||'en')));
}

// ═══════════════════════════════════════════
// PHASE 1c — SCHWIERIGKEITSGRAD-AUTOMATIK
// Setzt Difficulty-Offset und Mathe-Panel-Sichtbarkeit nach Zyklus
// ═══════════════════════════════════════════

// Setzt den Difficulty-Regler automatisch nach Zyklus
// Wird beim Profilwechsel und beim Öffnen von Panels aufgerufen
// ═══════════════════════════════════════════
// SPRINT 4 — LP21 SCHWIERIGKEITSGRAD-AUTOMATIK
// Feingranulare Zuweisung nach Schuljahr, Zyklus, Niveau und Sprachstart
// ═══════════════════════════════════════════
function getAutoDiffForProfile() {
  const zi = getZyklusInfo();
  if (zi.isAdult) return 0; // Erwachsene: immer Standard

  const sjRaw = zi.schuljahr;
  const sj = (sjRaw === 'kg1' || sjRaw === 'kg2') ? 0 : (parseInt(sjRaw) || 1);
  // Zyklus 1 (KG–2. Kl.): immer Einfach
  if (zi.zyklus === 1) return -1;
  // Zyklus 2 (3.–6. Kl.): feingranular nach Schuljahr
  if (zi.zyklus === 2) {
    if (sj <= 4) return -1; // 3.–4. Kl.: noch einfach
    if (sj === 5) return 0; // 5. Kl.: Standard
    return 0;               // 6. Kl.: Standard
  }
  // Zyklus 3 (7.–9. Kl.): Standard oder Fortgeschritten
  if (zi.zyklus === 3) {
    if (sj === 7) return 0;  // 7. Kl.: Standard
    if (sj === 8) return 0;  // 8. Kl.: Standard
    return 1;                // 9. Kl.+: Fortgeschritten
  }
  return 0;
}

// Gibt den CEFR-Level-String für den aktuellen Diff-Offset zurück
function getEffectiveNiveau(baseNiveau, offset) {
  const scale = ['A1','A2','B1','B2','C1','C2'];
  const idx = scale.indexOf(baseNiveau);
  if (idx < 0) return baseNiveau;
  return scale[Math.max(0, Math.min(scale.length-1, idx + offset))];
}

// Gibt einen menschenlesbaren Diff-Label zurück (für Prompts)
function getDiffLabel(offset, lang) {
  if (lang === 'de') {
    return offset === -1 ? 'einfacher (Wiederholung, kurze Sätze)' :
           offset ===  1 ? 'anspruchsvoller (komplexere Strukturen, erweiterter Wortschatz)' :
           'Standard (altersentsprechend, LP21-konform)';
  }
  return offset === -1 ? 'simpler (revision level, short sentences)' :
         offset ===  1 ? 'more challenging (complex structures, richer vocabulary)' :
         'standard (age-appropriate, LP21 level)';
}

function applyAutoDifficulty() {
  const zi = getZyklusInfo();
  const defaultDiff = getAutoDiffForProfile();
  ST.learning_state.difficulty_offset = defaultDiff;

  // Alle drow-Buttons synchronisieren
  document.querySelectorAll('.drow .db').forEach(b => {
    b.classList.toggle('on', parseInt(b.dataset.d) === defaultDiff);
  });

  // Dashboard-Badge aktualisieren (Sprint 4: Niveau-Anzeige)
  const niv = zi.isAdult ? (zi.niveau||'B1') : getEffectiveNiveau(zi.niveau||'A1', defaultDiff);
  const diffEl = document.getElementById('dash-zyklus-info');
  if (diffEl && !zi.isAdult) {
    const sj = parseInt(zi.schuljahr) || 1;
    const sjLabel = ['kg1','kg2'].includes(String(zi.schuljahr)) ? zi.label :
                    (sj + '. Klasse · Z' + zi.zyklus);
    const diffLabel = defaultDiff === -1 ? '📗 Einfach' :
                      defaultDiff ===  1 ? '📕 Fortgeschritten' : '📘 Standard';
    diffEl.textContent = `📚 ${sjLabel} · ${niv} · ${diffLabel}`;
  }
}

// Dashboard-Karten nach Zyklus/Profil anpassen
function updateDashByProfile() {
  const zi = getZyklusInfo();
  if (!zi) return;

  // Mathe: alle Zyklen immer sichtbar (Phase 6)
  const fcardMatheZ1  = document.querySelector('.fcard[data-nav="mathe-z1"]');
  const fcardMatheZ2  = document.querySelector('.fcard[data-nav="mathe-z2"]');
  const fcardMatheSek = document.querySelector('.fcard[data-nav="mathe-sek"]');
  if (fcardMatheZ1)  fcardMatheZ1.style.display  = '';
  if (fcardMatheZ2)  fcardMatheZ2.style.display  = '';
  if (fcardMatheSek) fcardMatheSek.style.display = '';

  // Mathe-Sidebar-Buttons: alle sichtbar
  const siZ1  = document.getElementById('si-mathe-z1');
  const siZ2  = document.getElementById('si-mathe-z2');
  const siSek = document.getElementById('si-mathe-sek');
  if (siZ1)  siZ1.style.display  = '';
  if (siZ2)  siZ2.style.display  = '';
  if (siSek) siSek.style.display = '';

  // Sprach-Karten FR/IT/ES nur ab Zyklus 2 anzeigen
  // (EN ist immer sichtbar, DE/DAZ auch)
  const fcardFR  = document.querySelector('.fcard[data-nav="fr-main"]');
  const fcardIT  = document.querySelector('.fcard[data-nav="it-main"]');
  const fcardES  = document.querySelector('.fcard[data-nav="es-main"]');
  const fcardDAF = document.querySelector('.fcard[data-nav="daf-main"]');
  // LP21 korrekt: DAZ ab Z2 (3. Kl.), FR/IT/ES ab 5. Klasse
  // Robuste schuljahrNum-Berechnung (inkl. 'kg1'/'kg2')
  const sj = zi.schuljahr;
  const schuljahrNum = (sj === 'kg1' || sj === 'kg2') ? 0 : (parseInt(sj) || 0);
  const showDAZ  = zi.isAdult || (zi.zyklus >= 2);
  const showFRITES = zi.isAdult || (schuljahrNum >= 5) || (zi.zyklus >= 3);
  if (fcardFR)  fcardFR.style.display  = showFRITES ? '' : 'none';
  if (fcardIT)  fcardIT.style.display  = showFRITES ? '' : 'none';
  if (fcardES)  fcardES.style.display  = showFRITES ? '' : 'none';
  if (fcardDAF) fcardDAF.style.display = showDAZ ? '' : 'none';

  // Wenn aktives Panel nicht mehr sichtbar → Dashboard zeigen
  const activePanel = document.querySelector('.panel.on');
  if (activePanel) {
    const pid = activePanel.id;
    if (!showFRITES && (pid === 'panel-fr-main' || pid === 'panel-it-main' || pid === 'panel-es-main')) {
      nav('dashboard');
    }
    if (!showDAZ && pid === 'panel-daf-main') {
      nav('dashboard');
    }
  }

  // Sidebar: DAF ab Z2 (3. Kl.), FR/IT/ES ab 5. Klasse
  ['fr','it','es'].forEach(lang => {
    const hdr  = document.getElementById('siacc-' + lang);
    const body = document.getElementById('siacc-body-' + lang);
    if (hdr)  hdr.style.display  = showFRITES ? '' : 'none';
    if (body && !showFRITES) body.style.display = 'none';
  });
  const dafHdr  = document.getElementById('siacc-daf');
  const dafBody = document.getElementById('siacc-body-daf');
  if (dafHdr)  dafHdr.style.display  = showDAZ ? '' : 'none';
  if (dafBody && !showDAZ) dafBody.style.display = 'none';
  // Sprachprüfungen: ab 5. Klasse (FR/IT/ES)
  const pruefHdr  = document.getElementById('siacc-pruef');
  const pruefBody = document.getElementById('siacc-body-pruef');
  if (pruefHdr)  pruefHdr.style.display  = showFRITES ? '' : 'none';
  if (pruefBody && !showFRITES) pruefBody.style.display = 'none';

  // Sprachausbildung: ab 5. Klasse + Adult
  const ausbildHdr  = document.getElementById('siacc-sprachausb');
  const ausbildBody = document.getElementById('siacc-body-sprachausb');
  const ausbildLbl  = document.getElementById('ss-adult-lang');
  if (ausbildHdr)  ausbildHdr.style.display  = showFRITES ? '' : 'none';
  if (ausbildBody && !showFRITES) ausbildBody.style.display = 'none';
  if (ausbildLbl)  ausbildLbl.style.display  = showFRITES ? '' : 'none';

  // Phase 3: Adult-Profil → Sprachkurse Erwachsene sichtbar
  const adultSection = document.getElementById('adult-lang-section');
  if (adultSection) adultSection.style.display = zi.isAdult ? '' : 'none';

  // Zyklus-Info auf dem Dashboard aktualisieren
  updateSidebarByProfile();
  // Difficulty automatisch setzen
  applyAutoDifficulty();
}

function showApiDisp(){
  const k=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  const el=document.getElementById('apidisplay');
  if(el)el.textContent=k?k.substring(0,12)+'***':'nicht gesetzt';
  const elFull=document.getElementById('apifull');
  if(elFull)elFull.textContent=k?k.substring(0,18)+'***':'nicht gesetzt';
}

// ── Phase 3: API-Key Startup-Validierung ──
async function validateApiKey(){
  const k=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  const badge=document.getElementById('api-status-badge');
  if(!badge)return;
  if(!k||!k.startsWith('sk-ant')){
    badge.textContent='🔴 Kein Schlüssel';badge.style.color='var(--red)';return;
  }
  badge.textContent='⏳ Prüfe…';badge.style.color='var(--text2)';
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:10,messages:[{role:'user',content:'hi'}]})
    });
    if(r.status===200||r.status===529){
      badge.textContent='🟢 Aktiv';badge.style.color='var(--green)';
    } else if(r.status===401){
      badge.textContent='🔴 Ungültig';badge.style.color='var(--red)';
    } else {
      badge.textContent='🟡 Status '+r.status;badge.style.color='var(--gold)';
    }
  }catch(e){badge.textContent='🟡 Netzwerk';badge.style.color='var(--gold)';}
}

// ── Hardcoded Key laden (falls gesetzt) ──
function loadHardcodedKey(){
  if(!HARDCODED_API_KEY)return false;
  if(!ST.apiKey&&!localStorage.getItem('edu_api_key')){
    ST.apiKey=HARDCODED_API_KEY;
    localStorage.setItem('edu_api_key',HARDCODED_API_KEY);
    return true;
  }
  // Falls user eigenen Key hat, HARDCODED als Fallback
  if(!ST.apiKey){
    ST.apiKey=HARDCODED_API_KEY;
  }
  return true;
}

// ── Sidebar Fremdsprache-Label ──
const LANG_FLAGS={en:'🇬🇧',de:'🇩🇪',fr:'🇫🇷',it:'🇮🇹',es:'🇪🇸'};
const LANG_FULL ={en:'Englisch',de:'Deutsch',fr:'Français',it:'Italiano',es:'Español'};
// Verb-Labels per Sprache für Hören/Lesen/Sprechen etc.
const LANG_SKILLS={
  en:{h:'Listening',l:'Reading',s:'Speaking',w:'Writing',g:'Grammar',v:'Vocabulary',r:'Roleplay'},
  de:{h:'Hören',l:'Lesen',s:'Sprechen',w:'Schreiben',g:'Grammatik',v:'Vokabeln',r:'Rollenspiel'},
  fr:{h:'Écoute',l:'Lecture',s:'Expression orale',w:'Écriture',g:'Grammaire',v:'Vocabulaire',r:'Jeu de rôle'},
  it:{h:'Ascolto',l:'Lettura',s:'Parlare',w:'Scrittura',g:'Grammatica',v:'Vocabolario',r:'Gioco di ruolo'},
  es:{h:'Escuchar',l:'Leer',s:'Hablar',w:'Escribir',g:'Gramática',v:'Vocabulario',r:'Juego de rol'},
};
// Separate Themen-Panels existieren nur für EN; für andere Sprachen zeigen wir den allg. Hinweis
const LANG_HAS_THEMEN={en:true};

function updateSidebarLang(){
  const lang=ST.lang||'en';
  const flag=LANG_FLAGS[lang]||'🌐';
  const name=LANG_FULL[lang]||lang;
  const sk=LANG_SKILLS[lang]||LANG_SKILLS.en;
  // Sidebar-Accordion Englisch: Titel = "LP21 · [Lernsprache]"
  const enHdr=document.getElementById('siacc-en');
  if(enHdr){const txt=enHdr.childNodes[0];if(txt)txt.textContent=flag+' LP21 · '+name+' ';}

  // ── Sprint 5: Lektionen-Button dynamisch zur aktiven Sprache ──
  const lekBtnEl = document.getElementById('si-lektionen-btn');
  if (lekBtnEl) {
    if (lang === 'en') {
      lekBtnEl.dataset.p = 'en-lektionen';
      delete lekBtnEl.dataset.sub;
      lekBtnEl.dataset.lekbtn = '1';
      const lbl = lekBtnEl.querySelector('.fs-lbl');
      if (lbl) lbl.textContent = 'Lektionen';
      const sub = lekBtnEl.querySelector('.sub');
      if (sub) sub.textContent = 'LP21 · Zyklus & Niveau';
    } else {
      // FR/IT/ES: Lektionen-Button zeigt auf Sprachpanel + Einheiten-Accordion
      const panelMap = {fr:'fr-main', it:'it-main', es:'es-main', de:'daf-main'};
      const targetPanel = panelMap[lang] || 'en-lektionen';
      lekBtnEl.dataset.p = targetPanel;
      lekBtnEl.dataset.sub = 'einheiten';
      lekBtnEl.dataset.lekbtn = '1';
      const lekLabels = {
        fr:'Lektionen · Unités', it:'Lektionen · Unità',
        es:'Lektionen · Unidades', de:'Lektionen · DAZ'
      };
      const lbl = lekBtnEl.querySelector('.fs-lbl');
      if (lbl) lbl.textContent = lekLabels[lang] || 'Lektionen';
      const sub = lekBtnEl.querySelector('.sub');
      if (sub) sub.textContent = name + ' · LP21 Einheiten';
    }
  }

  // Skill-Labels in den Buttons (Hören/Lesen/Sprechen etc.)
  const lblMap={hoeren:sk.h,lesen:sk.l,sprechen:sk.s,schreiben:sk.w,grammatik:sk.g,vokabeln:sk.v,rollenspiel:sk.r};
  Object.entries(lblMap).forEach(([panel,label])=>{
    const btn=document.querySelector(`.si[data-p="${panel}"] .fs-lbl`);
    if(btn)btn.textContent=label;
  });
  // Dashboard-Karten Fremdsprache-Labels
  document.querySelectorAll('[data-fslbl]').forEach(el=>{
    const key=el.dataset.fslbl;
    if(sk[key])el.textContent=sk[key];
  });
  const panelHeaders={
    hoeren:[flag+' '+sk.h,'LP21 · '+name+' – Hörtexte verstehen'],
    lesen:[flag+' '+sk.l,'LP21 · '+name+' – Texte lesen & analysieren'],
    sprechen:[flag+' '+sk.s,'LP21 · '+name+' – Aussprache & Kommunikation'],
    schreiben:[flag+' '+sk.w,'LP21 · '+name+' – Texte verfassen & überarbeiten'],
    grammatik:[flag+' '+sk.g,'LP21 · '+name+' – Regeln verstehen & anwenden'],
    vokabeln:[flag+' '+sk.v,'Spaced-Repetition · LP21 Wortschatz'],
    rollenspiel:[flag+' '+sk.r,'LP21 Sprechen · Alltagssituationen'],
  };
  Object.entries(panelHeaders).forEach(([panelId,[title,sub]])=>{
    const panel=document.getElementById('panel-'+panelId);
    if(!panel)return;
    const h2=panel.querySelector('.ph h2');
    const p2=panel.querySelector('.ph p');
    if(h2)h2.textContent=title;
    if(p2)p2.textContent=sub;
  });
}

function initLangSwitcher(){
  const btns=document.querySelectorAll('#lang-switcher .langbtn');
  function highlight(lang){btns.forEach(b=>b.classList.toggle('on',b.dataset.lang===lang));}
  highlight(ST.lang||'en');
  updateSidebarLang();
  btns.forEach(b=>b.addEventListener('click',function(){
    const lang=this.dataset.lang;
    ST.lang=lang;
    const p=ST.profiles[ST.activeProfile];if(p){p.lang=lang;saveProfile();}
    highlight(lang);
    updateSidebarLang();
    loadVK();loadSpk();chatHistory=[];startRole();
    toast('🌍 Lernsprache: '+(LANG_FULL[lang]||lang));
  }));
}

function initAdminPanel(){
  // Unlock button → show PIN entry
  document.getElementById('btnadminunlock').addEventListener('click',()=>{
    document.getElementById('api-pin-entry').style.display='block';
    document.getElementById('adminpin-input').focus();
  });
  // Verify PIN
  document.getElementById('btnadminverify').addEventListener('click',verifyAdminPin);
  document.getElementById('adminpin-input').addEventListener('keydown',e=>{if(e.key==='Enter')verifyAdminPin();});
  // Lock
  document.getElementById('btnadminlock').addEventListener('click',()=>{
    document.getElementById('api-unlocked').style.display='none';
    document.getElementById('api-locked').style.display='block';
    document.getElementById('api-pin-entry').style.display='none';
    document.getElementById('adminpin-input').value='';
    document.getElementById('adminpin-err').textContent='';
  });
  // Save API
  document.getElementById('btnsaveapi').addEventListener('click',function(){
    const k=document.getElementById('apichange').value.trim();
    if(!k.startsWith('sk-ant')){toast('⚠️ Ungültiger Schlüssel');return;}
    ST.apiKey=k; localStorage.setItem('edu_api_key',k); showApiDisp(); toast('✅ API-Schlüssel gespeichert!');
    validateApiKey();
  });
  // Change PIN
  document.getElementById('btnchangepin').addEventListener('click',()=>{
    const p1=document.getElementById('newpin1').value.trim();
    const p2=document.getElementById('newpin2').value.trim();
    const msg=document.getElementById('pinchange-msg');
    if(p1.length<4){msg.style.color='var(--red)';msg.textContent='PIN muss mindestens 4 Stellen haben.';return;}
    if(p1!==p2){msg.style.color='var(--red)';msg.textContent='PINs stimmen nicht überein.';return;}
    localStorage.setItem('edu_admin_pin',btoa(p1));
    msg.style.color='var(--green)';msg.textContent='✅ PIN geändert!';
    document.getElementById('newpin1').value='';document.getElementById('newpin2').value='';
    setTimeout(()=>{msg.textContent='';},2500);
  });
}

function verifyAdminPin(){
  const entered=document.getElementById('adminpin-input').value.trim();
  const stored=localStorage.getItem('edu_admin_pin');
  if(!stored){// Kein PIN gesetzt — direkter Zugang (Erstinstallation ohne PIN)
    unlockAdminPanel();return;
  }
  try{if(btoa(entered)===stored){unlockAdminPanel();}
  else{document.getElementById('adminpin-err').textContent='❌ Falscher PIN';}}
  catch(e){if(entered===atob(stored)){unlockAdminPanel();}
  else{document.getElementById('adminpin-err').textContent='❌ Falscher PIN';}}
}

function unlockAdminPanel(){
  document.getElementById('api-locked').style.display='none';
  document.getElementById('api-unlocked').style.display='block';
  document.getElementById('adminpin-input').value='';
  document.getElementById('adminpin-err').textContent='';
  showApiDisp();
}

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// Z1 LITERACY ENGINE
// Buchstaben · Sichtwörter · Zahlen
// Kein Lesen vorausgesetzt — Bild + Ton + Klick
// ═══════════════════════════════════════════

// ── Buchstaben-Daten (A–Z mit Anlaut-Wort + Emoji) ──
const BT_DATA = [
  {l:'A',w:'Apfel',e:'🍎',laut:'/a/'}, {l:'B',w:'Ball',e:'⚽',laut:'/b/'},
  {l:'C',w:'Computer',e:'💻',laut:'/ts/'}, {l:'D',w:'Dach',e:'🏠',laut:'/d/'},
  {l:'E',w:'Elefant',e:'🐘',laut:'/e/'}, {l:'F',w:'Fisch',e:'🐟',laut:'/f/'},
  {l:'G',w:'Garten',e:'🌻',laut:'/g/'}, {l:'H',w:'Hund',e:'🐕',laut:'/h/'},
  {l:'I',w:'Igel',e:'🦔',laut:'/i/'}, {l:'J',w:'Jacke',e:'🧥',laut:'/j/'},
  {l:'K',w:'Katze',e:'🐈',laut:'/k/'}, {l:'L',w:'Löwe',e:'🦁',laut:'/l/'},
  {l:'M',w:'Mond',e:'🌙',laut:'/m/'}, {l:'N',w:'Nase',e:'👃',laut:'/n/'},
  {l:'O',w:'Orange',e:'🍊',laut:'/o/'}, {l:'P',w:'Pferd',e:'🐴',laut:'/p/'},
  {l:'Q',w:'Qualle',e:'🪼',laut:'/kv/'}, {l:'R',w:'Rakete',e:'🚀',laut:'/r/'},
  {l:'S',w:'Sonne',e:'☀️',laut:'/s/'}, {l:'T',w:'Tiger',e:'🐯',laut:'/t/'},
  {l:'U',w:'Uhr',e:'⏰',laut:'/u/'}, {l:'V',w:'Vogel',e:'🐦',laut:'/f/'},
  {l:'W',w:'Wolke',e:'☁️',laut:'/v/'}, {l:'X',w:'Xylofon',e:'🎵',laut:'/ks/'},
  {l:'Y',w:'Yacht',e:'⛵',laut:'/j/'}, {l:'Z',w:'Zug',e:'🚂',laut:'/ts/'},
];

// localStorage für Fortschritt
const BT_KEY = 'z1_buchstaben';
const SW_KEY = 'z1_sichtwort';
const ZL_KEY = 'z1_zahlen';

let btModus='', btCurrent=null, btScore=0, btStreak=0, btCorrect=0;
let swModus='', swCurrent=null, swScore=0, swStreak=0, swSet=0;
let zlModus='', zlCurrent=null, zlScore=0, zlStreak=0, zlCorrect=0;

// ── Buchstaben-Fortschritt ──
function btGetProgress() { return JSON.parse(localStorage.getItem(BT_KEY)||'{}'); }
function btSaveProgress(p) { localStorage.setItem(BT_KEY, JSON.stringify(p)); }
function btMarkCorrect(letter) {
  const p = btGetProgress();
  p[letter] = Math.min(3, (p[letter]||0)+1);
  btSaveProgress(p); btRenderMap();
}

function btRenderMap() {
  const el = document.getElementById('abc-map'); if(!el) return;
  const p = btGetProgress();
  el.innerHTML = BT_DATA.map(b => {
    const lvl = p[b.l]||0;
    const col = lvl>=3?'var(--green)':lvl>=1?'var(--gold)':'var(--bg3)';
    const txt = lvl>=3?'var(--text)':'var(--text2)';
    return `<div onclick="btSetTagesbuchstabe('${b.l}')" style="width:44px;height:44px;border-radius:var(--r);background:${col};display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;border:1px solid var(--border);">
      <div style="font-size:18px;font-weight:800;color:${txt};">${b.l}</div>
      <div style="font-size:9px;color:var(--text3);">${lvl>=3?'✓':lvl>=1?'~':''}</div>
    </div>`;
  }).join('');
}

function btSetTagesbuchstabe(letter) {
  const b = BT_DATA.find(x=>x.l===letter); if(!b) return;
  const el = document.getElementById('bt-tag-letter');
  const ew = document.getElementById('bt-tag-wort');
  const el2 = document.getElementById('bt-tag-laut');
  if(el) el.textContent = b.l;
  if(ew) ew.textContent = b.e+' '+b.w;
  if(el2) el2.textContent = 'Laut: '+b.laut;
}

function btSprechTagesbuchstabe() {
  const el = document.getElementById('bt-tag-letter');
  const b = BT_DATA.find(x=>x.l===el?.textContent); if(!b) return;
  speak(b.l+'. '+b.w, 'de');
}

// ── Buchstaben-Trainer: Modi ──
function btStartModus(modus) {
  btModus = modus; btScore=0; btStreak=0; btCorrect=0;
  document.getElementById('bt-sc').textContent='0';
  document.getElementById('bt-st').textContent='0';
  document.getElementById('bt-ok').textContent='0';
  document.getElementById('bt-feedback').textContent='';
  document.querySelectorAll('[id^=bt-mod-]').forEach(b=>b.className='btn');
  const btn = document.getElementById('bt-mod-'+modus);
  if(btn) btn.className='btn btn-p';
  btNextQuestion();
}

function btNextQuestion() {
  const out = document.getElementById('bt-trainer'); if(!out) return;
  const p = btGetProgress();
  // Wähle Buchstabe: bevorzuge ungeübte
  const pool = BT_DATA.filter(b=>( p[b.l]||0)<3);
  const b = pool.length ? pool[Math.floor(Math.random()*pool.length)]
                        : BT_DATA[Math.floor(Math.random()*BT_DATA.length)];
  btCurrent = b;

  if(btModus==='laut') {
    // Laut hören → richtigen Buchstaben klicken
    const distractors = BT_DATA.filter(x=>x.l!==b.l).sort(()=>Math.random()-.5).slice(0,3);
    const opts = [b,...distractors].sort(()=>Math.random()-.5);
    out.innerHTML = `
      <div style="font-size:15px;color:var(--text2);margin-bottom:.5rem;">Welcher Buchstabe macht diesen Laut?</div>
      <button class="btn btn-p" style="font-size:18px;padding:12px 28px;" onclick="speak('${b.l}. ${b.w}','de')">🔊 ${b.laut}</button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:.5rem;width:100%;max-width:320px;">
        ${opts.map(o=>`<button onclick="btCheck('${o.l}','${b.l}')" style="padding:20px;font-size:42px;font-weight:800;background:var(--bg3);border:2px solid var(--border);border-radius:var(--r);cursor:pointer;">${o.l}</button>`).join('')}
      </div>`;
    setTimeout(()=>speak(b.l+'. '+b.w,'de'), 400);

  } else if(btModus==='bild') {
    // Bild sehen → Anlaut-Buchstaben klicken
    const distractors = BT_DATA.filter(x=>x.l!==b.l).sort(()=>Math.random()-.5).slice(0,3);
    const opts = [b,...distractors].sort(()=>Math.random()-.5);
    out.innerHTML = `
      <div style="font-size:72px;">${b.e}</div>
      <div style="font-size:18px;font-weight:700;">${b.w}</div>
      <div style="font-size:13px;color:var(--text2);">Mit welchem Buchstaben beginnt das Wort?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;max-width:320px;">
        ${opts.map(o=>`<button onclick="btCheck('${o.l}','${b.l}')" style="padding:20px;font-size:42px;font-weight:800;background:var(--bg3);border:2px solid var(--border);border-radius:var(--r);cursor:pointer;">${o.l}</button>`).join('')}
      </div>`;

  } else if(btModus==='schreib') {
    // Buchstabe sehen → auf Tastatur tippen
    out.innerHTML = `
      <div style="font-size:110px;font-family:'DM Serif Display',serif;line-height:1;color:var(--blue);">${b.l}</div>
      <div style="font-size:18px;color:var(--text2);">${b.e} ${b.w}</div>
      <div style="font-size:13px;color:var(--text3);margin-top:.25rem;">${b.laut}</div>
      <input id="bt-schreib-inp" class="inp" style="font-size:28px;text-align:center;width:100px;margin-top:.5rem;text-transform:uppercase;" maxlength="1" autocomplete="off" autocorrect="off" autocapitalize="off" placeholder="?" />
      <button class="btn btn-p" onclick="btCheckSchreib('${b.l}')" style="padding:10px 24px;font-size:15px;">OK ✓</button>`;
    setTimeout(()=>document.getElementById('bt-schreib-inp')?.focus(), 100);
    document.getElementById('bt-schreib-inp')?.addEventListener('keydown', e=>{ if(e.key==='Enter') btCheckSchreib(b.l); });

  } else if(btModus==='gross-klein') {
    // Gross → Klein oder umgekehrt zuordnen
    const showBig = Math.random() < 0.5;
    const shown = showBig ? b.l : b.l.toLowerCase();
    const answer = showBig ? b.l.toLowerCase() : b.l;
    const distractors = BT_DATA.filter(x=>x.l!==b.l).sort(()=>Math.random()-.5).slice(0,3);
    const opts = [answer,...distractors.map(d=>showBig?d.l.toLowerCase():d.l)].sort(()=>Math.random()-.5);
    out.innerHTML = `
      <div style="font-size:15px;color:var(--text2);">${showBig?'Grossbuchstabe → Kleinbuchstabe':'Kleinbuchstabe → Grossbuchstabe'}</div>
      <div style="font-size:110px;font-family:'DM Serif Display',serif;line-height:1;">${shown}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;max-width:320px;">
        ${opts.map(o=>`<button onclick="btCheck('${o}','${answer}')" style="padding:20px;font-size:42px;font-weight:800;background:var(--bg3);border:2px solid var(--border);border-radius:var(--r);cursor:pointer;">${o}</button>`).join('')}
      </div>`;
  }
}

function btCheck(given, correct) {
  const fb = document.getElementById('bt-feedback');
  if(given===correct) {
    btScore+=10+btStreak*2; btStreak++; btCorrect++;
    btMarkCorrect(btCurrent.l);
    if(fb) fb.innerHTML='<span style="color:var(--green)">✅ Super! +'+( 10+(btStreak-1)*2)+'</span>';
    addXP(5,'l','learn');
  } else {
    btStreak=0;
    if(fb) fb.innerHTML='<span style="color:var(--red)">❌ Es war: <strong>'+correct+'</strong></span>';
    speak(correct+'. '+btCurrent.w,'de');
  }
  document.getElementById('bt-sc').textContent=btScore;
  document.getElementById('bt-st').textContent=btStreak;
  document.getElementById('bt-ok').textContent=btCorrect;
  setTimeout(btNextQuestion, 1000);
}

function btCheckSchreib(correct) {
  const inp = document.getElementById('bt-schreib-inp');
  const given = (inp?.value||'').trim().toUpperCase();
  btCheck(given, correct);
}

// Buchstabe des Tages initialisieren
function btInitTagesbuchstabe() {
  const dayIdx = new Date().getDay();
  btSetTagesbuchstabe(BT_DATA[dayIdx % BT_DATA.length].l);
  btRenderMap();
}

// ════════════════════════════════
// SICHTWORT-TRAINER
// ════════════════════════════════
const SW_SETS = [
  // Set 0: Familie & Zuhause
  [{w:'Mama',e:'👩'},{w:'Papa',e:'👨'},{w:'Kind',e:'👧'},{w:'Baby',e:'👶'},{w:'Oma',e:'👵'},
   {w:'Opa',e:'👴'},{w:'Haus',e:'🏠'},{w:'Tür',e:'🚪'},{w:'Bett',e:'🛏'},{w:'Tisch',e:'🪑'},
   {w:'Stuhl',e:'🪑'},{w:'Küche',e:'🍳'},{w:'Bad',e:'🛁'},{w:'Buch',e:'📕'},{w:'Ball',e:'⚽'},
   {w:'Hund',e:'🐕'},{w:'Katze',e:'🐈'},{w:'Milch',e:'🥛'},{w:'Brot',e:'🍞'},{w:'Wasser',e:'💧'}],
  // Set 1: Schule & Lernen
  [{w:'Schule',e:'🏫'},{w:'Stift',e:'✏️'},{w:'Buch',e:'📚'},{w:'Tasche',e:'🎒'},{w:'Tafel',e:'🖊️'},
   {w:'Lesen',e:'📖'},{w:'Schreiben',e:'✍️'},{w:'Zählen',e:'🔢'},{w:'Malen',e:'🎨'},{w:'Singen',e:'🎵'},
   {w:'Lehrerin',e:'👩‍🏫'},{w:'Freund',e:'🤝'},{w:'Pause',e:'⏸️'},{w:'Turnen',e:'🤸'},{w:'Spielen',e:'🎮'},
   {w:'Lineal',e:'📏'},{w:'Schere',e:'✂️'},{w:'Kleber',e:'🖇️'},{w:'Papier',e:'📄'},{w:'Farbe',e:'🎨'}],
  // Set 2: Tiere & Natur
  [{w:'Hund',e:'🐕'},{w:'Katze',e:'🐈'},{w:'Vogel',e:'🐦'},{w:'Fisch',e:'🐟'},{w:'Pferd',e:'🐴'},
   {w:'Kuh',e:'🐄'},{w:'Schaf',e:'🐑'},{w:'Baum',e:'🌳'},{w:'Blume',e:'🌸'},{w:'Sonne',e:'☀️'},
   {w:'Regen',e:'🌧️'},{w:'Schnee',e:'❄️'},{w:'Mond',e:'🌙'},{w:'Stern',e:'⭐'},{w:'Wolke',e:'☁️'},
   {w:'Berg',e:'⛰️'},{w:'See',e:'🌊'},{w:'Wald',e:'🌲'},{w:'Gras',e:'🌿'},{w:'Stein',e:'🪨'}],
  // Set 3: Farben & Zahlen
  [{w:'rot',e:'🔴'},{w:'blau',e:'🔵'},{w:'grün',e:'🟢'},{w:'gelb',e:'🟡'},{w:'schwarz',e:'⚫'},
   {w:'weiß',e:'⚪'},{w:'eins',e:'1️⃣'},{w:'zwei',e:'2️⃣'},{w:'drei',e:'3️⃣'},{w:'vier',e:'4️⃣'},
   {w:'fünf',e:'5️⃣'},{w:'sechs',e:'6️⃣'},{w:'sieben',e:'7️⃣'},{w:'acht',e:'8️⃣'},{w:'neun',e:'9️⃣'},
   {w:'zehn',e:'🔟'},{w:'groß',e:'🔼'},{w:'klein',e:'🔽'},{w:'viel',e:'💯'},{w:'wenig',e:'🔻'}],
  // Set 4: Alltag & Körper
  [{w:'Kopf',e:'🗣️'},{w:'Auge',e:'👁️'},{w:'Nase',e:'👃'},{w:'Mund',e:'👄'},{w:'Ohr',e:'👂'},
   {w:'Hand',e:'✋'},{w:'Fuss',e:'🦶'},{w:'Arm',e:'💪'},{w:'essen',e:'🍽️'},{w:'trinken',e:'🥤'},
   {w:'schlafen',e:'😴'},{w:'laufen',e:'🏃'},{w:'springen',e:'🦘'},{w:'malen',e:'🎨'},{w:'lachen',e:'😄'},
   {w:'weinen',e:'😢'},{w:'lieb',e:'❤️'},{w:'müde',e:'😴'},{w:'hungrig',e:'🍽️'},{w:'satt',e:'😊'}],
];

let swCurrentSet = 0, swCurrentList = [], swCurrentIdx = 0, swKnown = {};

function swLoadSet(idx) {
  swCurrentSet = idx;
  swCurrentList = [...SW_SETS[idx]].sort(()=>Math.random()-.5);
  swCurrentIdx = 0;
  const known = JSON.parse(localStorage.getItem(SW_KEY)||'{}');
  swKnown = known;
  swUpdateStats();
  toast('📚 Set '+(idx+1)+' geladen!');
}

function swUpdateStats() {
  const known = JSON.parse(localStorage.getItem(SW_KEY)||'{}');
  const total = SW_SETS.flat().length;
  const green = Object.values(known).filter(v=>v>=3).length;
  const el1 = document.getElementById('sw-total');
  const el2 = document.getElementById('sw-green');
  const bar  = document.getElementById('sw-bar');
  if(el1) el1.textContent = total;
  if(el2) el2.textContent = green;
  if(bar) bar.style.width = Math.round(green/total*100)+'%';
}

function swStartModus(modus) {
  swModus = modus; swScore=0; swStreak=0;
  if(!swCurrentList.length) { swLoadSet(0); }
  document.getElementById('sw-feedback').textContent='';
  swNextCard();
}

function swNextCard() {
  const out = document.getElementById('sw-trainer'); if(!out) return;
  if(!swCurrentList.length) { out.innerHTML='<div style="font-size:15px;color:var(--green)">✅ Set abgeschlossen!</div>'; return; }
  swCurrentIdx = swCurrentIdx % swCurrentList.length;
  const word = swCurrentList[swCurrentIdx];
  swCurrent = word;

  if(swModus==='flash') {
    // Wort kurz zeigen → Kind sagt es laut
    out.innerHTML = `
      <div style="font-size:72px;">${word.e}</div>
      <div style="font-size:48px;font-weight:800;color:var(--blue);letter-spacing:2px;">${word.w}</div>
      <div style="font-size:13px;color:var(--text2);margin-top:.5rem;">Lies das Wort laut vor!</div>
      <div style="display:flex;gap:12px;margin-top:1rem;">
        <button onclick="swResult(true)" style="flex:1;padding:16px;font-size:22px;border-radius:var(--r);border:2px solid var(--green);background:rgba(34,197,94,.1);cursor:pointer;">✅ Kenne ich!</button>
        <button onclick="swResult(false)" style="flex:1;padding:16px;font-size:22px;border-radius:var(--r);border:2px solid var(--red);background:rgba(239,68,68,.1);cursor:pointer;">❌ Noch nicht</button>
      </div>`;
    setTimeout(()=>speak(word.w,'de'), 300);

  } else if(swModus==='bild') {
    // Bild → richtiges Wort aus 4 Optionen
    const setFlat = swCurrentList;
    const dists = setFlat.filter(x=>x.w!==word.w).sort(()=>Math.random()-.5).slice(0,3);
    const opts = [word,...dists].sort(()=>Math.random()-.5);
    out.innerHTML = `
      <div style="font-size:80px;">${word.e}</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:.5rem;">Welches Wort passt zum Bild?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:340px;">
        ${opts.map(o=>`<button onclick="swCheckWord('${o.w}','${word.w}')" style="padding:14px 10px;font-size:18px;font-weight:700;background:var(--bg3);border:2px solid var(--border);border-radius:var(--r);cursor:pointer;">${o.w}</button>`).join('')}
      </div>`;

  } else if(swModus==='lesen') {
    // Wort + Bild → vorlesen lassen
    out.innerHTML = `
      <div style="font-size:80px;">${word.e}</div>
      <div style="font-size:52px;font-weight:800;letter-spacing:3px;color:var(--text);">${word.w}</div>
      <button class="btn btn-p" style="font-size:18px;padding:12px 28px;" onclick="speak('${word.w}','de')">🔊 Hören</button>
      <div style="display:flex;gap:12px;margin-top:.5rem;">
        <button onclick="swResult(true)" style="flex:1;padding:14px;font-size:18px;border-radius:var(--r);border:2px solid var(--green);background:rgba(34,197,94,.1);cursor:pointer;">✅ Kenne ich!</button>
        <button onclick="swResult(false)" style="flex:1;padding:14px;font-size:18px;border-radius:var(--r);border:2px solid var(--red);background:rgba(239,68,68,.1);cursor:pointer;">❌ Noch üben</button>
      </div>`;

  } else if(swModus==='tippen') {
    // Bild sehen → Wort tippen
    out.innerHTML = `
      <div style="font-size:80px;">${word.e}</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:.5rem;">Tippe das Wort:</div>
      <input id="sw-type-inp" class="inp" style="font-size:22px;text-align:center;width:200px;" autocomplete="off" autocorrect="off" autocapitalize="off" placeholder="?" />
      <button class="btn btn-p" onclick="swCheckType('${word.w}')" style="padding:10px 24px;font-size:15px;">OK ✓</button>`;
    setTimeout(()=>document.getElementById('sw-type-inp')?.focus(),100);
    document.getElementById('sw-type-inp')?.addEventListener('keydown',e=>{ if(e.key==='Enter') swCheckType(word.w); });
  }
}

function swResult(known) {
  const p = JSON.parse(localStorage.getItem(SW_KEY)||'{}');
  const key = swCurrentSet+'-'+swCurrent.w;
  if(known) { p[key]= Math.min(3,(p[key]||0)+1); swStreak++; addXP(3,'l','learn'); }
  else { swStreak=0; }
  localStorage.setItem(SW_KEY, JSON.stringify(p));
  swUpdateStats();
  swCurrentIdx = (swCurrentIdx+1) % swCurrentList.length;
  setTimeout(swNextCard, 400);
}

function swCheckWord(given, correct) {
  const fb = document.getElementById('sw-feedback');
  if(given===correct) {
    swStreak++; swResult(true);
    if(fb) fb.innerHTML='<span style="color:var(--green)">✅ Richtig!</span>';
  } else {
    swStreak=0;
    if(fb) fb.innerHTML='<span style="color:var(--red)">❌ Es war: <strong>'+correct+'</strong></span>';
    speak(correct,'de');
    swCurrentIdx = (swCurrentIdx+1) % swCurrentList.length;
    setTimeout(swNextCard, 1200);
  }
}

function swCheckType(correct) {
  const inp = document.getElementById('sw-type-inp');
  const given = (inp?.value||'').trim();
  swCheckWord(given, correct);
}

// ════════════════════════════════
// ZAHLEN-TRAINER
// ════════════════════════════════
const ZL_NAMES = ['null','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn',
                  'elf','zwölf','dreizehn','vierzehn','fünfzehn','sechzehn','siebzehn','achtzehn','neunzehn','zwanzig'];
const ZL_EMOJI_OBJ = ['⭐','🍎','🐶','🏠','🌸','🎈','🦋','🍓','🐠','🌙','🎃'];

function zlGetProgress() { return JSON.parse(localStorage.getItem(ZL_KEY)||'{}'); }
function zlSaveProgress(p) { localStorage.setItem(ZL_KEY,JSON.stringify(p)); }
function zlMarkCorrect(n) {
  const p=zlGetProgress(); p[n]=Math.min(3,(p[n]||0)+1);
  zlSaveProgress(p); zlRenderMap();
}

function zlRenderMap() {
  const el = document.getElementById('zl-map'); if(!el) return;
  const p = zlGetProgress();
  el.innerHTML = Array.from({length:20},(_,i)=>i+1).map(n=>{
    const lvl=p[n]||0;
    const col=lvl>=3?'var(--green)':lvl>=1?'var(--gold)':'var(--bg3)';
    return `<div onclick="zlSetTageszahl(${n})" style="width:44px;height:44px;border-radius:var(--r);background:${col};display:flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid var(--border);font-size:18px;font-weight:800;">${n}</div>`;
  }).join('');
}

function zlSetTageszahl(n) {
  const elN = document.getElementById('zl-tag-zahl');
  const elP = document.getElementById('zl-tag-punkte');
  const elW = document.getElementById('zl-tag-wort');
  if(elN) elN.textContent=n;
  if(elW) elW.textContent=ZL_NAMES[n]||n;
  if(elP) elP.innerHTML=Array(n).fill(ZL_EMOJI_OBJ[n%ZL_EMOJI_OBJ.length]).join('');
}

function zlSprichZahl() {
  const el=document.getElementById('zl-tag-zahl');
  const n=parseInt(el?.textContent||'1');
  speak(ZL_NAMES[n]||String(n),'de');
}

function zlStartModus(modus) {
  zlModus=modus; zlScore=0; zlStreak=0; zlCorrect=0;
  document.getElementById('zl-sc').textContent='0';
  document.getElementById('zl-st').textContent='0';
  document.getElementById('zl-ok').textContent='0';
  document.getElementById('zl-feedback').textContent='';
  document.querySelectorAll('[id^=zl-mod-]').forEach(b=>b.className='btn');
  const btn=document.getElementById('zl-mod-'+modus);
  if(btn) btn.className='btn btn-p';
  zlNextQuestion();
}

function zlNextQuestion() {
  const out=document.getElementById('zl-trainer'); if(!out) return;
  const p=zlGetProgress();
  // Wähle Zahl: lieber ungeübte
  const pool=Array.from({length:20},(_,i)=>i+1).filter(n=>(p[n]||0)<3);
  const n=pool.length ? pool[Math.floor(Math.random()*pool.length)]
                      : Math.floor(Math.random()*20)+1;
  zlCurrent=n;
  const obj=ZL_EMOJI_OBJ[n%ZL_EMOJI_OBJ.length];
  const dots=Array(n).fill(obj).join(' ');

  if(zlModus==='menge') {
    // Menge sehen → Zahl klicken
    const dists=[...new Set([n-2,n-1,n+1,n+2].filter(x=>x>=1&&x<=20&&x!==n))].slice(0,3);
    while(dists.length<3){ const r=Math.floor(Math.random()*20)+1; if(r!==n&&!dists.includes(r)) dists.push(r); }
    const opts=[n,...dists].sort(()=>Math.random()-.5);
    out.innerHTML=`
      <div style="font-size:22px;line-height:1.8;max-width:280px;text-align:center;">${dots}</div>
      <div style="font-size:13px;color:var(--text2);">Wie viele ${obj} siehst du?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;max-width:300px;">
        ${opts.map(o=>`<button onclick="zlCheck(${o},${n})" style="padding:18px;font-size:36px;font-weight:800;background:var(--bg3);border:2px solid var(--border);border-radius:var(--r);cursor:pointer;">${o}</button>`).join('')}
      </div>`;

  } else if(zlModus==='ziffer') {
    // Ziffer sehen → Menge klicken (multiple choice mit Punkten)
    const dists=[...new Set([n-2,n-1,n+1,n+2].filter(x=>x>=1&&x<=20&&x!==n))].slice(0,3);
    while(dists.length<3){ const r=Math.floor(Math.random()*20)+1; if(r!==n&&!dists.includes(r)) dists.push(r); }
    const opts=[n,...dists].sort(()=>Math.random()-.5);
    out.innerHTML=`
      <div style="font-size:110px;font-family:'DM Serif Display',serif;line-height:1;color:var(--blue);">${n}</div>
      <div style="font-size:13px;color:var(--text2);">Welche Menge passt zur Zahl?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;max-width:320px;">
        ${opts.map(o=>`<button onclick="zlCheck(${o},${n})" style="padding:12px;font-size:18px;background:var(--bg3);border:2px solid var(--border);border-radius:var(--r);cursor:pointer;line-height:1.6;">${Array(o).fill(obj).join('')}</button>`).join('')}
      </div>`;
    setTimeout(()=>speak(ZL_NAMES[n]||String(n),'de'),400);

  } else if(zlModus==='vergleich') {
    // Zwei Mengen → mehr oder weniger?
    let b; do { b=Math.floor(Math.random()*20)+1; } while(b===n);
    const bigger=Math.max(n,b), smaller=Math.min(n,b);
    const objA=ZL_EMOJI_OBJ[bigger%ZL_EMOJI_OBJ.length];
    const objB=ZL_EMOJI_OBJ[(smaller+3)%ZL_EMOJI_OBJ.length];
    out.innerHTML=`
      <div style="display:flex;gap:24px;align-items:center;font-size:24px;">
        <div style="text-align:center;">
          <div style="font-size:16px;line-height:1.7;">${Array(bigger).fill(objA).join(' ')}</div>
          <div style="font-size:36px;font-weight:800;color:var(--blue);">${bigger}</div>
        </div>
        <div style="font-size:28px;">vs</div>
        <div style="text-align:center;">
          <div style="font-size:16px;line-height:1.7;">${Array(smaller).fill(objB).join(' ')}</div>
          <div style="font-size:36px;font-weight:800;color:var(--red);">${smaller}</div>
        </div>
      </div>
      <div style="font-size:13px;color:var(--text2);">Welche Zahl ist grösser?</div>
      <div style="display:flex;gap:16px;">
        <button onclick="zlCheckVergleich(${bigger},${bigger})" style="padding:18px 28px;font-size:36px;font-weight:800;background:var(--bg3);border:2px solid var(--border);border-radius:var(--r);cursor:pointer;">${bigger}</button>
        <button onclick="zlCheckVergleich(${smaller},${bigger})" style="padding:18px 28px;font-size:36px;font-weight:800;background:var(--bg3);border:2px solid var(--border);border-radius:var(--r);cursor:pointer;">${smaller}</button>
      </div>`;
    zlCurrent=bigger;

  } else if(zlModus==='ordnung') {
    // 4 Zahlen in richtige Reihenfolge bringen (klicken)
    const start=Math.max(1,n-2);
    const seq=Array.from({length:4},(_,i)=>start+i).filter(x=>x<=20);
    const shuffled=[...seq].sort(()=>Math.random()-.5);
    out.innerHTML=`
      <div style="font-size:13px;color:var(--text2);">Klicke die Zahlen von klein nach gross!</div>
      <div id="zl-ord-picked" style="display:flex;gap:8px;min-height:52px;align-items:center;justify-content:center;border:2px dashed var(--border);border-radius:var(--r);padding:8px;width:100%;max-width:280px;"></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
        ${shuffled.map(o=>`<button id="zl-ord-${o}" onclick="zlPickOrder(${o},'${seq.join(',')}')" style="padding:16px 22px;font-size:28px;font-weight:800;background:var(--bg3);border:2px solid var(--border);border-radius:var(--r);cursor:pointer;">${o}</button>`).join('')}
      </div>`;
    window._zlOrdPicked=[];
  }
}

let _zlOrdPicked=[];
function zlPickOrder(n, seqStr) {
  _zlOrdPicked.push(n);
  const btn=document.getElementById('zl-ord-'+n);
  if(btn){btn.disabled=true;btn.style.opacity='0.4';}
  const picked=document.getElementById('zl-ord-picked');
  if(picked) picked.innerHTML=_zlOrdPicked.map(x=>`<span style="font-size:28px;font-weight:800;">${x}</span>`).join(' ');
  const seq=seqStr.split(',').map(Number);
  if(_zlOrdPicked.length===seq.length){
    const correct=JSON.stringify(_zlOrdPicked)===JSON.stringify(seq);
    _zlOrdPicked=[];
    if(correct){ zlCorrect++; zlStreak++; zlScore+=15; zlMarkCorrect(seq[0]); document.getElementById('zl-feedback').innerHTML='<span style="color:var(--green)">✅ Richtig! Super!</span>'; addXP(8,'l','learn'); }
    else { zlStreak=0; document.getElementById('zl-feedback').innerHTML='<span style="color:var(--red)">❌ Versuch: '+seq.join(' → ')+'</span>'; speak(seq.join(' '),'de'); }
    document.getElementById('zl-sc').textContent=zlScore;
    document.getElementById('zl-st').textContent=zlStreak;
    document.getElementById('zl-ok').textContent=zlCorrect;
    setTimeout(zlNextQuestion,1400);
  }
}

function zlCheck(given,correct) {
  const fb=document.getElementById('zl-feedback');
  if(given===correct){
    zlScore+=10+zlStreak*2; zlStreak++; zlCorrect++;
    zlMarkCorrect(correct);
    if(fb) fb.innerHTML='<span style="color:var(--green)">✅ Richtig! +'+( 10+(zlStreak-1)*2)+'</span>';
    addXP(5,'l','learn');
  } else {
    zlStreak=0;
    if(fb) fb.innerHTML='<span style="color:var(--red)">❌ Es war: <strong>'+correct+'</strong> ('+ZL_NAMES[correct]+')</span>';
    speak(ZL_NAMES[correct]||String(correct),'de');
  }
  document.getElementById('zl-sc').textContent=zlScore;
  document.getElementById('zl-st').textContent=zlStreak;
  document.getElementById('zl-ok').textContent=zlCorrect;
  setTimeout(zlNextQuestion,1000);
}

function zlCheckVergleich(given,correct){ zlCheck(given,correct); }

function zlInitTagesZahl(){
  const n=(new Date().getDate()%20)+1;
  zlSetTageszahl(n);
  zlRenderMap();
}

// ── Init bei Panel-Öffnung ──
function initBuchstaben(){ btInitTagesbuchstabe(); }
function initZahlen(){ zlInitTagesZahl(); }
function initSichtwort(){ swLoadSet(swCurrentSet); swUpdateStats(); }

// ── Homeschooling Z1: Fächer um Literacy erweitern ──
// (HS_FAECHER.z1 wird um Buchstaben + Zahlen ergänzt)

// ═══════════════════════════════════════════
// PHASE 8a — HOMESCHOOLING ENGINE
// Quintal-System · Tagesplan · Reflexion · Eltern-Dashboard
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// PHASE 8a — HOMESCHOOLING ENGINE (V25)
// Separates Modul · Z1/Z2/Z3 differenziert
// Daten kommen aus bestehenden Modulen
// ═══════════════════════════════════════════

const HS_QUINTALE = [
  {nr:1, name:'Quintal 1', wochen:8, monat:'Aug–Okt', color:'var(--blue)'},
  {nr:2, name:'Quintal 2', wochen:8, monat:'Nov–Jan', color:'var(--purple)'},
  {nr:3, name:'Quintal 3', wochen:8, monat:'Feb–Apr', color:'var(--green)'},
  {nr:4, name:'Quintal 4', wochen:7, monat:'Apr–Jun', color:'var(--gold)'},
  {nr:5, name:'Quintal 5', wochen:4, monat:'Jul',     color:'var(--red)'},
];

// Schuljahresstart: 4. August
function hsGetSchuljahrStart(year) {
  return new Date(year, 7, 4); // August = Monat 7 (0-indexed)
}

function hsGetAllQuintale() {
  const now  = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear()-1;
  const base = hsGetSchuljahrStart(year);
  let cursor = new Date(base);
  return HS_QUINTALE.map(q => {
    const start = new Date(cursor);
    const end   = new Date(cursor.getTime() + q.wochen*7*86400000);
    cursor = new Date(end);
    const isActive = now >= start && now < end;
    const isPast   = now >= end;
    const daysDone = isActive ? Math.floor((now-start)/86400000) : 0;
    const pct = isActive ? Math.min(100,Math.round(daysDone/(q.wochen*7)*100)) : isPast ? 100 : 0;
    const week = isActive ? Math.floor(daysDone/7)+1 : 0;
    return {...q, start, end, isActive, isPast, pct, week,
      startFmt: start.toLocaleDateString('de-CH',{day:'numeric',month:'short'}),
      endFmt:   end.toLocaleDateString('de-CH',{day:'numeric',month:'short'}) };
  });
}

function hsGetCurrentQuintal() {
  return hsGetAllQuintale().find(q=>q.isActive) || hsGetAllQuintale()[0];
}

const HS_FAECHER = {
  // lk = Lektionen/Woche (LP21), min = Minimum, emp = Empfehlung
  // 1 Lektion = 45 Min → im HS ca. 30-40 Min
  z1: [
    {id:'buchstaben',label:'Buchstaben',  icon:'🔤', pflicht:true,  panel:'buchstaben',   reihenfolge:'fix',  z3nur:false, lk:{min:4,emp:5}, tage:['Mo','Di','Mi','Do','Fr']},
    {id:'zahlen',    label:'Zahlen',      icon:'🔢', pflicht:true,  panel:'zahlen-z1',    reihenfolge:'fix',  z3nur:false, lk:{min:4,emp:5}, tage:['Mo','Di','Mi','Do','Fr']},
    {id:'sichtwort', label:'Erste Wörter',icon:'👁️', pflicht:false, panel:'sichtwort',    reihenfolge:'frei', z3nur:false, lk:{min:2,emp:3}, tage:['Mo','Mi','Fr']},
    {id:'deutsch',   label:'Deutsch',     icon:'🇩🇪', pflicht:false, panel:'deutsch',      reihenfolge:'frei', z3nur:false, lk:{min:3,emp:4}, tage:['Mo','Di','Do']},
    {id:'nmg',       label:'NMG',         icon:'🌍', pflicht:false, panel:'nmg',          reihenfolge:'frei', z3nur:false, lk:{min:2,emp:3}, tage:['Di','Do']},
  ],
  z2: [
    {id:'deutsch',   label:'Deutsch',     icon:'🇩🇪', pflicht:true,  panel:'deutsch',      reihenfolge:'fix',  z3nur:false, lk:{min:5,emp:6}, tage:['Mo','Di','Mi','Do','Fr']},
    {id:'mathe',     label:'Mathematik',  icon:'➗', pflicht:true,  panel:'mathe-z2',     reihenfolge:'fix',  z3nur:false, lk:{min:4,emp:5}, tage:['Mo','Di','Mi','Do','Fr']},
    {id:'en',        label:'Englisch',    icon:'🇬🇧', pflicht:false, panel:'en-lektionen', reihenfolge:'frei', z3nur:false, lk:{min:3,emp:4}, tage:['Mo','Mi','Fr']},
    {id:'nmg',       label:'NMG',         icon:'🌍', pflicht:false, panel:'nmg',          reihenfolge:'frei', z3nur:false, lk:{min:2,emp:3}, tage:['Di','Do']},
    {id:'info',      label:'Informatik',  icon:'💻', pflicht:false, panel:'informatik',   reihenfolge:'frei', z3nur:false, lk:{min:1,emp:2}, tage:['Mi']},
  ],
  z3: [
    {id:'deutsch',   label:'Deutsch',     icon:'🇩🇪', pflicht:true,  panel:'deutsch',      reihenfolge:'fix',  z3nur:false, lk:{min:4,emp:5}, tage:['Mo','Di','Mi','Do']},
    {id:'mathe',     label:'Mathematik',  icon:'📊', pflicht:true,  panel:'mathe-sek',    reihenfolge:'fix',  z3nur:false, lk:{min:3,emp:4}, tage:['Mo','Di','Do','Fr']},
    {id:'en',        label:'Englisch',    icon:'🇬🇧', pflicht:false, panel:'en-lektionen', reihenfolge:'frei', z3nur:false, lk:{min:3,emp:4}, tage:['Mo','Mi','Fr']},
    {id:'nmg',       label:'NMG',         icon:'🌍', pflicht:false, panel:'nmg',          reihenfolge:'frei', z3nur:false, lk:{min:2,emp:3}, tage:['Di','Do']},
    {id:'info',      label:'Informatik',  icon:'💻', pflicht:false, panel:'informatik',   reihenfolge:'frei', z3nur:false, lk:{min:1,emp:2}, tage:['Mi']},
    {id:'bvp',       label:'Berufswahl',  icon:'🎯', pflicht:false, panel:'homeschool',   reihenfolge:'frei', z3nur:true,  lk:{min:1,emp:2}, tage:['Fr']},
    {id:'projekt',   label:'Projekt',     icon:'🔬', pflicht:false, panel:'homeschool',   reihenfolge:'frei', z3nur:true,  lk:{min:2,emp:3}, tage:['Di','Fr']},
  ],
};

const HS_WOCHENTAGE = ['So','Mo','Di','Mi','Do','Fr','Sa'];

const HS_IMPULSE_Z1 = [
  'Lass dein Kind dir den Buchstaben des Tages zeigen — als wärst du der Schüler.',
  'Fragt das Kind: <strong>«Welches Wort beginnt mit dem Buchstaben A?»</strong>',
  'Zählt zusammen die Treppenstufen zuhause — wer kommt zuerst auf die richtige Zahl?',
  'Schreibt heute zusammen einen Buchstaben mit dem Finger in die Luft.',
  'Zeig auf ein Objekt zuhause — kann dein Kind den Anlaut-Buchstaben nennen?',
  'Lest heute Abend zusammen ein Bilderbuch — lass das Kind bekannte Wörter zeigen.',
  'Fragt: <strong>«Wie viele Finger hast du — und wie schreibt man das?»</strong>',
];
const HS_IMPULSE_Z2 = [
  'Frag dein Kind: <strong>«Was war heute das Schwierigste — und was hast du gemacht?»</strong>',
  'Lass dein Kind dir erklären, was es heute geübt hat — als wärst du der Schüler.',
  'Zeig echtes Interesse: Schau dir heute das Lerntagebuch an.',
  'Fragt: <strong>«Was möchtest du morgen lernen?»</strong> — lass das Kind vorausdenken.',
  'Lob heute etwas ganz Konkretes: «Ich habe gesehen, dass du weitergemacht hast.»',
  'Frag: <strong>«Was weisst du jetzt, was du letzte Woche noch nicht wusstest?»</strong>',
  'Macht heute eine kurze Mathe-Runde beim Abendessen — wer ist schneller?',
];
const HS_IMPULSE_Z3 = [
  'Frag: <strong>«Was ist dein Plan für morgen — und was brauchst du dafür von mir?»</strong>',
  'Diskutiert heute das Quintal-Projekt — lass das Kind die Ideen präsentieren.',
  'Frag offen: «Was macht dir am meisten Spass am Lernen — und was nervt dich?»',
  'Schaut gemeinsam auf den Wochenplan: Ist das Tempo realistisch?',
  'Frag: <strong>«Was hast du diese Woche gelernt, das du nicht erwartet hast?»</strong>',
  'Unterstütze die Selbstständigkeit: «Was kannst du heute ohne meine Hilfe lösen?»',
  'Berufswahl-Thema: «Welche drei Berufe interessieren dich — warum?»',
];

const HS_KEY_CONFIG  = 'hs_eltern_config';
const HS_KEY_LOG     = 'hs_tageslog';
const HS_KEY_PIN     = 'hs_parent_pin';

let hsTimerInterval=null, hsTimerSeconds=0;
let hsDiffPick='', hsStolzPick='';
let hsElternUnlocked=false;
let hsZ3ZielErreicht=null;

// ── Zyklus des aktiven Profils ──
function hsGetZyklus() {
  const p=ST.profiles[ST.activeProfile];
  if(!p) return 'z2';
  if(p.type==='z1') return 'z1';
  if(p.type==='z3') return 'z3';
  if(p.type==='hs') return 'z2'; // HS-Elternprofil
  return p.type==='z2'?'z2':'z2';
}

// ── PIN ──
function hsVerifyParentPin(){
  const entered=document.getElementById('hs-pin-input')?.value.trim();
  const stored=localStorage.getItem(HS_KEY_PIN);
  const errEl=document.getElementById('hs-pin-err');
  if(!stored){hsElternUnlocked=true;hsShowElternViewUnlocked();return;}
  try{
    if(btoa(entered)===stored){hsElternUnlocked=true;hsShowElternViewUnlocked();}
    else if(errEl){errEl.textContent='❌ Falscher PIN';setTimeout(()=>{errEl.textContent='';},2000);}
  }catch(e){if(errEl)errEl.textContent='Fehler';}
}
function hsSetParentPin(){
  const pin=document.getElementById('hs-new-pin')?.value.trim();
  const msg=document.getElementById('hs-pin-msg');
  if(!pin||pin.length<4){if(msg){msg.style.color='var(--red)';msg.textContent='Mind. 4 Stellen';}return;}
  localStorage.setItem(HS_KEY_PIN,btoa(pin));
  if(msg){msg.style.color='var(--green)';msg.textContent='✅ PIN gesetzt!';}
  if(document.getElementById('hs-new-pin'))document.getElementById('hs-new-pin').value='';
  setTimeout(()=>{if(msg)msg.textContent='';},2000);
}

// ── View-Navigation ──
function hsShowView(view){
  ['heute','plan','lernen','eltern'].forEach(v=>{
    const el=document.getElementById('hs-'+v+'-view');
    if(el)el.style.display=v===view?'':'none';
    const btn=document.getElementById('hs-tab-'+v);
    if(btn)btn.className=v===view?'btn btn-p':'btn';
  });
  const lock=document.getElementById('hs-parent-lock');
  if(view==='eltern'){
    const pin=localStorage.getItem(HS_KEY_PIN);
    if(pin&&!hsElternUnlocked){if(lock)lock.style.display='';const ev=document.getElementById('hs-eltern-view');if(ev)ev.style.display='none';return;}
    hsShowElternViewUnlocked();
  } else {
    if(lock)lock.style.display='none';
  }
  if(view==='heute')  hsRenderHeuteView();
  if(view==='plan')   hsRenderPlanView();
  if(view==='lernen') hsRenderLernenLernen();
}

function hsShowElternViewUnlocked(){
  const lock=document.getElementById('hs-parent-lock');
  const ev=document.getElementById('hs-eltern-view');
  if(lock)lock.style.display='none';
  if(ev)ev.style.display='';
  hsRenderElternView();
}

// ── Quintal-Timeline im Header ──
function hsRenderTimeline(){
  const el=document.getElementById('hs-quintal-timeline');
  if(!el)return;
  const quintale=hsGetAllQuintale();
  el.innerHTML=quintale.map(q=>`
    <div style="flex:${q.wochen};min-width:0;text-align:center;" title="${q.name}: ${q.startFmt}–${q.endFmt}">
      <div style="height:8px;border-radius:4px;background:${q.isActive?q.color:q.isPast?'rgba(34,197,94,.4)':'var(--bg3)'};margin-bottom:3px;overflow:hidden;${q.isActive?'border:1.5px solid '+q.color:''}">
        ${q.isActive?`<div style="height:100%;width:${q.pct}%;background:${q.color};opacity:.6;border-radius:4px;"></div>`:''}
      </div>
      <div style="font-size:9px;color:${q.isActive?q.color:'var(--text3)'};font-weight:${q.isActive?'700':'400'};white-space:nowrap;overflow:hidden;">${q.isActive?'Q'+q.nr+' W'+q.week:'Q'+q.nr}</div>
    </div>`).join('');
  // Header-Sub
  const q=quintale.find(x=>x.isActive)||quintale[0];
  const sub=document.getElementById('hs-header-sub');
  if(sub)sub.textContent=q.name+' · Woche '+q.week+' von '+q.wochen+' · '+q.monat;
}

// ── HEUTE-VIEW ──
function hsRenderHeuteView(){
  const zyklus=hsGetZyklus();
  const z1sec=document.getElementById('hs-z1-morgen');
  const z2sec=document.getElementById('hs-z2z3-morgen');
  if(zyklus==='z1'){
    if(z1sec)z1sec.style.display='';
    if(z2sec)z2sec.style.display='none';
    hsRenderZ1Morgen();
  } else {
    if(z1sec)z1sec.style.display='none';
    if(z2sec)z2sec.style.display='';
    hsRenderZ2Z3Morgen(zyklus);
  }
  hsRenderTagebuch();
}

// ── Z1-Morgenrunde ──
function hsRenderZ1Morgen(){
  const hour=new Date().getHours();
  const p=ST.profiles[ST.activeProfile];
  const gruss=hour<11?'🌅':hour<17?'☀️':'🌙';
  const elG=document.getElementById('hs-z1-greeting-emoji');
  const elN=document.getElementById('hs-z1-greeting-name');
  if(elG)elG.textContent=gruss;
  if(elN)elN.textContent='Hallo '+(p?.name||'')+'!';
  // Sterne = XP / 50
  const sterne=document.getElementById('hs-z1-sterne');
  const stars=Math.min(10,Math.floor((ST.xp||0)/50));
  if(sterne)sterne.innerHTML='⭐'.repeat(stars)||'○○○○○';
  // Fächer als grosse Emoji-Buttons
  const config=JSON.parse(localStorage.getItem(HS_KEY_CONFIG)||'{}');
  const faecher=(HS_FAECHER.z1||[]).filter(f=>config[f.id]!==false);
  const el=document.getElementById('hs-z1-faecher');
  if(!el)return;
  el.innerHTML=faecher.map(f=>{
    const done=hsIsTodayDone(f.id);
    return `<button onclick="hsNavFach('${f.id}','${f.panel}','${f.icon}','${f.label}')" style="padding:20px 10px;background:${done?'rgba(34,197,94,.1)':'var(--bg3)'};border:2px solid ${done?'var(--green)':'var(--border)'};border-radius:12px;cursor:pointer;font-size:36px;text-align:center;">
      ${f.icon}<div style="font-size:12px;font-weight:700;margin-top:6px;color:var(--text);">${f.label}</div>
      ${done?'<div style="font-size:18px;">✅</div>':''}
    </button>`;
  }).join('');
}

function hsZ1OpenFach(id,panel,icon,label){
  document.getElementById('hs-z1-morgen').style.display='none';
  const lb=document.getElementById('hs-z1-lernblock');
  if(lb)lb.style.display='';
  document.getElementById('hs-z1-fach-emoji').textContent=icon;
  document.getElementById('hs-z1-fach-name').textContent=label;
  const btn=document.getElementById('hs-z1-goto-btn');
  if(btn){btn.textContent='→ '+label+' öffnen';btn.onclick=()=>nav(panel);}
  // Timer
  hsTimerSeconds=0;
  clearInterval(hsTimerInterval);
  hsTimerInterval=setInterval(()=>{
    hsTimerSeconds++;
    const m=String(Math.floor(hsTimerSeconds/60)).padStart(2,'0');
    const s=String(hsTimerSeconds%60).padStart(2,'0');
    const te=document.getElementById('hs-z1-timer');
    if(te)te.textContent=m+':'+s;
  },1000);
  window._hsCurrentFachId=id;
}

function hsZ1Start(){
  const config=JSON.parse(localStorage.getItem(HS_KEY_CONFIG)||'{}');
  const faecher=(HS_FAECHER.z1||[]).filter(f=>config[f.id]!==false);
  const undone=faecher.filter(f=>!hsIsTodayDone(f.id));
  if(!undone.length){toast('🎉 Heute schon alles erledigt!');return;}
  const f=undone[0];
  hsZ1OpenFach(f.id,f.panel,f.icon,f.label);
}

function hsZ1Fertig(){
  clearInterval(hsTimerInterval);
  if(window._hsCurrentFachId) hsMarkTodayDone(window._hsCurrentFachId);
  document.getElementById('hs-z1-lernblock').style.display='none';
  document.getElementById('hs-z1-reflexion').style.display='';
  hsDiffPick=''; hsStolzPick='';
  document.querySelectorAll('.hs-diff-btn,.hs-stolz-btn').forEach(b=>b.style.border='2px solid var(--border)');
}

// ── Z2/Z3-Morgenrunde ──
function hsRenderZ2Z3Morgen(zyklus){
  const q=hsGetCurrentQuintal();
  const hour=new Date().getHours();
  const gruss=hour<11?'Guten Morgen':'Hallo';
  const p=ST.profiles[ST.activeProfile];
  const grEl=document.getElementById('hs-greeting');
  if(grEl)grEl.textContent=gruss+(p?', '+p.name:'')+'! 👋';
  const ql=document.getElementById('hs-quintal-label');
  const qd=document.getElementById('hs-quintal-dates');
  const qp=document.getElementById('hs-quintal-pct');
  const qb=document.getElementById('hs-quintal-bar');
  if(ql)ql.textContent=q.name+' · Woche '+q.week;
  if(qd)qd.textContent=q.startFmt+' – '+q.endFmt+' · '+q.monat;
  if(qp)qp.textContent=q.pct+'%';
  if(qb)qb.style.width=q.pct+'%';
  // Z3: Tagesziel
  const z3ziel=document.getElementById('hs-z3-tagesziel');
  if(z3ziel)z3ziel.style.display=zyklus==='z3'?'':'none';
  // Fächer
  hsRenderTodayFaecher(zyklus);
  // Sections
  document.getElementById('hs-morgen-section').style.display='';
  document.getElementById('hs-lernblock-section').style.display='none';
  document.getElementById('hs-reflexion-section').style.display='none';
}

function hsRenderTodayFaecher(zyklus){
  const el=document.getElementById('hs-today-faecher');
  if(!el)return;
  const config=JSON.parse(localStorage.getItem(HS_KEY_CONFIG)||'{}');
  const faecher=(HS_FAECHER[zyklus]||HS_FAECHER.z2).filter(f=>config[f.id]!==false&&!f.z3nur);
  const dayIdx=new Date().getDay();
  const tagesIdx=(dayIdx>0?dayIdx-1:0)%faecher.length;
  el.innerHTML=faecher.map((f,i)=>{
    const isToday=i===tagesIdx;
    const done=hsIsTodayDone(f.id);
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:${isToday?'rgba(56,189,248,.09)':'var(--bg3)'};border:${isToday?'1.5px solid rgba(56,189,248,.35)':'1px solid var(--border)'};border-radius:var(--r);cursor:pointer;" onclick="nav('${f.panel}')">
      <span style="font-size:22px;">${f.icon}</span>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;${isToday?'color:var(--blue);':''}">${f.label}${isToday?'<span style="font-size:10px;background:rgba(56,189,248,.15);color:var(--blue);padding:1px 7px;border-radius:8px;margin-left:6px;">Heute</span>':''}</div>
        <div style="font-size:11px;color:var(--text3);">${f.pflicht?'Pflichtfach':'Wahlfach'}</div>
      </div>
      <span style="font-size:18px;">${done?'✅':'○'}</span>
    </div>`;
  }).join('');
}

function hsIsTodayDone(fachId){
  const today=new Date().toISOString().slice(0,10);
  const log=JSON.parse(localStorage.getItem(HS_KEY_LOG)||'[]');
  return log.some(e=>e.datum===today&&e.fach===fachId&&e.abgeschlossen);
}
function hsMarkTodayDone(fachId){
  const today=new Date().toISOString().slice(0,10);
  const log=JSON.parse(localStorage.getItem(HS_KEY_LOG)||'[]');
  if(!log.some(e=>e.datum===today&&e.fach===fachId)){
    log.unshift({datum:today,fach:fachId,abgeschlossen:true,dauer:Math.round(hsTimerSeconds/60)});
    localStorage.setItem(HS_KEY_LOG,JSON.stringify(log));
  }
}

// ── Lernblock ──
function hsStarteLernblock(){
  document.getElementById('hs-morgen-section').style.display='none';
  document.getElementById('hs-lernblock-section').style.display='';
  document.getElementById('hs-reflexion-section').style.display='none';
  hsTimerSeconds=0;
  clearInterval(hsTimerInterval);
  hsTimerInterval=setInterval(()=>{
    hsTimerSeconds++;
    const m=String(Math.floor(hsTimerSeconds/60)).padStart(2,'0');
    const s=String(hsTimerSeconds%60).padStart(2,'0');
    const te=document.getElementById('hs-timer');if(te)te.textContent=m+':'+s;
  },1000);
  const zyklus=hsGetZyklus();
  const config=JSON.parse(localStorage.getItem(HS_KEY_CONFIG)||'{}');
  const faecher=(HS_FAECHER[zyklus]||HS_FAECHER.z2).filter(f=>config[f.id]!==false&&!f.z3nur);
  const dayIdx=new Date().getDay();
  const f=faecher[(dayIdx>0?dayIdx-1:0)%faecher.length]||faecher[0];
  document.getElementById('hs-fach-titel').textContent=f.icon+' '+f.label;
  document.getElementById('hs-fach-sub').textContent='Mache eine Übung in diesem Bereich.';
  document.getElementById('hs-fach-buttons').innerHTML=`
    <button class="btn btn-p" onclick="hsNavFach('${f.id}','${f.panel}','${f.icon}','${f.label}')" style="padding:13px;font-size:14px;">→ ${f.label} öffnen</button>
    <div style="font-size:12px;color:var(--text3);text-align:center;margin-top:4px;">Drücke ✅ Fertig wenn du fertig bist — du kommst automatisch zurück</div>`;
  window._hsCurrentFachId=f.id;
}

function hsLernblockFertig(){
  clearInterval(hsTimerInterval);
  if(window._hsCurrentFachId)hsMarkTodayDone(window._hsCurrentFachId);
  document.getElementById('hs-lernblock-section').style.display='none';
  document.getElementById('hs-reflexion-section').style.display='';
  // Z3: Lernziel anzeigen
  const zyklus=hsGetZyklus();
  const z3lzc=document.getElementById('hs-z3-lernziel-check');
  const z3mz=document.getElementById('hs-z3-morgen-ziel');
  if(z3lzc)z3lzc.style.display=zyklus==='z3'?'':'none';
  if(z3mz)z3mz.style.display=zyklus==='z3'?'':'none';
  const zielInp=document.getElementById('hs-z3-ziel-inp');
  const zielDisp=document.getElementById('hs-z3-ziel-display');
  if(zielDisp&&zielInp)zielDisp.textContent=zielInp.value||'(kein Ziel gesetzt)';
  hsDiffPick='';hsStolzPick='';hsZ3ZielErreicht=null;
  document.querySelectorAll('.hs-diff-btn,.hs-stolz-btn').forEach(b=>b.style.border='2px solid var(--border)');
}

function hsPickDiff(btn){
  hsDiffPick=btn.dataset.val;
  document.querySelectorAll('.hs-diff-btn').forEach(b=>b.style.border='2px solid var(--border)');
  btn.style.border='2px solid var(--blue)';
}
function hsPickStolz(btn){
  hsStolzPick=btn.dataset.val;
  document.querySelectorAll('.hs-stolz-btn').forEach(b=>b.style.border='2px solid var(--border)');
  btn.style.border='2px solid var(--green)';
}
function hsZ3ZielCheck(erreicht){hsZ3ZielErreicht=erreicht;}

function hsSpeichereReflektion(){
  const zyklus=hsGetZyklus();
  let gelernt='';
  if(zyklus==='z1'){
    gelernt='(Emoji-Reflexion)';
  } else {
    const ta=document.getElementById('hs-ref-gelernt');
    gelernt=(ta?.value||'').trim();
    if(!gelernt){toast('⚠️ Was hast du heute gelernt?');return;}
  }
  if(!hsDiffPick){toast('⚠️ Wie schwierig war es?');return;}
  if(!hsStolzPick){toast('⚠️ Bist du stolz auf dich?');return;}
  const today=new Date().toISOString().slice(0,10);
  const log=JSON.parse(localStorage.getItem(HS_KEY_LOG)||'[]');
  const morgenZiel=document.getElementById('hs-z3-morgen-inp')?.value||'';
  log.unshift({datum:today,zeit:new Date().toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'}),
    gelernt,schwierigkeit:hsDiffPick,stolz:hsStolzPick,dauer:Math.round(hsTimerSeconds/60),
    fach:'reflexion',abgeschlossen:true,zyklus,morgenZiel,
    z3ZielErreicht:hsZ3ZielErreicht});
  if(log.length>100)log.pop();
  localStorage.setItem(HS_KEY_LOG,JSON.stringify(log));
  // Z1: zurück zur Morgenrunde
  if(zyklus==='z1'){
    document.getElementById('hs-z1-reflexion').style.display='none';
    document.getElementById('hs-z1-morgen').style.display='';
    hsRenderZ1Morgen();
  } else {
    document.getElementById('hs-reflexion-section').style.display='none';
    document.getElementById('hs-morgen-section').style.display='';
  }
  const stolzEmoji={ja:'⭐',fast:'🙂',naechstes_mal:'💪'}[hsStolzPick]||'✅';
  toast(stolzEmoji+' Super! Tag abgeschlossen.');
  addXP(15,'l','learn');
  hsRenderTagebuch();
}

// ── Tagebuch ──
function hsRenderTagebuch(){
  const log=JSON.parse(localStorage.getItem(HS_KEY_LOG)||'[]');
  const list=document.getElementById('hs-tagebuch-list');
  const empty=document.getElementById('hs-tagebuch-empty');
  if(!list)return;
  const eintraege=log.filter(e=>e.gelernt&&e.gelernt!=='(Emoji-Reflexion)');
  if(!eintraege.length){list.innerHTML='';if(empty)empty.style.display='';return;}
  if(empty)empty.style.display='none';
  const se={leicht:'😊',mittel:'🤔',schwer:'😤'};
  const ss={ja:'⭐',fast:'🙂',naechstes_mal:'💪'};
  list.innerHTML=eintraege.slice(0,10).map(e=>`
    <div style="padding:10px 12px;background:var(--bg3);border-radius:var(--r);border-left:3px solid var(--blue);">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:11px;font-weight:700;color:var(--blue);">${e.datum} ${e.zeit?'· '+e.zeit:''}</span>
        <span style="font-size:14px;">${se[e.schwierigkeit]||''} ${ss[e.stolz]||''}</span>
      </div>
      <div style="font-size:13px;">${e.gelernt}</div>
      ${e.dauer?`<div style="font-size:11px;color:var(--text3);margin-top:3px;">⏱️ ${e.dauer} Min.</div>`:''}
      ${e.morgenZiel?`<div style="font-size:11px;color:var(--purple);margin-top:3px;">→ Ziel morgen: ${e.morgenZiel}</div>`:''}
    </div>`).join('');
}

// ── PLAN-VIEW ──
function hsRenderPlanView(){
  hsRenderJahresQuintale();
  hsRenderWochenplan();
  hsRenderEKQuintalFaecher();
  const zyklus=hsGetZyklus();
  const z3proj=document.getElementById('hs-z3-projekt-card');
  if(z3proj)z3proj.style.display=zyklus==='z3'?'':'none';
  const planLabel=document.getElementById('hs-plan-quintal-label');
  const q=hsGetCurrentQuintal();
  if(planLabel)planLabel.textContent=q.name;
}

function hsRenderJahresQuintale(){
  const el=document.getElementById('hs-jahres-quintale');if(!el)return;
  const quintale=hsGetAllQuintale();
  el.innerHTML=quintale.map(q=>`
    <div style="padding:10px 14px;background:var(--bg3);border-radius:var(--r);border-left:4px solid ${q.isActive?q.color:q.isPast?'rgba(34,197,94,.4)':'var(--border)'};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <strong style="font-size:13px;color:${q.isActive?q.color:'var(--text)'};">${q.isActive?'▶ ':''}${q.name}</strong>
        <span style="font-size:11px;color:var(--text3);">${q.startFmt} – ${q.endFmt} · ${q.wochen} Wo.</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="flex:1;height:5px;background:var(--bg);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${q.pct}%;background:${q.isActive?q.color:'var(--green)'};border-radius:3px;"></div>
        </div>
        <span style="font-size:11px;color:var(--text3);min-width:30px;">${q.isActive?q.pct+'%':q.isPast?'✅':''}</span>
        <span style="font-size:11px;color:var(--text3);">${q.monat}</span>
      </div>
      ${q.isActive?`<div style="font-size:11px;color:${q.color};margin-top:3px;">Woche ${q.week} von ${q.wochen}</div>`:''}
    </div>`).join('');
}

function hsRenderWochenplan(){
  const el=document.getElementById('hs-wochenplan');if(!el)return;
  const zyklus=hsGetZyklus();
  const config=JSON.parse(localStorage.getItem(HS_KEY_CONFIG)||'{}');
  const faecher=(HS_FAECHER[zyklus]||HS_FAECHER.z2).filter(f=>config[f.id]!==false&&!f.z3nur);
  const wochentage=['Mo','Di','Mi','Do','Fr'];
  const todayDow=new Date().getDay(); // 1=Mo..5=Fr
  // Baue Tagesplan: Für jeden Tag die Fächer die an diesem Tag geplant sind
  el.innerHTML=wochentage.map((tag,i)=>{
    const isToday=(todayDow===i+1);
    // Fächer für diesen Tag (via tage[] array)
    const tagFaecher=faecher.filter(f=>f.tage&&f.tage.includes(tag));
    if(!tagFaecher.length) return '';
    const doneAll=tagFaecher.every(f=>isToday?hsIsTodayDone(f.id):false);
    return `<div style="padding:10px 14px;background:${isToday?'rgba(56,189,248,.07)':'var(--bg3)'};border-radius:var(--r);border:${isToday?'1.5px solid rgba(56,189,248,.3)':'1px solid var(--border)'};">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:12px;font-weight:800;color:${isToday?'var(--blue)':'var(--text3)'};min-width:28px;">${tag}</span>
        ${isToday?'<span style="font-size:10px;background:rgba(56,189,248,.15);color:var(--blue);padding:1px 8px;border-radius:8px;font-weight:700;">Heute</span>':''}
        ${doneAll&&isToday?'<span style="font-size:13px;margin-left:auto;">✅</span>':''}
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;">
        ${tagFaecher.map(f=>{
          const done=isToday&&hsIsTodayDone(f.id);
          return `<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--bg);border-radius:6px;cursor:pointer;" onclick="hsNavFach('${f.id}','${f.panel}','${f.icon}','${f.label}')">
            <span style="font-size:16px;">${f.icon}</span>
            <span style="font-size:12px;font-weight:600;flex:1;${done?'color:var(--green);text-decoration:line-through;':''}">${f.label}</span>
            <span style="font-size:10px;color:var(--text3);">${f.lk?f.lk.emp+'×/Wo':''}</span>
            <span style="font-size:13px;">${done?'✅':'○'}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).filter(Boolean).join('');
}

// Z3: Projekt-Auftrag via KI
async function hsZ3GeneriereAuftrag(){
  const thema=document.getElementById('hs-z3-projekt-thema')?.value.trim();
  if(!thema){toast('⚠️ Bitte Projektthema eingeben');return;}
  const out=document.getElementById('hs-z3-projekt-out');
  if(out)out.innerHTML='<div class="sp" style="margin:1rem auto;width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin 1s linear infinite;"></div>';
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){if(out)out.innerHTML='<div style="color:var(--gold);">⚠️ API-Schlüssel fehlt</div>';return;}
  const sys=`Du bist ein Schweizer Lehrer Z3 (7.–9. Klasse). Erstelle einen fächerübergreifenden Projektauftrag zum Thema "${thema}". 
Antworte nur als JSON: {"titel":"...","dauer":"z.B. 4 Wochen","faecher":["Fach1","Fach2"],"lernziele":["...","...","..."],"auftraege":[{"titel":"...","beschreibung":"...(2-3 Sätze)","produkt":"Was wird abgegeben?"}],"beurteilung":"Kurze Beschreibung wie bewertet wird"}`;
  try{
    const raw=await claude([{role:'user',content:'Erstelle Projektauftrag.'}],sys);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    if(out)out.innerHTML=`<div style="padding:12px;background:rgba(168,85,247,.06);border:1px solid rgba(168,85,247,.2);border-radius:var(--r);">
      <div style="font-size:15px;font-weight:700;margin-bottom:.5rem;">🔬 ${d.titel}</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:.75rem;">⏱️ ${d.dauer} · Fächer: ${(d.faecher||[]).join(', ')}</div>
      <div style="font-size:12px;font-weight:700;margin-bottom:.5rem;">Lernziele:</div>
      ${(d.lernziele||[]).map(z=>`<div style="font-size:12px;color:var(--text2);margin-bottom:3px;">• ${z}</div>`).join('')}
      <div style="font-size:12px;font-weight:700;margin:.75rem 0 .5rem;">Aufträge:</div>
      ${(d.auftraege||[]).map((a,i)=>`<div style="padding:8px;background:var(--bg3);border-radius:var(--r);margin-bottom:6px;">
        <div style="font-size:12px;font-weight:700;">${i+1}. ${a.titel}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px;">${a.beschreibung}</div>
        <div style="font-size:11px;color:var(--purple);margin-top:2px;">📋 ${a.produkt}</div>
      </div>`).join('')}
      <div style="font-size:11px;color:var(--text3);margin-top:.5rem;">📊 Beurteilung: ${d.beurteilung}</div>
    </div>`;
    toast('✅ Projektauftrag erstellt!');
  }catch(e){if(out)out.innerHTML='<div style="color:var(--red);">Fehler: '+e.message+'</div>';}
}

// ── ELTERN-VIEW ──
function hsRenderElternView(){
  hsRenderKinderOverview();
  hsRenderTagesimpuls();
  hsRenderQuintalOverview();
  hsRenderFachConfig();
  const zyklus=hsGetZyklus();
  const z3lz=document.getElementById('hs-z3-lernziele-card');
  if(z3lz){
    z3lz.style.display=zyklus==='z3'?'':'none';
    if(zyklus==='z3')hsRenderZ3Lernziele();
  }
}

function hsRenderKinderOverview(){
  const el=document.getElementById('hs-kinder-overview');if(!el)return;
  const today=new Date().toISOString().slice(0,10);
  const log=JSON.parse(localStorage.getItem(HS_KEY_LOG)||'[]');
  const todayLog=log.filter(e=>e.datum===today);
  el.innerHTML=ST.profiles.map((p,i)=>{
    const isActive=(i===ST.activeProfile);
    const done=todayLog.filter(e=>e.abgeschlossen).length;
    const ref=todayLog.find(e=>e.fach==='reflexion');
    const se={leicht:'😊',mittel:'🤔',schwer:'😤'};
    const ss={ja:'⭐',fast:'🙂',naechstes_mal:'💪'};
    const zyklusLabel={z1:'Z1',z2:'Z2',z3:'Z3',hs:'HS',adult:'Adult'}[p.type]||p.type;
    return `<div style="padding:12px 14px;background:${isActive?'rgba(56,189,248,.07)':'var(--bg3)'};border:${isActive?'1.5px solid rgba(56,189,248,.3)':'1px solid var(--border)'};border-radius:var(--r);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <span style="font-size:22px;">👧</span>
        <div style="flex:1;"><div style="font-size:13px;font-weight:700;">${p.name} <span style="font-size:11px;color:var(--text3);">${zyklusLabel} · Kl. ${p.level||'?'}</span></div></div>
        <span style="font-size:11px;padding:2px 8px;background:${done?'rgba(34,197,94,.15)':'rgba(245,158,11,.1)'};color:${done?'var(--green)':'var(--gold)'};border-radius:8px;">${done?'✅ Gelernt':'⏳ Offen'}</span>
      </div>
      ${ref?`<div style="display:flex;gap:10px;font-size:12px;color:var(--text2);margin-bottom:3px;">
        <span>${se[ref.schwierigkeit]||''}</span><span>${ss[ref.stolz]||''}</span>${ref.dauer?`<span>⏱️ ${ref.dauer} Min.</span>`:''}
      </div><div style="font-size:12px;color:var(--text3);font-style:italic;">${ref.gelernt?'«'+ref.gelernt+'»':''}</div>`:'<div style="font-size:12px;color:var(--text3);">Noch kein Eintrag heute.</div>'}
    </div>`;
  }).join('');
}

function hsRenderTagesimpuls(){
  const el=document.getElementById('hs-tagesimpuls');if(!el)return;
  const zyklus=hsGetZyklus();
  const pool=zyklus==='z1'?HS_IMPULSE_Z1:zyklus==='z3'?HS_IMPULSE_Z3:HS_IMPULSE_Z2;
  const d=new Date().getDay();
  el.innerHTML=pool[d%pool.length];
}

function hsRenderQuintalOverview(){
  const el=document.getElementById('hs-quintal-overview');if(!el)return;
  const q=hsGetCurrentQuintal();
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;">
    <strong>${q.name}</strong><span style="font-size:12px;color:var(--text3);">Woche ${q.week}/${q.wochen}</span>
  </div>
  <div style="font-size:12px;color:var(--text2);margin-bottom:.5rem;">${q.startFmt} – ${q.endFmt} · ${q.monat}</div>
  <div style="height:6px;background:var(--bg);border-radius:3px;overflow:hidden;">
    <div style="height:100%;width:${q.pct}%;background:${q.color};border-radius:3px;"></div>
  </div><div style="font-size:11px;color:var(--text3);margin-top:3px;">${q.pct}% vergangen</div>`;
}

function hsRenderFachConfig(){
  const el=document.getElementById('hs-fach-config');if(!el)return;
  const zyklus=hsGetZyklus();
  const faecher=HS_FAECHER[zyklus]||HS_FAECHER.z2;
  const config=JSON.parse(localStorage.getItem(HS_KEY_CONFIG)||'{}');
  // LP21 Lektionen-Summe
  const aktiv=faecher.filter(f=>config[f.id]!==false&&!f.z3nur);
  const totalMin=aktiv.reduce((s,f)=>s+(f.lk?.min||0),0);
  const totalEmp=aktiv.reduce((s,f)=>s+(f.lk?.emp||0),0);
  el.innerHTML=`<div style="padding:8px 12px;background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.2);border-radius:var(--r);margin-bottom:8px;font-size:12px;color:var(--text2);">
    📊 LP21-Richtwert: <strong>${totalMin}–${totalEmp} Lektionen/Woche</strong> (aktive Fächer) · 1 Lektion = 45 Min.
  </div>`+faecher.map(f=>`
    <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg3);border-radius:var(--r);cursor:pointer;">
      <input type="checkbox" ${f.pflicht?'checked disabled':(config[f.id]!==false?'checked':'')} data-fach="${f.id}" style="width:16px;height:16px;"/>
      <span style="font-size:16px;">${f.icon}</span>
      <div style="flex:1;"><div style="font-size:13px;font-weight:700;">${f.label}</div>
      <div style="font-size:11px;color:var(--text3);">${f.pflicht?'Pflichtfach':f.reihenfolge==='frei'?'Reihenfolge frei':'Reihenfolge fix'}${f.z3nur?' · Z3':''}</div></div>
      ${f.lk?`<span style="font-size:11px;color:var(--text3);white-space:nowrap;">${f.lk.min}–${f.lk.emp}×/Wo</span>`:''}
    </label>`).join('');
}

function hsSaveElternConfig(){
  const config={};
  document.querySelectorAll('#hs-fach-config input[type=checkbox]').forEach(cb=>{config[cb.dataset.fach]=cb.checked;});
  localStorage.setItem(HS_KEY_CONFIG,JSON.stringify(config));
  toast('✅ Fächerplan gespeichert!');
}

function hsRenderZ3Lernziele(){
  const el=document.getElementById('hs-z3-lernziele-list');if(!el)return;
  const log=JSON.parse(localStorage.getItem(HS_KEY_LOG)||'[]');
  const ziele=log.filter(e=>e.morgenZiel).slice(0,7);
  if(!ziele.length){el.innerHTML='<div style="font-size:13px;color:var(--text3);">Noch keine Tagesziele gesetzt.</div>';return;}
  el.innerHTML=ziele.map(e=>`
    <div style="padding:8px 12px;background:var(--bg3);border-radius:var(--r);border-left:3px solid ${e.z3ZielErreicht?'var(--green)':e.z3ZielErreicht===false?'var(--gold)':'var(--border)'};">
      <div style="font-size:11px;color:var(--text3);">${e.datum}</div>
      <div style="font-size:13px;">🎯 ${e.morgenZiel}</div>
      <div style="font-size:11px;margin-top:2px;">${e.z3ZielErreicht?'✅ Erreicht':e.z3ZielErreicht===false?'➡️ Teilweise':'—'}</div>
    </div>`).join('');
}

// ── Init ──
function hsUpdateSidebarVisibility(){
  const p=ST.profiles[ST.activeProfile];
  const isHS=p?.type==='hs'||ST.profiles.some(pr=>pr.type==='hs');
  const isZ1=p?.type==='z1'||isHS;
  const siacHs=document.getElementById('siacc-hs');
  const dashCard=document.getElementById('hs-dash-card');
  if(siacHs)siacHs.style.display=isHS?'':'none';
  if(dashCard)dashCard.style.display=isHS?'':'none';
  ['fc-buchstaben','fc-sichtwort','fc-zahlen-z1'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display=isZ1?'':'none';
  });
  ['si-buchstaben','si-sichtwort','si-zahlen-z1'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display=isZ1?'':'none';
  });
}

function hsInit(){
  hsRenderTimeline();
  hsUpdateSidebarVisibility();
  hsShowView('heute');
}

// ═══════════════════════════════════════════
// ETAPPE 4 — NMG VERTIEFUNG
// Strukturierte Einheiten · Z1 altersgerecht
// Experiment-Generator · Fortschritt
// ═══════════════════════════════════════════

const NMG_EINHEITEN = {
  Z1: [
    {id:'nmg-z1-u1', icon:'🍂', titel:'Die vier Jahreszeiten', fach:'Natur & Technik',
     themen:['Frühling: Blüten, Wärme, neue Tiere','Sommer: Hitze, Ferien, Wachstum','Herbst: Ernte, Blätter, Tiere winterschlaf','Winter: Kälte, Schnee, Stille'],
     schluessel:['Jahreszeiten benennen','Merkmale erkennen','Veränderungen beschreiben']},
    {id:'nmg-z1-u2', icon:'🐾', titel:'Tiere und ihre Lebensräume', fach:'Natur & Technik',
     themen:['Haustiere: Hund, Katze, Hamster','Bauernhoftiere: Kuh, Schwein, Henne','Wildtiere: Fuchs, Reh, Vogel','Wo leben welche Tiere?'],
     schluessel:['Tiere benennen','Lebensräume zuordnen','Nahrung kennen']},
    {id:'nmg-z1-u3', icon:'👨‍👩‍👧', titel:'Meine Familie & Gemeinschaft', fach:'Mensch & Gemeinschaft',
     themen:['Familienmitglieder benennen','Aufgaben in der Familie','Freunde und Zusammenspiel','Regeln in der Gemeinschaft'],
     schluessel:['Familie beschreiben','Rollen verstehen','Gemeinschaft erfahren']},
    {id:'nmg-z1-u4', icon:'🍎', titel:'Gesund essen & meinen Körper', fach:'Gesundheit & Ernährung',
     themen:['Mein Körper: Kopf, Arme, Beine','Die 5 Sinne: sehen, hören, riechen, schmecken, fühlen','Gesunde Lebensmittel','Körperpflege & Hygiene'],
     schluessel:['Körperteile benennen','Sinne beschreiben','Gesundes erkennen']},
    {id:'nmg-z1-u5', icon:'🌍', titel:'Meine Umgebung entdecken', fach:'Raum & Orientierung',
     themen:['Mein Zuhause und mein Zimmer','Der Weg zur Schule','Mein Dorf / meine Stadt','Links, rechts, oben, unten'],
     schluessel:['Orientierung üben','Orte beschreiben','Sicherheit im Verkehr']},
    {id:'nmg-z1-u6', icon:'💧', titel:'Wasser & Wetter', fach:'Natur & Technik',
     themen:['Regen, Schnee, Hagel, Nebel','Woher kommt das Wasser?','Wasser ist wichtig','Wasserkreislauf einfach'],
     schluessel:['Wetterphänomene benennen','Wasserkreislauf verstehen','Wasser wertschätzen']},
  ],
  Z2: [
    {id:'nmg-z2-u1', icon:'🇨🇭', titel:'Die Schweiz: Land und Kantone', fach:'Raum & Orientierung',
     themen:['26 Kantone und Hauptorte','Gebirge, Mittelland, Jura','Wichtige Flüsse und Seen','Nachbarländer der Schweiz'],
     schluessel:['Karte lesen','Kantone zuordnen','Landschaftstypen unterscheiden']},
    {id:'nmg-z2-u2', icon:'⚡', titel:'Energie: Wärme, Licht, Strom', fach:'Natur & Technik',
     themen:['Was ist Energie?','Elektrischer Strom im Alltag','Erneuerbare vs. fossile Energie','Energie sparen im Alltag'],
     schluessel:['Energieformen erkennen','Stromkreis verstehen','Nachhaltigkeit']},
    {id:'nmg-z2-u3', icon:'🗳️', titel:'Demokratie & Schweizer Politik', fach:'Mensch & Gemeinschaft',
     themen:['Was ist Demokratie?','Gemeinderat, Kanton, Bund','Volksabstimmung und Initiative','Bundesrat und Bundesversammlung'],
     schluessel:['Staatsebenen unterscheiden','Abstimmungen verstehen','Mitbestimmung']},
    {id:'nmg-z2-u4', icon:'🌲', titel:'Ökosysteme: Wald und Gewässer', fach:'Natur & Technik',
     themen:['Nahrungskette im Wald','Pflanzen und Tiere am Bach','Ökosystem Wiese','Eingriff des Menschen in die Natur'],
     schluessel:['Nahrungskette lesen','Ökosystem erklären','Abhängigkeiten verstehen']},
    {id:'nmg-z2-u5', icon:'📜', titel:'Geschichte: Mittelalter bis Neuzeit', fach:'Zeit, Dauer & Wandel',
     themen:['Leben im Mittelalter','Zeitstrahl: Wichtige Ereignisse','Industrialisierung','Schweizer Geschichte: 1291 bis heute'],
     schluessel:['Zeitstrahl lesen','Epochen unterscheiden','Wandel beschreiben']},
    {id:'nmg-z2-u6', icon:'💶', titel:'Wirtschaft & Konsum', fach:'Wirtschaft & Konsum',
     themen:['Was ist Geld und woher kommt es?','Produzenten und Konsumenten','Fairer Handel','Werbung kritisch betrachten'],
     schluessel:['Wirtschaftskreislauf','Konsum reflektieren','Fairen Handel kennen']},
  ],
  Z3: [
    {id:'nmg-z3-u1', icon:'🌡️', titel:'Klimawandel & Nachhaltigkeit', fach:'Umwelt & Nachhaltigkeit',
     themen:['Ursachen des Klimawandels (CO₂, Treibhauseffekt)','Folgen für Mensch und Natur','Nachhaltige Entwicklungsziele (SDGs)','Was kann ich persönlich tun?'],
     schluessel:['Treibhauseffekt erklären','SDGs anwenden','Handlungsoptionen']},
    {id:'nmg-z3-u2', icon:'⚗️', titel:'Physik: Kräfte und Bewegung', fach:'Natur & Technik',
     themen:['Schwerkraft und Masse','Reibung und Bewegung','Hebelgesetz und Drehmoment','Energieerhaltungssatz'],
     schluessel:['Kräfte berechnen','Hebel anwenden','Physikalische Gesetze']},
    {id:'nmg-z3-u3', icon:'🧬', titel:'Biologie: Evolution & Genetik', fach:'Natur & Technik',
     themen:['Darwins Evolutionstheorie','Natürliche Selektion','DNA und Vererbung','Biotechnologie und Ethik'],
     schluessel:['Evolution erklären','Genetik verstehen','Ethische Fragen']},
    {id:'nmg-z3-u4', icon:'🌐', titel:'Globalisierung & Weltwirtschaft', fach:'Wirtschaft & Konsum',
     themen:['Globale Lieferketten','Chancen und Risiken der Globalisierung','Migration und Mobilität','Internationale Organisationen (UNO, WTO)'],
     schluessel:['Globalisierung analysieren','Migration verstehen','Institutionen kennen']},
    {id:'nmg-z3-u5', icon:'🎯', titel:'Berufswahl & Zukunft', fach:'Mensch & Gemeinschaft',
     themen:['Berufsfelder in der Schweiz','Bewerbung und Vorstellungsgespräch','Lehre vs. Gymnasium','Zukunft der Arbeit (KI, Automation)'],
     schluessel:['Berufsfelder erkunden','Bewerbung vorbereiten','Zukunft reflektieren']},
    {id:'nmg-z3-u6', icon:'⚗️', titel:'Chemie: Stoffe und Reaktionen', fach:'Natur & Technik',
     themen:['Atome, Moleküle, Elemente','Chemische Reaktionen im Alltag','Säuren und Basen','Umweltchemie: Schadstoffe'],
     schluessel:['Reaktionsgleichungen','Periodensystem','Alltagschemie']},
  ],
};

const NMG_PROG_KEY = 'nmg_einheit_prog';

function nmgGetProg() { return JSON.parse(localStorage.getItem(NMG_PROG_KEY)||'{}'); }
function nmgSaveProg(p) { localStorage.setItem(NMG_PROG_KEY, JSON.stringify(p)); }
function nmgGetEinheitPct(id) { return nmgGetProg()[id]||0; }
function nmgTickEinheit(id) {
  const p=nmgGetProg();
  p[id]=Math.min(100,(p[id]||0)+25);
  nmgSaveProg(p); return p[id];
}

let nmgActiveZyklus = 'Z1';

function nmgShowTab(tab) {
  ['einheiten','themen','experiment'].forEach(t=>{
    const el=document.getElementById('nmg-'+t+'-view');
    const btn=document.getElementById('nmg-tab-'+t);
    if(el) el.style.display=t===tab?'':'none';
    if(btn) btn.className=t===tab?'btn btn-p':'btn';
  });
  if(tab==='einheiten') nmgRenderEinheiten(nmgActiveZyklus);
}

function nmgSelectZyklus(z, btn) {
  document.querySelectorAll('#nmg-zyklus-filter2 .gram-lf-btn').forEach(b=>b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  nmgActiveZyklus = z;
  nmgRenderEinheiten(z);
}

function nmgRenderEinheiten(zyklus) {
  const el = document.getElementById('nmg-einheiten-grid'); if(!el) return;
  const einheiten = NMG_EINHEITEN[zyklus]||[];
  el.innerHTML = einheiten.map(e=>{
    const pct = nmgGetEinheitPct(e.id);
    const col = pct>=75?'var(--green)':pct>=25?'var(--gold)':'var(--blue)';
    return `<div class="unit-card" style="cursor:pointer;" onclick="nmgSelectEinheit('${e.id}','${zyklus}')">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
        <span style="font-size:18px;">${e.icon}</span>
        <span style="font-size:10px;font-weight:700;color:${col};">${pct}%</span>
      </div>
      <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:3px;">${e.titel}</div>
      <div style="font-size:10px;color:var(--text3);">${e.fach}</div>
      <div style="height:4px;background:var(--bg);border-radius:2px;overflow:hidden;margin-top:6px;">
        <div style="height:100%;width:${pct}%;background:${col};border-radius:2px;"></div>
      </div>
    </div>`;
  }).join('');
}

function nmgSelectEinheit(id, zyklus) {
  const e = (NMG_EINHEITEN[zyklus]||[]).find(x=>x.id===id); if(!e) return;
  const el = document.getElementById('nmg-einheit-detail'); if(!el) return;
  const pct = nmgGetEinheitPct(id);
  el.innerHTML = `
    <div style="background:var(--bg3);border-radius:var(--r);padding:1rem;margin-bottom:1rem;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:.75rem;">
        <span style="font-size:32px;">${e.icon}</span>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:700;">${e.titel}</div>
          <div style="font-size:11px;color:var(--text3);">${e.fach} · ${zyklus}</div>
        </div>
        <span style="font-size:14px;font-weight:800;color:${pct>=75?'var(--green)':pct>=25?'var(--gold)':'var(--blue)'};">${pct}%</span>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:5px;">THEMEN</div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:.75rem;">
        ${e.themen.map(t=>`<div style="font-size:12px;color:var(--text2);">• ${t}</div>`).join('')}
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:5px;">LERNZIELE</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;">
        ${e.schluessel.map(s=>`<span style="font-size:11px;padding:2px 8px;background:rgba(56,189,248,.1);color:var(--blue);border-radius:8px;">${s}</span>`).join('')}
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1rem;">
      <button class="btn btn-p" onclick="nmgGenEinheitUebung('${id}','${zyklus}','text')" style="flex:1;min-width:140px;">📖 Lerntext</button>
      <button class="btn btn-p" onclick="nmgGenEinheitUebung('${id}','${zyklus}','mc')" style="flex:1;min-width:140px;">✅ Quiz</button>
      <button class="btn btn-p" onclick="nmgGenEinheitUebung('${id}','${zyklus}','experiment')" style="flex:1;min-width:140px;">🔬 Experiment</button>
      <button class="btn btn-p" onclick="nmgGenEinheitUebung('${id}','${zyklus}','vergleich')" style="flex:1;min-width:140px;">⚖️ Vergleich</button>
    </div>
    <div id="nmg-einheit-out-${id}"></div>`;
  el.scrollIntoView({behavior:'smooth',block:'start'});
}

async function nmgGenEinheitUebung(id, zyklus, typ) {
  const e = (NMG_EINHEITEN[zyklus]||[]).find(x=>x.id===id); if(!e) return;
  const outId = 'nmg-einheit-out-'+id;
  const out = document.getElementById(outId); if(!out) return;
  const key = ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){out.innerHTML='<div style="color:var(--gold);">⚠️ API-Schlüssel fehlt</div>';return;}
  out.innerHTML = '<div class="sp" style="margin:1.5rem auto;width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 1s linear infinite;"></div>';

  const themenStr = e.themen.join('; ');
  const zyklusLabel = {Z1:'KG–2. Klasse (sehr einfach, kurze Sätze, Bilder beschreiben)',Z2:'3.–6. Klasse (mittel, Sachtext)',Z3:'7.–9. Klasse (anspruchsvoll, Fachbegriffe)'}[zyklus];
  const aufgabe = typ==='text'
    ? `{"typ":"lerntext","titel":"...","text":"Sachtext 150-200 Wörter, altersgerecht","kernbegriffe":["Begriff1","Begriff2","Begriff3"],"fragen":[{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}]}`
    : typ==='mc'
    ? `{"typ":"quiz","titel":"...","fragen":[{"q":"...","opts":["a","b","c","d"],"correct":0},{"q":"...","opts":["a","b","c","d"],"correct":1},{"q":"...","opts":["a","b","c","d"],"correct":2},{"q":"...","opts":["a","b","c","d"],"correct":0}]}`
    : typ==='experiment'
    ? `{"typ":"experiment","titel":"...","ziel":"Was beobachten wir?","material":["mat1","mat2","mat3"],"schritte":["Schritt 1","Schritt 2","Schritt 3","Schritt 4"],"beobachtung":"Was siehst du?","erklaerung":"Warum passiert das?"}`
    : `{"typ":"vergleich","titel":"...","aspekte":["A","B"],"merkmale":[{"was":"Merkmal","a":"Wert A","b":"Wert B"},{"was":"Merkmal 2","a":"Wert A","b":"Wert B"},{"was":"Merkmal 3","a":"Wert A","b":"Wert B"}],"reflexion":"Offene Frage"}`;

  const sys = `Du bist LP21-Lehrperson NMG. Einheit: "${e.titel}" (${e.fach}). Zyklus: ${zyklus} (${zyklusLabel}). Themen: ${themenStr}. Sprache: Deutsch. Antworte NUR als JSON: ${aufgabe}`;

  try {
    const raw = await claude([{role:'user',content:'Generiere.'}], sys);
    const d = JSON.parse(raw.replace(/```json|```/g,'').trim());
    let html = '';

    if(d.typ==='lerntext') {
      html = `<div class="card"><div class="ctitle">${d.titel} <span class="tag tag-lp">NMG ${zyklus}</span></div>
        <div style="padding:14px 16px;background:var(--bg3);border-radius:var(--r);font-size:14px;line-height:1.9;margin-bottom:1rem;border-left:3px solid var(--green);">${d.text}
          <button class="btn" style="display:block;margin-top:.75rem;font-size:12px;padding:5px 14px;" onclick="speak(this.parentElement.innerText.replace('Vorlesen','').trim(),'de')">🔊 Vorlesen</button>
        </div>
        ${d.kernbegriffe?.length?`<div style="margin-bottom:.875rem;"><div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:5px;">KERNBEGRIFFE</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${d.kernbegriffe.map(k=>`<span style="padding:2px 9px;background:rgba(34,197,94,.1);color:var(--green);border-radius:8px;font-size:12px;">${k}</span>`).join('')}</div></div>`:''}
        ${d.fragen?.length?`<div><div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:.5rem;">VERSTÄNDNISFRAGEN</div>${d.fragen.map((f,i)=>{const oid='nmgq-'+Date.now()+'-'+i;return `<div style="margin-bottom:.75rem;"><div style="font-size:13px;font-weight:600;margin-bottom:4px;">${i+1}. ${f.q}</div><textarea id="${oid}" class="inp" rows="2" placeholder="Deine Antwort…" style="resize:none;font-size:13px;"></textarea><button class="btn" style="margin-top:4px;font-size:11px;padding:4px 10px;" onclick="document.getElementById('${oid}-a').style.display='block'">📄 Antwort</button><div id="${oid}-a" style="display:none;margin-top:4px;padding:7px;background:rgba(34,197,94,.08);border-radius:var(--r);font-size:12px;color:var(--green);">${f.a}</div></div>`; }).join('')}</div>`:''}</div>`;
    } else if(d.typ==='quiz') {
      html = `<div class="card"><div class="ctitle">${d.titel} <span class="tag tag-lp">Quiz</span></div>${d.fragen?.map((f,i)=>`<div style="margin-bottom:1rem;"><div style="font-size:13px;font-weight:600;margin-bottom:.5rem;">${i+1}. ${f.q}</div><div class="mcopts">${(f.opts||[]).map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${f.correct}">${o}</button>`).join('')}</div></div>`).join('')}</div>`;
    } else if(d.typ==='experiment') {
      html = `<div class="card"><div class="ctitle">🔬 ${d.titel} <span class="tag tag-lp">Experiment</span></div>
        ${d.ziel?`<div style="padding:10px 14px;background:rgba(56,189,248,.07);border:1px solid rgba(56,189,248,.2);border-radius:var(--r);margin-bottom:.875rem;font-size:13px;"><strong>🎯 Ziel:</strong> ${d.ziel}</div>`:''}
        ${d.material?.length?`<div style="margin-bottom:.875rem;"><div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:5px;">🧰 MATERIAL</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${d.material.map(m=>`<span style="padding:3px 10px;background:var(--bg3);border-radius:8px;font-size:12px;">${m}</span>`).join('')}</div></div>`:''}
        ${d.schritte?.length?`<div style="margin-bottom:.875rem;"><div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:5px;">📋 SCHRITTE</div><ol style="padding-left:1.25rem;font-size:13px;line-height:1.9;">${d.schritte.map(s=>`<li>${s}</li>`).join('')}</ol></div>`:''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:4px;">👁️ BEOBACHTUNG</div><textarea class="inp" rows="3" placeholder="${d.beobachtung||'Was siehst du?'}" style="resize:none;font-size:12px;width:100%;"></textarea></div>
          <div><div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:4px;">💡 ERKLÄRUNG</div><div style="padding:8px;background:rgba(34,197,94,.06);border-radius:var(--r);font-size:12px;min-height:60px;">${d.erklaerung||'—'}</div></div>
        </div></div>`;
    } else if(d.typ==='vergleich') {
      html = `<div class="card"><div class="ctitle">⚖️ ${d.titel} <span class="tag tag-lp">Vergleich</span></div>
        <div style="overflow-x:auto;margin-bottom:.875rem;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="border-bottom:1px solid var(--border);">
            <th style="padding:8px;text-align:left;font-size:11px;color:var(--text3);">Merkmal</th>
            <th style="padding:8px;text-align:left;color:var(--blue);">${d.aspekte?.[0]||'A'}</th>
            <th style="padding:8px;text-align:left;color:var(--green);">${d.aspekte?.[1]||'B'}</th>
          </tr></thead><tbody>
          ${(d.merkmale||[]).map(r=>`<tr style="border-bottom:1px solid rgba(45,63,86,.3);">
            <td style="padding:8px;font-weight:600;">${r.was}</td>
            <td style="padding:8px;color:var(--text2);">${r.a}</td>
            <td style="padding:8px;color:var(--text2);">${r.b}</td>
          </tr>`).join('')}
          </tbody></table></div>
        ${d.reflexion?`<div style="padding:10px 14px;background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.2);border-radius:var(--r);font-size:13px;">💬 ${d.reflexion}</div>`:''}</div>`;
    }

    out.innerHTML = html;
    out.querySelectorAll('.mcopts').forEach(opts=>opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);
      opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');const np=nmgTickEinheit(id);addXP(8,'l','learn');toast('✅ Richtig! '+np+'%');nmgRenderEinheiten(nmgActiveZyklus);}
      else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    })));
    if(typ!=='mc'){const np=nmgTickEinheit(id);nmgRenderEinheiten(nmgActiveZyklus);addXP(10,'l','learn');}
    out.scrollIntoView({behavior:'smooth',block:'nearest'});
  } catch(e) {
    out.innerHTML = `<div style="color:var(--red);">Fehler: ${e.message}</div>`;
  }
}

// ── Experiment-Tab direkt ──
async function nmgGenExperiment() {
  const thema = document.getElementById('nmg-exp-thema')?.value.trim();
  const zyklus = document.getElementById('nmg-exp-zyklus')?.value||'Z2';
  const out = document.getElementById('nmg-exp-out');
  if(!thema){toast('⚠️ Thema eingeben');return;}
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){if(out)out.innerHTML='<div style="color:var(--gold);">⚠️ API-Schlüssel fehlt</div>';return;}
  if(out)out.innerHTML='<div class="sp" style="margin:1.5rem auto;width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 1s linear infinite;"></div>';
  const zyklusLabel={Z1:'Kindergarten/1.-2. Klasse, sehr einfach, mit Alltagsmaterialien',Z2:'3.-6. Klasse, mittlere Schwierigkeit',Z3:'7.-9. Klasse, anspruchsvoll, physikalische/chemische Begriffe'}[zyklus];
  const sys=`Du bist LP21-Lehrperson NMG. Erstelle eine vollständige Experimentieranleitung zum Thema "${thema}" für ${zyklusLabel}.
JSON: {"titel":"...","lernziel":"Ein Satz was Schüler lernen","sicherheit":"Falls nötig: Sicherheitshinweis","material":["mat1","mat2","mat3","mat4"],"schritte":["Schritt 1","Schritt 2","Schritt 3","Schritt 4","Schritt 5"],"beobachtung_fragen":["Was siehst du?","Wie verändert sich...?","Was passiert wenn...?"],"erklaerung":"Warum passiert das? (2-3 Sätze, altersgerecht)","variation":"Optional: Was könnte man noch ausprobieren?"}`;
  try{
    const raw=await claude([{role:'user',content:'Experiment.'}],sys);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    if(out)out.innerHTML=`<div class="card">
      <div class="ctitle">🔬 ${d.titel} <span class="tag tag-lp">${zyklus}</span><span class="tag tag-ai">Experiment</span></div>
      ${d.lernziel?`<div style="padding:10px 14px;background:rgba(56,189,248,.07);border:1px solid rgba(56,189,248,.2);border-radius:var(--r);margin-bottom:.875rem;font-size:13px;">🎯 <strong>Lernziel:</strong> ${d.lernziel}</div>`:''}
      ${d.sicherheit?`<div style="padding:8px 14px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:var(--r);margin-bottom:.875rem;font-size:12px;">⚠️ ${d.sicherheit}</div>`:''}
      <div style="margin-bottom:.875rem;"><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">🧰 Material</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${(d.material||[]).map(m=>`<span style="padding:4px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;font-size:12px;">• ${m}</span>`).join('')}</div>
      </div>
      <div style="margin-bottom:.875rem;"><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">📋 Durchführung</div>
        <ol style="padding-left:1.25rem;font-size:14px;line-height:1.9;margin:0;">${(d.schritte||[]).map(s=>`<li style="margin-bottom:4px;">${s}</li>`).join('')}</ol>
      </div>
      <div style="margin-bottom:.875rem;"><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">👁️ Beobachtungsfragen</div>
        ${(d.beobachtung_fragen||[]).map((f,i)=>`<div style="margin-bottom:.5rem;padding:8px 12px;background:var(--bg3);border-radius:var(--r);font-size:13px;">${i+1}. ${f}</div>`).join('')}
      </div>
      <div style="padding:12px 16px;background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.2);border-radius:var(--r);margin-bottom:.75rem;">
        <div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:5px;">💡 Erklärung</div>
        <div style="font-size:13px;line-height:1.7;">${d.erklaerung||'—'}</div>
      </div>
      ${d.variation?`<div style="font-size:12px;color:var(--text3);padding:8px 12px;background:rgba(168,85,247,.06);border-radius:var(--r);">🔄 <strong>Variation:</strong> ${d.variation}</div>`:''}
    </div>`;
    addXP(15,'l','learn');
    toast('🔬 Experiment bereit!');
  }catch(e){if(out)out.innerHTML=`<div style="color:var(--red);">Fehler: ${e.message}</div>`;}
}

// ── Init NMG bei Panel-Öffnung ──

// ═══════════════════════════════════════════
// SPRINT 12 — VOKABEL-IMPORT ENGINE
// Manuell · PDF/Text KI-Import · Eigene Sets
// ═══════════════════════════════════════════

const VOKI_KEY = 'voki_custom_sets'; // localStorage key

// ── Hilfsfunktionen ──
function vokiGetSets() { return JSON.parse(localStorage.getItem(VOKI_KEY)||'[]'); }
function vokiSaveSets(sets) { localStorage.setItem(VOKI_KEY, JSON.stringify(sets)); }

function vokiShowTab(tab) {
  ['manuell','pdf','sets'].forEach(t => {
    const el  = document.getElementById('voki-'+t+'-view');
    const btn = document.getElementById('voki-tab-'+t);
    if(el)  el.style.display  = t===tab ? '' : 'none';
    if(btn) btn.className     = t===tab ? 'btn btn-p' : 'btn';
  });
  if(tab==='sets') vokiRenderSets();
  if(tab==='manuell') vokiInitManuell();
}

// ── Manuell: Zeilen ──
let vokiZeilen = [];
function vokiInitManuell() {
  vokiZeilen = [{w:'',tr:'',ex:''}];
  vokiRenderZeilen();
}
function vokiAddZeile() {
  vokiZeilen.push({w:'',tr:'',ex:''});
  vokiRenderZeilen();
}
function vokiRenderZeilen() {
  const el = document.getElementById('voki-zeilen'); if(!el) return;
  el.innerHTML = vokiZeilen.map((z,i) => `
    <div style="display:grid;grid-template-columns:2fr 2fr 3fr auto;gap:6px;align-items:center;">
      <input class="inp" value="${z.w}" placeholder="Wort" style="font-size:12px;" oninput="vokiZeilen[${i}].w=this.value"/>
      <input class="inp" value="${z.tr}" placeholder="Übersetzung" style="font-size:12px;" oninput="vokiZeilen[${i}].tr=this.value"/>
      <input class="inp" value="${z.ex}" placeholder="Beispiel (optional)" style="font-size:12px;" oninput="vokiZeilen[${i}].ex=this.value"/>
      <button onclick="vokiZeilen.splice(${i},1);vokiRenderZeilen()" style="padding:6px 10px;border:1px solid var(--border);background:var(--bg3);border-radius:var(--r);cursor:pointer;color:var(--red);">✕</button>
    </div>`).join('');
}

function vokiBulkImport() {
  const bulk = document.getElementById('voki-bulk')?.value.trim();
  if(!bulk) return;
  const lines = bulk.split('\n').filter(l=>l.trim());
  vokiZeilen = lines.map(l => {
    const parts = l.split('\t');
    return { w: (parts[0]||'').trim(), tr: (parts[1]||'').trim(), ex: (parts[2]||'').trim() };
  }).filter(z=>z.w);
  vokiRenderZeilen();
  document.getElementById('voki-bulk').value = '';
  toast(`✅ ${vokiZeilen.length} Vokabeln übernommen`);
}

function vokiSaveManuell() {
  const name = document.getElementById('voki-set-name')?.value.trim();
  const lang = document.getElementById('voki-lang')?.value || 'en';
  const msg  = document.getElementById('voki-manuell-msg');
  if(!name) { if(msg){msg.style.color='var(--red)';msg.textContent='⚠️ Bitte Set-Namen eingeben';} return; }
  const vokabeln = vokiZeilen.filter(z=>z.w&&z.tr);
  if(!vokabeln.length) { if(msg){msg.style.color='var(--red)';msg.textContent='⚠️ Mindestens eine Vokabel eingeben';} return; }
  vokiSaveSet(name, lang, vokabeln);
  if(msg){msg.style.color='var(--green)';msg.textContent=`✅ Set «${name}» mit ${vokabeln.length} Vokabeln gespeichert!`;}
  document.getElementById('voki-set-name').value = '';
  vokiZeilen = [{w:'',tr:'',ex:''}];
  vokiRenderZeilen();
  setTimeout(()=>{ if(msg)msg.textContent=''; },3000);
  vokiUpdateVKDB();
}

function vokiSaveSet(name, lang, vokabeln, source) {
  const sets = vokiGetSets();
  const id   = 'voki_'+Date.now();
  sets.push({ id, name, lang, vokabeln, source: source||'manuell',
    datum: new Date().toISOString().slice(0,10), count: vokabeln.length });
  vokiSaveSets(sets);
  toast(`💾 Set «${name}» gespeichert!`);
  vokiUpdateVKDB();
}

// ── VKDB mit eigenen Sets synchronisieren ──
function vokiUpdateVKDB() {
  const sets = vokiGetSets();
  ['en','fr','it','es','de'].forEach(lang => {
    const langSets = sets.filter(s=>s.lang===lang);
    // Eigene Sets als Einheiten ab Index 10 hinzufügen (LP21 nutzt 0–9)
    langSets.forEach((s,i) => {
      const formatted = s.vokabeln.map(v => ({
        w:v.w, p:'', tr:v.tr, ex:v.ex||'', custom:true, setId:s.id
      }));
      if(!VKDB[lang]) VKDB[lang]=[];
      VKDB[lang][10+i] = formatted;
    });
  });
  buildVKUnitGrid();
}

// ── PDF/Text KI-Import ──
function vokiHandleDrop(e) {
  e.preventDefault();
  document.getElementById('voki-dropzone').style.borderColor='var(--border)';
  const file = e.dataTransfer.files[0];
  if(file) vokiHandleFile(file);
}

function vokiHandleFile(file) {
  if(!file) return;
  const reader = new FileReader();
  if(file.type==='application/pdf') {
    reader.onload = () => {
      // PDF: wir können den Rohttext-Inhalt nicht direkt lesen ohne lib
      // Stattdessen Hinweis zeigen
      document.getElementById('voki-pdf-text').value =
        '[PDF erkannt — bitte Text manuell aus dem PDF kopieren und hier einfügen]';
      toast('💡 PDF: bitte Text kopieren und einfügen');
    };
    reader.readAsDataURL(file);
  } else {
    reader.onload = e => {
      document.getElementById('voki-pdf-text').value = e.target.result;
      toast(`✅ Datei «${file.name}» geladen`);
    };
    reader.readAsText(file, 'utf-8');
  }
}

async function vokiKiImport() {
  const text = document.getElementById('voki-pdf-text')?.value.trim();
  const name = document.getElementById('voki-pdf-name')?.value.trim();
  const lang = document.getElementById('voki-pdf-lang')?.value || 'en';
  const out  = document.getElementById('voki-pdf-out');
  if(!text || text.length < 20) { toast('⚠️ Bitte Text eingeben'); return; }
  if(!name) { toast('⚠️ Bitte Set-Namen eingeben'); return; }
  const key = ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){ if(out)out.innerHTML='<div style="color:var(--gold);">⚠️ API-Schlüssel fehlt</div>';return; }

  // Extraktions-Typ
  const chip = document.querySelector('[data-vext].on');
  const extTyp = chip ? chip.dataset.vext : 'vokabeln';
  const langNames = {en:'Englisch',fr:'Französisch',it:'Italienisch',es:'Spanisch',de:'Deutsch'};

  if(out) out.innerHTML = '<div class="sp" style="margin:1.5rem auto;width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin 1s linear infinite;"></div><div style="text-align:center;font-size:13px;color:var(--text2);margin-top:.5rem;">KI extrahiert Vokabeln…</div>';

  const sys = `Du bist ein Schweizer Sprachlehrer. Analysiere den folgenden Text und extrahiere alle ${extTyp} auf ${langNames[lang]||lang}.
Für jede Vokabel gib an: Originalwort, deutsche Übersetzung, und wenn möglich ein kurzes Beispiel aus dem Text.
Extrahiere maximal 40 Einträge, nur relevante ${extTyp}.

Antworte NUR als JSON (kein Markdown):
{"set_name":"${name}","sprache":"${lang}","count":5,"vokabeln":[
  {"w":"Wort auf ${langNames[lang]}","tr":"Deutsche Übersetzung","ex":"Kurzes Beispiel aus dem Text (optional)"},
  ...
]}

Text zum Analysieren:
${text.slice(0,3000)}`;

  try {
    const raw = await claude([{role:'user',content:'Extrahiere Vokabeln.'}], sys);
    const d = JSON.parse(raw.replace(/```json|```/g,'').trim());
    const vokabeln = (d.vokabeln||[]).filter(v=>v.w&&v.tr);

    if(!vokabeln.length) {
      if(out) out.innerHTML='<div style="color:var(--gold);">⚠️ Keine Vokabeln gefunden. Anderen Text versuchen?</div>';
      return;
    }

    // Vorschau + Bestätigungs-Button
    if(out) out.innerHTML = `
      <div style="padding:12px 14px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:var(--r);margin-bottom:.875rem;">
        <div style="font-size:13px;font-weight:700;color:var(--green);margin-bottom:.5rem;">✅ ${vokabeln.length} ${extTyp} gefunden</div>
        <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;">
          ${vokabeln.map(v=>`<div style="display:flex;gap:8px;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);">
            <span style="font-weight:700;min-width:120px;">${v.w}</span>
            <span style="color:var(--text2);flex:1;">${v.tr}</span>
            ${v.ex?`<span style="color:var(--text3);font-style:italic;font-size:11px;">${v.ex.slice(0,40)}</span>`:''}
          </div>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-p" onclick="vokiConfirmImport('${name.replace(/'/g,"\\x27")}','${lang}',${JSON.stringify(vokabeln).replace(/'/g,"\\x27")})" style="flex:1;padding:12px;">💾 Set speichern</button>
        <button class="btn" onclick="document.getElementById('voki-pdf-out').innerHTML=''" style="padding:12px;">✕ Verwerfen</button>
      </div>`;
    addXP(10,'l','learn');
  } catch(e) {
    if(out) out.innerHTML=`<div style="color:var(--red);">Fehler: ${e.message}</div>`;
  }
}

function vokiConfirmImport(name, lang, vokabeln) {
  vokiSaveSet(name, lang, typeof vokabeln==='string'?JSON.parse(vokabeln):vokabeln, 'ki-import');
  document.getElementById('voki-pdf-out').innerHTML =
    `<div style="color:var(--green);padding:.75rem;font-size:13px;">✅ Set «${name}» gespeichert! Öffne <strong>Meine Sets</strong> um damit zu lernen.</div>`;
  document.getElementById('voki-pdf-text').value = '';
  document.getElementById('voki-pdf-name').value = '';
}

// ── Meine Sets ──
function vokiRenderSets() {
  const sets   = vokiGetSets();
  const el     = document.getElementById('voki-sets-list');
  const empty  = document.getElementById('voki-sets-empty');
  const count  = document.getElementById('voki-sets-count');
  if(count) count.textContent = sets.length;
  if(!sets.length) {
    if(el)    el.innerHTML = '';
    if(empty) empty.style.display = '';
    return;
  }
  if(empty) empty.style.display = 'none';
  const langFlags = {en:'🇬🇧',fr:'🇫🇷',it:'🇮🇹',es:'🇪🇸',de:'🇩🇪'};
  const sourceLabel = {manuell:'✏️ Manuell','ki-import':'🤖 KI-Import'};
  if(el) el.innerHTML = sets.map((s,i) => `
    <div style="padding:12px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:.5rem;">
        <span style="font-size:20px;">${langFlags[s.lang]||'🌐'}</span>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;">${s.name}</div>
          <div style="font-size:11px;color:var(--text3);">${sourceLabel[s.source]||s.source} · ${s.count} Wörter · ${s.datum}</div>
        </div>
        <button onclick="vokiDeleteSet('${s.id}')" style="padding:4px 10px;border:1px solid var(--border);background:transparent;border-radius:var(--r);cursor:pointer;font-size:12px;color:var(--red);">🗑️</button>
      </div>
      <!-- Vorschau erste 5 Wörter -->
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:.75rem;">
        ${(s.vokabeln||[]).slice(0,5).map(v=>`<span style="padding:2px 8px;background:var(--bg2);border-radius:5px;font-size:11px;">${v.w} = ${v.tr}</span>`).join('')}
        ${s.count>5?`<span style="font-size:11px;color:var(--text3);">+${s.count-5} weitere</span>`:''}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-p" onclick="vokiLernenSet('${s.id}')" style="flex:1;font-size:12px;padding:8px;">📇 Lernen</button>
        <button class="btn" onclick="vokiExportSet('${s.id}')" style="font-size:12px;padding:8px;">📤 Export</button>
      </div>
    </div>`).join('');
}

function vokiDeleteSet(id) {
  if(!confirm('Set löschen?')) return;
  const sets = vokiGetSets().filter(s=>s.id!==id);
  vokiSaveSets(sets);
  vokiUpdateVKDB();
  vokiRenderSets();
  toast('🗑️ Set gelöscht');
}

function vokiLernenSet(id) {
  const sets = vokiGetSets();
  const s = sets.find(x=>x.id===id);
  if(!s) return;
  // Sprache setzen + zum Vokabeltrainer navigieren
  ST.lang = s.lang;
  const p = ST.profiles[ST.activeProfile];
  if(p) { p.lang=s.lang; }
  // Set-Index finden (10+i)
  const langSets = sets.filter(x=>x.lang===s.lang);
  const idx = 10 + langSets.indexOf(s);
  nav('vokabeln');
  setTimeout(() => { selectVKUnit(idx, 0); }, 100);
  toast(`📇 Lerne Set «${s.name}»`);
}

function vokiExportSet(id) {
  const s = vokiGetSets().find(x=>x.id===id);
  if(!s) return;
  // Als Tab-separierte Textdatei exportieren
  const lines = (s.vokabeln||[]).map(v=>[v.w,v.tr,v.ex||''].join('\t'));
  const blob = new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = s.name.replace(/[^a-zA-Z0-9]/g,'_')+'.txt';
  a.click();
  toast('📤 Export gespeichert!');
}

// ── Chip-Handler für Extraktions-Typ ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-msektyp]').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-msektyp]').forEach(b=>b.classList.remove('on'));
      this.classList.add('on');
    });
  });
  document.querySelectorAll('[data-vext]').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-vext]').forEach(b=>b.classList.remove('on'));
      this.classList.add('on');
    });
  });
});

// ── Nav-Hook ──

// ═══════════════════════════════════════════
// PHASE 8b — LERNEN LERNEN ENGINE
// Z1: Wiederholung als Spiel
// Z2: Lernkarten · Mindmap · Erklären (Feynman)
// Z3: Pomodoro · Retrieval Practice · Elaboration
// ═══════════════════════════════════════════

const LL_STRATEGIEN = {
  z1: [
    { id:'wiederholen', icon:'🔄', titel:'Nochmal zeigen', farbe:'var(--blue)',
      beschreibung:'Du lernst am besten wenn du etwas mehrmals siehst. Drücke auf eine Karte — dann dreh sie um!',
      tipps:['Jede Karte 3 Mal anschauen', 'Erst Bild — dann Wort', 'Mit Mama oder Papa zusammen'] },
    { id:'erklaeren_z1', icon:'🗣️', titel:'Erklär mir das!', farbe:'var(--green)',
      beschreibung:'Erkläre deiner Puppe, deinem Bruder oder dir selbst was du gelernt hast. So bleibt es besser!',
      tipps:['Einfache Wörter benutzen', 'Ein Beispiel nennen', 'Dabei ein Bild malen'] },
    { id:'malen', icon:'🎨', titel:'Mal was du gelernt hast', farbe:'var(--gold)',
      beschreibung:'Male auf Papier was du heute gelernt hast. Ein Buchstabe, eine Zahl, ein Wort.',
      tipps:['Gross und deutlich malen', 'Den Buchstaben schön machen', 'Dann vorlesen'] },
  ],
  z2: [
    { id:'lernkarten', icon:'📇', titel:'Lernkarten', farbe:'var(--blue)',
      beschreibung:'Schreibe Frage vorne, Antwort hinten. Wiederhole bis du alle kennst. So wie ein Profi!',
      tipps:['Grüne Karte = kann ich', 'Rote Karte = nochmal üben', 'Jeden Tag 5 Karten'] },
    { id:'mindmap', icon:'🗺️', titel:'Mindmap erstellen', farbe:'var(--purple)',
      beschreibung:'Ein Thema in die Mitte — dann alle Ideen drumherum. Die KI hilft dir einen Startpunkt zu finden.',
      tipps:['Hauptthema gross schreiben', 'Äste für Untergruppen', 'Farben verwenden'] },
    { id:'feynman', icon:'👩‍🏫', titel:'Erkläre es einfach', farbe:'var(--green)',
      beschreibung:'Erkläre das Thema so als wärst du der Lehrer. Wenn du es nicht erklären kannst, musst du es nochmal lernen.',
      tipps:['Kein Buch — aus dem Kopf', 'Einfache Sprache', 'Was war unklar?'] },
    { id:'pomodoro', icon:'🍅', titel:'Pomodoro Technik', farbe:'var(--red)',
      beschreibung:'25 Minuten konzentriert lernen, dann 5 Minuten Pause. Keine Ablenkung im Timer!',
      tipps:['Handy weglegen', 'Nur eine Aufgabe', 'Nach 4 Runden: 20 Min. Pause'] },
  ],
  z3: [
    { id:'pomodoro', icon:'🍅', titel:'Pomodoro Technik', farbe:'var(--red)',
      beschreibung:'25 Minuten tief konzentriert — dann 5 Minuten Pause. Wissenschaftlich bewiesen effektiv.',
      tipps:['Alle Ablenkungen eliminieren', 'Nur eine Aufgabe pro Block', 'Nach 4 Runden: längere Pause'] },
    { id:'retrieval', icon:'🎯', titel:'Retrieval Practice', farbe:'var(--blue)',
      beschreibung:'Buch zu — Fragen beantworten — dann vergleichen. Schwieriger als Lesen aber 3× wirksamer.',
      tipps:['Ohne Unterlagen starten', 'Alles aufschreiben was du weisst', 'Dann Lücken schliessen'] },
    { id:'elaboration', icon:'🔗', titel:'Elaboration', farbe:'var(--purple)',
      beschreibung:'Warum ist das so? Wie hängt das zusammen? Eigene Beispiele finden. Tiefes Verstehen statt oberflächliches Lernen.',
      tipps:['Mindestens 3 Warum-Fragen', 'Verbindungen zu anderen Themen', 'Eigene Beispiele erfinden'] },
    { id:'feynman', icon:'👩‍🏫', titel:'Feynman-Methode', farbe:'var(--green)',
      beschreibung:'Erkläre das Thema einer 10-jährigen Person. Was du nicht einfach erklären kannst, hast du nicht verstanden.',
      tipps:['Kein Fachjargon', 'Analogien benutzen', 'Wo stockst du? Da nochmal lernen'] },
    { id:'lernkarten', icon:'📇', titel:'Spaced Repetition', farbe:'var(--gold)',
      beschreibung:'Lernkarten nach Schwierigkeitsgrad sortieren. Schwierige Karten häufiger wiederholen.',
      tipps:['Kiste 1 = täglich', 'Kiste 2 = alle 2 Tage', 'Kiste 3 = wöchentlich'] },
  ],
};

let llPomodoro = { running:false, secs:0, paused:false, runden:0, interval:null };

function hsRenderLernenLernen() {
  const zyklus = hsGetZyklus();
  const strategien = LL_STRATEGIEN[zyklus] || LL_STRATEGIEN.z2;
  const intro = document.getElementById('ll-intro-text');
  const el    = document.getElementById('ll-strategien');
  const active = document.getElementById('ll-active');
  if (active) active.style.display = 'none';
  if (intro) {
    const intros = {
      z1: 'Wie lernst du am besten? Wähle eine Übung! 🌟',
      z2: 'Lernstrategien machen dich schlauer — nicht mehr Üben, sondern schlauer Üben.',
      z3: 'Wissenschaftlich bewährte Methoden für tiefes Verständnis und langfristiges Behalten.',
    };
    intro.textContent = intros[zyklus] || intros.z2;
  }
  if (!el) return;
  el.innerHTML = strategien.map(s => `
    <div onclick="llStartStrategie('${s.id}')" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);cursor:pointer;transition:border-color .2s;" onmouseover="this.style.borderColor='${s.farbe}'" onmouseout="this.style.borderColor='var(--border)'">
      <span style="font-size:28px;">${s.icon}</span>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:700;color:var(--text);">${s.titel}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;">${s.beschreibung.slice(0,60)}…</div>
      </div>
      <span style="font-size:18px;color:${s.farbe};">→</span>
    </div>`).join('');
}

function llStartStrategie(id) {
  const zyklus = hsGetZyklus();
  const strategien = LL_STRATEGIEN[zyklus] || LL_STRATEGIEN.z2;
  const s = strategien.find(x=>x.id===id) || [...LL_STRATEGIEN.z2,...LL_STRATEGIEN.z3].find(x=>x.id===id);
  if (!s) return;
  const el = document.getElementById('ll-active');
  if (!el) return;
  el.style.display = '';
  // Render je nach Strategie
  if (id === 'pomodoro')     { llRenderPomodoro(s, el); return; }
  if (id === 'lernkarten')   { llRenderLernkarten(s, el); return; }
  if (id === 'mindmap')      { llRenderMindmap(s, el); return; }
  if (id === 'feynman')      { llRenderFeynman(s, el); return; }
  if (id === 'retrieval')    { llRenderRetrieval(s, el); return; }
  if (id === 'elaboration')  { llRenderElaboration(s, el); return; }
  if (id === 'wiederholen')  { llRenderWiederholen(s, el); return; }
  if (id === 'erklaeren_z1') { llRenderErklaeren(s, el); return; }
  if (id === 'malen')        { llRenderMalen(s, el); return; }
  el.scrollIntoView({behavior:'smooth', block:'start'});
}

function llCard(s, content) {
  return `<div class="card" style="margin-bottom:1rem;border-color:${s.farbe}40;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem;">
      <span style="font-size:28px;">${s.icon}</span>
      <div><div style="font-size:16px;font-weight:700;">${s.titel}</div>
      <div style="font-size:12px;color:var(--text2);">${s.beschreibung}</div></div>
    </div>
    <div style="margin-bottom:1rem;padding:10px 14px;background:rgba(168,85,247,.05);border-radius:var(--r);">
      <div style="font-size:11px;font-weight:700;color:var(--purple);margin-bottom:5px;">💡 Tipps</div>
      ${s.tipps.map(t=>`<div style="font-size:12px;color:var(--text2);">• ${t}</div>`).join('')}
    </div>
    ${content}
    <button class="btn" style="margin-top:.75rem;font-size:12px;" onclick="document.getElementById('ll-active').style.display='none';document.getElementById('ll-strategien').style.display='flex';">← Zurück</button>
  </div>`;
}

// ── POMODORO ──
function llRenderPomodoro(s, el) {
  llPomodoro = {running:false, secs:0, paused:false, runden:0, interval:null};
  el.innerHTML = llCard(s, `
    <div style="text-align:center;padding:1.5rem 0;">
      <div style="font-size:72px;font-family:'DM Serif Display',serif;font-weight:700;color:var(--red);line-height:1;" id="ll-pom-timer">25:00</div>
      <div style="font-size:13px;color:var(--text2);margin-top:.5rem;" id="ll-pom-status">Bereit für den ersten Block</div>
      <div style="font-size:12px;color:var(--text3);">🍅 Runden: <strong id="ll-pom-runden">0</strong></div>
    </div>
    <div style="margin-bottom:.875rem;">
      <div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:.5rem;">Was lernst du heute?</div>
      <input class="inp" id="ll-pom-aufgabe" placeholder="z.B. Englisch Vokabeln Unit 3" style="font-size:13px;"/>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-p" id="ll-pom-start" onclick="llPomStart()" style="flex:1;padding:12px;">▶ Start</button>
      <button class="btn" id="ll-pom-pause" onclick="llPomPause()" style="flex:1;padding:12px;" disabled>⏸ Pause</button>
      <button class="btn" onclick="llPomReset()" style="padding:12px;">↺</button>
    </div>
    <div style="height:6px;background:var(--bg);border-radius:3px;overflow:hidden;margin-top:.75rem;">
      <div id="ll-pom-bar" style="height:100%;background:var(--red);border-radius:3px;width:100%;transition:width 1s linear;"></div>
    </div>`);
  el.scrollIntoView({behavior:'smooth',block:'start'});
}

function llPomStart() {
  const aufgabe = document.getElementById('ll-pom-aufgabe')?.value.trim();
  if(!aufgabe){toast('⚠️ Bitte Aufgabe eingeben');return;}
  clearInterval(llPomodoro.interval);
  const total = 25*60;
  llPomodoro.secs = total;
  llPomodoro.running = true;
  document.getElementById('ll-pom-start').disabled = true;
  document.getElementById('ll-pom-pause').disabled = false;
  document.getElementById('ll-pom-status').textContent = '🔴 Konzentriert arbeiten — kein Handy!';
  llPomodoro.interval = setInterval(() => {
    if(llPomodoro.paused) return;
    llPomodoro.secs--;
    const m=String(Math.floor(llPomodoro.secs/60)).padStart(2,'0');
    const s=String(llPomodoro.secs%60).padStart(2,'0');
    const el=document.getElementById('ll-pom-timer');
    if(el) el.textContent=m+':'+s;
    const bar=document.getElementById('ll-pom-bar');
    if(bar) bar.style.width=(llPomodoro.secs/total*100)+'%';
    if(llPomodoro.secs<=0){
      clearInterval(llPomodoro.interval);
      llPomodoro.runden++;
      llPomodoro.running=false;
      const r=document.getElementById('ll-pom-runden');
      if(r)r.textContent=llPomodoro.runden;
      const st=document.getElementById('ll-pom-status');
      if(st)st.textContent='✅ Runde '+llPomodoro.runden+' geschafft! Jetzt 5 Min. Pause.';
      const sBtn=document.getElementById('ll-pom-start');
      if(sBtn){sBtn.disabled=false;sBtn.textContent='▶ Nächste Runde';}
      addXP(20,'l','learn');
      toast('🍅 Pomodoro abgeschlossen! +20 XP');
      if(typeof speak==='function') speak('Super! Mach jetzt eine Pause.','de');
    }
  }, 1000);
}
function llPomPause(){
  llPomodoro.paused=!llPomodoro.paused;
  const btn=document.getElementById('ll-pom-pause');
  if(btn)btn.textContent=llPomodoro.paused?'▶ Weiter':'⏸ Pause';
  const st=document.getElementById('ll-pom-status');
  if(st)st.textContent=llPomodoro.paused?'⏸ Pause':'🔴 Konzentriert arbeiten!';
}
function llPomReset(){
  clearInterval(llPomodoro.interval);
  llPomodoro={running:false,secs:0,paused:false,runden:0,interval:null};
  const el=document.getElementById('ll-pom-timer');if(el)el.textContent='25:00';
  const bar=document.getElementById('ll-pom-bar');if(bar)bar.style.width='100%';
  const st=document.getElementById('ll-pom-status');if(st)st.textContent='Bereit für den ersten Block';
  const sb=document.getElementById('ll-pom-start');if(sb){sb.disabled=false;sb.textContent='▶ Start';}
  const pb=document.getElementById('ll-pom-pause');if(pb){pb.disabled=true;pb.textContent='⏸ Pause';}
}

// ── LERNKARTEN ──
let llKarten=[], llKarteIdx=0, llKarteGruen=0;
function llRenderLernkarten(s, el) {
  el.innerHTML = llCard(s, `
    <div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:.5rem;">Eigene Lernkarten erstellen</div>
    <div id="ll-karten-form" style="display:flex;flex-direction:column;gap:8px;margin-bottom:.875rem;">
      <input class="inp" id="ll-k-frage" placeholder="Vorderseite: Frage oder Begriff…" style="font-size:13px;"/>
      <input class="inp" id="ll-k-antwort" placeholder="Rückseite: Antwort oder Bedeutung…" style="font-size:13px;"/>
      <button class="btn btn-p" onclick="llAddKarte()" style="font-size:13px;">+ Karte hinzufügen</button>
    </div>
    <div id="ll-karten-deck" style="display:none;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;">
        <span style="font-size:12px;color:var(--text3);" id="ll-k-counter">Karte 1/1</span>
        <span style="font-size:12px;color:var(--green);">🟢 <span id="ll-k-gruen">0</span> gemeistert</span>
      </div>
      <div id="ll-k-card" onclick="this.classList.toggle('fl')" class="fw" style="cursor:pointer;margin-bottom:.875rem;height:160px;">
        <div class="fi2"><div class="ff">
          <div style="font-size:11px;color:var(--text3);margin-bottom:.5rem;">Frage (klicken = umdrehen)</div>
          <div style="font-size:20px;font-weight:700;" id="ll-k-vorne"></div>
        </div><div class="ff fb2">
          <div style="font-size:11px;color:var(--text3);margin-bottom:.5rem;">Antwort</div>
          <div style="font-size:20px;font-weight:700;color:var(--gold);" id="ll-k-hinten"></div>
        </div></div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn" onclick="llKarteWeiter(false)" style="flex:1;padding:12px;font-size:20px;" title="Nochmal">🔴</button>
        <button class="btn" onclick="llKarteWeiter(true)" style="flex:1;padding:12px;font-size:20px;" title="Gemeistert">🟢</button>
      </div>
    </div>`);
  el.scrollIntoView({behavior:'smooth',block:'start'});
}
function llAddKarte(){
  const f=document.getElementById('ll-k-frage')?.value.trim();
  const a=document.getElementById('ll-k-antwort')?.value.trim();
  if(!f||!a){toast('⚠️ Bitte beide Felder ausfüllen');return;}
  llKarten.push({frage:f,antwort:a,gruen:false});
  document.getElementById('ll-k-frage').value='';
  document.getElementById('ll-k-antwort').value='';
  llKarteIdx=llKarten.length-1;
  llKarteGruen=0;
  document.getElementById('ll-karten-deck').style.display='';
  llZeigeKarte();
  toast('✅ Karte hinzugefügt! ('+llKarten.length+' total)');
}
function llZeigeKarte(){
  if(!llKarten.length)return;
  const k=llKarten[llKarteIdx];
  const vorne=document.getElementById('ll-k-vorne');
  const hinten=document.getElementById('ll-k-hinten');
  const counter=document.getElementById('ll-k-counter');
  const gruen=document.getElementById('ll-k-gruen');
  const card=document.getElementById('ll-k-card');
  if(vorne)vorne.textContent=k.frage;
  if(hinten)hinten.textContent=k.antwort;
  if(counter)counter.textContent='Karte '+(llKarteIdx+1)+'/'+llKarten.length;
  if(gruen)gruen.textContent=llKarteGruen;
  if(card)card.classList.remove('fl');
}
function llKarteWeiter(gewusst){
  if(gewusst){llKarten[llKarteIdx].gruen=true;llKarteGruen=llKarten.filter(k=>k.gruen).length;addXP(3,'l','learn');}
  const nichtGewusst=llKarten.filter(k=>!k.gruen);
  if(!nichtGewusst.length){toast('🎉 Alle Karten gemeistert! +15 XP');addXP(15,'l','learn');return;}
  const next=nichtGewusst[Math.floor(Math.random()*nichtGewusst.length)];
  llKarteIdx=llKarten.indexOf(next);
  llZeigeKarte();
}

// ── MINDMAP (KI) ──
function llRenderMindmap(s, el) {
  el.innerHTML = llCard(s, `
    <div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:.5rem;">Thema eingeben → KI gibt Startstruktur</div>
    <div class="irow" style="margin-bottom:.875rem;">
      <input class="inp" id="ll-mm-thema" placeholder="z.B. Fotosynthese, Brüche, Mittelalter…"/>
      <button class="btn btn-p" onclick="llGenMindmap()">🗺️ Generieren</button>
    </div>
    <div id="ll-mm-out"></div>
    <div style="margin-top:.875rem;padding:10px;background:rgba(168,85,247,.06);border-radius:var(--r);font-size:12px;color:var(--text2);">
      <strong>Dann auf Papier:</strong> Schreibe das Thema in die Mitte. Füge eigene Äste hinzu. Verbinde verwandte Begriffe.
    </div>`);
  el.scrollIntoView({behavior:'smooth',block:'start'});
}
async function llGenMindmap(){
  const thema=document.getElementById('ll-mm-thema')?.value.trim();
  if(!thema){toast('⚠️ Thema eingeben');return;}
  const out=document.getElementById('ll-mm-out');
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){if(out)out.innerHTML='<div style="color:var(--gold);">⚠️ API-Schlüssel fehlt</div>';return;}
  if(out)out.innerHTML='<div class="sp" style="margin:1rem auto;width:28px;height:28px;border:3px solid var(--border);border-top-color:var(--purple);border-radius:50%;animation:spin 1s linear infinite;"></div>';
  const sys=`Erstelle eine Mindmap-Struktur zum Thema "${thema}" für einen Schweizer LP21-Schüler. 
Antworte NUR als JSON: {"zentrum":"${thema}","aste":[{"label":"Hauptast","farbe":"#3b82f6","unteraeste":["Begriff1","Begriff2","Begriff3"]},{"label":"Hauptast2","farbe":"#8b5cf6","unteraeste":["Begriff1","Begriff2"]},{"label":"Hauptast3","farbe":"#10b981","unteraeste":["Begriff1","Begriff2","Begriff3"]},{"label":"Hauptast4","farbe":"#f59e0b","unteraeste":["Begriff1","Begriff2"]}]}`;
  try{
    const raw=await claude([{role:'user',content:'Mindmap generieren.'}],sys);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    if(out)out.innerHTML=`<div style="padding:12px;background:var(--bg3);border-radius:var(--r);">
      <div style="text-align:center;font-size:18px;font-weight:800;color:var(--purple);margin-bottom:1rem;padding:8px;background:rgba(168,85,247,.1);border-radius:8px;">${d.zentrum}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${(d.aste||[]).map(a=>`<div style="padding:10px;background:${a.farbe}18;border:1.5px solid ${a.farbe}44;border-radius:8px;">
          <div style="font-size:12px;font-weight:700;color:${a.farbe};margin-bottom:6px;">${a.label}</div>
          ${(a.unteraeste||[]).map(u=>`<div style="font-size:11px;color:var(--text2);margin-bottom:2px;">• ${u}</div>`).join('')}
        </div>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:.75rem;text-align:center;">✏️ Jetzt auf Papier nachzeichnen und eigene Ideen ergänzen!</div>
    </div>`;
    addXP(10,'l','learn');
  }catch(e){if(out)out.innerHTML='<div style="color:var(--red);">Fehler: '+e.message+'</div>';}
}

// ── FEYNMAN / ERKLÄREN ──
function llRenderFeynman(s, el) {
  const zyklus=hsGetZyklus();
  const prompt=zyklus==='z1'?'Was habe ich heute gelernt?':'Erkläre das Thema so einfach wie möglich:';
  el.innerHTML = llCard(s, `
    <div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:.5rem;">${prompt}</div>
    <div class="irow" style="margin-bottom:.5rem;">
      <input class="inp" id="ll-fey-thema" placeholder="z.B. Brüche, Passé composé…"/>
    </div>
    <textarea class="warea" id="ll-fey-text" placeholder="${zyklus==='z1'?'Erzähle was du heute gelernt hast…':'Erkläre das Thema ohne Fachbegriffe. Was würdest du einer jüngeren Person sagen?'}" rows="4" style="resize:none;margin-bottom:.875rem;"></textarea>
    <button class="btn btn-p" onclick="llFeynmanCheck()" style="width:100%;padding:12px;">🔍 KI-Feedback erhalten</button>
    <div id="ll-fey-out" style="margin-top:.875rem;"></div>`);
  el.scrollIntoView({behavior:'smooth',block:'start'});
}
async function llFeynmanCheck(){
  const thema=document.getElementById('ll-fey-thema')?.value.trim();
  const text=document.getElementById('ll-fey-text')?.value.trim();
  if(!text||text.length<20){toast('⚠️ Bitte ausführlicher erklären');return;}
  const out=document.getElementById('ll-fey-out');
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){if(out)out.innerHTML='<div style="color:var(--gold);">⚠️ API-Schlüssel fehlt</div>';return;}
  if(out)out.innerHTML='<div class="sp" style="margin:1rem auto;width:28px;height:28px;border:3px solid var(--border);border-top-color:var(--green);border-radius:50%;animation:spin 1s linear infinite;"></div>';
  const zyklus=hsGetZyklus();
  const sys=`Du bist ein LP21-Lerncoach. Ein Kind (${zyklus.toUpperCase()}) hat folgendes erklärt${thema?' zum Thema "'+thema+'"':''}:
"${text}"
Gib konstruktives, ermutigtes Feedback auf Deutsch. Was war gut? Was fehlt noch? Maximal 3 kurze Punkte.
Format: {"gut":"Was war gut (1 Satz)","verbessern":"Was fehlt noch (1 Satz)","naechster_schritt":"Konkret was jetzt tun"}`;
  try{
    const raw=await claude([{role:'user',content:'Feedback.'}],sys);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    if(out)out.innerHTML=`<div style="display:flex;flex-direction:column;gap:8px;">
      <div style="padding:10px 14px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:var(--r);">
        <div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:3px;">✅ Was gut war</div>
        <div style="font-size:13px;">${d.gut}</div>
      </div>
      <div style="padding:10px 14px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.25);border-radius:var(--r);">
        <div style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:3px;">💡 Was noch fehlt</div>
        <div style="font-size:13px;">${d.verbessern}</div>
      </div>
      <div style="padding:10px 14px;background:rgba(56,189,248,.07);border:1px solid rgba(56,189,248,.25);border-radius:var(--r);">
        <div style="font-size:11px;font-weight:700;color:var(--blue);margin-bottom:3px;">→ Nächster Schritt</div>
        <div style="font-size:13px;">${d.naechster_schritt}</div>
      </div>
    </div>`;
    addXP(15,'l','learn');
  }catch(e){if(out)out.innerHTML='<div style="color:var(--red);">Fehler: '+e.message+'</div>';}
}

// ── RETRIEVAL PRACTICE (Z3) ──
function llRenderRetrieval(s, el) {
  el.innerHTML = llCard(s, `
    <div style="font-size:12px;color:var(--text2);margin-bottom:.875rem;">Buch zu! Schreibe alles auf was du zum Thema weisst — ohne nachzuschauen.</div>
    <input class="inp" id="ll-ret-thema" placeholder="Thema (z.B. Zweiter Weltkrieg, Quadratische Gleichungen…)" style="margin-bottom:.5rem;"/>
    <textarea class="warea" id="ll-ret-text" placeholder="Schreibe alles was du weisst… (ohne Unterlagen!)" rows="5" style="resize:none;margin-bottom:.875rem;"></textarea>
    <button class="btn btn-p" onclick="llRetrievalCheck()" style="width:100%;padding:12px;">📊 Vergleichen & Lücken finden</button>
    <div id="ll-ret-out" style="margin-top:.875rem;"></div>`);
  el.scrollIntoView({behavior:'smooth',block:'start'});
}
async function llRetrievalCheck(){
  const thema=document.getElementById('ll-ret-thema')?.value.trim();
  const text=document.getElementById('ll-ret-text')?.value.trim();
  if(!thema||!text){toast('⚠️ Thema und Antwort eingeben');return;}
  const out=document.getElementById('ll-ret-out');
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){if(out)out.innerHTML='<div style="color:var(--gold);">⚠️ API-Schlüssel fehlt</div>';return;}
  if(out)out.innerHTML='<div class="sp" style="margin:1rem auto;width:28px;height:28px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin 1s linear infinite;"></div>';
  const sys=`Du bist LP21-Lerncoach Z3. Thema: "${thema}". Schüler hat aus dem Gedächtnis geschrieben: "${text}".
Analysiere was richtig, was falsch und was fehlt. Antworte als JSON:
{"richtig":["Punkt1","Punkt2"],"fehlt":["wichtiges Konzept1","wichtiges Konzept2","wichtiges Konzept3"],"falsch":[],"score":"z.B. 7/10","empfehlung":"Was als nächstes lernen"}`;
  try{
    const raw=await claude([{role:'user',content:'Analysiere.'}],sys);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    if(out)out.innerHTML=`<div style="display:flex;flex-direction:column;gap:8px;">
      <div style="padding:10px 14px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:var(--r);">
        <div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:3px;">✅ Gewusst (${(d.richtig||[]).length})</div>
        ${(d.richtig||[]).map(r=>`<div style="font-size:12px;color:var(--text2);">• ${r}</div>`).join('')}
      </div>
      ${(d.falsch||[]).length?`<div style="padding:10px 14px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.25);border-radius:var(--r);">
        <div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:3px;">❌ Nicht ganz richtig</div>
        ${(d.falsch||[]).map(r=>`<div style="font-size:12px;color:var(--text2);">• ${r}</div>`).join('')}
      </div>`:''}
      <div style="padding:10px 14px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.25);border-radius:var(--r);">
        <div style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:3px;">📚 Vergessen / Lücken</div>
        ${(d.fehlt||[]).map(r=>`<div style="font-size:12px;color:var(--text2);">• ${r}</div>`).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg3);border-radius:var(--r);">
        <div style="font-size:24px;font-weight:800;color:var(--blue);">${d.score||'–'}</div>
        <div style="font-size:13px;color:var(--text2);">${d.empfehlung||''}</div>
      </div>
    </div>`;
    addXP(20,'l','learn');
  }catch(e){if(out)out.innerHTML='<div style="color:var(--red);">Fehler: '+e.message+'</div>';}
}

// ── ELABORATION (Z3) ──
function llRenderElaboration(s, el) {
  el.innerHTML = llCard(s, `
    <div style="font-size:12px;color:var(--text2);margin-bottom:.875rem;">Stelle dir Warum-Fragen und finde Verbindungen. Die KI stellt dir 5 Tiefenfragen zum Thema.</div>
    <div class="irow" style="margin-bottom:.875rem;">
      <input class="inp" id="ll-elab-thema" placeholder="Thema eingeben (z.B. Evolution, Demokratie, Funktionen)…"/>
      <button class="btn btn-p" onclick="llGenElaboration()">🔗 Fragen generieren</button>
    </div>
    <div id="ll-elab-out"></div>`);
  el.scrollIntoView({behavior:'smooth',block:'start'});
}
async function llGenElaboration(){
  const thema=document.getElementById('ll-elab-thema')?.value.trim();
  if(!thema){toast('⚠️ Thema eingeben');return;}
  const out=document.getElementById('ll-elab-out');
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){if(out)out.innerHTML='<div style="color:var(--gold);">⚠️ API-Schlüssel fehlt</div>';return;}
  if(out)out.innerHTML='<div class="sp" style="margin:1rem auto;width:28px;height:28px;border:3px solid var(--border);border-top-color:var(--purple);border-radius:50%;animation:spin 1s linear infinite;"></div>';
  const sys=`Erstelle 5 Tiefenfragen (Elaboration) zum Thema "${thema}" für einen Z3-Schüler (LP21). 
Die Fragen sollen Warum, Wie, Welche-Verbindung, Eigene-Beispiele, Anwendung abdecken.
JSON: {"fragen":[{"frage":"...","typ":"Warum|Wie|Verbindung|Beispiel|Anwendung"},{"frage":"...","typ":"..."},{"frage":"...","typ":"..."},{"frage":"...","typ":"..."},{"frage":"...","typ":"..."}]}`;
  try{
    const raw=await claude([{role:'user',content:'Generiere.'}],sys);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    if(out)out.innerHTML=`<div style="display:flex;flex-direction:column;gap:8px;">
      ${(d.fragen||[]).map((f,i)=>`<div style="padding:12px 14px;background:var(--bg3);border-radius:var(--r);border-left:3px solid var(--purple);">
        <div style="font-size:10px;font-weight:700;color:var(--purple);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">${f.typ}</div>
        <div style="font-size:13px;font-weight:600;margin-bottom:8px;">${f.frage}</div>
        <textarea class="inp" placeholder="Deine Antwort…" rows="2" style="resize:none;width:100%;font-size:12px;"></textarea>
      </div>`).join('')}
      <button class="btn btn-p" onclick="addXP(25,'l','learn');toast('✅ Elaboration abgeschlossen! +25 XP')" style="margin-top:.5rem;">✅ Fertig</button>
    </div>`;
  }catch(e){if(out)out.innerHTML='<div style="color:var(--red);">Fehler: '+e.message+'</div>';}
}

// ── Z1: Wiederholen ──
function llRenderWiederholen(s, el) {
  const btData=typeof BT_DATA!=='undefined'?BT_DATA:[];
  const today=btData[new Date().getDay()%btData.length]||{l:'A',w:'Apfel',e:'🍎'};
  el.innerHTML = llCard(s, `
    <div style="text-align:center;padding:1rem 0;">
      <div style="font-size:80px;">${today.e}</div>
      <div style="font-size:32px;font-weight:800;margin-top:.5rem;">${today.l}</div>
      <div style="font-size:18px;color:var(--text2);">${today.w}</div>
      <button class="btn btn-p" style="margin-top:1rem;padding:12px 28px;" onclick="speak('${today.l}. ${today.w}','de')">🔊 Hören</button>
    </div>
    <div style="display:flex;gap:8px;margin-top:.5rem;">
      <button class="btn" style="flex:1;padding:12px;font-size:16px;" onclick="nav('buchstaben')">🔤 Buchstaben üben</button>
      <button class="btn" style="flex:1;padding:12px;font-size:16px;" onclick="nav('zahlen-z1')">🔢 Zahlen üben</button>
    </div>`);
  el.scrollIntoView({behavior:'smooth',block:'start'});
}

// ── Z1: Erklären ──
function llRenderErklaeren(s, el) {
  el.innerHTML = llCard(s, `
    <div style="text-align:center;font-size:48px;margin:1rem 0;">🗣️</div>
    <div style="font-size:15px;text-align:center;margin-bottom:1rem;color:var(--text2);">Erkläre was du heute gelernt hast!</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button class="btn btn-p" style="padding:14px;font-size:15px;" onclick="speak('Was hast du heute gelernt?','de')">🔊 Frage vorlesen</button>
      <button class="btn" style="padding:14px;font-size:15px;" onclick="addXP(10,'l','learn');toast('⭐ Super erklärt! +10 XP')">⭐ Ich habe erklärt!</button>
    </div>`);
  el.scrollIntoView({behavior:'smooth',block:'start'});
}

// ── Z1: Malen ──
function llRenderMalen(s, el) {
  el.innerHTML = llCard(s, `
    <div style="text-align:center;font-size:64px;margin:1rem 0;">🎨</div>
    <div style="font-size:15px;text-align:center;margin-bottom:1.25rem;color:var(--text2);">Male auf Papier was du heute gelernt hast!</div>
    <div style="padding:12px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);border-radius:var(--r);font-size:13px;margin-bottom:1rem;">
      Buchstabe des Tages: <strong id="ll-mal-buchstabe">A</strong> — male ihn ganz gross!
    </div>
    <button class="btn btn-p" style="width:100%;padding:14px;font-size:15px;" onclick="addXP(10,'l','learn');toast('🎨 Super gemalt! +10 XP')">✅ Ich habe gemalt!</button>`);
  const b=typeof BT_DATA!=='undefined'?BT_DATA[new Date().getDay()%26]:{l:'A'};
  const el2=el.querySelector('#ll-mal-buchstabe');if(el2)el2.textContent=b.l;
  el.scrollIntoView({behavior:'smooth',block:'start'});
}

// ═══════════════════════════════════════════
// ETAPPE 1+2: ERFOLGSKONTROLLEN HS + ZEUGNIS PDF
// ═══════════════════════════════════════════

// ── Quintal-Abschluss: EK pro Fach starten ──
function hsRenderEKQuintalFaecher() {
  const el = document.getElementById('hs-ek-quintal-faecher'); if(!el) return;
  const zyklus = hsGetZyklus();
  const config  = JSON.parse(localStorage.getItem(HS_KEY_CONFIG)||'{}');
  const faecher = (HS_FAECHER[zyklus]||HS_FAECHER.z2).filter(f=>config[f.id]!==false&&!f.z3nur);
  const allEK   = JSON.parse(localStorage.getItem('edu_ek_results')||'[]');
  const q       = hsGetCurrentQuintal();
  const qStart  = q.start;
  // EK in diesem Quintal
  const qEK = allEK.filter(r => new Date(r.date) >= qStart);
  el.innerHTML = faecher.map(f => {
    const fachEK = qEK.filter(r => r.fachLbl && r.fachLbl.toLowerCase().includes(f.label.toLowerCase()));
    const done   = fachEK.length > 0;
    const avgNote = done ? (fachEK.reduce((s,r)=>s+r.note,0)/fachEK.length).toFixed(1) : null;
    const nc = avgNote ? (parseFloat(avgNote)>=4?'var(--green)':parseFloat(avgNote)>=3?'var(--gold)':'var(--red)') : 'var(--text3)';
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg3);border-radius:var(--r);">
      <span style="font-size:18px;">${f.icon}</span>
      <span style="font-size:13px;font-weight:600;flex:1;">${f.label}</span>
      ${done ? `<span style="font-size:16px;font-weight:800;color:${nc};">${avgNote}</span><span style="font-size:11px;color:var(--text3);">(${fachEK.length}×)</span>`
             : '<span style="font-size:11px;color:var(--text3);">noch keine EK</span>'}
    </div>`;
  }).join('');
}

function hsStarteEK() {
  nav('ek');
  // Zyklus automatisch setzen
  const zyklus = hsGetZyklus();
  const zMap = {z1:'Z1', z2:'Z2', z3:'Z3'};
  const sel = document.getElementById('ek-zyklus');
  if(sel && zMap[zyklus]) sel.value = zMap[zyklus];
  toast('📝 Wähle Fach und starte die Erfolgskontrolle');
}

// ── JSON Backup ──
function exportEKJson() {
  const all = JSON.parse(localStorage.getItem('edu_ek_results')||'[]');
  const tagebuch = JSON.parse(localStorage.getItem('hs_tageslog')||'[]');
  const data = { exportDatum: new Date().toISOString(), erfolgskontrollen: all, tageslog: tagebuch };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'EduPlatform_Backup_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  toast('💾 Backup gespeichert!');
}

// ── ZEUGNIS PDF (HTML-Print) ──
function exportZeugnisPDF() {
  const all = JSON.parse(localStorage.getItem('edu_ek_results')||'[]');
  if (!all.length) { toast('⚠️ Noch keine Erfolgskontrollen gespeichert'); return; }

  const now     = new Date();
  const schuljahr = now.getMonth() >= 7
    ? `${now.getFullYear()}/${now.getFullYear()+1}`
    : `${now.getFullYear()-1}/${now.getFullYear()}`;

  // Alle Profile die EK haben
  const profiles = [...new Set(all.map(r=>r.profileName||'–'))];

  // Halbjahr bestimmen
  const hj   = now.getMonth() >= 1 && now.getMonth() <= 6 ? 'hj2' : 'hj1';
  const hjLabel = hj === 'hj1' ? 'Halbjahr 1 (Aug–Feb)' : 'Halbjahr 2 (Mär–Jul)';
  const gefiltert = all.filter(r => r.hj === hj || true); // alle

  // Profil-spezifische Daten
  const zeugnisHTML = profiles.map(pName => {
    const pEK = gefiltert.filter(r=>(r.profileName||'–')===pName);
    if (!pEK.length) return '';
    const faecher = [...new Set(pEK.map(r=>r.fachLbl))];
    const avgGesamt = (pEK.reduce((s,r)=>s+r.note,0)/pEK.length).toFixed(1);
    const p = ST.profiles.find(pr=>pr.name===pName);
    const klasse = p?.level ? `${p.level}. Klasse` : '–';
    const zyklus = p?.type?.toUpperCase() || '–';

    const fachRows = faecher.map(fach => {
      const fachEK = pEK.filter(r=>r.fachLbl===fach);
      const avg = (fachEK.reduce((s,r)=>s+r.note,0)/fachEK.length).toFixed(1);
      const pct = Math.round(fachEK.reduce((s,r)=>s+r.pct,0)/fachEK.length);
      const note = parseFloat(avg);
      const noteColor = note>=5?'#16a34a':note>=4?'#2563eb':note>=3?'#d97706':'#dc2626';
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${fach}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${fachEK.length}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${pct}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:20px;font-weight:800;color:${noteColor};">${avg}</td>
      </tr>`;
    }).join('');

    const avgColor = parseFloat(avgGesamt)>=5?'#16a34a':parseFloat(avgGesamt)>=4?'#2563eb':parseFloat(avgGesamt)>=3?'#d97706':'#dc2626';

    return `
      <div style="page-break-after:always;padding:40px;font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;border-bottom:3px solid #1e3a5f;padding-bottom:20px;">
          <div>
            <div style="font-size:28px;font-weight:900;color:#1e3a5f;letter-spacing:-0.5px;">🎓 Zeugnis</div>
            <div style="font-size:14px;color:#64748b;margin-top:4px;">EduPlatform LP21 · Homeschooling</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;color:#64748b;">Schuljahr ${schuljahr}</div>
            <div style="font-size:13px;color:#64748b;">${hjLabel}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Ausgestellt: ${now.toLocaleDateString('de-CH',{day:'2-digit',month:'long',year:'numeric'})}</div>
          </div>
        </div>

        <!-- Kind -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:28px;display:flex;align-items:center;gap:20px;">
          <div style="font-size:48px;">👧</div>
          <div>
            <div style="font-size:22px;font-weight:800;color:#1e293b;">${pName}</div>
            <div style="font-size:14px;color:#64748b;margin-top:4px;">${klasse} · ${zyklus} · LP21</div>
          </div>
          <div style="margin-left:auto;text-align:center;">
            <div style="font-size:40px;font-weight:900;color:${avgColor};">${avgGesamt}</div>
            <div style="font-size:11px;color:#94a3b8;">Ø Gesamtnote</div>
          </div>
        </div>

        <!-- Noten-Tabelle -->
        <div style="margin-bottom:28px;">
          <div style="font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Beurteilung nach Fach</div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Fach</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Anzahl EK</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Ø Punkte</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Note</th>
              </tr>
            </thead>
            <tbody>${fachRows}</tbody>
          </table>
        </div>

        <!-- Notenskala -->
        <div style="display:flex;gap:8px;margin-bottom:28px;flex-wrap:wrap;">
          ${[[6,'#16a34a','Sehr gut'],[5,'#2563eb','Gut'],[4,'#0891b2','Genügend'],[3,'#d97706','Knapp'],[2,'#dc2626','Ungenügend'],[1,'#7f1d1d','Sehr schwach']]
            .map(([n,c,l])=>`<div style="display:flex;align-items:center;gap:4px;font-size:11px;color:#64748b;"><span style="font-weight:800;color:${c};">${n}</span> = ${l}</div>`).join(' · ')}
        </div>

        <!-- Lerntagebuch-Zusammenfassung -->
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:28px;">
          <div style="font-size:13px;font-weight:700;color:#166534;margin-bottom:8px;">📔 Lerntagebuch</div>
          ${(() => {
            const log = JSON.parse(localStorage.getItem('hs_tageslog')||'[]');
            const kindLog = log.filter(e=>e.gelernt&&e.gelernt!=='(Emoji-Reflexion)').slice(0,3);
            if (!kindLog.length) return '<div style="font-size:13px;color:#64748b;">Keine Einträge vorhanden.</div>';
            return kindLog.map(e=>`<div style="font-size:12px;color:#166534;margin-bottom:4px;">«${e.gelernt}» <span style="color:#94a3b8;">(${e.datum})</span></div>`).join('');
          })()}
        </div>

        <!-- Unterschrift -->
        <div style="display:flex;justify-content:space-between;margin-top:48px;padding-top:20px;border-top:1px solid #e5e7eb;">
          <div style="text-align:center;flex:1;">
            <div style="border-top:1px solid #94a3b8;width:180px;margin:0 auto 6px;"></div>
            <div style="font-size:11px;color:#94a3b8;">Erziehungsberechtigte/r</div>
          </div>
          <div style="text-align:center;flex:1;">
            <div style="border-top:1px solid #94a3b8;width:180px;margin:0 auto 6px;"></div>
            <div style="font-size:11px;color:#94a3b8;">Datum</div>
          </div>
        </div>

        <div style="margin-top:20px;padding:10px 14px;background:#f8fafc;border-radius:8px;font-size:10px;color:#94a3b8;">
          Dieses Zeugnis wurde durch EduPlatform LP21 (Homeschooling-Modul) generiert. Die Noten basieren auf KI-generierten Erfolgskontrollen nach LP21-Kompetenzbereichen.
        </div>
      </div>`;
  }).join('');

  // Print-Window öffnen
  const w = window.open('', '_blank', 'width=800,height=900');
  w.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Zeugnis ${schuljahr}</title>
    <style>
      body{margin:0;background:#fff;}
      @media print{@page{margin:0;size:A4;} body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    </style>
  </head><body>
    ${zeugnisHTML}
    <div style="text-align:center;padding:20px;">
      <button onclick="window.print()" style="padding:12px 28px;background:#1e3a5f;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer;font-weight:700;">🖨️ Drucken / Als PDF speichern</button>
    </div>
  </body></html>`);
  w.document.close();
  toast('📄 Zeugnis-Fenster geöffnet — drucke oder speichere als PDF');
}

// ── Hook: Quintal-EK Fächer rendern wenn Plan-View geöffnet ──

// ═══════════════════════════════════════════
// HS Back Bar (persistenter Zurück-Button)
let _hsActiveFromHS = false;  // true wenn aus HS-Tagesplan geöffnet
let _hsBackFachId   = '';
let _hsBackMiniTimer = null;

function hsNavFach(id, panel, icon, label) {
  // Aus Wochenplan oder Z1-Morgen: Fach öffnen + Back-Bar anzeigen
  _hsActiveFromHS  = true;
  _hsBackFachId    = id;
  window._hsCurrentFachId = id;
  // Back-Bar anzeigen
  const bar = document.getElementById('hs-back-bar');
  const nm  = document.getElementById('hs-back-fach-name');
  if (bar) bar.classList.add('on');
  if (nm)  nm.textContent = icon + ' ' + label;
  // Mini-Timer starten
  let secs = 0;
  clearInterval(_hsBackMiniTimer);
  _hsBackMiniTimer = setInterval(() => {
    secs++;
    const m = String(Math.floor(secs/60)).padStart(2,'0');
    const s = String(secs%60).padStart(2,'0');
    const te = document.getElementById('hs-back-timer-mini');
    if (te) te.textContent = m + ':' + s;
    // Auch Haupt-Timer mitführen
    hsTimerSeconds = secs;
  }, 1000);
  nav(panel);
}

function hsZurueckTagesplan() {
  clearInterval(_hsBackMiniTimer);
  const bar = document.getElementById('hs-back-bar');
  if (bar) bar.classList.remove('on');
  _hsActiveFromHS = false;
  nav('homeschool');
}

function hsBackFertig() {
  clearInterval(_hsBackMiniTimer);
  if (_hsBackFachId) hsMarkTodayDone(_hsBackFachId);
  const bar = document.getElementById('hs-back-bar');
  if (bar) bar.classList.remove('on');
  _hsActiveFromHS = false;
  nav('homeschool');
  toast('✅ ' + (_hsBackFachId||'Fach') + ' erledigt!');
  // Reflexion öffnen wenn Z1
  const zyklus = hsGetZyklus();
  if (zyklus === 'z1') {
    setTimeout(() => {
      document.getElementById('hs-z1-lernblock')?.style && (document.getElementById('hs-z1-lernblock').style.display = 'none');
      document.getElementById('hs-z1-morgen')?.style && (document.getElementById('hs-z1-morgen').style.display = 'none');
      document.getElementById('hs-z1-reflexion')?.style && (document.getElementById('hs-z1-reflexion').style.display = '');
      hsDiffPick = ''; hsStolzPick = '';
      document.querySelectorAll('.hs-diff-btn,.hs-stolz-btn').forEach(b => b.style.border = '2px solid var(--border)');
    }, 300);
  } else {
    setTimeout(() => hsLernblockFertig(), 300);
  }
}

function nav(name){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('on'));
  if(name==='profile') setTimeout(renderSjArchiv,50);
  if(name==='homeschool') setTimeout(hsInit, 50);
  // Hide HS back bar when going home
  if(!_hsActiveFromHS || name==='homeschool'){
    const bar=document.getElementById('hs-back-bar');
    if(bar&&name==='homeschool')bar.classList.remove('on');
  }
  if(name==='buchstaben') setTimeout(initBuchstaben, 50);
  if(name==='zahlen-z1')  setTimeout(initZahlen, 50);
  if(name==='sichtwort')  setTimeout(initSichtwort, 50);
  if(name==='vok-import') setTimeout(()=>{vokiShowTab('manuell');}, 50);
  if(name==='mathe-sek') setTimeout(()=>{msekShowTab('einheiten');msekRenderGrid();}, 50);
  if(name==='nmg') setTimeout(()=>{
    nmgShowTab('einheiten');
    const p=ST.profiles[ST.activeProfile];
    const z=p?.type==='z3'?'Z3':p?.type==='z2'?'Z2':'Z1';
    nmgActiveZyklus=z;
    document.querySelectorAll('#nmg-zyklus-filter2 .gram-lf-btn').forEach(b=>b.classList.remove('on'));
    const activeBtn=document.querySelector('#nmg-zyklus-filter2 [data-nz2="'+z+'"]');
    if(activeBtn)activeBtn.classList.add('on');
    nmgRenderEinheiten(z);
  }, 50);
  document.querySelectorAll('.si').forEach(b=>b.classList.remove('on'));
  const panel=document.getElementById('panel-'+name); if(panel)panel.classList.add('on');
  document.querySelectorAll('.si[data-p="'+name+'"]').forEach(b=>b.classList.add('on'));
  // Sprint 4: Niveau-Badge im Panel-Header aktualisieren
  updatePanelNiveauBadge(name);
  // Phase 2: Einheiten-Grid automatisch laden wenn Panel geöffnet wird
  if(name==='fr-main') buildEinheitenGrid('fr','fr-einheiten-grid');
  if(name==='it-main') buildEinheitenGrid('it','it-einheiten-grid');
  if(name==='es-main') buildEinheitenGrid('es','es-einheiten-grid');
  if(name==='daf-main') buildEinheitenGrid('de','de-einheiten-grid');
}

// Sprint 4: Zeigt aktuelles Niveau + Schwierigkeit im Panel-Header an
function updatePanelNiveauBadge(panelName) {
  const panel = document.getElementById('panel-' + panelName);
  if (!panel) return;
  const badge = panel.querySelector('.sprint4-niveau-badge');
  if (!badge) return;
  const zi = getZyklusInfo();
  const diff = ST.learning_state?.difficulty_offset ?? getAutoDiffForProfile();
  const baseNiv = zi.isAdult ? (zi.niveau||'B1') : (zi.niveau||'A1');
  const effNiv = getEffectiveNiveau(baseNiv, diff);
  const diffIco = diff === -1 ? '📗' : diff === 1 ? '📕' : '📘';
  const diffTxt = diff === -1 ? 'Einfach' : diff === 1 ? 'Fortgeschritten' : 'Standard';
  badge.textContent = `${diffIco} ${effNiv} · ${diffTxt}`;
  badge.style.display = '';
}

// ═══════════════════════════════════════════
// API CALL
// ═══════════════════════════════════════════
async function claude(messages,system){
  return claudeEx(messages,system,1400);
}
async function claudeEx(messages,system,maxTok){
  const key=ST.apiKey||localStorage.getItem("edu_api_key")||"";
  if(!key){toast("⚠️ Kein API-Schlüssel");throw new Error("No key");}
  const res=await fetch(API,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key":key,
      "anthropic-version":"2023-06-01",
      "anthropic-dangerous-direct-browser-access":"true"
    },
    body:JSON.stringify({model:MDL,max_tokens:maxTok||1400,system,messages})
  });
  if(!res.ok){const e=await res.json();throw new Error(e.error?.message||"API "+res.status);}
  const d=await res.json();
  return d.content.map(c=>c.text||"").join("");
}

function ctx(extra){
  const d=ST.learning_state.difficulty_offset;
  const dt=d===-1?'einfacher':d===1?'schwerer':'standard';
  // Phase 1c: Zyklus-Engine einbinden
  const zi=getZyklusInfo();
  const zyklusCtx=zi.isAdult
    ?`Erwachsener Lerner, Niveau ${zi.niveau}.`
    :`LP21 Zyklus ${zi.zyklus}, ${zi.label||''}, Sprachniveau ${zi.niveau}.`;
  return`Lerner: Niveau ${ST.user_config.level}, Sprache ${LANG_NAMES[ST.lang]||ST.lang}, Profil ${ST.user_config.profile_type}, Schwierigkeit ${dt}, ${zyklusCtx} Ausgangssprache Deutsch.${extra?'\n'+extra:''}`;
}

// ═══════════════════════════════════════════
// XP & BADGES
// ═══════════════════════════════════════════
function addXP(amt,sk,pk){
  ST.xp+=amt;ST.done++;
  if(sk&&ST.skills[sk]!==undefined)ST.skills[sk]=Math.min(100,ST.skills[sk]+Math.round(amt/2));
  if(pk&&ST.progress[pk]!==undefined)ST.progress[pk]=Math.min(100,ST.progress[pk]+Math.round(amt/3));
  saveProfile();updateTop();updateDash();checkBadges();
}

function checkBadges(){
  let nb=false;
  BADGES_DEF.forEach(b=>{if(!earnedBadges.includes(b.id)&&b.cond()){earnedBadges.push(b.id);nb=true;toast('🏅 Badge: '+b.name+'!');} });
  if(nb){saveProfile();renderBadges();}
}

function renderBadges(){
  const el=document.getElementById('badgegrid'); if(!el)return;
  el.innerHTML=BADGES_DEF.map(b=>{const e=earnedBadges.includes(b.id);return`<div class="badge ${e?'earned':'locked'}"><span style="font-size:20px;">${b.ico}</span><div><div style="font-size:13px;font-weight:700;">${b.name}</div><div style="font-size:11px;color:var(--text2);">${b.desc}</div></div></div>`}).join('');
}

// ═══════════════════════════════════════════
// TTS / STT
// ═══════════════════════════════════════════
function speak(text,lang,e){if(e)e.stopPropagation();if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=LANG_BCP[lang]||'en-US';u.rate=.88;window.speechSynthesis.speak(u);}

function startRec(lang,onRes,onEnd,stEl,micEl){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('⚠️ Spracheingabe benötigt Chrome/Edge');return null;}
  if(activeRec){try{activeRec.stop();}catch(e){}}
  const r=new SR();r.lang=LANG_BCP[lang]||'en-US';r.interimResults=true;
  r.onstart=()=>{if(micEl)micEl.classList.add('on');if(stEl){stEl.textContent='🔴 Ich höre...';stEl.className='micst act';}};
  r.onresult=(e)=>{const t=Array.from(e.results).map(x=>x[0].transcript).join('');if(onRes)onRes(t,e.results[e.results.length-1].isFinal);};
  r.onerror=()=>{if(micEl)micEl.classList.remove('on');if(stEl){stEl.textContent='';stEl.className='micst';}activeRec=null;};
  r.onend=()=>{if(micEl)micEl.classList.remove('on');if(stEl&&stEl.textContent.includes('höre')){stEl.textContent='';stEl.className='micst';}if(onEnd)onEnd();activeRec=null;};
  r.start();activeRec=r;return r;
}

function sp(){return'<div class="sp"><div class="sp-ring"></div><br>Laden...</div>';}

// ═══════════════════════════════════════════
// LERNPFAD
// ═══════════════════════════════════════════
const PATH_NODES=[
  {id:'h1',ico:'👂',t:'Grundwortschatz hören',panel:'hoeren',xp:20},
  {id:'l1',ico:'👁️',t:'Einfache Texte lesen',panel:'lesen',xp:20},
  {id:'s1',ico:'🗣️',t:'Sich vorstellen',panel:'sprechen',xp:25},
  {id:'w1',ico:'✍️',t:'Kurze Sätze schreiben',panel:'schreiben',xp:25},
  {id:'g1',ico:'📐',t:'Grundgrammatik',panel:'grammatik',xp:20},
  {id:'m1',ico:'🔢',t:'Mathe Z1: Addition',panel:'mathe-z1',xp:20},
  {id:'m2',ico:'➗',t:'Mathe Z2: Mal/Geteilt',panel:'mathe-z2',xp:25},
  {id:'h2',ico:'👂',t:'Dialoge verstehen',panel:'hoeren',xp:30},
  {id:'s2',ico:'🗣️',t:'Rollenspiel Alltag',panel:'rollenspiel',xp:35},
  {id:'w2',ico:'✍️',t:'E-Mail schreiben',panel:'schreiben',xp:35},
  {id:'kb',ico:'⌨️',t:'Tastatur-Grundreihe',panel:'tastatur',xp:30},
  {id:'s3',ico:'🗣️',t:'Präsentationen',panel:'sprechen',xp:45},
];

function buildPath(){
  const done=JSON.parse(localStorage.getItem('edu_path')||'[]');
  document.getElementById('pathgrid').innerHTML=PATH_NODES.map((n,i)=>{
    const isDone=done.includes(n.id),isAct=!isDone&&(i===0||done.includes(PATH_NODES[i-1]?.id)),locked=!isDone&&!isAct;
    return`<div class="pnode ${isDone?'done':isAct?'actn':'locked'}" data-pid="${n.id}" data-pp="${n.panel}" data-lk="${locked}">
      ${isDone?'<div class="pndot">✓</div>':''}
      <div style="font-size:22px;margin-bottom:5px;">${n.ico}</div>
      <div style="font-size:12px;font-weight:700;color:var(--text2);line-height:1.3;">${n.t}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px;">+${n.xp} XP</div>
    </div>`;
  }).join('');
  document.getElementById('pathgrid').addEventListener('click',function(e){
    const nd=e.target.closest('.pnode[data-pid]'); if(!nd)return;
    if(nd.dataset.lk==='true'){toast('🔒 Vorherige Aufgabe zuerst abschliessen!');return;}
    nav(nd.dataset.pp);
  });
}

// ═══════════════════════════════════════════
// LEVEL TEST
// ═══════════════════════════════════════════
async function startLT(){
  document.getElementById('lt-intro').style.display='none';
  document.getElementById('lt-result').style.display='none';
  document.getElementById('lt-quiz').style.display='block';
  ltIdx=0;ltScore=0;
  document.getElementById('ltprog').innerHTML=LT_LEVELS.map((_,i)=>`<div class="ltd" id="ltd${i}"></div>`).join('');
  document.getElementById('ltd0').classList.add('cur');
  await loadLTQ(0);
}

async function loadLTQ(idx){
  if(idx>=LT_LEVELS.length){showLTRes();return;}
  document.getElementById('ltq').innerHTML=sp();
  document.getElementById('ltopts').innerHTML='';
  document.getElementById('ltfb').textContent='';
  try{
    const raw=await claude([{role:'user',content:'Frage.'}],
      `Erstelle eine ${LANG_NAMES[ST.lang]||'Englisch'} Frage für Niveau ${LT_LEVELS[idx]}. Antworte NUR JSON: {"question":"...","options":["a","b","c","d"],"correct":0,"explanation":"Kurze Erklärung Deutsch"}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    document.getElementById('ltq').textContent=(idx+1)+'. '+d.question;
    document.getElementById('ltopts').innerHTML=d.options.map((o,i)=>
      `<button class="mcopt" data-a="${i}" data-c="${d.correct}" data-e="${d.explanation.replace(/"/g,"'")}">${o}</button>`
    ).join('');
    document.getElementById('ltopts').querySelectorAll('.mcopt').forEach(b=>{
      b.addEventListener('click',function(){answerLTQ(parseInt(this.dataset.a),parseInt(this.dataset.c),this.dataset.e,idx);});
    });
    for(let i=0;i<LT_LEVELS.length;i++){const dt=document.getElementById('ltd'+i);if(!dt)continue;dt.className='ltd'+(i<idx?' done':i===idx?' cur':'');}
  }catch(e){document.getElementById('ltq').textContent='Fehler – nächste...';setTimeout(()=>loadLTQ(idx+1),1000);}
}

function answerLTQ(ans,correct,expl,idx){
  document.getElementById('ltopts').querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
  const ok=ans===correct; if(ok)ltScore++;
  document.getElementById('ltopts').querySelectorAll('.mcopt')[ans].classList.add(ok?'ok':'no');
  if(!ok)document.getElementById('ltopts').querySelectorAll('.mcopt')[correct].classList.add('ok');
  document.getElementById('ltfb').textContent=expl;
  ltIdx=idx+1; setTimeout(()=>loadLTQ(ltIdx),1500);
}

function showLTRes(){
  document.getElementById('lt-quiz').style.display='none';
  document.getElementById('lt-result').style.display='block';
  const pct=Math.round((ltScore/LT_LEVELS.length)*100);
  ltDetected=['A1','A1','A2','A2','B1','B1','B2','C1','C1','C2'][Math.min(ltScore,9)];
  document.getElementById('ltrl').textContent=ltDetected;
  document.getElementById('ltrd').textContent=`${pct}% richtig · Empfehlung: ${ltDetected}`;
  document.getElementById('ltrb').style.width=pct+'%';
  document.getElementById('ltrs').textContent=`${ltScore}/${LT_LEVELS.length} Fragen richtig`;
  if(!earnedBadges.includes('ltdone')){earnedBadges.push('ltdone');saveProfile();checkBadges();}
}

function applyLT(){
  ST.user_config.level=ltDetected;
  const p=ST.profiles[ST.activeProfile];if(p){p.level=ltDetected;saveProfile();}
  updateTop();updateDash();toast('✅ Niveau auf '+ltDetected+' gesetzt!');nav('dashboard');
}

// ═══════════════════════════════════════════
// QUITALBRIEF 2.0
// ═══════════════════════════════════════════
async function runQuital(){
  const fach=document.getElementById('qfach').value;
  const topic=document.getElementById('qtopic').value.trim()||'Vokabeln';
  const diff=ST.learning_state.difficulty_offset;
  const doExt=document.getElementById('qdiffext').checked;
  const out=document.getElementById('qout');
  out.innerHTML=sp();
  ST.learning_state.current_topic=topic;
  // Punkt 5: Sachfächer immer Deutsch, Sprachfächer folgen Lernsprache
  const sachfaecher=['Mathematik','NMG','Informatik'];
  const fachSprache=sachfaecher.includes(fach)?'Deutsch (Sachfach — immer Deutsch unabhängig von Lernsprache)':'der gewählten Lernsprache ('+( LANG_NAMES[ST.lang]||ST.lang)+')';

  const diffLbl=diff===-1?'-1 (Wiederholung)':diff===1?'+1 (Fortgeschritten)':'0 (Standard)';
  const sys=`Du bist LP21-Lehrer. ${ctx()}
Fach: ${fach}. Thema: "${topic}". Schwierigkeit: ${diffLbl}. Antwortsprache: ${fachSprache}.
Erstelle:
1. Lückentext (4 Lücken [L1]–[L4])
2. MC (4 Fragen mit 4 Optionen)
3. Schreibaufgabe
${doExt?'4. Differenzierung: Zusatzaufgabe für starke Schüler (Transfer/Kreativ)':''}
Antworte NUR JSON:
{
  "title":"...",
  "gap":{"text":"Satz mit [L1]–[L4]","blanks":[{"id":1,"answer":"word","options":["a","b","c"]}]},
  "mc":{"questions":[{"q":"...","options":["a","b","c","d"],"correct":0}]},
  "write":{"task":"Aufgabe Deutsch","hint":"Tipp"},
  "competency":"LP21 Code"
  ${doExt?',"extra":{"title":"Zusatzaufgabe","task":"...","type":"kreativ|transfer|offen"}':""}
}`;
  try{
    const raw=await claude([{role:'user',content:'Generiere.'}],sys);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    let html=`<div class="card"><div class="ctitle">${d.title} <span class="tag tag-ai">Quintalbrief</span><span class="tag tag-lp">${d.competency||''}</span></div>`;

    // GAP
    html+=`<div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.625rem;">Lückentext</div>`;
    let gt=d.gap.text;
    d.gap.blanks.forEach(b=>{gt=gt.replace('[L'+b.id+']',mkBlank(b.answer,b.options));});
    html+=`<div class="stxt">${gt}</div>`;

    // MC
    html+=`<div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin:.875rem 0 .625rem;">Multiple Choice</div>`;
    d.mc.questions.forEach((q,qi)=>{
      html+=`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div>
        <div class="mcopts">${q.options.map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div></div>`;
    });

    // WRITE
    html+=`<div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin:.875rem 0 .625rem;">Schreiben</div>
      <div style="font-size:14px;color:var(--text2);padding:9px 12px;background:var(--bg3);border-radius:var(--r);margin-bottom:.5rem;">${d.write.task}</div>
      ${d.write.hint?`<div style="font-size:12px;color:var(--text3);margin-bottom:.5rem;">💡 ${d.write.hint}</div>`:''}
      <textarea class="warea" id="qwrite" placeholder="Deine Antwort..."></textarea>
      <div class="btn-row"><button class="btn btn-p" id="qwritechk">Prüfen ↗</button></div>
      <div id="qwritefb"></div>`;

    if(doExt&&d.extra){
      html+=`<div style="margin-top:1.25rem;padding:1rem;background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.2);border-radius:var(--r);">
        <div style="font-size:11px;font-weight:700;color:var(--purple);margin-bottom:.5rem;">🚀 ${d.extra.title}</div>
        <div style="font-size:14px;font-weight:600;">${d.extra.task}</div>
        <span class="tag" style="margin-top:5px;display:inline-block;background:rgba(168,85,247,.12);color:var(--purple);border:1px solid rgba(168,85,247,.2);">${d.extra.type}</span>
      </div>`;
    }
    html+=`</div>`;
    out.innerHTML=html;
    addXP(5,'l','learn');
    toast(`⚡ Übungen zu "${topic}" generiert!`);

    // Wire blanks
    wireBlankClick(out);
    // Wire MC
    out.querySelectorAll('.mcopts').forEach(opts=>{
      opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
        const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);
        opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
        if(i===c){this.classList.add('ok');addXP(5,'l','learn');toast('✅ Richtig!');}
        else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');toast('❌ Falsch.');}
      }));
    });
    // Wire write check
    document.getElementById('qwritechk').addEventListener('click',async()=>{
      const txt=document.getElementById('qwrite').value.trim(); if(!txt)return;
      const fb=document.getElementById('qwritefb'); fb.innerHTML=sp();
      try{
        const r2=await claude([{role:'user',content:'Bewerten.'}],
          `Aufgabe: "${d.write.task}". Text: "${txt}". ${ctx()} Antworte NUR JSON: {"score":0-100,"ok":true,"fb":"Feedback","tip":"Tipp"}`);
        const r=JSON.parse(r2.replace(/```json|```/g,'').trim());
        const col=r.score>=70?'var(--green)':r.score>=50?'var(--gold)':'var(--red)';
        fb.innerHTML=`<div class="rescard ${r.score>=70?'res-g':r.score>=50?'res-m':'res-b'}" style="margin-top:.75rem;">
          <div style="font-size:15px;font-weight:700;color:${col};">${r.ok?'✅':'⚠️'} ${r.score}/100</div>
          <div style="font-size:13px;margin-top:4px;">${r.fb}</div>
          ${r.tip?`<div style="font-size:12px;margin-top:4px;color:${col};">💡 ${r.tip}</div>`:''}
        </div>`;
        addXP(Math.round(r.score/10),'w','learn');
      }catch(e){fb.textContent='Fehler.';}
    });
  }catch(e){out.innerHTML=`<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`;}
}

// ── Blank options registry (avoids JSON in HTML attributes) ──
let _bidCtr=0;
const BLANK_MAP={};
function mkBlank(answer,options){
  const id='b'+(++_bidCtr);
  BLANK_MAP[id]=options;
  return `<span class="blank" data-ans="${answer.replace(/"/g,'&quot;')}" data-bid="${id}">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>`;
}
function wireBlankClick(container){
  container.querySelectorAll('.blank[data-bid]').forEach(el=>{
    el.addEventListener('click',()=>showGapDD(el));
  });
}

function showGapDD(el){
  const opts=BLANK_MAP[el.dataset.bid]||[],ans=el.dataset.ans;
  document.querySelectorAll('.gapdrop').forEach(d=>d.remove());
  const dd=document.createElement('span');dd.className='gapdrop';
  dd.style.cssText='display:inline-block;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);z-index:10;min-width:88px;vertical-align:top;box-shadow:var(--sh-lg);';
  opts.forEach(o=>{
    const it=document.createElement('span');it.style.cssText='display:block;padding:7px 13px;cursor:pointer;font-size:13px;font-weight:500;';it.textContent=o;
    it.addEventListener('mouseenter',()=>{it.style.background='var(--bg3)'});it.addEventListener('mouseleave',()=>{it.style.background=''});
    it.addEventListener('click',e=>{e.stopPropagation();el.textContent=o;
      if(o===ans){el.style.color='var(--green)';el.style.borderColor='var(--green)';addXP(3,'l','learn');toast('✅');}
      else{el.style.color='var(--red)';el.style.borderColor='var(--red)';setTimeout(()=>{el.innerHTML='&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';el.style.color='';el.style.borderColor='';},1200);toast('❌');}
      dd.remove();
    });dd.appendChild(it);
  });
  el.after(dd);setTimeout(()=>{try{dd.remove();}catch(e){}},5000);
}

// ═══════════════════════════════════════════
// HÖREN
// ═══════════════════════════════════════════
async function loadHT(){
  const el=document.getElementById('httext'),qel=document.getElementById('htqs');
  el.innerHTML=sp();qel.innerHTML='';htText='';
  try{
    const raw=await claude([{role:'user',content:'Erstelle.'}],
      `LP21-Lehrer. ${ctx()} Erstelle ${LANG_NAMES[ST.lang]} Hörtext (4–6 Sätze)+3 Fragen. NUR JSON: {"text":"...","questions":[{"q":"...","options":["a","b","c"],"correct":0}]}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    htText=d.text;el.textContent=d.text;
    qel.innerHTML='<div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin:.875rem 0 .5rem;">Verständnisfragen</div>'+
      d.questions.map((q,qi)=>`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div>
        <div class="mcopts">${q.options.map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div></div>`).join('');
    qel.querySelectorAll('.mcopts').forEach(opts=>{opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');addXP(10,'h','listen');toast('✅ Richtig! +10 XP');}else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');toast('❌');}
    }));});
    addXP(5,'h','listen');
  }catch(e){el.textContent='Fehler: '+e.message;}
}

// ═══════════════════════════════════════════
// LESEN
// ═══════════════════════════════════════════
async function loadStory(){
  const sb=document.getElementById('stbody'),mc=document.getElementById('stmc');
  sb.innerHTML=sp();mc.innerHTML='';
  try{
    const raw=await claude([{role:'user',content:'Erstelle.'}],
      `LP21-Lehrer. ${ctx()} Erstelle ${LANG_NAMES[ST.lang]} Geschichte (5–8 Sätze) mit 4 Lücken [B1]–[B4]+1 Frage. NUR JSON: {"title":"...","story":"...","blanks":[{"id":1,"answer":"word","options":["a","b","c"]}],"mc":{"q":"...","options":["a","b","c"],"correct":0}}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    let html=d.story;
    d.blanks.forEach(b=>{html=html.replace('[B'+b.id+']',mkBlank(b.answer,b.options));});
    sb.innerHTML=`<strong style="font-size:17px;">${d.title}</strong><br><br>`+html;
    wireBlankClick(sb);
    mc.innerHTML=`<div style="margin-top:.875rem;font-size:14px;font-weight:600;margin-bottom:5px;">${d.mc.q}</div>
      <div class="mcopts">${d.mc.options.map((o,i)=>`<button class="mcopt" data-i="${i}" data-c="${d.mc.correct}">${o}</button>`).join('')}</div>`;
    mc.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);mc.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');addXP(10,'l','learn');toast('✅ +10 XP');}else{this.classList.add('no');mc.querySelectorAll('.mcopt')[c].classList.add('ok');}
    }));
    addXP(8,'l','learn');
  }catch(e){sb.textContent='Fehler: '+e.message;}
}

// ═══════════════════════════════════════════
// SPRECHEN
// ═══════════════════════════════════════════
async function loadSpk(){
  document.getElementById('spktgt').textContent='...';document.getElementById('spkde').textContent='Wird geladen';
  document.getElementById('spktr').textContent='Deine Stimme...';document.getElementById('spkfb').innerHTML='';spkTarget=null;
  try{
    const raw=await claude([{role:'user',content:'Satz.'}],
      `${LANG_NAMES[ST.lang]} Satz zum Nachsprechen. ${ctx()} NUR JSON: {"sentence":"...","translation":"Deutsch"}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    spkTarget=d.sentence;document.getElementById('spktgt').textContent=d.sentence;document.getElementById('spkde').textContent=d.translation;
  }catch(e){document.getElementById('spktgt').textContent='Fehler.';}
}

let spkMicOn=false;
function toggleSpkMic(){
  if(!spkTarget){toast('⚠️ Bitte erst Satz laden');return;}
  if(spkMicOn){if(activeRec)activeRec.stop();spkMicOn=false;return;}
  spkMicOn=true;
  const micEl=document.getElementById('spkmic'),stEl=document.getElementById('spkst'),trEl=document.getElementById('spktr');
  let fin='';
  startRec(ST.lang,(t,isFinal)=>{trEl.textContent=t;if(isFinal)fin=t;},async()=>{spkMicOn=false;if(!fin)return;trEl.textContent=fin;await evalSpk(fin);},stEl,micEl);
}

async function evalSpk(spoken){
  const fb=document.getElementById('spkfb');fb.innerHTML=sp();
  try{
    const raw=await claude([{role:'user',content:'Bewerten.'}],
      `Aussprache: Ziel "${spkTarget}", gesprochen "${spoken}". ${ctx()} NUR JSON: {"score":0-100,"fb":"Deutsch","tip":"Tipp"}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    const col=d.score>=80?'var(--green)':d.score>=50?'var(--gold)':'var(--red)';
    fb.innerHTML=`<div class="rescard ${d.score>=80?'res-g':d.score>=50?'res-m':'res-b'}" style="margin-top:.75rem;">
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:7px;">
        <span style="font-size:22px;">${d.score>=80?'✅':d.score>=50?'⚠️':'❌'}</span>
        <div><div style="font-size:15px;font-weight:700;color:${col};">${d.score}/100</div>
        <div class="scbar" style="width:160px;"><div class="scfill" style="width:${d.score}%;background:${col};"></div></div></div>
      </div>
      <div style="font-size:14px;">${d.fb}</div>
      ${d.tip?`<div style="font-size:12px;color:${col};margin-top:4px;">💡 ${d.tip}</div>`:''}
    </div>`;
    if(d.score>=60)addXP(d.score>=80?15:8,'s','learn');
    document.getElementById('spkst').textContent='';
  }catch(e){fb.textContent='Fehler: '+e.message;}
}

// ═══════════════════════════════════════════
// SCHREIBEN
// ═══════════════════════════════════════════
async function loadWritePrompt(){
  const el=document.getElementById('wrprompt');el.textContent='Laden...';
  try{
    const raw=await claude([{role:'user',content:'Aufgabe.'}],
      `Schreibauftrag. ${ctx()} NUR JSON: {"task":"Aufgabe Deutsch","minWords":50,"genre":"Brief|E-Mail|Geschichte|Beschreibung"}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    el.innerHTML=`<strong>${d.genre}:</strong> ${d.task} <span style="font-size:12px;color:var(--text3);">(mind. ${d.minWords} Wörter)</span>`;
    document.getElementById('wrinput').value='';document.getElementById('wrfb').innerHTML='';
  }catch(e){el.textContent='Fehler.';}
}

async function checkWriting(){
  const txt=document.getElementById('wrinput').value.trim();if(!txt){toast('⚠️ Bitte erst schreiben');return;}
  const task=document.getElementById('wrprompt').textContent;
  const fb=document.getElementById('wrfb');fb.innerHTML=sp();
  try{
    const raw=await claude([{role:'user',content:'Bewerten.'}],
      `LP21+Cambridge Lehrer. Aufgabe: "${task}". Text: "${txt}". ${ctx()} NUR JSON: {"score":0-100,"grade":"A-F","content":"...","grammar":"...","vocab":"...","structure":"...","improved":"Beispiel"}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    const col=d.score>=70?'var(--green)':d.score>=50?'var(--gold)':'var(--red)';
    fb.innerHTML=`<div class="rescard ${d.score>=70?'res-g':d.score>=50?'res-m':'res-b'}" style="margin-top:.875rem;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:.875rem;">
        <div style="font-family:'DM Serif Display',serif;font-size:44px;color:${col};">${d.grade}</div>
        <div><div style="font-size:18px;font-weight:700;color:${col};">${d.score}/100</div>
        <div class="scbar" style="width:180px;"><div class="scfill" style="width:${d.score}%;background:${col};"></div></div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;font-size:13px;">
        <div><strong>📖</strong> ${d.content}</div><div><strong>📐</strong> ${d.grammar}</div>
        <div><strong>💬</strong> ${d.vocab}</div><div><strong>🏗️</strong> ${d.structure}</div>
      </div>
      ${d.improved?`<div style="margin-top:.625rem;padding:9px;background:var(--bg3);border-radius:var(--r);font-size:13px;"><strong>Beispiel:</strong> <em>${d.improved}</em></div>`:''}
    </div>`;
    addXP(Math.round(d.score/10),'w','learn');toast('✅ Note: '+d.grade);
  }catch(e){fb.textContent='Fehler: '+e.message;}
}

// ═══════════════════════════════════════════
// GRAMMATIK
// ═══════════════════════════════════════════
let gramMicOn=false;
function toggleGramMic(){
  if(gramMicOn){if(activeRec)activeRec.stop();gramMicOn=false;return;}
  gramMicOn=true;
  startRec('de-DE',(t)=>{document.getElementById('graminp').value=t;},()=>{gramMicOn=false;},
    document.getElementById('gramst'),document.getElementById('grammic'));
}
async function checkGram(){
  const inp=document.getElementById('graminp').value.trim();if(!inp)return;
  const res=document.getElementById('gramres');res.innerHTML=sp();
  try{
    const raw=await claude([{role:'user',content:inp}],
      `LP21-Grammatiklehrer ${LANG_NAMES[ST.lang]}. ${ctx()} Analysiere: "${inp}". NUR JSON: {"corrected":"...","errors":[{"wrong":"...","correct":"...","rule":"Regel","example":"Beispiel"}],"overall":"Feedback","lp21":"LP21-Code"}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    let html=`<strong>Korrigiert:</strong> <span style="color:var(--green);">${d.corrected}</span><br><br>`;
    if(d.errors?.length){d.errors.forEach(e=>{html+=`<span style="background:rgba(239,68,68,.15);color:var(--red);padding:1px 5px;border-radius:4px;">${e.wrong}</span> → <span style="background:rgba(34,197,94,.15);color:var(--green);padding:1px 5px;border-radius:4px;">${e.correct}</span><br><div style="margin-top:6px;padding:8px 12px;background:rgba(56,189,248,.07);border-radius:var(--r);font-size:13px;color:var(--blue);border-left:3px solid var(--blue2);">📌 ${e.rule}${e.example?`<br><em>${e.example}</em>`:''}</div>`;});}
    else{html+='<div style="padding:8px 12px;background:rgba(34,197,94,.07);border-radius:var(--r);color:var(--green);">✅ Keine Fehler!</div>';}
    html+=`<br><span style="font-size:13px;color:var(--text2);">${d.overall}</span>`;
    if(d.lp21)html+=`<br><span class="tag tag-lp" style="display:inline-block;margin-top:5px;">${d.lp21}</span>`;
    res.innerHTML=html;res.className='gram-res';addXP(8,'r','learn');
  }catch(e){res.textContent='Fehler: '+e.message;}
}
async function loadGramEx(){
  const topic=document.getElementById('gramtopic').value.trim()||'Present Simple';
  const el=document.getElementById('gramex');el.innerHTML=sp();
  try{
    const raw=await claude([{role:'user',content:'Generiere.'}],
      `LP21-Grammatik. Thema: "${topic}". ${ctx()} 5 Lückentext-Aufgaben. NUR JSON: {"title":"...","tasks":[{"sentence":"Satz mit [LÜCKE]","options":["a","b","c"],"correct":0,"rule":"Regel"}]}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    el.innerHTML=`<div style="font-size:14px;font-weight:700;margin-bottom:.75rem;">${d.title}</div>`+
      d.tasks.map((t,i)=>`<div style="margin-bottom:1.125rem;">
        <div style="font-size:14px;font-weight:600;margin-bottom:5px;">${i+1}. ${t.sentence.replace('[LÜCKE]','<span style="background:var(--bg3);padding:0 16px;border-radius:3px;">___</span>')}</div>
        <div class="mcopts">${t.options.map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${t.correct}" data-r="${t.rule.replace(/"/g,"'")}">${o}</button>`).join('')}</div>
      </div>`).join('');
    el.querySelectorAll('.mcopts').forEach(opts=>{opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');this.closest('.mcopts').insertAdjacentHTML('afterend',`<div style="padding:7px 11px;background:rgba(56,189,248,.07);border-radius:var(--r);font-size:13px;color:var(--blue);margin-bottom:.75rem;border-left:3px solid var(--blue2);">📌 ${this.dataset.r}</div>`);addXP(5,'r','learn');toast('✅');}
      else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    }));});
  }catch(e){el.textContent='Fehler: '+e.message;}
}

// ═══════════════════════════════════════════
// VOKABELN
// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// VOKABELTRAINER — LP21 Einheiten
// ═══════════════════════════════════════════
const VK_UNITS=[
  {id:1,title:'Begrüssung & Vorstellung',lp:'Z1·A1',icon:'👋'},
  {id:2,title:'Familie & Zuhause',lp:'Z1·A1',icon:'🏠'},
  {id:3,title:'Schule & Alltag',lp:'Z1/Z2·A1/A2',icon:'🏫'},
  {id:4,title:'Essen & Trinken',lp:'Z2·A2',icon:'🍽️'},
  {id:5,title:'Freizeit & Hobbys',lp:'Z2·A2',icon:'⚽'},
  {id:6,title:'Reisen & Verkehr',lp:'Z2/Z3·B1',icon:'✈️'},
  {id:7,title:'Natur & Umwelt',lp:'Z3·B1',icon:'🌿'},
  {id:8,title:'Gesundheit & Körper',lp:'Z3·B1/B2',icon:'🏥'},
  {id:9,title:'Beruf & Zukunft',lp:'Z3/Adult·B2',icon:'💼'},
  {id:10,title:'Gesellschaft & Kultur',lp:'Adult·B2/C1',icon:'🌍'},
];
// VKDB wird unten als separate Blöcke definiert (EN/FR/IT/ES)
// Format: VKDB[lang][unitIdx] = Array(40) von {w,p,tr,ex}
const VKDB={en:[],fr:[],it:[],es:[]};
const TRANCHE=10;

// ── VK Hilfsfunktionen ──
function getUnitPct(lang,unitIdx){
  const db=VKDB[lang];if(!db||!db[unitIdx]||!db[unitIdx].length)return 0;
  const prog=JSON.parse(localStorage.getItem('vk_prog_'+lang)||'{}');
  const unitProg=prog[unitIdx]||{};
  return Math.round(Object.values(unitProg).filter(Boolean).length/db[unitIdx].length*100);
}
function saveVKProgress(wordIdx,learned){
  const lang=ST.lang||'en';
  const globalIdx=vkTranche*TRANCHE+wordIdx;
  const key='vk_prog_'+lang;
  const prog=JSON.parse(localStorage.getItem(key)||'{}');
  if(!prog[vkUnit])prog[vkUnit]={};
  prog[vkUnit][globalIdx]=learned;
  localStorage.setItem(key,JSON.stringify(prog));
  sbSaveVocabWord(lang, vkUnit, globalIdx, learned); // → Supabase
}
function buildVKUnitGrid(){
  const lang=ST.lang||'en';const db=VKDB[lang];
  if(!db||!db.length||!db[0]||!db[0].length){
    document.getElementById('vk-unit-grid').innerHTML='<div style="color:var(--text3);font-size:13px;grid-column:1/-1;">Datenbasis wird geladen…</div>';
    document.getElementById('vk-tranche-grid').innerHTML='';return;
  }
  document.getElementById('vk-unit-grid').innerHTML=VK_UNITS.map((u,i)=>{
    const pct=getUnitPct(lang,i);const isActive=i===vkUnit;
    return `<button onclick="selectVKUnit(${i},0)" style="padding:8px 4px;border:2px solid ${isActive?'var(--blue)':'var(--border)'};border-radius:var(--r);background:${isActive?'rgba(56,189,248,.12)':'var(--bg3)'};font-size:11px;font-weight:700;color:${isActive?'var(--blue)':'var(--text2)'};cursor:pointer;line-height:1.3;transition:all .15s;">
      <div style="font-size:16px;margin-bottom:2px;">${u.icon}</div>
      <div>${i+1}</div>
      ${pct>0?`<div style="font-size:9px;color:${pct>=100?'var(--green)':'var(--text3)'};">${pct}%</div>`:''}
    </button>`;
  }).join('');
}
function buildVKTrancheGrid(unitIdx){
  const lang=ST.lang||'en';const db=VKDB[lang];
  if(!db||!db[unitIdx]||!db[unitIdx].length){document.getElementById('vk-tranche-grid').innerHTML='';return;}
  const total=db[unitIdx].length;const numT=Math.ceil(total/TRANCHE);
  const prog=JSON.parse(localStorage.getItem('vk_prog_'+lang)||'{}');
  const unitProg=prog[unitIdx]||{};
  document.getElementById('vk-tranche-grid').innerHTML=Array.from({length:numT},(_,ti)=>{
    const start=ti*TRANCHE,end=Math.min(start+TRANCHE,total);
    const done=Array.from({length:end-start},(_,wi)=>unitProg[start+wi]).filter(Boolean).length;
    const isActive=ti===vkTranche;
    return `<button onclick="selectVKUnit(${unitIdx},${ti})" style="padding:5px 10px;border:2px solid ${isActive?'var(--blue)':'var(--border)'};border-radius:8px;font-size:11px;font-weight:700;background:${isActive?'rgba(56,189,248,.12)':'var(--bg3)'};color:${isActive?'var(--blue)':'var(--text2)'};cursor:pointer;transition:all .15s;">
      ${ti*TRANCHE+1}–${end}${done===end-start?' ✓':''}
    </button>`;
  }).join('');
}
function selectVKUnit(unitIdx,trancheIdx){
  vkUnit=unitIdx;vkTranche=trancheIdx;
  const lang=ST.lang||'en';const db=VKDB[lang];
  if(!db||!db[unitIdx]||!db[unitIdx].length){vkList=[];return;}
  const start=trancheIdx*TRANCHE;const end=Math.min(start+TRANCHE,db[unitIdx].length);
  vkList=db[unitIdx].slice(start,end);
  vkIdx=0;vkLearned=0;vkStreak=0;vkFlipped=false;
  document.getElementById('vk-unit-complete').style.display='none';
  document.getElementById('vkcard').style.display='';
  document.getElementById('vkflip').style.display='flex';
  document.getElementById('vkbtns').style.display='none';
  const u=VK_UNITS[unitIdx];
  document.getElementById('vk-unit-lbl').textContent='Einheit '+u.id+': '+u.title;
  document.getElementById('vk-ph-title').textContent='📇 '+u.icon+' '+u.title;
  document.getElementById('vkt').textContent=vkList.length;
  document.getElementById('vk-unitdone').textContent=getUnitPct(lang,unitIdx)+'%';
  buildVKUnitGrid();buildVKTrancheGrid(unitIdx);updVK();showVK();
}
function loadVK(){buildVKUnitGrid();selectVKUnit(0,0);}
function showVK(){
  document.getElementById('vk-unit-complete').style.display='none';
  if(vkIdx>=vkList.length){
    document.getElementById('vkcard').style.display='none';
    document.getElementById('vkflip').style.display='none';
    document.getElementById('vkbtns').style.display='none';
    document.getElementById('vk-unit-complete').style.display='block';
    const pct=Math.round(vkLearned/vkList.length*100);
    document.getElementById('vk-complete-msg').textContent=vkLearned+'/'+vkList.length+' Wörter gemerkt ('+pct+'%) · '+VK_UNITS[vkUnit].title;
    document.getElementById('vk-unitdone').textContent=getUnitPct(ST.lang||'en',vkUnit)+'%';
    buildVKUnitGrid();buildVKTrancheGrid(vkUnit);addXP(vkLearned*2,null,'learn');return;
  }
  const v=vkList[vkIdx];
  document.getElementById('vkcard').style.display='';
  document.getElementById('vkw').textContent=v.w;
  document.getElementById('vkp').textContent=v.p;
  document.getElementById('vktr').textContent=v.tr;
  document.getElementById('vkex').textContent=v.ex;
  document.getElementById('vkcard').classList.remove('fl');vkFlipped=false;
  document.getElementById('vkbtns').style.display='none';
  document.getElementById('vkflip').style.display='flex';updVK();
}
function flipVK(){
  document.getElementById('vkcard').classList.toggle('fl');vkFlipped=!vkFlipped;
  document.getElementById('vkbtns').style.display=vkFlipped?'flex':'none';
  document.getElementById('vkflip').style.display=vkFlipped?'none':'flex';
}
function rateVK(ok){
  saveVKProgress(vkIdx,ok);
  if(ok){vkLearned++;vkStreak++;addXP(3,null,'learn');toast('✓ +3 XP');}
  else{vkStreak=0;}
  vkIdx++;updVK();showVK();
}
function updVK(){
  document.getElementById('vkl').textContent=vkLearned;
  document.getElementById('vks').textContent=vkStreak;
  document.getElementById('vkprog').style.width=(vkList.length>0?Math.round(vkIdx/vkList.length*100):0)+'%';
  document.getElementById('vkt').textContent=vkList.length;
}
// ── VKDB Datenbasis (folgt unten) ──

// EN Units 1-5
VKDB.en[0]=[{w:'hello',p:'Ausruf',tr:'Hallo',ex:'Hello! My name is Tim.'},{w:'goodbye',p:'Ausruf',tr:'Auf Wiedersehen',ex:'Goodbye! See you tomorrow.'},{w:'please',p:'Adv.',tr:'bitte',ex:'Can I have water, please?'},{w:'thank you',p:'Ausruf',tr:'Danke',ex:'Thank you for your help.'},{w:'sorry',p:'Ausruf',tr:'Entschuldigung',ex:'Sorry, I am late.'},{w:'yes',p:'Adv.',tr:'ja',ex:'Yes, I understand.'},{w:'no',p:'Adv.',tr:'nein',ex:'No, that is wrong.'},{w:'name',p:'Nomen',tr:'Name',ex:'My name is Lena.'},{w:'age',p:'Nomen',tr:'Alter',ex:'My age is ten years.'},{w:'from',p:'Präp.',tr:'aus / von',ex:'I am from Switzerland.'},{w:'nice to meet you',p:'Ausdruck',tr:'Freut mich',ex:'Nice to meet you!'},{w:'how are you',p:'Ausdruck',tr:'Wie geht es dir?',ex:'How are you today?'},{w:'fine',p:'Adj.',tr:'gut / prima',ex:'I am fine, thank you.'},{w:'what',p:'Fragewort',tr:'was',ex:'What is your name?'},{w:'where',p:'Fragewort',tr:'wo / woher',ex:'Where are you from?'},{w:'how old',p:'Ausdruck',tr:'wie alt',ex:'How old are you?'},{w:'live',p:'Verb',tr:'wohnen / leben',ex:'I live in Basel.'},{w:'speak',p:'Verb',tr:'sprechen',ex:'I speak German and English.'},{w:'learn',p:'Verb',tr:'lernen',ex:'I learn English at school.'},{w:'understand',p:'Verb',tr:'verstehen',ex:'I do not understand.'},{w:'again',p:'Adv.',tr:'nochmal / wieder',ex:'Can you say that again?'},{w:'slowly',p:'Adv.',tr:'langsam',ex:'Please speak slowly.'},{w:'friend',p:'Nomen',tr:'Freund / Freundin',ex:'This is my friend Sara.'},{w:'class',p:'Nomen',tr:'Klasse',ex:'We are in class 4.'},{w:'teacher',p:'Nomen',tr:'Lehrer / Lehrerin',ex:'My teacher is very nice.'},{w:'student',p:'Nomen',tr:'Schüler / Schülerin',ex:'She is a good student.'},{w:'school',p:'Nomen',tr:'Schule',ex:'I go to school every day.'},{w:'country',p:'Nomen',tr:'Land',ex:'Switzerland is a small country.'},{w:'language',p:'Nomen',tr:'Sprache',ex:'English is a world language.'},{w:'spell',p:'Verb',tr:'buchstabieren',ex:'Can you spell your name?'},{w:'introduce',p:'Verb',tr:'vorstellen',ex:'Let me introduce myself.'},{w:'nationality',p:'Nomen',tr:'Nationalität',ex:'My nationality is Swiss.'},{w:'address',p:'Nomen',tr:'Adresse',ex:'My address is in Zurich.'},{w:'phone number',p:'Nomen',tr:'Telefonnummer',ex:'What is your phone number?'},{w:'email',p:'Nomen',tr:'E-Mail',ex:'Send me an email!'},{w:'nice',p:'Adj.',tr:'nett / schön',ex:'What a nice day!'},{w:'happy',p:'Adj.',tr:'glücklich / froh',ex:'I am happy to meet you.'},{w:'welcome',p:'Ausruf',tr:'willkommen',ex:'Welcome to our school!'},{w:'question',p:'Nomen',tr:'Frage',ex:'Do you have a question?'},{w:'answer',p:'Nomen',tr:'Antwort',ex:'The answer is correct.'}];
VKDB.en[1]=[{w:'mother',p:'Nomen',tr:'Mutter',ex:'My mother works at home.'},{w:'father',p:'Nomen',tr:'Vater',ex:'My father is a doctor.'},{w:'sister',p:'Nomen',tr:'Schwester',ex:'I have one sister.'},{w:'brother',p:'Nomen',tr:'Bruder',ex:'My brother is eight years old.'},{w:'grandmother',p:'Nomen',tr:'Grossmutter',ex:'My grandmother bakes cakes.'},{w:'grandfather',p:'Nomen',tr:'Grossvater',ex:'My grandfather reads the newspaper.'},{w:'parents',p:'Nomen pl.',tr:'Eltern',ex:'My parents are kind.'},{w:'family',p:'Nomen',tr:'Familie',ex:'My family has four members.'},{w:'child',p:'Nomen',tr:'Kind',ex:'She is a happy child.'},{w:'baby',p:'Nomen',tr:'Baby',ex:'The baby is sleeping.'},{w:'house',p:'Nomen',tr:'Haus',ex:'We live in a big house.'},{w:'flat',p:'Nomen',tr:'Wohnung',ex:'We have a flat in the city.'},{w:'room',p:'Nomen',tr:'Zimmer',ex:'My room is on the top floor.'},{w:'bedroom',p:'Nomen',tr:'Schlafzimmer',ex:'The bedroom is quiet.'},{w:'kitchen',p:'Nomen',tr:'Küche',ex:'We eat in the kitchen.'},{w:'living room',p:'Nomen',tr:'Wohnzimmer',ex:'The living room is cosy.'},{w:'bathroom',p:'Nomen',tr:'Badezimmer',ex:'The bathroom is clean.'},{w:'garden',p:'Nomen',tr:'Garten',ex:'We play in the garden.'},{w:'door',p:'Nomen',tr:'Tür',ex:'Please close the door.'},{w:'window',p:'Nomen',tr:'Fenster',ex:'Open the window, please.'},{w:'table',p:'Nomen',tr:'Tisch',ex:'The book is on the table.'},{w:'chair',p:'Nomen',tr:'Stuhl',ex:'Sit on the chair.'},{w:'bed',p:'Nomen',tr:'Bett',ex:'I go to bed at nine.'},{w:'sofa',p:'Nomen',tr:'Sofa',ex:'The cat sits on the sofa.'},{w:'lamp',p:'Nomen',tr:'Lampe',ex:'Turn on the lamp.'},{w:'big',p:'Adj.',tr:'gross',ex:'The house is very big.'},{w:'small',p:'Adj.',tr:'klein',ex:'My room is small.'},{w:'old',p:'Adj.',tr:'alt',ex:'This is an old building.'},{w:'new',p:'Adj.',tr:'neu',ex:'We have a new flat.'},{w:'clean',p:'Adj.',tr:'sauber',ex:'Keep your room clean.'},{w:'uncle',p:'Nomen',tr:'Onkel',ex:'My uncle lives in Bern.'},{w:'aunt',p:'Nomen',tr:'Tante',ex:'My aunt has two cats.'},{w:'cousin',p:'Nomen',tr:'Cousin / Cousine',ex:'My cousin is funny.'},{w:'pet',p:'Nomen',tr:'Haustier',ex:'We have a pet dog.'},{w:'dog',p:'Nomen',tr:'Hund',ex:'The dog is sleeping.'},{w:'cat',p:'Nomen',tr:'Katze',ex:'The cat drinks milk.'},{w:'live together',p:'Verb',tr:'zusammenwohnen',ex:'We live together in Zurich.'},{w:'neighbour',p:'Nomen',tr:'Nachbar / Nachbarin',ex:'Our neighbour is friendly.'},{w:'upstairs',p:'Adv.',tr:'oben',ex:'The bedroom is upstairs.'},{w:'downstairs',p:'Adv.',tr:'unten',ex:'The kitchen is downstairs.'}];
VKDB.en[2]=[{w:'lesson',p:'Nomen',tr:'Stunde / Lektion',ex:'The lesson starts at eight.'},{w:'subject',p:'Nomen',tr:'Fach',ex:'Maths is my favourite subject.'},{w:'homework',p:'Nomen',tr:'Hausaufgaben',ex:'I do my homework after school.'},{w:'test',p:'Nomen',tr:'Test / Prüfung',ex:'We have a test on Friday.'},{w:'mark',p:'Nomen',tr:'Note',ex:'I got a good mark.'},{w:'pencil',p:'Nomen',tr:'Bleistift',ex:'Can I borrow your pencil?'},{w:'rubber',p:'Nomen',tr:'Radiergummi',ex:'I need a rubber.'},{w:'ruler',p:'Nomen',tr:'Lineal',ex:'Use a ruler to draw a line.'},{w:'notebook',p:'Nomen',tr:'Heft',ex:'Write in your notebook.'},{w:'bag',p:'Nomen',tr:'Tasche / Rucksack',ex:'My bag is very heavy.'},{w:'timetable',p:'Nomen',tr:'Stundenplan',ex:'Check your timetable.'},{w:'break',p:'Nomen',tr:'Pause',ex:'We play during break.'},{w:'canteen',p:'Nomen',tr:'Mensa',ex:'We eat in the canteen.'},{w:'gym',p:'Nomen',tr:'Turnhalle',ex:'We have PE in the gym.'},{w:'library',p:'Nomen',tr:'Bibliothek',ex:'Borrow a book from the library.'},{w:'read',p:'Verb',tr:'lesen',ex:'I read every evening.'},{w:'write',p:'Verb',tr:'schreiben',ex:'Write your name on the paper.'},{w:'listen',p:'Verb',tr:'zuhören',ex:'Listen to the teacher carefully.'},{w:'speak',p:'Verb',tr:'sprechen',ex:'Speak louder, please.'},{w:'repeat',p:'Verb',tr:'wiederholen',ex:'Please repeat the sentence.'},{w:'morning',p:'Nomen',tr:'Morgen',ex:'I wake up in the morning.'},{w:'afternoon',p:'Nomen',tr:'Nachmittag',ex:'School ends in the afternoon.'},{w:'evening',p:'Nomen',tr:'Abend',ex:'I read in the evening.'},{w:'night',p:'Nomen',tr:'Nacht',ex:'Good night!'},{w:'early',p:'Adv.',tr:'früh',ex:'I get up early.'},{w:'late',p:'Adv.',tr:'spät',ex:'Do not be late!'},{w:'always',p:'Adv.',tr:'immer',ex:'I always do my homework.'},{w:'sometimes',p:'Adv.',tr:'manchmal',ex:'Sometimes I forget my pencil.'},{w:'never',p:'Adv.',tr:'nie',ex:'I never cheat in tests.'},{w:'often',p:'Adv.',tr:'oft',ex:'I often walk to school.'},{w:'get up',p:'Verb',tr:'aufstehen',ex:'I get up at seven.'},{w:'have breakfast',p:'Verb',tr:'frühstücken',ex:'I have breakfast at home.'},{w:'go to school',p:'Verb',tr:'in die Schule gehen',ex:'I go to school by bus.'},{w:'come home',p:'Verb',tr:'nach Hause kommen',ex:'I come home at four.'},{w:'go to bed',p:'Verb',tr:'ins Bett gehen',ex:'I go to bed at nine.'},{w:'brush teeth',p:'Verb',tr:'Zähne putzen',ex:'Brush your teeth twice a day.'},{w:'wash',p:'Verb',tr:'waschen',ex:'Wash your hands.'},{w:'dress',p:'Verb',tr:'anziehen',ex:'Dress quickly in the morning.'},{w:'tidy up',p:'Verb',tr:'aufräumen',ex:'Tidy up your room.'},{w:'help',p:'Verb',tr:'helfen',ex:'Can you help me?'}];
VKDB.en[3]=[{w:'bread',p:'Nomen',tr:'Brot',ex:'I eat bread for breakfast.'},{w:'butter',p:'Nomen',tr:'Butter',ex:'Add butter to the bread.'},{w:'cheese',p:'Nomen',tr:'Käse',ex:'Swiss cheese is famous.'},{w:'milk',p:'Nomen',tr:'Milch',ex:'Children drink milk.'},{w:'egg',p:'Nomen',tr:'Ei',ex:'I eat an egg every morning.'},{w:'apple',p:'Nomen',tr:'Apfel',ex:'An apple a day is healthy.'},{w:'banana',p:'Nomen',tr:'Banane',ex:'Bananas give you energy.'},{w:'orange',p:'Nomen',tr:'Orange',ex:'I drink orange juice.'},{w:'vegetable',p:'Nomen',tr:'Gemüse',ex:'Eat more vegetables!'},{w:'potato',p:'Nomen',tr:'Kartoffel',ex:'We have potatoes for dinner.'},{w:'meat',p:'Nomen',tr:'Fleisch',ex:'I do not eat much meat.'},{w:'fish',p:'Nomen',tr:'Fisch',ex:'Fish is healthy.'},{w:'rice',p:'Nomen',tr:'Reis',ex:'Rice is eaten worldwide.'},{w:'pasta',p:'Nomen',tr:'Pasta / Nudeln',ex:'Pasta is my favourite food.'},{w:'soup',p:'Nomen',tr:'Suppe',ex:'Hot soup warms you up.'},{w:'salad',p:'Nomen',tr:'Salat',ex:'I have a salad for lunch.'},{w:'cake',p:'Nomen',tr:'Kuchen',ex:'My grandmother bakes great cake.'},{w:'chocolate',p:'Nomen',tr:'Schokolade',ex:'Swiss chocolate is the best.'},{w:'water',p:'Nomen',tr:'Wasser',ex:'Drink two litres of water daily.'},{w:'juice',p:'Nomen',tr:'Saft',ex:'I have apple juice at breakfast.'},{w:'hungry',p:'Adj.',tr:'hungrig',ex:'I am very hungry.'},{w:'thirsty',p:'Adj.',tr:'durstig',ex:'Are you thirsty?'},{w:'delicious',p:'Adj.',tr:'lecker / köstlich',ex:'This soup is delicious.'},{w:'sweet',p:'Adj.',tr:'süss',ex:'This cake is too sweet.'},{w:'salty',p:'Adj.',tr:'salzig',ex:'Chips are very salty.'},{w:'hot',p:'Adj.',tr:'heiss',ex:'The soup is very hot.'},{w:'cold',p:'Adj.',tr:'kalt',ex:'I like cold drinks.'},{w:'cook',p:'Verb',tr:'kochen',ex:'My mother cooks every evening.'},{w:'eat',p:'Verb',tr:'essen',ex:'We eat lunch at twelve.'},{w:'drink',p:'Verb',tr:'trinken',ex:'Drink water after sport.'},{w:'breakfast',p:'Nomen',tr:'Frühstück',ex:'Breakfast is the most important meal.'},{w:'lunch',p:'Nomen',tr:'Mittagessen',ex:'I have lunch at school.'},{w:'dinner',p:'Nomen',tr:'Abendessen',ex:'Dinner is at seven.'},{w:'snack',p:'Nomen',tr:'Snack / Znüni',ex:'I eat a snack after school.'},{w:'recipe',p:'Nomen',tr:'Rezept',ex:'Follow the recipe step by step.'},{w:'ingredient',p:'Nomen',tr:'Zutat',ex:'What ingredients do we need?'},{w:'taste',p:'Verb',tr:'schmecken / kosten',ex:'Taste the sauce!'},{w:'order',p:'Verb',tr:'bestellen',ex:'I order a pizza.'},{w:'menu',p:'Nomen',tr:'Speisekarte',ex:'Can I see the menu, please?'},{w:'restaurant',p:'Nomen',tr:'Restaurant',ex:'We eat in a restaurant on Sundays.'}];
VKDB.en[4]=[{w:'hobby',p:'Nomen',tr:'Hobby',ex:'My hobby is painting.'},{w:'sport',p:'Nomen',tr:'Sport',ex:'I do sport three times a week.'},{w:'football',p:'Nomen',tr:'Fussball',ex:'I play football with friends.'},{w:'swimming',p:'Nomen',tr:'Schwimmen',ex:'Swimming is good for the body.'},{w:'cycling',p:'Nomen',tr:'Radfahren / Velo',ex:'Cycling is fun and healthy.'},{w:'music',p:'Nomen',tr:'Musik',ex:'I listen to music every day.'},{w:'reading',p:'Nomen',tr:'Lesen',ex:'Reading is my favourite hobby.'},{w:'drawing',p:'Nomen',tr:'Zeichnen',ex:'She loves drawing animals.'},{w:'dancing',p:'Nomen',tr:'Tanzen',ex:'Dancing makes you happy.'},{w:'cooking',p:'Nomen',tr:'Kochen',ex:'I enjoy cooking with my family.'},{w:'cinema',p:'Nomen',tr:'Kino',ex:'We go to the cinema on Saturdays.'},{w:'theatre',p:'Nomen',tr:'Theater',ex:'The theatre play was amazing.'},{w:'museum',p:'Nomen',tr:'Museum',ex:'We visited a history museum.'},{w:'park',p:'Nomen',tr:'Park',ex:'I walk in the park after school.'},{w:'concert',p:'Nomen',tr:'Konzert',ex:'The concert was fantastic.'},{w:'team',p:'Nomen',tr:'Team / Mannschaft',ex:'I am in a football team.'},{w:'match',p:'Nomen',tr:'Spiel / Match',ex:'We won the match!'},{w:'practise',p:'Verb',tr:'üben',ex:'I practise the guitar daily.'},{w:'win',p:'Verb',tr:'gewinnen',ex:'Our team always wins.'},{w:'lose',p:'Verb',tr:'verlieren',ex:'It is okay to lose sometimes.'},{w:'free time',p:'Nomen',tr:'Freizeit',ex:'I love my free time.'},{w:'weekend',p:'Nomen',tr:'Wochenende',ex:'What do you do at weekends?'},{w:'holiday',p:'Nomen',tr:'Ferien',ex:'Summer holidays are in July.'},{w:'enjoy',p:'Verb',tr:'geniessen / mögen',ex:'I enjoy playing chess.'},{w:'exciting',p:'Adj.',tr:'aufregend / spannend',ex:'The match was very exciting.'},{w:'boring',p:'Adj.',tr:'langweilig',ex:'I find chess boring.'},{w:'favourite',p:'Adj.',tr:'Lieblings-',ex:'My favourite sport is tennis.'},{w:'together',p:'Adv.',tr:'zusammen',ex:'We play together every Saturday.'},{w:'outdoors',p:'Adv.',tr:'draussen',ex:'I love being outdoors.'},{w:'indoors',p:'Adv.',tr:'drinnen',ex:'On rainy days I stay indoors.'},{w:'instrument',p:'Nomen',tr:'Instrument',ex:'I play a musical instrument.'},{w:'guitar',p:'Nomen',tr:'Gitarre',ex:'She plays the guitar very well.'},{w:'piano',p:'Nomen',tr:'Klavier',ex:'I take piano lessons.'},{w:'club',p:'Nomen',tr:'Verein / Club',ex:'I am in a sports club.'},{w:'training',p:'Nomen',tr:'Training',ex:'Football training is on Tuesday.'},{w:'collect',p:'Verb',tr:'sammeln',ex:'I collect stamps.'},{w:'paint',p:'Verb',tr:'malen',ex:'She paints beautiful pictures.'},{w:'photograph',p:'Verb',tr:'fotografieren',ex:'I photograph nature.'},{w:'volunteer',p:'Verb',tr:'sich freiwillig engagieren',ex:'She volunteers at a shelter.'},{w:'relax',p:'Verb',tr:'entspannen',ex:'I relax by reading books.'}];

// EN Units 6-10
VKDB.en[5]=[{w:'travel',p:'Verb / Nomen',tr:'reisen / Reise',ex:'I love to travel by train.'},{w:'trip',p:'Nomen',tr:'Ausflug / Reise',ex:'We had a great school trip.'},{w:'journey',p:'Nomen',tr:'Fahrt / Reise',ex:'The journey took three hours.'},{w:'passport',p:'Nomen',tr:'Pass',ex:'Show me your passport, please.'},{w:'ticket',p:'Nomen',tr:'Ticket / Billett',ex:'I bought a train ticket.'},{w:'luggage',p:'Nomen',tr:'Gepäck',ex:'My luggage is too heavy.'},{w:'hotel',p:'Nomen',tr:'Hotel',ex:'We stayed in a nice hotel.'},{w:'airport',p:'Nomen',tr:'Flughafen',ex:'We arrived at the airport early.'},{w:'train station',p:'Nomen',tr:'Bahnhof',ex:'Meet me at the train station.'},{w:'platform',p:'Nomen',tr:'Gleis / Perron',ex:'The train leaves from platform 4.'},{w:'departure',p:'Nomen',tr:'Abfahrt',ex:'Departure is at ten o clock.'},{w:'arrival',p:'Nomen',tr:'Ankunft',ex:'Arrival in Zurich at noon.'},{w:'delay',p:'Nomen',tr:'Verspätung',ex:'There is a delay of twenty minutes.'},{w:'booking',p:'Nomen',tr:'Buchung',ex:'I made a hotel booking online.'},{w:'map',p:'Nomen',tr:'Karte / Plan',ex:'Use the map to find your way.'},{w:'direction',p:'Nomen',tr:'Richtung',ex:'Go in the right direction.'},{w:'straight on',p:'Ausdruck',tr:'geradeaus',ex:'Go straight on for two blocks.'},{w:'turn left',p:'Ausdruck',tr:'links abbiegen',ex:'Turn left at the traffic lights.'},{w:'turn right',p:'Ausdruck',tr:'rechts abbiegen',ex:'Turn right after the bridge.'},{w:'far',p:'Adj.',tr:'weit',ex:'Is it far from here?'},{w:'near',p:'Adj.',tr:'nah',ex:'The station is near the hotel.'},{w:'bus',p:'Nomen',tr:'Bus',ex:'Take bus number twelve.'},{w:'tram',p:'Nomen',tr:'Tram',ex:'The tram stops here.'},{w:'underground',p:'Nomen',tr:'U-Bahn',ex:'The underground is fast.'},{w:'taxi',p:'Nomen',tr:'Taxi',ex:'Take a taxi to the airport.'},{w:'plane',p:'Nomen',tr:'Flugzeug',ex:'The plane lands at noon.'},{w:'boat',p:'Nomen',tr:'Schiff / Boot',ex:'We took a boat on the lake.'},{w:'bicycle',p:'Nomen',tr:'Fahrrad / Velo',ex:'I go to school by bicycle.'},{w:'car',p:'Nomen',tr:'Auto',ex:'My parents drive a small car.'},{w:'on foot',p:'Ausdruck',tr:'zu Fuss',ex:'I go to school on foot.'},{w:'exchange',p:'Verb',tr:'tauschen / wechseln',ex:'Where can I exchange money?'},{w:'currency',p:'Nomen',tr:'Währung',ex:'The Swiss currency is the franc.'},{w:'customs',p:'Nomen',tr:'Zoll',ex:'We went through customs.'},{w:'souvenir',p:'Nomen',tr:'Souvenir',ex:'I bought a souvenir for my mum.'},{w:'sightseeing',p:'Nomen',tr:'Sightseeing',ex:'We went sightseeing in Rome.'},{w:'recommend',p:'Verb',tr:'empfehlen',ex:'Can you recommend a restaurant?'},{w:'check in',p:'Verb',tr:'einchecken',ex:'We check in at the hotel.'},{w:'check out',p:'Verb',tr:'auschecken',ex:'Check out before eleven.'},{w:'reservation',p:'Nomen',tr:'Reservierung',ex:'I have a reservation for two.'},{w:'tour guide',p:'Nomen',tr:'Reiseleiter / in',ex:'The tour guide speaks four languages.'}];
VKDB.en[6]=[{w:'environment',p:'Nomen',tr:'Umwelt',ex:'We must protect the environment.'},{w:'nature',p:'Nomen',tr:'Natur',ex:'I love spending time in nature.'},{w:'forest',p:'Nomen',tr:'Wald',ex:'The forest is full of animals.'},{w:'mountain',p:'Nomen',tr:'Berg',ex:'Switzerland has many mountains.'},{w:'lake',p:'Nomen',tr:'See',ex:'We swim in the lake.'},{w:'river',p:'Nomen',tr:'Fluss',ex:'The river Rhine is long.'},{w:'ocean',p:'Nomen',tr:'Ozean / Meer',ex:'Plastic pollutes the ocean.'},{w:'island',p:'Nomen',tr:'Insel',ex:'Sardinia is a beautiful island.'},{w:'climate',p:'Nomen',tr:'Klima',ex:'Climate change is a big problem.'},{w:'weather',p:'Nomen',tr:'Wetter',ex:'The weather is sunny today.'},{w:'temperature',p:'Nomen',tr:'Temperatur',ex:'The temperature is dropping.'},{w:'rain',p:'Nomen',tr:'Regen',ex:'There will be rain tomorrow.'},{w:'snow',p:'Nomen',tr:'Schnee',ex:'Children play in the snow.'},{w:'wind',p:'Nomen',tr:'Wind',ex:'A strong wind is blowing.'},{w:'cloud',p:'Nomen',tr:'Wolke',ex:'Dark clouds are coming.'},{w:'sun',p:'Nomen',tr:'Sonne',ex:'The sun is shining brightly.'},{w:'storm',p:'Nomen',tr:'Sturm',ex:'A storm hit the city last night.'},{w:'pollution',p:'Nomen',tr:'Verschmutzung',ex:'Air pollution is a serious problem.'},{w:'recycling',p:'Nomen',tr:'Recycling',ex:'Recycling helps the environment.'},{w:'energy',p:'Nomen',tr:'Energie',ex:'Solar energy is clean.'},{w:'protect',p:'Verb',tr:'schützen',ex:'We must protect our forests.'},{w:'save',p:'Verb',tr:'sparen / retten',ex:'Save water every day.'},{w:'reduce',p:'Verb',tr:'reduzieren',ex:'Reduce plastic waste.'},{w:'reuse',p:'Verb',tr:'wiederverwenden',ex:'Reuse glass bottles.'},{w:'recycle',p:'Verb',tr:'recyceln',ex:'Recycle paper and plastic.'},{w:'plant',p:'Verb',tr:'pflanzen',ex:'We planted a tree in the garden.'},{w:'endangered',p:'Adj.',tr:'gefährdet',ex:'Many animals are endangered.'},{w:'extinct',p:'Adj.',tr:'ausgestorben',ex:'The dodo is extinct.'},{w:'sustainable',p:'Adj.',tr:'nachhaltig',ex:'We need sustainable solutions.'},{w:'global warming',p:'Nomen',tr:'Erderwärmung',ex:'Global warming melts the glaciers.'},{w:'fossil fuel',p:'Nomen',tr:'fossiler Brennstoff',ex:'We burn too many fossil fuels.'},{w:'renewable',p:'Adj.',tr:'erneuerbar',ex:'Renewable energy is the future.'},{w:'solar panel',p:'Nomen',tr:'Solaranlage',ex:'Solar panels produce electricity.'},{w:'flood',p:'Nomen',tr:'Überschwemmung',ex:'Floods can destroy villages.'},{w:'drought',p:'Nomen',tr:'Dürre',ex:'A drought killed the crops.'},{w:'deforestation',p:'Nomen',tr:'Abholzung',ex:'Deforestation destroys habitats.'},{w:'biodiversity',p:'Nomen',tr:'Artenvielfalt',ex:'Biodiversity is essential for life.'},{w:'habitat',p:'Nomen',tr:'Lebensraum',ex:'Polar bears lose their habitat.'},{w:'carbon',p:'Nomen',tr:'Kohlenstoff / CO2',ex:'Reduce your carbon footprint.'},{w:'emission',p:'Nomen',tr:'Emission / Ausstoss',ex:'Emissions must be reduced.'}];
VKDB.en[7]=[{w:'health',p:'Nomen',tr:'Gesundheit',ex:'Health is the most important thing.'},{w:'body',p:'Nomen',tr:'Körper',ex:'Exercise is good for your body.'},{w:'head',p:'Nomen',tr:'Kopf',ex:'My head hurts.'},{w:'hand',p:'Nomen',tr:'Hand',ex:'Wash your hands before eating.'},{w:'arm',p:'Nomen',tr:'Arm',ex:'She broke her arm.'},{w:'leg',p:'Nomen',tr:'Bein',ex:'My leg is sore.'},{w:'stomach',p:'Nomen',tr:'Magen / Bauch',ex:'I have a stomach ache.'},{w:'back',p:'Nomen',tr:'Rücken',ex:'My back hurts after sitting.'},{w:'throat',p:'Nomen',tr:'Hals',ex:'I have a sore throat.'},{w:'eye',p:'Nomen',tr:'Auge',ex:'She has green eyes.'},{w:'doctor',p:'Nomen',tr:'Arzt / Ärztin',ex:'I went to the doctor yesterday.'},{w:'hospital',p:'Nomen',tr:'Spital / Krankenhaus',ex:'She stayed in hospital for two days.'},{w:'medicine',p:'Nomen',tr:'Medizin / Medikament',ex:'Take this medicine twice a day.'},{w:'appointment',p:'Nomen',tr:'Termin',ex:'I have a doctor appointment.'},{w:'pain',p:'Nomen',tr:'Schmerz',ex:'The pain was very strong.'},{w:'fever',p:'Nomen',tr:'Fieber',ex:'She has a high fever.'},{w:'cold',p:'Nomen',tr:'Erkältung',ex:'I have a cold this week.'},{w:'cough',p:'Nomen',tr:'Husten',ex:'The cough is getting better.'},{w:'allergy',p:'Nomen',tr:'Allergie',ex:'I have a pollen allergy.'},{w:'emergency',p:'Nomen',tr:'Notfall',ex:'Call 144 in an emergency.'},{w:'healthy',p:'Adj.',tr:'gesund',ex:'Eat healthy food every day.'},{w:'ill',p:'Adj.',tr:'krank',ex:'I was ill last week.'},{w:'tired',p:'Adj.',tr:'müde',ex:'I am very tired today.'},{w:'stressed',p:'Adj.',tr:'gestresst',ex:'Exams make me stressed.'},{w:'fit',p:'Adj.',tr:'fit / gesund',ex:'Sport keeps you fit.'},{w:'exercise',p:'Verb / Nomen',tr:'Sport machen / Übung',ex:'Exercise for 30 minutes daily.'},{w:'sleep',p:'Verb',tr:'schlafen',ex:'Sleep at least eight hours.'},{w:'rest',p:'Verb',tr:'ausruhen',ex:'Rest when you are ill.'},{w:'recover',p:'Verb',tr:'erholen / genesen',ex:'She recovered quickly.'},{w:'hurt',p:'Verb',tr:'wehtun / verletzen',ex:'My knee hurts.'},{w:'nutrition',p:'Nomen',tr:'Ernährung',ex:'Good nutrition is essential.'},{w:'vitamin',p:'Nomen',tr:'Vitamin',ex:'Fruit contains many vitamins.'},{w:'hygiene',p:'Nomen',tr:'Hygiene',ex:'Personal hygiene prevents illness.'},{w:'vaccine',p:'Nomen',tr:'Impfung',ex:'Get your vaccine on time.'},{w:'surgery',p:'Nomen',tr:'Operation',ex:'The surgery was successful.'},{w:'mental health',p:'Nomen',tr:'psychische Gesundheit',ex:'Mental health is just as important.'},{w:'stress',p:'Nomen',tr:'Stress',ex:'Too much stress is unhealthy.'},{w:'balance',p:'Nomen',tr:'Balance / Gleichgewicht',ex:'Find a balance between work and rest.'},{w:'symptom',p:'Nomen',tr:'Symptom',ex:'Describe your symptoms to the doctor.'},{w:'treatment',p:'Nomen',tr:'Behandlung',ex:'The treatment takes two weeks.'}];
VKDB.en[8]=[{w:'job',p:'Nomen',tr:'Beruf / Stelle',ex:'My mother has a good job.'},{w:'work',p:'Verb / Nomen',tr:'arbeiten / Arbeit',ex:'She works in a hospital.'},{w:'career',p:'Nomen',tr:'Karriere',ex:'He has a great career ahead.'},{w:'salary',p:'Nomen',tr:'Gehalt / Lohn',ex:'A good salary is important.'},{w:'interview',p:'Nomen',tr:'Bewerbungsgespräch',ex:'I have a job interview tomorrow.'},{w:'apply',p:'Verb',tr:'sich bewerben',ex:'I applied for the position.'},{w:'CV',p:'Nomen',tr:'Lebenslauf',ex:'Write a clear CV.'},{w:'qualification',p:'Nomen',tr:'Qualifikation',ex:'He has many qualifications.'},{w:'apprenticeship',p:'Nomen',tr:'Lehre',ex:'She is doing an apprenticeship.'},{w:'university',p:'Nomen',tr:'Universität',ex:'He studies at university.'},{w:'engineer',p:'Nomen',tr:'Ingenieur / in',ex:'She is a software engineer.'},{w:'nurse',p:'Nomen',tr:'Krankenpfleger / in',ex:'The nurse was very helpful.'},{w:'lawyer',p:'Nomen',tr:'Anwalt / Anwältin',ex:'He became a successful lawyer.'},{w:'architect',p:'Nomen',tr:'Architekt / in',ex:'The architect designed a museum.'},{w:'entrepreneur',p:'Nomen',tr:'Unternehmer / in',ex:'She is a young entrepreneur.'},{w:'employee',p:'Nomen',tr:'Angestellte / r',ex:'The company has 200 employees.'},{w:'employer',p:'Nomen',tr:'Arbeitgeber / in',ex:'My employer is very fair.'},{w:'colleague',p:'Nomen',tr:'Kollege / Kollegin',ex:'My colleagues are friendly.'},{w:'meeting',p:'Nomen',tr:'Sitzung / Meeting',ex:'We have a meeting at nine.'},{w:'deadline',p:'Nomen',tr:'Termin / Frist',ex:'The deadline is on Friday.'},{w:'goal',p:'Nomen',tr:'Ziel',ex:'Set clear goals for your future.'},{w:'ambition',p:'Nomen',tr:'Ehrgeiz / Ambition',ex:'She has great ambition.'},{w:'skill',p:'Nomen',tr:'Fähigkeit / Kompetenz',ex:'Communication is a key skill.'},{w:'experience',p:'Nomen',tr:'Erfahrung',ex:'Work experience is valuable.'},{w:'responsibility',p:'Nomen',tr:'Verantwortung',ex:'This job has a lot of responsibility.'},{w:'team work',p:'Nomen',tr:'Teamarbeit',ex:'Team work makes the dream work.'},{w:'creative',p:'Adj.',tr:'kreativ',ex:'Be creative in problem solving.'},{w:'motivated',p:'Adj.',tr:'motiviert',ex:'She is highly motivated.'},{w:'flexible',p:'Adj.',tr:'flexibel',ex:'The job requires a flexible person.'},{w:'achieve',p:'Verb',tr:'erreichen / erzielen',ex:'She achieved excellent results.'},{w:'promote',p:'Verb',tr:'befördern',ex:'He was promoted to manager.'},{w:'retire',p:'Verb',tr:'in Rente gehen',ex:'She will retire at 65.'},{w:'volunteer',p:'Nomen',tr:'Freiwillige / r',ex:'Many volunteers help in the community.'},{w:'internship',p:'Nomen',tr:'Praktikum',ex:'He did an internship in Zurich.'},{w:'remote work',p:'Nomen',tr:'Homeoffice',ex:'Remote work is very common now.'},{w:'automation',p:'Nomen',tr:'Automatisierung',ex:'Automation changes the job market.'},{w:'digital skills',p:'Nomen',tr:'digitale Kompetenzen',ex:'Digital skills are essential today.'},{w:'network',p:'Verb',tr:'vernetzen',ex:'Network with professionals in your field.'},{w:'leadership',p:'Nomen',tr:'Führung / Leadership',ex:'Good leadership inspires the team.'},{w:'pension',p:'Nomen',tr:'Rente / Pension',ex:'Save for your pension early.'}];
VKDB.en[9]=[{w:'society',p:'Nomen',tr:'Gesellschaft',ex:'A fair society benefits everyone.'},{w:'culture',p:'Nomen',tr:'Kultur',ex:'Swiss culture is very diverse.'},{w:'tradition',p:'Nomen',tr:'Tradition',ex:'Every country has its traditions.'},{w:'democracy',p:'Nomen',tr:'Demokratie',ex:'Switzerland is a direct democracy.'},{w:'government',p:'Nomen',tr:'Regierung',ex:'The government passed a new law.'},{w:'law',p:'Nomen',tr:'Gesetz',ex:'Obey the law.'},{w:'rights',p:'Nomen pl.',tr:'Rechte',ex:'Every person has human rights.'},{w:'equality',p:'Nomen',tr:'Gleichheit',ex:'Equality is a fundamental value.'},{w:'freedom',p:'Nomen',tr:'Freiheit',ex:'Freedom of speech is important.'},{w:'vote',p:'Verb',tr:'abstimmen / wählen',ex:'Citizens vote in elections.'},{w:'media',p:'Nomen',tr:'Medien',ex:'The media influences opinions.'},{w:'internet',p:'Nomen',tr:'Internet',ex:'The internet connects the world.'},{w:'social media',p:'Nomen',tr:'soziale Medien',ex:'Social media can be addictive.'},{w:'fake news',p:'Nomen',tr:'Falschinformationen',ex:'Fake news spreads quickly online.'},{w:'globalisation',p:'Nomen',tr:'Globalisierung',ex:'Globalisation changes economies.'},{w:'migration',p:'Nomen',tr:'Migration',ex:'Migration is a complex topic.'},{w:'integration',p:'Nomen',tr:'Integration',ex:'Integration helps newcomers settle in.'},{w:'poverty',p:'Nomen',tr:'Armut',ex:'Fighting poverty is a global goal.'},{w:'inequality',p:'Nomen',tr:'Ungleichheit',ex:'Income inequality is rising.'},{w:'prejudice',p:'Nomen',tr:'Vorurteil',ex:'Challenge your own prejudices.'},{w:'tolerance',p:'Nomen',tr:'Toleranz',ex:'Tolerance makes society peaceful.'},{w:'respect',p:'Nomen',tr:'Respekt',ex:'Show respect for others.'},{w:'solidarity',p:'Nomen',tr:'Solidarität',ex:'Solidarity is key in difficult times.'},{w:'conflict',p:'Nomen',tr:'Konflikt',ex:'Dialogue helps resolve conflicts.'},{w:'peace',p:'Nomen',tr:'Frieden',ex:'We must work for peace.'},{w:'justice',p:'Nomen',tr:'Gerechtigkeit',ex:'Justice must be fair for all.'},{w:'protest',p:'Verb / Nomen',tr:'protestieren / Protest',ex:'People protested in the street.'},{w:'debate',p:'Verb / Nomen',tr:'debattieren / Debatte',ex:'There was a heated debate.'},{w:'opinion',p:'Nomen',tr:'Meinung',ex:'Everyone has the right to an opinion.'},{w:'argument',p:'Nomen',tr:'Argument',ex:'Give strong arguments in the debate.'},{w:'generation',p:'Nomen',tr:'Generation',ex:'Each generation faces new challenges.'},{w:'value',p:'Nomen',tr:'Wert',ex:'Honesty is an important value.'},{w:'identity',p:'Nomen',tr:'Identität',ex:'Language shapes our identity.'},{w:'minority',p:'Nomen',tr:'Minderheit',ex:'Minority rights must be protected.'},{w:'majority',p:'Nomen',tr:'Mehrheit',ex:'The majority voted yes.'},{w:'influence',p:'Verb / Nomen',tr:'beeinflussen / Einfluss',ex:'Advertising influences consumers.'},{w:'responsibility',p:'Nomen',tr:'Verantwortung',ex:'We have a responsibility to future generations.'},{w:'community',p:'Nomen',tr:'Gemeinschaft',ex:'A strong community helps everyone.'},{w:'initiative',p:'Nomen',tr:'Initiative',ex:'Take the initiative to change things.'},{w:'campaign',p:'Nomen',tr:'Kampagne',ex:'She ran a successful campaign.'}];

// FR Units 1-10 (40 Wörter je)
VKDB.fr[0]=[{w:'bonjour',p:'Ausruf',tr:'guten Tag / Hallo',ex:"Bonjour! Comment tu t’appelles?"},{w:'au revoir',p:'Ausruf',tr:'auf Wiedersehen',ex:'Au revoir! À demain.'},{w:'merci',p:'Ausruf',tr:'Danke',ex:'Merci beaucoup!'},{w:"s’il vous plaît",p:'Ausdruck',tr:'bitte (formell)',ex:"Un café, s’il vous plaît."},{w:'excusez-moi',p:'Ausruf',tr:'Entschuldigung',ex:'Excusez-moi, où est la gare?'},{w:'oui',p:'Adv.',tr:'ja',ex:'Oui, je comprends.'},{w:'non',p:'Adv.',tr:'nein',ex:"Non, ce n’est pas correct."},{w:"je m’appelle",p:'Ausdruck',tr:'ich heisse',ex:"Je m’appelle Lucie."},{w:"j’ai … ans",p:'Ausdruck',tr:'ich bin … Jahre alt',ex:"J'ai douze ans."},{w:'d\'où viens-tu',p:'Ausdruck',tr:'woher kommst du',ex:'D\'où viens-tu?'},{w:'enchanté(e)',p:'Adj.',tr:'freut mich',ex:'Enchanté de te rencontrer!'},{w:'comment allez-vous',p:'Ausdruck',tr:'wie geht es Ihnen',ex:'Comment allez-vous?'},{w:'très bien',p:'Ausdruck',tr:'sehr gut',ex:'Très bien, merci.'},{w:"qu’est-ce que",p:'Fragewort',tr:'was ist',ex:"Qu'est-ce que c’est?"},{w:'habiter',p:'Verb',tr:'wohnen',ex:"J'habite à Genève."},{w:'parler',p:'Verb',tr:'sprechen',ex:'Je parle français et allemand.'},{w:'apprendre',p:'Verb',tr:'lernen',ex:"J'apprends le français à l’école."},{w:'comprendre',p:'Verb',tr:'verstehen',ex:'Je ne comprends pas.'},{w:'répéter',p:'Verb',tr:'wiederholen',ex:"Pouvez-vous répéter, s’il vous plaît?"},{w:'épeler',p:'Verb',tr:'buchstabieren',ex:'Pouvez-vous épeler votre nom?'},{w:'lentement',p:'Adv.',tr:'langsam',ex:"Parlez plus lentement, s’il vous plaît."},{w:'ami(e)',p:'Nomen',tr:'Freund / Freundin',ex:'Voici mon amie Sarah.'},{w:'classe',p:'Nomen',tr:'Klasse',ex:'Nous sommes en classe de 5e.'},{w:'professeur',p:'Nomen',tr:'Lehrer / Lehrerin',ex:'Mon professeur est très sympa.'},{w:'élève',p:'Nomen',tr:'Schüler / Schülerin',ex:"C'est une bonne élève."},{w:'école',p:'Nomen',tr:'Schule',ex:"Je vais à l’école chaque jour."},{w:'pays',p:'Nomen',tr:'Land',ex:'La Suisse est un petit pays.'},{w:'langue',p:'Nomen',tr:'Sprache',ex:'Le français est une belle langue.'},{w:'se présenter',p:'Verb',tr:'sich vorstellen',ex:'Je vais me présenter.'},{w:'nationalité',p:'Nomen',tr:'Nationalität',ex:'Ma nationalité est suisse.'},{w:'adresse',p:'Nomen',tr:'Adresse',ex:'Quelle est ton adresse?'},{w:'numéro de téléphone',p:'Nomen',tr:'Telefonnummer',ex:'Quel est ton numéro?'},{w:'sympa',p:'Adj.',tr:'nett / sympathisch',ex:'Il est très sympa.'},{w:'content(e)',p:'Adj.',tr:'froh / glücklich',ex:'Je suis content de te voir.'},{w:'bienvenue',p:'Ausruf',tr:'willkommen',ex:'Bienvenue à notre école!'},{w:'question',p:'Nomen',tr:'Frage',ex:'Tu as une question?'},{w:'réponse',p:'Nomen',tr:'Antwort',ex:'La réponse est correcte.'},{w:'encore',p:'Adv.',tr:'nochmal',ex:"Encore une fois, s’il vous plaît."},{w:'voilà',p:'Ausruf',tr:'da ist es / fertig',ex:'Voilà mon cahier.'},{w:"d'accord",p:'Ausruf',tr:'okay / einverstanden',ex:"D'accord, on y va!"}];
VKDB.fr[1]=[{w:'mère',p:'Nomen',tr:'Mutter',ex:'Ma mère travaille à la maison.'},{w:'père',p:'Nomen',tr:'Vater',ex:'Mon père est médecin.'},{w:'soeur',p:'Nomen',tr:'Schwester',ex:"J'ai une soeur."},{w:'frère',p:'Nomen',tr:'Bruder',ex:'Mon frère a huit ans.'},{w:'grand-mère',p:'Nomen',tr:'Grossmutter',ex:'Ma grand-mère fait des gâteaux.'},{w:'grand-père',p:'Nomen',tr:'Grossvater',ex:'Mon grand-père lit le journal.'},{w:'parents',p:'Nomen pl.',tr:'Eltern',ex:'Mes parents sont gentils.'},{w:'famille',p:'Nomen',tr:'Familie',ex:'Ma famille a quatre membres.'},{w:'enfant',p:'Nomen',tr:'Kind',ex:"C'est un enfant heureux."},{w:'bébé',p:'Nomen',tr:'Baby',ex:'Le bébé dort.'},{w:'maison',p:'Nomen',tr:'Haus',ex:'Nous habitons dans une grande maison.'},{w:'appartement',p:'Nomen',tr:'Wohnung',ex:'Nous avons un appartement en ville.'},{w:'chambre',p:'Nomen',tr:'Zimmer',ex:'Ma chambre est au premier étage.'},{w:'cuisine',p:'Nomen',tr:'Küche',ex:'On mange dans la cuisine.'},{w:'salon',p:'Nomen',tr:'Wohnzimmer',ex:'Le salon est confortable.'},{w:'salle de bain',p:'Nomen',tr:'Badezimmer',ex:'La salle de bain est propre.'},{w:'jardin',p:'Nomen',tr:'Garten',ex:'On joue dans le jardin.'},{w:'porte',p:'Nomen',tr:'Tür',ex:"Ferme la porte, s’il te plaît."},{w:'fenêtre',p:'Nomen',tr:'Fenster',ex:'Ouvre la fenêtre!'},{w:'table',p:'Nomen',tr:'Tisch',ex:'Le livre est sur la table.'},{w:'chaise',p:'Nomen',tr:'Stuhl',ex:'Assieds-toi sur la chaise.'},{w:'lit',p:'Nomen',tr:'Bett',ex:'Je vais au lit à neuf heures.'},{w:'grand(e)',p:'Adj.',tr:'gross',ex:'La maison est très grande.'},{w:'petit(e)',p:'Adj.',tr:'klein',ex:'Ma chambre est petite.'},{w:'propre',p:'Adj.',tr:'sauber',ex:'Garde ta chambre propre.'},{w:'oncle',p:'Nomen',tr:'Onkel',ex:'Mon oncle habite à Lyon.'},{w:'tante',p:'Nomen',tr:'Tante',ex:'Ma tante a deux chats.'},{w:'cousin(e)',p:'Nomen',tr:'Cousin / Cousine',ex:'Mon cousin est drôle.'},{w:'animal domestique',p:'Nomen',tr:'Haustier',ex:'Nous avons un chien.'},{w:'chien',p:'Nomen',tr:'Hund',ex:'Le chien dort dans le jardin.'},{w:'chat',p:'Nomen',tr:'Katze',ex:'Le chat boit du lait.'},{w:'voisin(e)',p:'Nomen',tr:'Nachbar / Nachbarin',ex:'Notre voisine est sympa.'},{w:'en haut',p:'Adv.',tr:'oben',ex:'La chambre est en haut.'},{w:'en bas',p:'Adv.',tr:'unten',ex:'La cuisine est en bas.'},{w:'nouveau / nouvelle',p:'Adj.',tr:'neu',ex:'Nous avons un nouvel appartement.'},{w:'vieux / vieille',p:'Adj.',tr:'alt',ex:"C'est un vieux bâtiment."},{w:'habiter ensemble',p:'Ausdruck',tr:'zusammenwohnen',ex:'Nous habitons ensemble à Genève.'},{w:'canapé',p:'Nomen',tr:'Sofa',ex:'Le chat dort sur le canapé.'},{w:'lampe',p:'Nomen',tr:'Lampe',ex:'Allume la lampe!'},{w:'calme',p:'Adj.',tr:'ruhig',ex:'La chambre est calme.'}];
VKDB.fr[2]=[{w:'leçon',p:'Nomen',tr:'Stunde / Lektion',ex:'La leçon commence à huit heures.'},{w:'matière',p:'Nomen',tr:'Fach',ex:'Les maths sont ma matière préférée.'},{w:'devoir',p:'Nomen',tr:'Hausaufgaben',ex:"Je fais mes devoirs après l’école."},{w:'contrôle',p:'Nomen',tr:'Test',ex:'Nous avons un contrôle vendredi.'},{w:'note',p:'Nomen',tr:'Note',ex:"J'ai eu une bonne note."},{w:'crayon',p:'Nomen',tr:'Bleistift',ex:'Prête-moi ton crayon!'},{w:'gomme',p:'Nomen',tr:'Radiergummi',ex:"J'ai besoin d’une gomme."},{w:'règle',p:'Nomen',tr:'Lineal',ex:'Utilise une règle.'},{w:'cahier',p:'Nomen',tr:'Heft',ex:'Écris dans ton cahier.'},{w:'cartable',p:'Nomen',tr:'Schultasche',ex:'Mon cartable est lourd.'},{w:'emploi du temps',p:'Nomen',tr:'Stundenplan',ex:'Regarde ton emploi du temps.'},{w:'récréation',p:'Nomen',tr:'Pause',ex:'On joue pendant la récréation.'},{w:'cantine',p:'Nomen',tr:'Mensa',ex:'On mange à la cantine.'},{w:'gymnase',p:'Nomen',tr:'Turnhalle',ex:'On a EPS dans le gymnase.'},{w:'bibliothèque',p:'Nomen',tr:'Bibliothek',ex:'Emprunte un livre à la bibliothèque.'},{w:'lire',p:'Verb',tr:'lesen',ex:'Je lis chaque soir.'},{w:'écrire',p:'Verb',tr:'schreiben',ex:'Écris ton nom sur la feuille.'},{w:'écouter',p:'Verb',tr:'zuhören',ex:'Écoute le professeur attentivement.'},{w:'parler',p:'Verb',tr:'sprechen',ex:"Parle plus fort, s’il te plaît."},{w:'répéter',p:'Verb',tr:'wiederholen',ex:'Répète la frase.'},{w:'matin',p:'Nomen',tr:'Morgen',ex:'Je me réveille le matin.'},{w:'après-midi',p:'Nomen',tr:'Nachmittag',ex:"L’école finit l'après-midi."},{w:'soir',p:'Nomen',tr:'Abend',ex:'Je lis le soir.'},{w:'nuit',p:'Nomen',tr:'Nacht',ex:'Bonne nuit!'},{w:'tôt',p:'Adv.',tr:'früh',ex:'Je me lève tôt.'},{w:'tard',p:'Adv.',tr:'spät',ex:'Ne sois pas en retard!'},{w:'toujours',p:'Adv.',tr:'immer',ex:'Je fais toujours mes devoirs.'},{w:'parfois',p:'Adv.',tr:'manchmal',ex:"Parfois j'oublie mon crayon."},{w:'jamais',p:'Adv.',tr:'nie',ex:'Je ne triche jamais.'},{w:'souvent',p:'Adv.',tr:'oft',ex:"Je vais souvent à pied à l’école."},{w:'se lever',p:'Verb',tr:'aufstehen',ex:'Je me lève à sept heures.'},{w:'prendre le petit-déjeuner',p:'Verb',tr:'frühstücken',ex:'Je prends le petit-déjeuner chez moi.'},{w:"aller à l’école",p:'Verb',tr:'in die Schule gehen',ex:"Je vais à l’école en bus."},{w:'rentrer',p:'Verb',tr:'nach Hause kommen',ex:'Je rentre à quatre heures.'},{w:'se coucher',p:'Verb',tr:'ins Bett gehen',ex:'Je me couche à neuf heures.'},{w:'se brosser les dents',p:'Verb',tr:'Zähne putzen',ex:'Brosse-toi les dents deux fois par jour.'},{w:'se laver',p:'Verb',tr:'sich waschen',ex:'Lave-toi les mains.'},{w:'ranger',p:'Verb',tr:'aufräumen',ex:'Range ta chambre!'},{w:'aider',p:'Verb',tr:'helfen',ex:"Tu peux m'aider?"},{w:"s'habiller",p:'Verb',tr:'sich anziehen',ex:"Habille-toi vite le matin."}];
VKDB.fr[3]=[{w:'pain',p:'Nomen',tr:'Brot',ex:'Je mange du pain au petit-déjeuner.'},{w:'beurre',p:'Nomen',tr:'Butter',ex:'Mets du beurre sur le pain.'},{w:'fromage',p:'Nomen',tr:'Käse',ex:'Le fromage suisse est réputé.'},{w:'lait',p:'Nomen',tr:'Milch',ex:'Les enfants boivent du lait.'},{w:'oeuf',p:'Nomen',tr:'Ei',ex:'Je mange un oeuf le matin.'},{w:'pomme',p:'Nomen',tr:'Apfel',ex:"Une pomme par jour, c’est bon."},{w:'banane',p:'Nomen',tr:'Banane',ex:"La banane donne de l'énergie."},{w:'orange',p:'Nomen',tr:'Orange',ex:"Je bois du jus d'orange."},{w:'légume',p:'Nomen',tr:'Gemüse',ex:'Mange plus de légumes!'},{w:'pomme de terre',p:'Nomen',tr:'Kartoffel',ex:'Nous mangeons des pommes de terre.'},{w:'viande',p:'Nomen',tr:'Fleisch',ex:'Je ne mange pas beaucoup de viande.'},{w:'poisson',p:'Nomen',tr:'Fisch',ex:'Le poisson est bon pour la santé.'},{w:'riz',p:'Nomen',tr:'Reis',ex:'Le riz est mangé dans le monde entier.'},{w:'pâtes',p:'Nomen',tr:'Nudeln',ex:'Les pâtes sont mon plat préféré.'},{w:'soupe',p:'Nomen',tr:'Suppe',ex:'La soupe chaude réchauffe.'},{w:'salade',p:'Nomen',tr:'Salat',ex:'Je mange une salade à midi.'},{w:'gâteau',p:'Nomen',tr:'Kuchen',ex:'Ma grand-mère fait un super gâteau.'},{w:'chocolat',p:'Nomen',tr:'Schokolade',ex:'Le chocolat suisse est le meilleur.'},{w:'eau',p:'Nomen',tr:'Wasser',ex:"Bois deux litres d'eau par jour."},{w:'jus',p:'Nomen',tr:'Saft',ex:"Je bois du jus de pomme."},{w:'avoir faim',p:'Ausdruck',tr:'hungrig sein',ex:"J'ai très faim!"},{w:'avoir soif',p:'Ausdruck',tr:'durstig sein',ex:'As-tu soif?'},{w:'délicieux',p:'Adj.',tr:'köstlich / lecker',ex:'Cette soupe est délicieuse.'},{w:'sucré(e)',p:'Adj.',tr:'süss',ex:'Ce gâteau est trop sucré.'},{w:'salé(e)',p:'Adj.',tr:'salzig',ex:'Les chips sont très salées.'},{w:'chaud(e)',p:'Adj.',tr:'heiss',ex:'La soupe est très chaude.'},{w:'froid(e)',p:'Adj.',tr:'kalt',ex:"J'aime les boissons froides."},{w:'cuisiner',p:'Verb',tr:'kochen',ex:'Ma mère cuisine chaque soir.'},{w:'manger',p:'Verb',tr:'essen',ex:'Nous mangeons à midi.'},{w:'boire',p:'Verb',tr:'trinken',ex:"Bois de l'eau après le sport."},{w:'petit-déjeuner',p:'Nomen',tr:'Frühstück',ex:'Le petit-déjeuner est important.'},{w:'déjeuner',p:'Nomen',tr:'Mittagessen',ex:'Je mange à la cantine.'},{w:'dîner',p:'Nomen',tr:'Abendessen',ex:'Le dîner est à sept heures.'},{w:'goûter',p:'Nomen',tr:'Snack / Znüni',ex:"Je mange un goûter après l’école."},{w:'recette',p:'Nomen',tr:'Rezept',ex:'Suis la recette étape par étape.'},{w:'ingrédient',p:'Nomen',tr:'Zutat',ex:'Quels ingrédients faut-il?'},{w:'goûter',p:'Verb',tr:'kosten / schmecken',ex:'Goûte la sauce!'},{w:'commander',p:'Verb',tr:'bestellen',ex:'Je commande une pizza.'},{w:'menu',p:'Nomen',tr:'Speisekarte',ex:'Puis-je voir le menu?'},{w:'restaurant',p:'Nomen',tr:'Restaurant',ex:'Nous mangeons au restaurant le dimanche.'}];
VKDB.fr[4]=[{w:'loisir',p:'Nomen',tr:'Freizeit / Hobby',ex:'Mon loisir préféré est la peinture.'},{w:'sport',p:'Nomen',tr:'Sport',ex:'Je fais du sport trois fois par semaine.'},{w:'football',p:'Nomen',tr:'Fussball',ex:'Je joue au football avec des amis.'},{w:'natation',p:'Nomen',tr:'Schwimmen',ex:'La natation est bon pour la santé.'},{w:'cyclisme',p:'Nomen',tr:'Radfahren',ex:'Le cyclisme est un sport populaire.'},{w:'musique',p:'Nomen',tr:'Musik',ex:"J'écoute de la musique chaque jour."},{w:'lecture',p:'Nomen',tr:'Lesen',ex:'La lecture est mon passe-temps préféré.'},{w:'dessin',p:'Nomen',tr:'Zeichnen',ex:'Elle adore dessiner des animaux.'},{w:'danse',p:'Nomen',tr:'Tanzen',ex:'La danse rend heureux.'},{w:'cuisine',p:'Nomen',tr:'Kochen',ex:"J'aime cuisiner en famille."},{w:'cinéma',p:'Nomen',tr:'Kino',ex:'On va au cinéma le samedi.'},{w:'théâtre',p:'Nomen',tr:'Theater',ex:'La pièce de théâtre était incroyable.'},{w:'musée',p:'Nomen',tr:'Museum',ex:'Nous avons visité un musée.'},{w:'parc',p:'Nomen',tr:'Park',ex:'Je me promène dans le parc.'},{w:'concert',p:'Nomen',tr:'Konzert',ex:'Le concert était fantastique.'},{w:'équipe',p:'Nomen',tr:'Team / Mannschaft',ex:'Je suis dans une équipe de foot.'},{w:'match',p:'Nomen',tr:'Spiel / Match',ex:'Nous avons gagné le match!'},{w:"s'entraîner",p:'Verb',tr:'trainieren / üben',ex:"Je m'entraîne à la guitare."},{w:'gagner',p:'Verb',tr:'gewinnen',ex:'Notre équipe gagne toujours.'},{w:'perdre',p:'Verb',tr:'verlieren',ex:"Perdre parfois, c’est normal."},{w:'temps libre',p:'Nomen',tr:'Freizeit',ex:"J'adore mon temps libre."},{w:'week-end',p:'Nomen',tr:'Wochenende',ex:'Que fais-tu le week-end?'},{w:'vacances',p:'Nomen pl.',tr:'Ferien',ex:"Les vacances d'été sont en juillet."},{w:'aimer',p:'Verb',tr:'mögen / geniessen',ex:"J'aime jouer aux échecs."},{w:'passionnant(e)',p:'Adj.',tr:'spannend / aufregend',ex:'Le match était passionnant.'},{w:'ennuyeux',p:'Adj.',tr:'langweilig',ex:'Je trouve les échecs ennuyeux.'},{w:'préféré(e)',p:'Adj.',tr:'Lieblings-',ex:'Mon sport préféré est le tennis.'},{w:'ensemble',p:'Adv.',tr:'zusammen',ex:'On joue ensemble chaque samedi.'},{w:'dehors',p:'Adv.',tr:'draussen',ex:"J'adore être dehors."},{w:'dedans',p:'Adv.',tr:'drinnen',ex:'Les jours de pluie, je reste dedans.'},{w:'instrument',p:'Nomen',tr:'Instrument',ex:"Je joue d’un instrument."},{w:'guitare',p:'Nomen',tr:'Gitarre',ex:'Elle joue très bien de la guitare.'},{w:'piano',p:'Nomen',tr:'Klavier',ex:'Je prends des cours de piano.'},{w:'club',p:'Nomen',tr:'Verein / Club',ex:'Je suis dans un club sportif.'},{w:'entraînement',p:'Nomen',tr:'Training',ex:"L'entraînement de foot est mardi."},{w:'collectionner',p:'Verb',tr:'sammeln',ex:'Je collectionne des timbres.'},{w:'peindre',p:'Verb',tr:'malen',ex:'Elle peint de beaux tableaux.'},{w:'photographier',p:'Verb',tr:'fotografieren',ex:"J'aime photographier la nature."},{w:'se détendre',p:'Verb',tr:'entspannen',ex:'Je me détends en lisant.'},{w:'se promener',p:'Verb',tr:'spazieren gehen',ex:'On se promène dans le parc.'}];
VKDB.fr[5]=[{w:'voyager',p:'Verb',tr:'reisen',ex:"J'adore voyager en train."},{w:'voyage',p:'Nomen',tr:'Reise',ex:'Nous avons fait un beau voyage.'},{w:'passeport',p:'Nomen',tr:'Pass',ex:"Montre ton passeport, s’il te plaît."},{w:'billet',p:'Nomen',tr:'Ticket / Billett',ex:"J'ai acheté un billet de train."},{w:'bagage',p:'Nomen',tr:'Gepäck',ex:'Mon bagage est trop lourd.'},{w:'hôtel',p:'Nomen',tr:'Hotel',ex:'Nous logeons dans un bel hôtel.'},{w:'aéroport',p:'Nomen',tr:'Flughafen',ex:"On arrive tôt à l'aéroport."},{w:'gare',p:'Nomen',tr:'Bahnhof',ex:'Retrouve-moi à la gare.'},{w:'quai',p:'Nomen',tr:'Perron / Gleis',ex:'Le train part du quai 4.'},{w:'départ',p:'Nomen',tr:'Abfahrt',ex:'Le départ est à dix heures.'},{w:'arrivée',p:'Nomen',tr:'Ankunft',ex:'L\'arrivée à Zurich est à midi.'},{w:'retard',p:'Nomen',tr:'Verspätung',ex:'Il y a un retard de vingt minutes.'},{w:'réservation',p:'Nomen',tr:'Buchung',ex:"J'ai fait une réservation en ligne."},{w:'plan',p:'Nomen',tr:'Plan / Karte',ex:'Utilise le plan pour te repérer.'},{w:'direction',p:'Nomen',tr:'Richtung',ex:'Va dans la bonne direction.'},{w:'tout droit',p:'Ausdruck',tr:'geradeaus',ex:'Allez tout droit.'},{w:'à gauche',p:'Ausdruck',tr:'links',ex:'Tournez à gauche aux feux.'},{w:'à droite',p:'Ausdruck',tr:'rechts',ex:'Tournez à droite après le pont.'},{w:'loin',p:'Adj.',tr:'weit',ex:"Est-ce loin d'ici?"},{w:'près',p:'Adj.',tr:'nah',ex:"La gare est près de l'hôtel."},{w:'bus',p:'Nomen',tr:'Bus',ex:'Prends le bus numéro douze.'},{w:'tram',p:'Nomen',tr:'Tram',ex:"Le tram s'arrête ici."},{w:'métro',p:'Nomen',tr:'U-Bahn',ex:'Le métro est rapide.'},{w:'taxi',p:'Nomen',tr:'Taxi',ex:"Prends un taxi pour l'aéroport."},{w:'avion',p:'Nomen',tr:'Flugzeug',ex:'L\'avion atterrit à midi.'},{w:'bateau',p:'Nomen',tr:'Schiff',ex:'Nous avons pris un bateau sur le lac.'},{w:'vélo',p:'Nomen',tr:'Fahrrad / Velo',ex:"Je vais à l’école en vélo."},{w:'voiture',p:'Nomen',tr:'Auto',ex:'Mes parents ont une petite voiture.'},{w:'à pied',p:'Ausdruck',tr:'zu Fuss',ex:"Je vais à l’école à pied."},{w:'changer',p:'Verb',tr:'umsteigen / wechseln',ex:'Il faut changer à Lyon.'},{w:'monnaie',p:'Nomen',tr:'Währung / Kleingeld',ex:'La monnaie suisse est le franc.'},{w:'douane',p:'Nomen',tr:'Zoll',ex:'Nous avons passé la douane.'},{w:'souvenir',p:'Nomen',tr:'Souvenir',ex:"J'ai acheté un souvenir pour ma mère."},{w:'visite guidée',p:'Nomen',tr:'Stadtführung',ex:'Nous avons fait une visite guidée.'},{w:'recommander',p:'Verb',tr:'empfehlen',ex:'Pouvez-vous recommander un restaurant?'},{w:"s'enregistrer",p:'Verb',tr:'einchecken',ex:"Nous nous enregistrons à l'hôtel."},{w:'quitter',p:'Verb',tr:'abreisen / verlassen',ex:"On quitte l'hôtel avant onze heures."},{w:'guide touristique',p:'Nomen',tr:'Reiseleiter / in',ex:'Le guide parle quatre langues.'},{w:'frontière',p:'Nomen',tr:'Grenze',ex:'On a traversé la frontière.'},{w:'touriste',p:'Nomen',tr:'Tourist / in',ex:'La ville accueille beaucoup de touristes.'}];
VKDB.fr[6]=[{w:'environnement',p:'Nomen',tr:'Umwelt',ex:"Nous devons protéger l’environnement."},{w:'nature',p:'Nomen',tr:'Natur',ex:'Je me promène dans la nature.'},{w:'forêt',p:'Nomen',tr:'Wald',ex:"La forêt est pleine d'animaux."},{w:'montagne',p:'Nomen',tr:'Berg',ex:'La Suisse a de nombreuses montagnes.'},{w:'lac',p:'Nomen',tr:'See',ex:'Nous nous baignons dans le lac.'},{w:'rivière',p:'Nomen',tr:'Fluss',ex:'Le Rhin est un long fleuve.'},{w:'océan',p:'Nomen',tr:"Ozean / Meer",ex:"Le plastique pollue l'océan."},{w:'île',p:'Nomen',tr:'Insel',ex:'La Sardaigne est une belle île.'},{w:'climat',p:'Nomen',tr:'Klima',ex:'Le changement climatique est grave.'},{w:'météo',p:'Nomen',tr:'Wetter',ex:"La météo est ensoleillée aujourd'hui."},{w:'température',p:'Nomen',tr:'Temperatur',ex:'La température baisse.'},{w:'pluie',p:'Nomen',tr:'Regen',ex:'Il va pleuvoir demain.'},{w:'neige',p:'Nomen',tr:'Schnee',ex:'Les enfants jouent dans la neige.'},{w:'vent',p:'Nomen',tr:'Wind',ex:'Un vent fort souffle.'},{w:'nuage',p:'Nomen',tr:'Wolke',ex:'De sombres nuages arrivent.'},{w:'soleil',p:'Nomen',tr:'Sonne',ex:'Le soleil brille fort.'},{w:'orage',p:'Nomen',tr:'Sturm / Gewitter',ex:'Un orage a frappé la ville.'},{w:'pollution',p:'Nomen',tr:'Verschmutzung',ex:"La pollution de l'air est grave."},{w:'recyclage',p:'Nomen',tr:'Recycling',ex:"Le recyclage aide l’environnement."},{w:'énergie',p:'Nomen',tr:'Energie',ex:"L'énergie solaire est propre."},{w:'protéger',p:'Verb',tr:'schützen',ex:'Il faut protéger nos forêts.'},{w:'économiser',p:'Verb',tr:'sparen',ex:"Économise l'eau chaque jour."},{w:'réduire',p:'Verb',tr:'reduzieren',ex:'Réduis tes déchets plastiques.'},{w:'réutiliser',p:'Verb',tr:'wiederverwenden',ex:'Réutilise les bouteilles en verre.'},{w:'recycler',p:'Verb',tr:'recyceln',ex:'Recycle le papier et le plastique.'},{w:'planter',p:'Verb',tr:'pflanzen',ex:'Nous avons planté un arbre.'},{w:'menacé(e)',p:'Adj.',tr:'gefährdet',ex:'De nombreux animaux sont menacés.'},{w:'éteint(e)',p:'Adj.',tr:'ausgestorben',ex:'Le dodo est éteint.'},{w:'durable',p:'Adj.',tr:'nachhaltig',ex:'Nous avons besoin de solutions durables.'},{w:'réchauffement climatique',p:'Nomen',tr:'Erderwärmung',ex:'Le réchauffement fait fondre les glaciers.'},{w:'combustible fossile',p:'Nomen',tr:'fossiler Brennstoff',ex:'Nous brûlons trop de combustibles fossiles.'},{w:'renouvelable',p:'Adj.',tr:'erneuerbar',ex:"L'énergie renouvelable est lavenir."},{w:'panneau solaire',p:'Nomen',tr:'Solaranlage',ex:'Les panneaux solaires produisent de l\'électricité.'},{w:'inondation',p:'Nomen',tr:'Überschwemmung',ex:'Les inondations peuvent détruire des villages.'},{w:'sécheresse',p:'Nomen',tr:'Dürre',ex:'La sécheresse a détruit les récoltes.'},{w:'déforestation',p:'Nomen',tr:'Abholzung',ex:'La déforestation détruit les habitats.'},{w:'biodiversité',p:'Nomen',tr:'Artenvielfalt',ex:"La biodiversité est essentielle à la vie."},{w:'habitat',p:'Nomen',tr:'Lebensraum',ex:'Les ours polaires perdent leur habitat.'},{w:'carbone',p:'Nomen',tr:'Kohlenstoff / CO2',ex:'Réduis ton empreinte carbone.'},{w:'émission',p:'Nomen',tr:'Emission / Ausstoss',ex:'Les émissions doivent être réduites.'}];
VKDB.fr[7]=[{w:'santé',p:'Nomen',tr:'Gesundheit',ex:"La santé est la chose la plus importante."},{w:'corps',p:'Nomen',tr:'Körper',ex:'Le sport est bon pour le corps.'},{w:'tête',p:'Nomen',tr:'Kopf',ex:"J'ai mal à la tête."},{w:'main',p:'Nomen',tr:'Hand',ex:'Lave tes mains avant de manger.'},{w:'bras',p:'Nomen',tr:'Arm',ex:'Elle s\'est cassé le bras.'},{w:'jambe',p:'Nomen',tr:'Bein',ex:'Ma jambe fait mal.'},{w:'ventre',p:'Nomen',tr:'Bauch / Magen',ex:"J'ai mal au ventre."},{w:'dos',p:'Nomen',tr:'Rücken',ex:'Mon dos fait mal.'},{w:'gorge',p:'Nomen',tr:'Hals',ex:"J'ai mal à la gorge."},{w:'oeil',p:'Nomen',tr:'Auge',ex:'Elle a les yeux verts.'},{w:'médecin',p:'Nomen',tr:'Arzt / Ärztin',ex:'Je suis allé chez le médecin hier.'},{w:'hôpital',p:'Nomen',tr:'Spital / Krankenhaus',ex:"Elle est restée à l'hôpital deux jours."},{w:'médicament',p:'Nomen',tr:'Medikament',ex:'Prends ce médicament deux fois par jour.'},{w:'rendez-vous',p:'Nomen',tr:'Termin',ex:'J\'ai un rendez-vous chez le médecin.'},{w:'douleur',p:'Nomen',tr:'Schmerz',ex:'La douleur était très forte.'},{w:'fièvre',p:'Nomen',tr:'Fieber',ex:'Elle a de la fièvre.'},{w:'rhume',p:'Nomen',tr:'Erkältung',ex:"J'ai un rhume cette semaine."},{w:'toux',p:'Nomen',tr:'Husten',ex:"La toux s'améliore."},{w:'allergie',p:'Nomen',tr:'Allergie',ex:"J'ai une allergie au pollen."},{w:'urgence',p:'Nomen',tr:'Notfall',ex:'Appelez le 144 en cas d\'urgence.'},{w:'en bonne santé',p:'Ausdruck',tr:'gesund',ex:'Mange sainement chaque jour.'},{w:'malade',p:'Adj.',tr:'krank',ex:"J'étais malade la semaine dernière."},{w:'fatigué(e)',p:'Adj.',tr:'müde',ex:'Je suis très fatigué aujourd\'hui.'},{w:'stressé(e)',p:'Adj.',tr:'gestresst',ex:'Les examens me stressent.'},{w:'en forme',p:'Ausdruck',tr:'fit',ex:'Le sport te garde en forme.'},{w:'faire du sport',p:'Verb',tr:'Sport machen',ex:'Fais du sport 30 minutes par jour.'},{w:'dormir',p:'Verb',tr:'schlafen',ex:'Dors au moins huit heures.'},{w:'se reposer',p:'Verb',tr:'ausruhen',ex:'Repose-toi quand tu es malade.'},{w:'guérir',p:'Verb',tr:'genesen / heilen',ex:'Elle a guéri rapidement.'},{w:'avoir mal',p:'Verb',tr:'wehtun',ex:'Mon genou me fait mal.'},{w:'nutrition',p:'Nomen',tr:'Ernährung',ex:'Une bonne nutrition est essentielle.'},{w:'vitamine',p:'Nomen',tr:'Vitamin',ex:'Les fruits contiennent beaucoup de vitamines.'},{w:'hygiène',p:'Nomen',tr:'Hygiene',ex:"L'hygiène personnelle prévient les maladies."},{w:'vaccin',p:'Nomen',tr:'Impfung',ex:'Fais-toi vacciner à temps.'},{w:'opération',p:'Nomen',tr:'Operation',ex:"L'opération s'est bien passée."},{w:'santé mentale',p:'Nomen',tr:'psychische Gesundheit',ex:'La santé mentale est aussi importante.'},{w:'stress',p:'Nomen',tr:'Stress',ex:'Trop de stress est mauvais.'},{w:'équilibre',p:'Nomen',tr:'Balance / Gleichgewicht',ex:'Trouve un équilibre entre travail et repos.'},{w:'symptôme',p:'Nomen',tr:'Symptom',ex:'Décris tes symptômes au médecin.'},{w:'traitement',p:'Nomen',tr:'Behandlung',ex:'Le traitement dure deux semaines.'}];
VKDB.fr[8]=[{w:'travail',p:'Nomen',tr:'Arbeit / Beruf',ex:'Ma mère a un bon travail.'},{w:'travailler',p:'Verb',tr:'arbeiten',ex:'Elle travaille dans un hôpital.'},{w:'carrière',p:'Nomen',tr:'Karriere',ex:'Il a une belle carrière devant lui.'},{w:'salaire',p:'Nomen',tr:'Gehalt / Lohn',ex:'Un bon salaire est important.'},{w:'entretien',p:'Nomen',tr:'Vorstellungsgespräch',ex:"J'ai un entretien d'embauche demain."},{w:'postuler',p:'Verb',tr:'sich bewerben',ex:"J'ai postulé pour le poste."},{w:'CV',p:'Nomen',tr:'Lebenslauf',ex:'Écris un CV clair.'},{w:'qualification',p:'Nomen',tr:'Qualifikation',ex:'Il a de nombreuses qualifications.'},{w:'apprentissage',p:'Nomen',tr:'Lehre',ex:'Elle fait un apprentissage.'},{w:'université',p:'Nomen',tr:'Universität',ex:"Il étudie à l'université."},{w:'ingénieur(e)',p:'Nomen',tr:'Ingenieur / in',ex:'Elle est ingénieure en informatique.'},{w:'infirmier/ière',p:'Nomen',tr:'Krankenpfleger / in',ex:"L'infirmière était très aimable."},{w:'avocat(e)',p:'Nomen',tr:'Anwalt / Anwältin',ex:'Il est devenu avocat.'},{w:'architecte',p:'Nomen',tr:'Architekt / in',ex:"L'architecte a conçu un musée."},{w:'entrepreneur(e)',p:'Nomen',tr:'Unternehmer / in',ex:'Elle est jeune entrepreneuse.'},{w:'employé(e)',p:'Nomen',tr:'Angestellte / r',ex:'La société a 200 employés.'},{w:'employeur',p:'Nomen',tr:'Arbeitgeber / in',ex:'Mon employeur est très juste.'},{w:'collègue',p:'Nomen',tr:'Kollege / Kollegin',ex:'Mes collègues sont sympathiques.'},{w:'réunion',p:'Nomen',tr:'Sitzung / Meeting',ex:'Nous avons une réunion à neuf heures.'},{w:'délai',p:'Nomen',tr:'Frist',ex:'Le délai est vendredi.'},{w:'objectif',p:'Nomen',tr:'Ziel',ex:'Fixe des objectifs clairs.'},{w:'ambition',p:'Nomen',tr:'Ehrgeiz',ex:"Elle a beaucoup d'ambition."},{w:'compétence',p:'Nomen',tr:'Fähigkeit / Kompetenz',ex:'La communication est une compétence clé.'},{w:'expérience',p:'Nomen',tr:'Erfahrung',ex:'L\'expérience professionnelle est précieuse.'},{w:'responsabilité',p:'Nomen',tr:'Verantwortung',ex:'Ce poste a beaucoup de responsabilités.'},{w:'travail en équipe',p:'Nomen',tr:'Teamarbeit',ex:"Le travail en équipe est essentiel."},{w:'créatif/ve',p:'Adj.',tr:'kreativ',ex:'Sois créatif dans la résolution de problèmes.'},{w:'motivé(e)',p:'Adj.',tr:'motiviert',ex:'Elle est très motivée.'},{w:'flexible',p:'Adj.',tr:'flexibel',ex:'Le poste exige une personne flexible.'},{w:'réussir',p:'Verb',tr:'erreichen / schaffen',ex:"Elle a réussi d'excellents résultats."},{w:'être promu(e)',p:'Verb',tr:'befördert werden',ex:'Il a été promu directeur.'},{w:'prendre sa retraite',p:'Verb',tr:'in Rente gehen',ex:'Elle prendra sa retraite à 65 ans.'},{w:'bénévole',p:'Nomen',tr:'Freiwillige / r',ex:'Beaucoup de bénévoles aident la communauté.'},{w:'stage',p:'Nomen',tr:'Praktikum',ex:'Il a fait un stage à Zurich.'},{w:'télétravail',p:'Nomen',tr:'Homeoffice',ex:'Le télétravail est très courant.'},{w:'automatisation',p:'Nomen',tr:'Automatisierung',ex:"L'automatisation transforme le marché."},{w:'compétences numériques',p:'Nomen',tr:'digitale Kompetenzen',ex:'Les compétences numériques sont essentielles.'},{w:'réseau',p:'Verb',tr:'vernetzen',ex:'Réseaute avec des professionnels.'},{w:'leadership',p:'Nomen',tr:'Führung',ex:"Un bon leadership inspire l'équipe."},{w:'retraite',p:'Nomen',tr:'Rente / Pension',ex:'Épargne tôt pour ta retraite.'}];
VKDB.fr[9]=[{w:'société',p:'Nomen',tr:'Gesellschaft',ex:'Une société juste profite à tous.'},{w:'culture',p:'Nomen',tr:'Kultur',ex:'La culture suisse est très diverse.'},{w:'tradition',p:'Nomen',tr:'Tradition',ex:'Chaque pays a ses traditions.'},{w:'démocratie',p:'Nomen',tr:'Demokratie',ex:'La Suisse est une démocratie directe.'},{w:'gouvernement',p:'Nomen',tr:'Regierung',ex:'Le gouvernement a adopté une nouvelle loi.'},{w:'loi',p:'Nomen',tr:'Gesetz',ex:'Respectez la loi.'},{w:'droits',p:'Nomen pl.',tr:'Rechte',ex:'Chaque personne a des droits humains.'},{w:'égalité',p:'Nomen',tr:'Gleichheit',ex:"L'égalité est une valeur fondamentale."},{w:'liberté',p:'Nomen',tr:'Freiheit',ex:"La liberté d'expression est importante."},{w:'voter',p:'Verb',tr:'abstimmen / wählen',ex:'Les citoyens votent aux élections.'},{w:'médias',p:'Nomen',tr:'Medien',ex:'Les médias influencent les opinions.'},{w:'internet',p:'Nomen',tr:'Internet',ex:'Internet connecte le monde.'},{w:'réseaux sociaux',p:'Nomen',tr:'soziale Medien',ex:'Les réseaux sociaux peuvent créer une dépendance.'},{w:'fausse information',p:'Nomen',tr:'Falschinformationen',ex:'Les fausses informations se propagent vite.'},{w:'mondialisation',p:'Nomen',tr:'Globalisierung',ex:'La mondialisation change les économies.'},{w:'migration',p:'Nomen',tr:'Migration',ex:'La migration est un sujet complexe.'},{w:'intégration',p:'Nomen',tr:'Integration',ex:'L\'intégration aide les nouveaux arrivants.'},{w:'pauvreté',p:'Nomen',tr:'Armut',ex:'Lutter contre la pauvreté est un objectif mondial.'},{w:'inégalité',p:'Nomen',tr:'Ungleichheit',ex:'Les inégalités de revenus augmentent.'},{w:'préjugé',p:'Nomen',tr:'Vorurteil',ex:'Remets en question tes propres préjugés.'},{w:'tolérance',p:'Nomen',tr:'Toleranz',ex:'La tolérance rend la société paisible.'},{w:'respect',p:'Nomen',tr:'Respekt',ex:'Montre du respect envers les autres.'},{w:'solidarité',p:'Nomen',tr:'Solidarität',ex:'La solidarité est clé en période difficile.'},{w:'conflit',p:'Nomen',tr:'Konflikt',ex:'Le dialogue aide à résoudre les conflits.'},{w:'paix',p:'Nomen',tr:'Frieden',ex:'Nous devons oeuvrer pour la paix.'},{w:'justice',p:'Nomen',tr:'Gerechtigkeit',ex:'La justice doit être équitable.'},{w:'protester',p:'Verb',tr:'protestieren',ex:'Les gens ont protesté dans la rue.'},{w:'débattre',p:'Verb',tr:'debattieren',ex:'Il y a eu un vif débat.'},{w:'opinion',p:'Nomen',tr:'Meinung',ex:'Chacun a le droit à une opinion.'},{w:'argument',p:'Nomen',tr:'Argument',ex:'Donne de bons arguments dans le débat.'},{w:'génération',p:'Nomen',tr:'Generation',ex:'Chaque génération fait face à de nouveaux défis.'},{w:'valeur',p:'Nomen',tr:'Wert',ex:"L'honnêteté est une valeur importante."},{w:'identité',p:'Nomen',tr:'Identität',ex:'La langue forge notre identité.'},{w:'minorité',p:'Nomen',tr:'Minderheit',ex:'Les droits des minorités doivent être protégés.'},{w:'majorité',p:'Nomen',tr:'Mehrheit',ex:'La majorité a voté oui.'},{w:'influencer',p:'Verb',tr:'beeinflussen',ex:'La publicité influence les consommateurs.'},{w:'responsabilité',p:'Nomen',tr:'Verantwortung',ex:'Nous avons une responsabilité envers les générations futures.'},{w:'communauté',p:'Nomen',tr:'Gemeinschaft',ex:'Une communauté forte aide tout le monde.'},{w:'initiative',p:'Nomen',tr:'Initiative',ex:'Prends l\'initiative de changer les choses.'},{w:'campagne',p:'Nomen',tr:'Kampagne',ex:'Elle a mené une campagne réussie.'}];

// IT + ES — komprimiert (je 10 Einheiten x 40 Wörter)
VKDB.it[0]=[{w:'ciao',p:'Ausruf',tr:'Hallo / Tschüss',ex:"Ciao! Come ti chiami?"},{w:'arrivederci',p:'Ausruf',tr:'auf Wiedersehen',ex:'Arrivederci! A domani.'},{w:'grazie',p:'Ausruf',tr:'Danke',ex:'Grazie mille!'},{w:'per favore',p:'Ausdruck',tr:'bitte',ex:'Un caffè, per favore.'},{w:'scusa',p:'Ausruf',tr:'Entschuldigung',ex:"Scusa, dov'è la stazione?"},{w:'sì',p:'Adv.',tr:'ja',ex:'Sì, capisco.'},{w:'no',p:'Adv.',tr:'nein',ex:"No, non è corretto."},{w:'mi chiamo',p:'Ausdruck',tr:'ich heisse',ex:'Mi chiamo Luca.'},{w:'ho … anni',p:'Ausdruck',tr:'ich bin … Jahre alt',ex:'Ho dodici anni.'},{w:'di dove sei',p:'Ausdruck',tr:'woher bist du',ex:'Di dove sei?'},{w:'piacere',p:'Ausruf',tr:'freut mich',ex:'Piacere di conoscerti!'},{w:'come stai',p:'Ausdruck',tr:"wie geht's dir",ex:'Come stai oggi?'},{w:'bene',p:'Adv.',tr:'gut',ex:'Sto bene, grazie.'},{w:'cosa',p:'Fragewort',tr:'was',ex:'Cosa fai?'},{w:'dove',p:'Fragewort',tr:'wo / woher',ex:'Dove abiti?'},{w:'quanti anni hai',p:'Ausdruck',tr:'wie alt bist du',ex:'Quanti anni hai?'},{w:'abitare',p:'Verb',tr:'wohnen',ex:'Abito a Zurigo.'},{w:'parlare',p:'Verb',tr:'sprechen',ex:'Parlo italiano e tedesco.'},{w:'imparare',p:'Verb',tr:'lernen',ex:"Imparo l'italiano a scuola."},{w:'capire',p:'Verb',tr:'verstehen',ex:'Non capisco.'},{w:'piano',p:'Adv.',tr:'langsam',ex:'Parla più piano, per favore.'},{w:'amico/a',p:'Nomen',tr:'Freund / Freundin',ex:'Questo è il mio amico Marco.'},{w:'classe',p:'Nomen',tr:'Klasse',ex:'Siamo nella quinta classe.'},{w:'insegnante',p:'Nomen',tr:'Lehrer / Lehrerin',ex:'Il mio insegnante è molto simpatico.'},{w:'alunno/a',p:'Nomen',tr:'Schüler / Schülerin',ex:'È un buon alunno.'},{w:'scuola',p:'Nomen',tr:'Schule',ex:'Vado a scuola ogni giorno.'},{w:'paese',p:'Nomen',tr:'Land',ex:'La Svizzera è un piccolo paese.'},{w:'lingua',p:'Nomen',tr:'Sprache',ex:"L'italiano è una bella lingua."},{w:'presentarsi',p:'Verb',tr:'sich vorstellen',ex:'Mi presento.'},{w:'nazionalità',p:'Nomen',tr:'Nationalität',ex:'La mia nazionalità è svizzera.'},{w:'indirizzo',p:'Nomen',tr:'Adresse',ex:'Qual è il tuo indirizzo?'},{w:'numero di telefono',p:'Nomen',tr:'Telefonnummer',ex:'Qual è il tuo numero?'},{w:'simpatico/a',p:'Adj.',tr:'nett / sympathisch',ex:'È molto simpatico.'},{w:'contento/a',p:'Adj.',tr:'froh / glücklich',ex:'Sono contento di conoscerti.'},{w:'benvenuto/a',p:'Ausruf',tr:'willkommen',ex:'Benvenuto nella nostra scuola!'},{w:'domanda',p:'Nomen',tr:'Frage',ex:'Hai una domanda?'},{w:'risposta',p:'Nomen',tr:'Antwort',ex:'La risposta è corretta.'},{w:'ancora',p:'Adv.',tr:'nochmal',ex:'Ancora una volta, per favore.'},{w:'ecco',p:'Ausruf',tr:'da ist es',ex:'Ecco il mio quaderno.'},{w:'va bene',p:'Ausruf',tr:'okay / einverstanden',ex:'Va bene, andiamo!'}];
VKDB.it[1]=[{w:'madre',p:'Nomen',tr:'Mutter',ex:'Mia madre lavora a casa.'},{w:'padre',p:'Nomen',tr:'Vater',ex:'Mio padre è medico.'},{w:'sorella',p:'Nomen',tr:'Schwester',ex:'Ho una sorella.'},{w:'fratello',p:'Nomen',tr:'Bruder',ex:'Mio fratello ha otto anni.'},{w:'nonna',p:'Nomen',tr:'Grossmutter',ex:'Mia nonna fa le torte.'},{w:'nonno',p:'Nomen',tr:'Grossvater',ex:'Mio nonno legge il giornale.'},{w:'genitori',p:'Nomen pl.',tr:'Eltern',ex:'I miei genitori sono gentili.'},{w:'famiglia',p:'Nomen',tr:'Familie',ex:'La mia famiglia ha quattro persone.'},{w:'bambino/a',p:'Nomen',tr:'Kind',ex:'È un bambino felice.'},{w:'neonato',p:'Nomen',tr:'Baby',ex:'Il neonato dorme.'},{w:'casa',p:'Nomen',tr:'Haus',ex:'Abitiamo in una casa grande.'},{w:'appartamento',p:'Nomen',tr:'Wohnung',ex:'Abbiamo un appartamento in città.'},{w:'camera',p:'Nomen',tr:'Zimmer',ex:'La mia camera è al primo piano.'},{w:'cucina',p:'Nomen',tr:'Küche',ex:'Mangiamo in cucina.'},{w:'soggiorno',p:'Nomen',tr:'Wohnzimmer',ex:'Il soggiorno è accogliente.'},{w:'bagno',p:'Nomen',tr:'Badezimmer',ex:'Il bagno è pulito.'},{w:'giardino',p:'Nomen',tr:'Garten',ex:'Giochiamo in giardino.'},{w:'porta',p:'Nomen',tr:'Tür',ex:'Chiudi la porta, per favore.'},{w:'finestra',p:'Nomen',tr:'Fenster',ex:'Apri la finestra!'},{w:'tavolo',p:'Nomen',tr:'Tisch',ex:'Il libro è sul tavolo.'},{w:'sedia',p:'Nomen',tr:'Stuhl',ex:'Siediti sulla sedia.'},{w:'letto',p:'Nomen',tr:'Bett',ex:'Vado a letto alle nove.'},{w:'grande',p:'Adj.',tr:'gross',ex:'La casa è molto grande.'},{w:'piccolo/a',p:'Adj.',tr:'klein',ex:'La mia camera è piccola.'},{w:'pulito/a',p:'Adj.',tr:'sauber',ex:'Tieni la tua camera pulita.'},{w:'zio',p:'Nomen',tr:'Onkel',ex:'Mio zio abita a Milano.'},{w:'zia',p:'Nomen',tr:'Tante',ex:'Mia zia ha due gatti.'},{w:'cugino/a',p:'Nomen',tr:'Cousin / Cousine',ex:'Mio cugino è divertente.'},{w:'animale domestico',p:'Nomen',tr:'Haustier',ex:'Abbiamo un cane.'},{w:'cane',p:'Nomen',tr:'Hund',ex:'Il cane dorme.'},{w:'gatto',p:'Nomen',tr:'Katze',ex:'Il gatto beve il latte.'},{w:'vicino/a',p:'Nomen',tr:'Nachbar / Nachbarin',ex:'La nostra vicina è simpatica.'},{w:'su',p:'Adv.',tr:'oben',ex:'La camera è su.'},{w:'giù',p:'Adv.',tr:'unten',ex:'La cucina è giù.'},{w:'nuovo/a',p:'Adj.',tr:'neu',ex:'Abbiamo un nuovo appartamento.'},{w:'vecchio/a',p:'Adj.',tr:'alt',ex:'È un vecchio edificio.'},{w:'vivere insieme',p:'Ausdruck',tr:'zusammenwohnen',ex:'Viviamo insieme a Zurigo.'},{w:'divano',p:'Nomen',tr:'Sofa',ex:'Il gatto dorme sul divano.'},{w:'lampada',p:'Nomen',tr:'Lampe',ex:'Accendi la lampada!'},{w:'tranquillo/a',p:'Adj.',tr:'ruhig',ex:'La camera è tranquilla.'}];
VKDB.it[2]=[{w:'lezione',p:'Nomen',tr:'Stunde',ex:'La lezione inizia alle otto.'},{w:'materia',p:'Nomen',tr:'Fach',ex:'La matematica è la mia materia preferita.'},{w:'compiti',p:'Nomen pl.',tr:'Hausaufgaben',ex:'Faccio i compiti dopo scuola.'},{w:'verifica',p:'Nomen',tr:'Test / Prüfung',ex:'Abbiamo una verifica venerdì.'},{w:'voto',p:'Nomen',tr:'Note',ex:'Ho preso un bel voto.'},{w:'matita',p:'Nomen',tr:'Bleistift',ex:'Puoi prestarmi la matita?'},{w:'gomma',p:'Nomen',tr:'Radiergummi',ex:'Ho bisogno di una gomma.'},{w:'righello',p:'Nomen',tr:'Lineal',ex:'Usa il righello per disegnare.'},{w:'quaderno',p:'Nomen',tr:'Heft',ex:'Scrivi sul quaderno.'},{w:'zaino',p:'Nomen',tr:'Schultasche',ex:'Il mio zaino è molto pesante.'},{w:'orario',p:'Nomen',tr:'Stundenplan',ex:'Guarda il tuo orario.'},{w:'ricreazione',p:'Nomen',tr:'Pause',ex:'Giochiamo durante la ricreazione.'},{w:'mensa',p:'Nomen',tr:'Mensa',ex:'Mangiamo alla mensa.'},{w:'palestra',p:'Nomen',tr:'Turnhalle',ex:'Facciamo educazione fisica in palestra.'},{w:'biblioteca',p:'Nomen',tr:'Bibliothek',ex:'Prendi un libro in biblioteca.'},{w:'leggere',p:'Verb',tr:'lesen',ex:'Leggo ogni sera.'},{w:'scrivere',p:'Verb',tr:'schreiben',ex:'Scrivi il tuo nome sul foglio.'},{w:'ascoltare',p:'Verb',tr:'zuhören',ex:"Ascolta l'insegnante attentamente."},{w:'parlare',p:'Verb',tr:'sprechen',ex:'Parla più forte, per favore.'},{w:'ripetere',p:'Verb',tr:'wiederholen',ex:'Ripeti la frase.'},{w:'mattino',p:'Nomen',tr:'Morgen',ex:'Mi sveglio di mattino.'},{w:'pomeriggio',p:'Nomen',tr:'Nachmittag',ex:'La scuola finisce il pomeriggio.'},{w:'sera',p:'Nomen',tr:'Abend',ex:'Leggo la sera.'},{w:'notte',p:'Nomen',tr:'Nacht',ex:'Buonanotte!'},{w:'presto',p:'Adv.',tr:'früh',ex:'Mi alzo presto.'},{w:'tardi',p:'Adv.',tr:'spät',ex:'Non fare tardi!'},{w:'sempre',p:'Adv.',tr:'immer',ex:'Faccio sempre i compiti.'},{w:'a volte',p:'Adv.',tr:'manchmal',ex:'A volte dimentico la matita.'},{w:'mai',p:'Adv.',tr:'nie',ex:'Non copio mai.'},{w:'spesso',p:'Adv.',tr:'oft',ex:'Vado spesso a scuola a piedi.'},{w:'alzarsi',p:'Verb',tr:'aufstehen',ex:'Mi alzo alle sette.'},{w:'fare colazione',p:'Verb',tr:'frühstücken',ex:'Faccio colazione a casa.'},{w:'andare a scuola',p:'Verb',tr:'in die Schule gehen',ex:'Vado a scuola in autobus.'},{w:'tornare a casa',p:'Verb',tr:'nach Hause kommen',ex:'Torno a casa alle quattro.'},{w:'andare a letto',p:'Verb',tr:'ins Bett gehen',ex:'Vado a letto alle nove.'},{w:'lavarsi i denti',p:'Verb',tr:'Zähne putzen',ex:'Lavati i denti due volte al giorno.'},{w:'lavarsi',p:'Verb',tr:'sich waschen',ex:'Lavati le mani.'},{w:'riordinare',p:'Verb',tr:'aufräumen',ex:'Riordina la tua camera!'},{w:'aiutare',p:'Verb',tr:'helfen',ex:'Puoi aiutarmi?'},{w:'vestirsi',p:'Verb',tr:'sich anziehen',ex:'Vestiti in fretta al mattino.'}];
VKDB.it[3]=[{w:'pane',p:'Nomen',tr:'Brot',ex:'Mangio il pane a colazione.'},{w:'burro',p:'Nomen',tr:'Butter',ex:'Metti il burro sul pane.'},{w:'formaggio',p:'Nomen',tr:'Käse',ex:'Il formaggio svizzero è famoso.'},{w:'latte',p:'Nomen',tr:'Milch',ex:'I bambini bevono il latte.'},{w:'uovo',p:'Nomen',tr:'Ei',ex:'Mangio un uovo ogni mattina.'},{w:'mela',p:'Nomen',tr:'Apfel',ex:'Una mela al giorno fa bene.'},{w:'banana',p:'Nomen',tr:'Banane',ex:'La banana dà energia.'},{w:"arancia",p:'Nomen',tr:'Orange',ex:"Bevo succo d'arancia."},{w:'verdura',p:'Nomen',tr:'Gemüse',ex:'Mangia più verdura!'},{w:'patata',p:'Nomen',tr:'Kartoffel',ex:'Mangiamo le patate a cena.'},{w:'carne',p:'Nomen',tr:'Fleisch',ex:'Non mangio molta carne.'},{w:'pesce',p:'Nomen',tr:'Fisch',ex:'Il pesce fa bene alla salute.'},{w:'riso',p:'Nomen',tr:'Reis',ex:'Il riso è mangiato in tutto il mondo.'},{w:'pasta',p:'Nomen',tr:'Nudeln / Pasta',ex:'La pasta è il mio piatto preferito.'},{w:'zuppa',p:'Nomen',tr:'Suppe',ex:'La zuppa calda scalda.'},{w:'insalata',p:'Nomen',tr:'Salat',ex:"Mangio un'insalata a pranzo."},{w:'torta',p:'Nomen',tr:'Kuchen',ex:'Mia nonna fa una torta buonissima.'},{w:'cioccolato',p:'Nomen',tr:'Schokolade',ex:'Il cioccolato svizzero è il migliore.'},{w:'acqua',p:'Nomen',tr:'Wasser',ex:"Bevi due litri d'acqua al giorno."},{w:'succo',p:'Nomen',tr:'Saft',ex:'Bevo succo di mela a colazione.'},{w:'avere fame',p:'Ausdruck',tr:'hungrig sein',ex:'Ho molta fame!'},{w:'avere sete',p:'Ausdruck',tr:'durstig sein',ex:'Hai sete?'},{w:'delizioso/a',p:'Adj.',tr:'lecker / köstlich',ex:'Questa zuppa è deliziosa.'},{w:'dolce',p:'Adj.',tr:'süss',ex:'Questa torta è troppo dolce.'},{w:'salato/a',p:'Adj.',tr:'salzig',ex:'Le patatine sono molto salate.'},{w:'caldo/a',p:'Adj.',tr:'heiss',ex:'La zuppa è molto calda.'},{w:'freddo/a',p:'Adj.',tr:'kalt',ex:'Mi piacciono le bevande fredde.'},{w:'cucinare',p:'Verb',tr:'kochen',ex:'Mia madre cucina ogni sera.'},{w:'mangiare',p:'Verb',tr:'essen',ex:'Mangiamo a mezzogiorno.'},{w:'bere',p:'Verb',tr:'trinken',ex:"Bevi acqua dopo lo sport."},{w:'colazione',p:'Nomen',tr:'Frühstück',ex:'La colazione è il pasto più importante.'},{w:'pranzo',p:'Nomen',tr:'Mittagessen',ex:'Pranzo alla mensa.'},{w:'cena',p:'Nomen',tr:'Abendessen',ex:'La cena è alle sette.'},{w:'spuntino',p:'Nomen',tr:'Snack',ex:'Mangio uno spuntino dopo scuola.'},{w:'ricetta',p:'Nomen',tr:'Rezept',ex:'Segui la ricetta passo per passo.'},{w:'ingrediente',p:'Nomen',tr:'Zutat',ex:'Quali ingredienti servono?'},{w:'assaggiare',p:'Verb',tr:'kosten / schmecken',ex:'Assaggia la salsa!'},{w:'ordinare',p:'Verb',tr:'bestellen',ex:'Ordino una pizza.'},{w:'menù',p:'Nomen',tr:'Speisekarte',ex:'Posso vedere il menù?'},{w:'ristorante',p:'Nomen',tr:'Restaurant',ex:'Mangiamo al ristorante la domenica.'}];
VKDB.it[4]=[{w:'hobby',p:'Nomen',tr:'Hobby',ex:'Il mio hobby è dipingere.'},{w:'sport',p:'Nomen',tr:'Sport',ex:'Faccio sport tre volte alla settimana.'},{w:'calcio',p:'Nomen',tr:'Fussball',ex:'Gioco a calcio con gli amici.'},{w:'nuoto',p:'Nomen',tr:'Schwimmen',ex:'Il nuoto fa bene al corpo.'},{w:'ciclismo',p:'Nomen',tr:'Radfahren',ex:'Il ciclismo è divertente e salutare.'},{w:'musica',p:'Nomen',tr:'Musik',ex:'Ascolto musica ogni giorno.'},{w:'lettura',p:'Nomen',tr:'Lesen',ex:'La lettura è il mio passatempo preferito.'},{w:'disegno',p:'Nomen',tr:'Zeichnen',ex:'Lei adora disegnare animali.'},{w:'danza',p:'Nomen',tr:'Tanzen',ex:'La danza rende felici.'},{w:'cucina',p:'Nomen',tr:'Kochen',ex:'Mi piace cucinare con la famiglia.'},{w:'cinema',p:'Nomen',tr:'Kino',ex:'Andiamo al cinema il sabato.'},{w:'teatro',p:'Nomen',tr:'Theater',ex:'Lo spettacolo teatrale era fantastico.'},{w:'museo',p:'Nomen',tr:'Museum',ex:'Abbiamo visitato un museo.'},{w:'parco',p:'Nomen',tr:'Park',ex:'Passeggio nel parco dopo scuola.'},{w:'concerto',p:'Nomen',tr:'Konzert',ex:'Il concerto era meraviglioso.'},{w:'squadra',p:'Nomen',tr:'Team / Mannschaft',ex:'Sono in una squadra di calcio.'},{w:'partita',p:'Nomen',tr:'Spiel / Match',ex:'Abbiamo vinto la partita!'},{w:'allenarsi',p:'Verb',tr:'trainieren / üben',ex:'Mi alleno alla chitarra ogni giorno.'},{w:'vincere',p:'Verb',tr:'gewinnen',ex:'La nostra squadra vince sempre.'},{w:'perdere',p:'Verb',tr:'verlieren',ex:'A volte si può perdere.'},{w:'tempo libero',p:'Nomen',tr:'Freizeit',ex:'Adoro il mio tempo libero.'},{w:'fine settimana',p:'Nomen',tr:'Wochenende',ex:'Cosa fai nel fine settimana?'},{w:'vacanze',p:'Nomen pl.',tr:'Ferien',ex:'Le vacanze estive sono in luglio.'},{w:'piacere',p:'Verb',tr:'mögen / geniessen',ex:'Mi piace giocare a scacchi.'},{w:'emozionante',p:'Adj.',tr:'spannend / aufregend',ex:'La partita era emozionante.'},{w:'noioso/a',p:'Adj.',tr:'langweilig',ex:'Trovo gli scacchi noiosi.'},{w:'preferito/a',p:'Adj.',tr:'Lieblings-',ex:'Il mio sport preferito è il tennis.'},{w:'insieme',p:'Adv.',tr:'zusammen',ex:'Giochiamo insieme ogni sabato.'},{w:'fuori',p:'Adv.',tr:'draussen',ex:'Adoro stare fuori.'},{w:'dentro',p:'Adv.',tr:'drinnen',ex:'Nei giorni di pioggia sto dentro.'},{w:'strumento',p:'Nomen',tr:'Instrument',ex:'Suono uno strumento musicale.'},{w:'chitarra',p:'Nomen',tr:'Gitarre',ex:'Lei suona la chitarra molto bene.'},{w:'pianoforte',p:'Nomen',tr:'Klavier',ex:'Prendo lezioni di pianoforte.'},{w:'club',p:'Nomen',tr:'Verein / Club',ex:'Sono in un club sportivo.'},{w:'allenamento',p:'Nomen',tr:'Training',ex:"L'allenamento di calcio è il martedì."},{w:'collezionare',p:'Verb',tr:'sammeln',ex:'Colleziono francobolli.'},{w:'dipingere',p:'Verb',tr:'malen',ex:'Dipinge bei quadri.'},{w:'fotografare',p:'Verb',tr:'fotografieren',ex:'Amo fotografare la natura.'},{w:'rilassarsi',p:'Verb',tr:'entspannen',ex:'Mi rilasso leggendo.'},{w:'passeggiare',p:'Verb',tr:'spazieren gehen',ex:'Passeggiamo nel parco.'}];
VKDB.it[5]=[{w:'viaggiare',p:'Verb',tr:'reisen',ex:'Adoro viaggiare in treno.'},{w:'viaggio',p:'Nomen',tr:'Reise',ex:'Abbiamo fatto un bel viaggio.'},{w:'passaporto',p:'Nomen',tr:'Pass',ex:'Mostra il tuo passaporto, per favore.'},{w:'biglietto',p:'Nomen',tr:'Ticket / Billett',ex:'Ho comprato un biglietto del treno.'},{w:'bagaglio',p:'Nomen',tr:'Gepäck',ex:'Il mio bagaglio è troppo pesante.'},{w:'albergo',p:'Nomen',tr:'Hotel',ex:"Siamo in un bell'albergo."},{w:'aeroporto',p:'Nomen',tr:'Flughafen',ex:"Arriviamo all'aeroporto presto."},{w:'stazione',p:'Nomen',tr:'Bahnhof',ex:'Ci vediamo alla stazione.'},{w:'binario',p:'Nomen',tr:'Perron / Gleis',ex:'Il treno parte dal binario 4.'},{w:'partenza',p:'Nomen',tr:'Abfahrt',ex:'La partenza è alle dieci.'},{w:'arrivo',p:'Nomen',tr:'Ankunft',ex:"L'arrivo a Zurigo è a mezzogiorno."},{w:'ritardo',p:'Nomen',tr:'Verspätung',ex:"C'è un ritardo di venti minuti."},{w:'prenotazione',p:'Nomen',tr:'Buchung / Reservierung',ex:'Ho fatto una prenotazione online.'},{w:'mappa',p:'Nomen',tr:'Plan / Karte',ex:'Usa la mappa per orientarti.'},{w:'direzione',p:'Nomen',tr:'Richtung',ex:'Vai nella direzione giusta.'},{w:'dritto',p:'Ausdruck',tr:'geradeaus',ex:'Vai dritto per due isolati.'},{w:'a sinistra',p:'Ausdruck',tr:'links',ex:'Gira a sinistra al semaforo.'},{w:'a destra',p:'Ausdruck',tr:'rechts',ex:'Gira a destra dopo il ponte.'},{w:'lontano',p:'Adj.',tr:'weit',ex:'È lontano da qui?'},{w:'vicino',p:'Adj.',tr:'nah',ex:"La stazione è vicino all'albergo."},{w:'autobus',p:'Nomen',tr:'Bus',ex:'Prendi l\'autobus numero dodici.'},{w:'tram',p:'Nomen',tr:'Tram',ex:'Il tram si ferma qui.'},{w:'metro',p:'Nomen',tr:'U-Bahn',ex:'La metro è veloce.'},{w:'taxi',p:'Nomen',tr:'Taxi',ex:"Prendi un taxi per l'aeroporto."},{w:'aereo',p:'Nomen',tr:'Flugzeug',ex:"L'aereo atterra a mezzogiorno."},{w:'barca',p:'Nomen',tr:'Schiff / Boot',ex:'Abbiamo preso una barca sul lago.'},{w:'bicicletta',p:'Nomen',tr:'Fahrrad / Velo',ex:'Vado a scuola in bicicletta.'},{w:'macchina',p:'Nomen',tr:'Auto',ex:'I miei genitori hanno una piccola macchina.'},{w:'a piedi',p:'Ausdruck',tr:'zu Fuss',ex:'Vado a scuola a piedi.'},{w:'cambiare',p:'Verb',tr:'umsteigen / wechseln',ex:'Bisogna cambiare a Milano.'},{w:'valuta',p:'Nomen',tr:'Währung',ex:'La valuta svizzera è il franco.'},{w:'dogana',p:'Nomen',tr:'Zoll',ex:'Abbiamo passato la dogana.'},{w:'souvenir',p:'Nomen',tr:'Souvenir',ex:'Ho comprato un souvenir per mia madre.'},{w:'gita turistica',p:'Nomen',tr:'Stadtführung',ex:'Abbiamo fatto una gita turistica.'},{w:'raccomandare',p:'Verb',tr:'empfehlen',ex:'Può raccomandare un ristorante?'},{w:'fare il check-in',p:'Verb',tr:'einchecken',ex:"Facciamo il check-in in albergo."},{w:'lasciare',p:'Verb',tr:'abreisen / verlassen',ex:"Lasciamo l'albergo prima delle undici."},{w:'guida turistica',p:'Nomen',tr:'Reiseleiter / in',ex:'La guida parla quattro lingue.'},{w:'frontiera',p:'Nomen',tr:'Grenze',ex:'Abbiamo attraversato la frontiera.'},{w:'turista',p:'Nomen',tr:'Tourist / in',ex:'La città accoglie molti turisti.'}];
VKDB.it[6]=[{w:'ambiente',p:'Nomen',tr:'Umwelt',ex:"Dobbiamo proteggere lambiente."},{w:'natura',p:'Nomen',tr:'Natur',ex:'Amo passare il tempo nella natura.'},{w:'foresta',p:'Nomen',tr:'Wald',ex:'La foresta è piena di animali.'},{w:'montagna',p:'Nomen',tr:'Berg',ex:'La Svizzera ha molte montagne.'},{w:'lago',p:'Nomen',tr:'See',ex:'Facciamo il bagno nel lago.'},{w:'fiume',p:'Nomen',tr:'Fluss',ex:'Il Reno è un fiume lungo.'},{w:'oceano',p:'Nomen',tr:'Ozean / Meer',ex:"La plastica inquina l'oceano."},{w:'isola',p:'Nomen',tr:'Insel',ex:'La Sardegna è una bella isola.'},{w:'clima',p:'Nomen',tr:'Klima',ex:'Il cambiamento climatico è un grande problema.'},{w:'tempo',p:'Nomen',tr:'Wetter',ex:'Il tempo è soleggiato oggi.'},{w:'temperatura',p:'Nomen',tr:'Temperatur',ex:'La temperatura sta scendendo.'},{w:'pioggia',p:'Nomen',tr:'Regen',ex:'Domani ci sarà pioggia.'},{w:'neve',p:'Nomen',tr:'Schnee',ex:'I bambini giocano nella neve.'},{w:'vento',p:'Nomen',tr:'Wind',ex:'Soffia un vento forte.'},{w:'nuvola',p:'Nomen',tr:'Wolke',ex:'Arrivano nuvole scure.'},{w:'sole',p:'Nomen',tr:'Sonne',ex:'Il sole splende forte.'},{w:'temporale',p:'Nomen',tr:'Sturm / Gewitter',ex:'Un temporale ha colpito la città.'},{w:'inquinamento',p:'Nomen',tr:'Verschmutzung',ex:"L'inquinamento dell'aria è grave."},{w:'riciclaggio',p:'Nomen',tr:'Recycling',ex:"Il riciclaggio aiuta l’ambiente."},{w:'energia',p:'Nomen',tr:'Energie',ex:"L'energia solare è pulita."},{w:'proteggere',p:'Verb',tr:'schützen',ex:'Dobbiamo proteggere le nostre foreste.'},{w:'risparmiare',p:'Verb',tr:'sparen',ex:"Risparmia l'acqua ogni giorno."},{w:'ridurre',p:'Verb',tr:'reduzieren',ex:'Riduci i rifiuti plastici.'},{w:'riutilizzare',p:'Verb',tr:'wiederverwenden',ex:'Riutilizza le bottiglie di vetro.'},{w:'riciclare',p:'Verb',tr:'recyceln',ex:'Ricicla carta e plastica.'},{w:'piantare',p:'Verb',tr:'pflanzen',ex:'Abbiamo piantato un albero in giardino.'},{w:'minacciato/a',p:'Adj.',tr:'gefährdet',ex:'Molti animali sono minacciati.'},{w:'estinto/a',p:'Adj.',tr:'ausgestorben',ex:'Il dodo è estinto.'},{w:'sostenibile',p:'Adj.',tr:'nachhaltig',ex:'Abbiamo bisogno di soluzioni sostenibili.'},{w:'riscaldamento globale',p:'Nomen',tr:'Erderwärmung',ex:'Il riscaldamento globale scioglie i ghiacciai.'},{w:'combustibile fossile',p:'Nomen',tr:'fossiler Brennstoff',ex:'Bruciamo troppi combustibili fossili.'},{w:'rinnovabile',p:'Adj.',tr:'erneuerbar',ex:"L'energia rinnovabile è il futuro."},{w:'pannello solare',p:'Nomen',tr:'Solaranlage',ex:'I pannelli solari producono elettricità.'},{w:'alluvione',p:'Nomen',tr:'Überschwemmung',ex:'Le alluvioni possono distruggere villaggi.'},{w:'siccità',p:'Nomen',tr:'Dürre',ex:'La siccità ha distrutto i raccolti.'},{w:'deforestazione',p:'Nomen',tr:'Abholzung',ex:'La deforestazione distrugge gli habitat.'},{w:'biodiversità',p:'Nomen',tr:'Artenvielfalt',ex:"La biodiversità è essenziale per la vita."},{w:'habitat',p:'Nomen',tr:'Lebensraum',ex:'Gli orsi polari perdono il loro habitat.'},{w:'carbonio',p:'Nomen',tr:'Kohlenstoff / CO2',ex:'Riduci la tua impronta di carbonio.'},{w:'emissione',p:'Nomen',tr:'Emission / Ausstoss',ex:'Le emissioni devono essere ridotte.'}];
VKDB.it[7]=[{w:'salute',p:'Nomen',tr:'Gesundheit',ex:'La salute è la cosa più importante.'},{w:'corpo',p:'Nomen',tr:'Körper',ex:'Lo sport fa bene al corpo.'},{w:'testa',p:'Nomen',tr:'Kopf',ex:'Ho mal di testa.'},{w:'mano',p:'Nomen',tr:'Hand',ex:'Lavati le mani prima di mangiare.'},{w:'braccio',p:'Nomen',tr:'Arm',ex:'Si è rotto il braccio.'},{w:'gamba',p:'Nomen',tr:'Bein',ex:'La mia gamba fa male.'},{w:'stomaco',p:'Nomen',tr:'Magen / Bauch',ex:'Ho mal di stomaco.'},{w:'schiena',p:'Nomen',tr:'Rücken',ex:'La mia schiena fa male.'},{w:'gola',p:'Nomen',tr:'Hals',ex:'Ho mal di gola.'},{w:'occhio',p:'Nomen',tr:'Auge',ex:'Ha gli occhi verdi.'},{w:'medico',p:'Nomen',tr:'Arzt / Ärztin',ex:'Ieri sono andato dal medico.'},{w:'ospedale',p:'Nomen',tr:'Spital / Krankenhaus',ex:'È rimasta in ospedale due giorni.'},{w:'medicina',p:'Nomen',tr:'Medikament',ex:'Prendi questa medicina due volte al giorno.'},{w:'appuntamento',p:'Nomen',tr:'Termin',ex:'Ho un appuntamento dal medico.'},{w:'dolore',p:'Nomen',tr:'Schmerz',ex:'Il dolore era molto forte.'},{w:'febbre',p:'Nomen',tr:'Fieber',ex:'Ha la febbre alta.'},{w:'raffreddore',p:'Nomen',tr:'Erkältung',ex:'Ho il raffreddore questa settimana.'},{w:'tosse',p:'Nomen',tr:'Husten',ex:'La tosse sta migliorando.'},{w:'allergia',p:'Nomen',tr:'Allergie',ex:"Ho un'allergia al polline."},{w:'emergenza',p:'Nomen',tr:'Notfall',ex:'Chiama il 118 in caso di emergenza.'},{w:'sano/a',p:'Adj.',tr:'gesund',ex:'Mangia sano ogni giorno.'},{w:'malato/a',p:'Adj.',tr:'krank',ex:'Ero malato la settimana scorsa.'},{w:'stanco/a',p:'Adj.',tr:'müde',ex:'Sono molto stanco oggi.'},{w:'stressato/a',p:'Adj.',tr:'gestresst',ex:'Gli esami mi stressano.'},{w:'in forma',p:'Ausdruck',tr:'fit',ex:'Lo sport ti mantiene in forma.'},{w:'fare esercizio',p:'Verb',tr:'Sport machen',ex:'Fai esercizio per 30 minuti al giorno.'},{w:'dormire',p:'Verb',tr:'schlafen',ex:'Dormi almeno otto ore.'},{w:'riposare',p:'Verb',tr:'ausruhen',ex:'Riposati quando sei malato.'},{w:'guarire',p:'Verb',tr:'genesen / heilen',ex:'È guarita rapidamente.'},{w:'fare male',p:'Verb',tr:'wehtun',ex:'Il mio ginocchio fa male.'},{w:'nutrizione',p:'Nomen',tr:'Ernährung',ex:'Una buona nutrizione è essenziale.'},{w:'vitamina',p:'Nomen',tr:'Vitamin',ex:'La frutta contiene molte vitamine.'},{w:'igiene',p:'Nomen',tr:'Hygiene',ex:"L'igiene personale previene le malattie."},{w:'vaccino',p:'Nomen',tr:'Impfung',ex:'Fai il vaccino in tempo.'},{w:'operazione',p:'Nomen',tr:'Operation',ex:"L'operazione è riuscita bene."},{w:'salute mentale',p:'Nomen',tr:'psychische Gesundheit',ex:'La salute mentale è altrettanto importante.'},{w:'stress',p:'Nomen',tr:'Stress',ex:'Troppo stress fa male alla salute.'},{w:'equilibrio',p:'Nomen',tr:'Balance / Gleichgewicht',ex:'Trova un equilibrio tra lavoro e riposo.'},{w:'sintomo',p:'Nomen',tr:'Symptom',ex:'Descrivi i sintomi al medico.'},{w:'trattamento',p:'Nomen',tr:'Behandlung',ex:'Il trattamento dura due settimane.'}];
VKDB.it[8]=[{w:'lavoro',p:'Nomen',tr:'Arbeit / Beruf',ex:'Mia madre ha un buon lavoro.'},{w:'lavorare',p:'Verb',tr:'arbeiten',ex:'Lavora in un ospedale.'},{w:'carriera',p:'Nomen',tr:'Karriere',ex:'Ha una bella carriera davanti.'},{w:'stipendio',p:'Nomen',tr:'Gehalt / Lohn',ex:'Uno stipendio buono è importante.'},{w:'colloquio',p:'Nomen',tr:'Vorstellungsgespräch',ex:'Ho un colloquio di lavoro domani.'},{w:'candidarsi',p:'Verb',tr:'sich bewerben',ex:'Ho fatto domanda per il posto.'},{w:'curriculum',p:'Nomen',tr:'Lebenslauf',ex:'Scrivi un curriculum chiaro.'},{w:'qualifica',p:'Nomen',tr:'Qualifikation',ex:'Ha molte qualifiche.'},{w:'apprendistato',p:'Nomen',tr:'Lehre',ex:'Sta facendo un apprendistato.'},{w:'università',p:'Nomen',tr:'Universität',ex:"Studia all'università."},{w:'ingegnere',p:'Nomen',tr:'Ingenieur / in',ex:"È un'ingegnera informatica."},{w:'infermiere/a',p:'Nomen',tr:'Krankenpfleger / in',ex:"L'infermiera era molto gentile."},{w:'avvocato',p:'Nomen',tr:'Anwalt / Anwältin',ex:'È diventato avvocato di successo.'},{w:'architetto',p:'Nomen',tr:'Architekt / in',ex:"L'architetto ha progettato un museo."},{w:'imprenditore/trice',p:'Nomen',tr:'Unternehmer / in',ex:'È una giovane imprenditrice.'},{w:'dipendente',p:'Nomen',tr:'Angestellte / r',ex:"L'azienda ha 200 dipendenti."},{w:'datore di lavoro',p:'Nomen',tr:'Arbeitgeber / in',ex:'Il mio datore di lavoro è molto giusto.'},{w:'collega',p:'Nomen',tr:'Kollege / Kollegin',ex:'I miei colleghi sono simpatici.'},{w:'riunione',p:'Nomen',tr:'Sitzung / Meeting',ex:'Abbiamo una riunione alle nove.'},{w:'scadenza',p:'Nomen',tr:'Frist',ex:'La scadenza è venerdì.'},{w:'obiettivo',p:'Nomen',tr:'Ziel',ex:'Fissa obiettivi chiari per il tuo futuro.'},{w:'ambizione',p:'Nomen',tr:'Ehrgeiz',ex:'Ha molta ambizione.'},{w:'competenza',p:'Nomen',tr:'Fähigkeit',ex:'La comunicazione è una competenza chiave.'},{w:'esperienza',p:'Nomen',tr:'Erfahrung',ex:'L\'esperienza lavorativa è preziosa.'},{w:'responsabilità',p:'Nomen',tr:'Verantwortung',ex:'Questo lavoro ha molta responsabilità.'},{w:'lavoro di squadra',p:'Nomen',tr:'Teamarbeit',ex:'Il lavoro di squadra è essenziale.'},{w:'creativo/a',p:'Adj.',tr:'kreativ',ex:'Sii creativo nella risoluzione dei problemi.'},{w:'motivato/a',p:'Adj.',tr:'motiviert',ex:'È molto motivata.'},{w:'flessibile',p:'Adj.',tr:'flexibel',ex:'Il lavoro richiede una persona flessibile.'},{w:'raggiungere',p:'Verb',tr:'erreichen',ex:'Ha raggiunto ottimi risultati.'},{w:'essere promosso/a',p:'Verb',tr:'befördert werden',ex:'È stato promosso direttore.'},{w:'andare in pensione',p:'Verb',tr:'in Rente gehen',ex:'Andrà in pensione a 65 anni.'},{w:'volontario/a',p:'Nomen',tr:'Freiwillige / r',ex:'Molti volontari aiutano la comunità.'},{w:'tirocinio',p:'Nomen',tr:'Praktikum',ex:'Ha fatto un tirocinio a Zurigo.'},{w:'telelavoro',p:'Nomen',tr:'Homeoffice',ex:'Il telelavoro è molto comune.'},{w:'automazione',p:'Nomen',tr:'Automatisierung',ex:"L'automazione cambia il mercato del lavoro."},{w:'competenze digitali',p:'Nomen',tr:'digitale Kompetenzen',ex:'Le competenze digitali sono essenziali.'},{w:'fare rete',p:'Verb',tr:'vernetzen',ex:'Crea una rete di contatti nel tuo settore.'},{w:'leadership',p:'Nomen',tr:'Führung',ex:'Una buona leadership ispira il team.'},{w:'pensione',p:'Nomen',tr:'Rente / Pension',ex:'Risparmia presto per la pensione.'}];
VKDB.it[9]=[{w:'società',p:'Nomen',tr:'Gesellschaft',ex:'Una società giusta avvantaggia tutti.'},{w:'cultura',p:'Nomen',tr:'Kultur',ex:'La cultura svizzera è molto diversa.'},{w:'tradizione',p:'Nomen',tr:'Tradition',ex:'Ogni paese ha le sue tradizioni.'},{w:'democrazia',p:'Nomen',tr:'Demokratie',ex:'La Svizzera è una democrazia diretta.'},{w:'governo',p:'Nomen',tr:'Regierung',ex:'Il governo ha approvato una nuova legge.'},{w:'legge',p:'Nomen',tr:'Gesetz',ex:'Rispetta la legge.'},{w:'diritti',p:'Nomen pl.',tr:'Rechte',ex:'Ogni persona ha diritti umani.'},{w:'uguaglianza',p:'Nomen',tr:'Gleichheit',ex:"L'uguaglianza è un valore fondamentale."},{w:'libertà',p:'Nomen',tr:'Freiheit',ex:'La libertà di parola è importante.'},{w:'votare',p:'Verb',tr:'abstimmen / wählen',ex:'I cittadini votano alle elezioni.'},{w:'media',p:'Nomen',tr:'Medien',ex:'I media influenzano le opinioni.'},{w:'internet',p:'Nomen',tr:'Internet',ex:'Internet connette il mondo.'},{w:'social media',p:'Nomen',tr:'soziale Medien',ex:'I social media possono creare dipendenza.'},{w:'fake news',p:'Nomen',tr:'Falschinformationen',ex:'Le fake news si diffondono rapidamente.'},{w:'globalizzazione',p:'Nomen',tr:'Globalisierung',ex:'La globalizzazione cambia le economie.'},{w:'migrazione',p:'Nomen',tr:'Migration',ex:'La migrazione è un argomento complesso.'},{w:'integrazione',p:'Nomen',tr:'Integration',ex:"L'integrazione aiuta i nuovi arrivati."},{w:'povertà',p:'Nomen',tr:'Armut',ex:'Combattere la povertà è un obiettivo globale.'},{w:'disuguaglianza',p:'Nomen',tr:'Ungleichheit',ex:'La disuguaglianza di reddito sta aumentando.'},{w:'pregiudizio',p:'Nomen',tr:'Vorurteil',ex:'Metti in discussione i tuoi pregiudizi.'},{w:'tolleranza',p:'Nomen',tr:'Toleranz',ex:'La tolleranza rende la società pacifica.'},{w:'rispetto',p:'Nomen',tr:'Respekt',ex:'Mostra rispetto verso gli altri.'},{w:'solidarietà',p:'Nomen',tr:'Solidarität',ex:'La solidarietà è fondamentale nei momenti difficili.'},{w:'conflitto',p:'Nomen',tr:'Konflikt',ex:'Il dialogo aiuta a risolvere i conflitti.'},{w:'pace',p:'Nomen',tr:'Frieden',ex:'Dobbiamo lavorare per la pace.'},{w:'giustizia',p:'Nomen',tr:'Gerechtigkeit',ex:'La giustizia deve essere equa.'},{w:'protestare',p:'Verb',tr:'protestieren',ex:'Le persone hanno protestato per strada.'},{w:'dibattere',p:'Verb',tr:'debattieren',ex:"C'è stato un acceso dibattito."},{w:'opinione',p:'Nomen',tr:'Meinung',ex:"Ognuno ha diritto a un'opinione."},{w:'argomento',p:'Nomen',tr:'Argument',ex:'Dai buoni argomenti nel dibattito.'},{w:'generazione',p:'Nomen',tr:'Generation',ex:'Ogni generazione affronta nuove sfide.'},{w:'valore',p:'Nomen',tr:'Wert',ex:"L'onestà è un valore importante."},{w:'identità',p:'Nomen',tr:'Identität',ex:'La lingua forma la nostra identità.'},{w:'minoranza',p:'Nomen',tr:'Minderheit',ex:'I diritti delle minoranze devono essere protetti.'},{w:'maggioranza',p:'Nomen',tr:'Mehrheit',ex:'La maggioranza ha votato sì.'},{w:'influenzare',p:'Verb',tr:'beeinflussen',ex:'La pubblicità influenza i consumatori.'},{w:'responsabilità',p:'Nomen',tr:'Verantwortung',ex:'Abbiamo una responsabilità verso le generazioni future.'},{w:'comunità',p:'Nomen',tr:'Gemeinschaft',ex:'Una comunità forte aiuta tutti.'},{w:'iniziativa',p:'Nomen',tr:'Initiative',ex:"Prendi l'iniziativa per cambiare le cose."},{w:'campagna',p:'Nomen',tr:'Kampagne',ex:'Ha condotto una campagna di successo.'}];
VKDB.es[0]=[{w:'hola',p:'Ausruf',tr:'Hallo',ex:'¡Hola! ¿Cómo te llamas?'},{w:'adiós',p:'Ausruf',tr:'auf Wiedersehen',ex:'¡Adiós! Hasta mañana.'},{w:'gracias',p:'Ausruf',tr:'Danke',ex:'¡Muchas gracias!'},{w:'por favor',p:'Ausdruck',tr:'bitte',ex:'Un café, por favor.'},{w:'perdona',p:'Ausruf',tr:'Entschuldigung',ex:'Perdona, ¿dónde está la estación?'},{w:'sí',p:'Adv.',tr:'ja',ex:'Sí, entiendo.'},{w:'no',p:'Adv.',tr:'nein',ex:'No, no es correcto.'},{w:'me llamo',p:'Ausdruck',tr:'ich heisse',ex:'Me llamo Carlos.'},{w:'tengo … años',p:'Ausdruck',tr:'ich bin … Jahre alt',ex:'Tengo doce años.'},{w:'¿de dónde eres?',p:'Ausdruck',tr:'woher bist du',ex:'¿De dónde eres?'},{w:'encantado/a',p:'Adj.',tr:'freut mich',ex:'¡Encantado de conocerte!'},{w:'¿cómo estás?',p:'Ausdruck',tr:"wie geht's dir",ex:'¿Cómo estás hoy?'},{w:'muy bien',p:'Ausdruck',tr:'sehr gut',ex:'Muy bien, gracias.'},{w:'¿qué?',p:'Fragewort',tr:'was',ex:'¿Qué haces?'},{w:'¿dónde?',p:'Fragewort',tr:'wo / woher',ex:'¿Dónde vives?'},{w:'¿cuántos años tienes?',p:'Ausdruck',tr:'wie alt bist du',ex:'¿Cuántos años tienes?'},{w:'vivir',p:'Verb',tr:'wohnen / leben',ex:'Vivo en Zúrich.'},{w:'hablar',p:'Verb',tr:'sprechen',ex:'Hablo español y alemán.'},{w:'aprender',p:'Verb',tr:'lernen',ex:'Aprendo español en la escuela.'},{w:'entender',p:'Verb',tr:'verstehen',ex:'No entiendo.'},{w:'despacio',p:'Adv.',tr:'langsam',ex:'Habla más despacio, por favor.'},{w:'amigo/a',p:'Nomen',tr:'Freund / Freundin',ex:'Este es mi amigo Pedro.'},{w:'clase',p:'Nomen',tr:'Klasse',ex:'Estamos en la quinta clase.'},{w:'profesor/a',p:'Nomen',tr:'Lehrer / Lehrerin',ex:'Mi profesor es muy simpático.'},{w:'alumno/a',p:'Nomen',tr:'Schüler / Schülerin',ex:'Es una buena alumna.'},{w:'escuela',p:'Nomen',tr:'Schule',ex:'Voy a la escuela cada día.'},{w:'país',p:'Nomen',tr:'Land',ex:'Suiza es un país pequeño.'},{w:'idioma',p:'Nomen',tr:'Sprache',ex:'El español es un idioma mundial.'},{w:'presentarse',p:'Verb',tr:'sich vorstellen',ex:'Voy a presentarme.'},{w:'nacionalidad',p:'Nomen',tr:'Nationalität',ex:'Mi nacionalidad es suiza.'},{w:'dirección',p:'Nomen',tr:'Adresse',ex:'¿Cuál es tu dirección?'},{w:'número de teléfono',p:'Nomen',tr:'Telefonnummer',ex:'¿Cuál es tu número?'},{w:'simpático/a',p:'Adj.',tr:'nett / sympathisch',ex:'Es muy simpático.'},{w:'contento/a',p:'Adj.',tr:'froh / glücklich',ex:'Estoy contento de conocerte.'},{w:'bienvenido/a',p:'Ausruf',tr:'willkommen',ex:'¡Bienvenido a nuestra escuela!'},{w:'pregunta',p:'Nomen',tr:'Frage',ex:'¿Tienes una pregunta?'},{w:'respuesta',p:'Nomen',tr:'Antwort',ex:'La respuesta es correcta.'},{w:'otra vez',p:'Ausdruck',tr:'nochmal',ex:'Otra vez, por favor.'},{w:'aquí está',p:'Ausdruck',tr:'da ist es',ex:'Aquí está mi cuaderno.'},{w:'de acuerdo',p:'Ausruf',tr:'einverstanden',ex:'¡De acuerdo, vamos!'}];
VKDB.es[1]=[{w:'madre',p:'Nomen',tr:'Mutter',ex:'Mi madre trabaja en casa.'},{w:'padre',p:'Nomen',tr:'Vater',ex:'Mi padre es médico.'},{w:'hermana',p:'Nomen',tr:'Schwester',ex:'Tengo una hermana.'},{w:'hermano',p:'Nomen',tr:'Bruder',ex:'Mi hermano tiene ocho años.'},{w:'abuela',p:'Nomen',tr:'Grossmutter',ex:'Mi abuela hace pasteles.'},{w:'abuelo',p:'Nomen',tr:'Grossvater',ex:'Mi abuelo lee el periódico.'},{w:'padres',p:'Nomen pl.',tr:'Eltern',ex:'Mis padres son amables.'},{w:'familia',p:'Nomen',tr:'Familie',ex:'Mi familia tiene cuatro miembros.'},{w:'niño/a',p:'Nomen',tr:'Kind',ex:'Es un niño feliz.'},{w:'bebé',p:'Nomen',tr:'Baby',ex:'El bebé está durmiendo.'},{w:'casa',p:'Nomen',tr:'Haus',ex:'Vivimos en una casa grande.'},{w:'piso',p:'Nomen',tr:'Wohnung',ex:'Tenemos un piso en la ciudad.'},{w:'habitación',p:'Nomen',tr:'Zimmer',ex:'Mi habitación está en el primer piso.'},{w:'cocina',p:'Nomen',tr:'Küche',ex:'Comemos en la cocina.'},{w:'salón',p:'Nomen',tr:'Wohnzimmer',ex:'El salón es acogedor.'},{w:'baño',p:'Nomen',tr:'Badezimmer',ex:'El baño está limpio.'},{w:'jardín',p:'Nomen',tr:'Garten',ex:'Jugamos en el jardín.'},{w:'puerta',p:'Nomen',tr:'Tür',ex:'Cierra la puerta, por favor.'},{w:'ventana',p:'Nomen',tr:'Fenster',ex:'¡Abre la ventana!'},{w:'mesa',p:'Nomen',tr:'Tisch',ex:'El libro está encima de la mesa.'},{w:'silla',p:'Nomen',tr:'Stuhl',ex:'Siéntate en la silla.'},{w:'cama',p:'Nomen',tr:'Bett',ex:'Me voy a la cama a las nueve.'},{w:'grande',p:'Adj.',tr:'gross',ex:'La casa es muy grande.'},{w:'pequeño/a',p:'Adj.',tr:'klein',ex:'Mi habitación es pequeña.'},{w:'limpio/a',p:'Adj.',tr:'sauber',ex:'Mantén tu habitación limpia.'},{w:'tío',p:'Nomen',tr:'Onkel',ex:'Mi tío vive en Madrid.'},{w:'tía',p:'Nomen',tr:'Tante',ex:'Mi tía tiene dos gatos.'},{w:'primo/a',p:'Nomen',tr:'Cousin / Cousine',ex:'Mi primo es divertido.'},{w:'mascota',p:'Nomen',tr:'Haustier',ex:'Tenemos un perro.'},{w:'perro',p:'Nomen',tr:'Hund',ex:'El perro duerme.'},{w:'gato',p:'Nomen',tr:'Katze',ex:'El gato bebe leche.'},{w:'vecino/a',p:'Nomen',tr:'Nachbar / Nachbarin',ex:'Nuestra vecina es simpática.'},{w:'arriba',p:'Adv.',tr:'oben',ex:'La habitación está arriba.'},{w:'abajo',p:'Adv.',tr:'unten',ex:'La cocina está abajo.'},{w:'nuevo/a',p:'Adj.',tr:'neu',ex:'Tenemos un piso nuevo.'},{w:'viejo/a',p:'Adj.',tr:'alt',ex:'Es un edificio viejo.'},{w:'vivir juntos',p:'Ausdruck',tr:'zusammenwohnen',ex:'Vivimos juntos en Zúrich.'},{w:'sofá',p:'Nomen',tr:'Sofa',ex:'El gato duerme en el sofá.'},{w:'lámpara',p:'Nomen',tr:'Lampe',ex:'¡Enciende la lámpara!'},{w:'tranquilo/a',p:'Adj.',tr:'ruhig',ex:'La habitación está tranquila.'}];
VKDB.es[2]=[{w:'lección',p:'Nomen',tr:'Stunde / Lektion',ex:'La lección empieza a las ocho.'},{w:'asignatura',p:'Nomen',tr:'Fach',ex:'Las matemáticas son mi asignatura favorita.'},{w:'deberes',p:'Nomen pl.',tr:'Hausaufgaben',ex:'Hago los deberes después de la escuela.'},{w:'examen',p:'Nomen',tr:'Test / Prüfung',ex:'Tenemos un examen el viernes.'},{w:'nota',p:'Nomen',tr:'Note',ex:'He sacado una buena nota.'},{w:'lápiz',p:'Nomen',tr:'Bleistift',ex:'¿Me prestas tu lápiz?'},{w:'goma',p:'Nomen',tr:'Radiergummi',ex:'Necesito una goma.'},{w:'regla',p:'Nomen',tr:'Lineal',ex:'Usa la regla para trazar una línea.'},{w:'cuaderno',p:'Nomen',tr:'Heft',ex:'Escribe en tu cuaderno.'},{w:'mochila',p:'Nomen',tr:'Schultasche',ex:'Mi mochila es muy pesada.'},{w:'horario',p:'Nomen',tr:'Stundenplan',ex:'Mira tu horario.'},{w:'recreo',p:'Nomen',tr:'Pause',ex:'Jugamos durante el recreo.'},{w:'comedor',p:'Nomen',tr:'Mensa',ex:'Comemos en el comedor.'},{w:'gimnasio',p:'Nomen',tr:'Turnhalle',ex:'Tenemos educación física en el gimnasio.'},{w:'biblioteca',p:'Nomen',tr:'Bibliothek',ex:'Saca un libro de la biblioteca.'},{w:'leer',p:'Verb',tr:'lesen',ex:'Leo cada noche.'},{w:'escribir',p:'Verb',tr:'schreiben',ex:'Escribe tu nombre en el papel.'},{w:'escuchar',p:'Verb',tr:'zuhören',ex:'Escucha al profesor con atención.'},{w:'hablar',p:'Verb',tr:'sprechen',ex:'Habla más alto, por favor.'},{w:'repetir',p:'Verb',tr:'wiederholen',ex:'Repite la frase.'},{w:'mañana',p:'Nomen',tr:'Morgen',ex:'Me despierto por la mañana.'},{w:'tarde',p:'Nomen',tr:'Nachmittag',ex:'La escuela termina por la tarde.'},{w:'noche',p:'Nomen',tr:'Abend / Nacht',ex:'Leo por la noche.'},{w:'temprano',p:'Adv.',tr:'früh',ex:'Me levanto temprano.'},{w:'siempre',p:'Adv.',tr:'immer',ex:'Siempre hago los deberes.'},{w:'a veces',p:'Adv.',tr:'manchmal',ex:'A veces olvido el lápiz.'},{w:'nunca',p:'Adv.',tr:'nie',ex:'Nunca copio en los exámenes.'},{w:'a menudo',p:'Adv.',tr:'oft',ex:'A menudo voy a la escuela a pie.'},{w:'buenas noches',p:'Ausruf',tr:'Gute Nacht',ex:'¡Buenas noches!'},{w:'muy tarde',p:'Ausdruck',tr:'sehr spät',ex:'No llegues muy tarde.'},{w:'levantarse',p:'Verb',tr:'aufstehen',ex:'Me levanto a las siete.'},{w:'desayunar',p:'Verb',tr:'frühstücken',ex:'Desayuno en casa.'},{w:'ir a la escuela',p:'Verb',tr:'in die Schule gehen',ex:'Voy a la escuela en autobús.'},{w:'volver a casa',p:'Verb',tr:'nach Hause kommen',ex:'Vuelvo a casa a las cuatro.'},{w:'acostarse',p:'Verb',tr:'ins Bett gehen',ex:'Me acuesto a las nueve.'},{w:'lavarse los dientes',p:'Verb',tr:'Zähne putzen',ex:'Lávate los dientes dos veces al día.'},{w:'lavarse',p:'Verb',tr:'sich waschen',ex:'Lávate las manos.'},{w:'ordenar',p:'Verb',tr:'aufräumen',ex:'Ordena tu habitación.'},{w:'ayudar',p:'Verb',tr:'helfen',ex:'¿Puedes ayudarme?'},{w:'vestirse',p:'Verb',tr:'sich anziehen',ex:'Vístete rápido por la mañana.'}];
VKDB.es[3]=[{w:'pan',p:'Nomen',tr:'Brot',ex:'Como pan en el desayuno.'},{w:'mantequilla',p:'Nomen',tr:'Butter',ex:'Pon mantequilla en el pan.'},{w:'queso',p:'Nomen',tr:'Käse',ex:'El queso suizo es famoso.'},{w:'leche',p:'Nomen',tr:'Milch',ex:'Los niños beben leche.'},{w:'huevo',p:'Nomen',tr:'Ei',ex:'Como un huevo cada mañana.'},{w:'manzana',p:'Nomen',tr:'Apfel',ex:'Una manzana al día es saludable.'},{w:'plátano',p:'Nomen',tr:'Banane',ex:'El plátano da energía.'},{w:'naranja',p:'Nomen',tr:'Orange',ex:'Bebo zumo de naranja.'},{w:'verdura',p:'Nomen',tr:'Gemüse',ex:'¡Come más verdura!'},{w:'patata',p:'Nomen',tr:'Kartoffel',ex:'Comemos patatas para cenar.'},{w:'carne',p:'Nomen',tr:'Fleisch',ex:'No como mucha carne.'},{w:'pescado',p:'Nomen',tr:'Fisch',ex:'El pescado es saludable.'},{w:'arroz',p:'Nomen',tr:'Reis',ex:'El arroz se come en todo el mundo.'},{w:'pasta',p:'Nomen',tr:'Nudeln / Pasta',ex:'La pasta es mi plato favorito.'},{w:'sopa',p:'Nomen',tr:'Suppe',ex:'La sopa caliente reconforta.'},{w:'ensalada',p:'Nomen',tr:'Salat',ex:'Como una ensalada al mediodía.'},{w:'pastel',p:'Nomen',tr:'Kuchen',ex:'Mi abuela hace un pastel estupendo.'},{w:'chocolate',p:'Nomen',tr:'Schokolade',ex:'El chocolate suizo es el mejor.'},{w:'agua',p:'Nomen',tr:'Wasser',ex:'Bebe dos litros de agua al día.'},{w:'zumo',p:'Nomen',tr:'Saft',ex:'Bebo zumo de manzana en el desayuno.'},{w:'tener hambre',p:'Ausdruck',tr:'hungrig sein',ex:'¡Tengo mucha hambre!'},{w:'tener sed',p:'Ausdruck',tr:'durstig sein',ex:'¿Tienes sed?'},{w:'delicioso/a',p:'Adj.',tr:'lecker / köstlich',ex:'Esta sopa está deliciosa.'},{w:'dulce',p:'Adj.',tr:'süss',ex:'Este pastel está muy dulce.'},{w:'salado/a',p:'Adj.',tr:'salzig',ex:'Las patatas fritas están muy saladas.'},{w:'caliente',p:'Adj.',tr:'heiss',ex:'La sopa está muy caliente.'},{w:'frío/a',p:'Adj.',tr:'kalt',ex:'Me gustan las bebidas frías.'},{w:'cocinar',p:'Verb',tr:'kochen',ex:'Mi madre cocina cada noche.'},{w:'comer',p:'Verb',tr:'essen',ex:'Comemos a mediodía.'},{w:'beber',p:'Verb',tr:'trinken',ex:'Bebe agua después del deporte.'},{w:'desayuno',p:'Nomen',tr:'Frühstück',ex:'El desayuno es la comida más importante.'},{w:'almuerzo',p:'Nomen',tr:'Mittagessen',ex:'Almuerzo en el comedor.'},{w:'cena',p:'Nomen',tr:'Abendessen',ex:'La cena es a las siete.'},{w:'merienda',p:'Nomen',tr:'Znüni / Snack',ex:'Como una merienda después de la escuela.'},{w:'receta',p:'Nomen',tr:'Rezept',ex:'Sigue la receta paso a paso.'},{w:'ingrediente',p:'Nomen',tr:'Zutat',ex:'¿Qué ingredientes necesitamos?'},{w:'probar',p:'Verb',tr:'kosten / schmecken',ex:'¡Prueba la salsa!'},{w:'pedir',p:'Verb',tr:'bestellen',ex:'Pido una pizza.'},{w:'menú',p:'Nomen',tr:'Speisekarte',ex:'¿Puedo ver el menú?'},{w:'restaurante',p:'Nomen',tr:'Restaurant',ex:'Comemos en el restaurante los domingos.'}];
VKDB.es[4]=[{w:'afición',p:'Nomen',tr:'Hobby / Freizeit',ex:'Mi afición favorita es la pintura.'},{w:'deporte',p:'Nomen',tr:'Sport',ex:'Hago deporte tres veces a la semana.'},{w:'fútbol',p:'Nomen',tr:'Fussball',ex:'Juego al fútbol con amigos.'},{w:'natación',p:'Nomen',tr:'Schwimmen',ex:'La natación es buena para el cuerpo.'},{w:'ciclismo',p:'Nomen',tr:'Radfahren',ex:'El ciclismo es divertido y saludable.'},{w:'música',p:'Nomen',tr:'Musik',ex:'Escucho música cada día.'},{w:'lectura',p:'Nomen',tr:'Lesen',ex:'La lectura es mi pasatiempo favorito.'},{w:'dibujo',p:'Nomen',tr:'Zeichnen',ex:'Le encanta dibujar animales.'},{w:'baile',p:'Nomen',tr:'Tanzen',ex:'El baile hace feliz.'},{w:'cocina',p:'Nomen',tr:'Kochen',ex:'Me gusta cocinar con la familia.'},{w:'cine',p:'Nomen',tr:'Kino',ex:'Vamos al cine los sábados.'},{w:'teatro',p:'Nomen',tr:'Theater',ex:'La obra de teatro fue increíble.'},{w:'museo',p:'Nomen',tr:'Museum',ex:'Visitamos un museo.'},{w:'parque',p:'Nomen',tr:'Park',ex:'Paseo por el parque después de la escuela.'},{w:'concierto',p:'Nomen',tr:'Konzert',ex:'El concierto fue fantástico.'},{w:'equipo',p:'Nomen',tr:'Team / Mannschaft',ex:'Estoy en un equipo de fútbol.'},{w:'partido',p:'Nomen',tr:'Spiel / Match',ex:'¡Ganamos el partido!'},{w:'entrenar',p:'Verb',tr:'trainieren / üben',ex:'Me entreno a la guitarra cada día.'},{w:'ganar',p:'Verb',tr:'gewinnen',ex:'Nuestro equipo siempre gana.'},{w:'perder',p:'Verb',tr:'verlieren',ex:'A veces se puede perder.'},{w:'tiempo libre',p:'Nomen',tr:'Freizeit',ex:'Me encanta mi tiempo libre.'},{w:'fin de semana',p:'Nomen',tr:'Wochenende',ex:'¿Qué haces el fin de semana?'},{w:'vacaciones',p:'Nomen pl.',tr:'Ferien',ex:'Las vacaciones de verano son en julio.'},{w:'gustar',p:'Verb',tr:'mögen / geniessen',ex:'Me gusta jugar al ajedrez.'},{w:'emocionante',p:'Adj.',tr:'spannend / aufregend',ex:'El partido fue muy emocionante.'},{w:'aburrido/a',p:'Adj.',tr:'langweilig',ex:'Encuentro el ajedrez aburrido.'},{w:'favorito/a',p:'Adj.',tr:'Lieblings-',ex:'Mi deporte favorito es el tenis.'},{w:'juntos',p:'Adv.',tr:'zusammen',ex:'Jugamos juntos cada sábado.'},{w:'fuera',p:'Adv.',tr:'draussen',ex:'Me encanta estar fuera.'},{w:'dentro',p:'Adv.',tr:'drinnen',ex:'Los días de lluvia me quedo dentro.'},{w:'instrumento',p:'Nomen',tr:'Instrument',ex:'Toco un instrumento musical.'},{w:'guitarra',p:'Nomen',tr:'Gitarre',ex:'Ella toca la guitarra muy bien.'},{w:'piano',p:'Nomen',tr:'Klavier',ex:'Tomo clases de piano.'},{w:'club',p:'Nomen',tr:'Verein / Club',ex:'Estoy en un club deportivo.'},{w:'entrenamiento',p:'Nomen',tr:'Training',ex:'El entrenamiento de fútbol es el martes.'},{w:'coleccionar',p:'Verb',tr:'sammeln',ex:'Colecciono sellos.'},{w:'pintar',p:'Verb',tr:'malen',ex:'Ella pinta cuadros hermosos.'},{w:'fotografiar',p:'Verb',tr:'fotografieren',ex:'Me encanta fotografiar la naturaleza.'},{w:'relajarse',p:'Verb',tr:'entspannen',ex:'Me relajo leyendo.'},{w:'pasear',p:'Verb',tr:'spazieren gehen',ex:'Paseamos por el parque.'}];
VKDB.es[5]=[{w:'viajar',p:'Verb',tr:'reisen',ex:'Me encanta viajar en tren.'},{w:'viaje',p:'Nomen',tr:'Reise',ex:'Hicimos un viaje estupendo.'},{w:'pasaporte',p:'Nomen',tr:'Pass',ex:'Muéstrame tu pasaporte, por favor.'},{w:'billete',p:'Nomen',tr:'Ticket / Billett',ex:'Compré un billete de tren.'},{w:'equipaje',p:'Nomen',tr:'Gepäck',ex:'Mi equipaje pesa demasiado.'},{w:'hotel',p:'Nomen',tr:'Hotel',ex:'Nos alojamos en un buen hotel.'},{w:'aeropuerto',p:'Nomen',tr:'Flughafen',ex:'Llegamos pronto al aeropuerto.'},{w:'estación de tren',p:'Nomen',tr:'Bahnhof',ex:'Quedamos en la estación de tren.'},{w:'andén',p:'Nomen',tr:'Perron / Gleis',ex:'El tren sale del andén 4.'},{w:'salida',p:'Nomen',tr:'Abfahrt',ex:'La salida es a las diez.'},{w:'llegada',p:'Nomen',tr:'Ankunft',ex:'La llegada a Zúrich es al mediodía.'},{w:'retraso',p:'Nomen',tr:'Verspätung',ex:'Hay un retraso de veinte minutos.'},{w:'reserva',p:'Nomen',tr:'Buchung',ex:'Hice una reserva online.'},{w:'mapa',p:'Nomen',tr:'Karte / Plan',ex:'Usa el mapa para orientarte.'},{w:'dirección',p:'Nomen',tr:'Richtung',ex:'Ve en la dirección correcta.'},{w:'todo recto',p:'Ausdruck',tr:'geradeaus',ex:'Sigue todo recto dos manzanas.'},{w:'a la izquierda',p:'Ausdruck',tr:'links',ex:'Gira a la izquierda en el semáforo.'},{w:'a la derecha',p:'Ausdruck',tr:'rechts',ex:'Gira a la derecha después del puente.'},{w:'lejos',p:'Adj.',tr:'weit',ex:'¿Está lejos de aquí?'},{w:'cerca',p:'Adj.',tr:'nah',ex:'La estación está cerca del hotel.'},{w:'autobús',p:'Nomen',tr:'Bus',ex:'Coge el autobús número doce.'},{w:'tranvía',p:'Nomen',tr:'Tram',ex:'El tranvía para aquí.'},{w:'metro',p:'Nomen',tr:'U-Bahn',ex:'El metro es rápido.'},{w:'taxi',p:'Nomen',tr:'Taxi',ex:'Coge un taxi al aeropuerto.'},{w:'avión',p:'Nomen',tr:'Flugzeug',ex:'El avión aterriza al mediodía.'},{w:'barco',p:'Nomen',tr:'Schiff / Boot',ex:'Tomamos un barco en el lago.'},{w:'bicicleta',p:'Nomen',tr:'Fahrrad / Velo',ex:'Voy a la escuela en bicicleta.'},{w:'coche',p:'Nomen',tr:'Auto',ex:'Mis padres tienen un coche pequeño.'},{w:'a pie',p:'Ausdruck',tr:'zu Fuss',ex:'Voy a la escuela a pie.'},{w:'cambiar',p:'Verb',tr:'umsteigen / wechseln',ex:'Hay que cambiar en Valencia.'},{w:'moneda',p:'Nomen',tr:'Währung',ex:'La moneda suiza es el franco.'},{w:'aduana',p:'Nomen',tr:'Zoll',ex:'Pasamos por la aduana.'},{w:'souvenir',p:'Nomen',tr:'Souvenir',ex:'Compré un souvenir para mi madre.'},{w:'visita guiada',p:'Nomen',tr:'Stadtführung',ex:'Hicimos una visita guiada.'},{w:'recomendar',p:'Verb',tr:'empfehlen',ex:'¿Puede recomendar un restaurante?'},{w:'hacer el check-in',p:'Verb',tr:'einchecken',ex:'Hacemos el check-in en el hotel.'},{w:'salir del hotel',p:'Verb',tr:'auschecken',ex:'Dejamos el hotel antes de las once.'},{w:'guía turístico/a',p:'Nomen',tr:'Reiseleiter / in',ex:'El guía habla cuatro idiomas.'},{w:'frontera',p:'Nomen',tr:'Grenze',ex:'Cruzamos la frontera.'},{w:'turista',p:'Nomen',tr:'Tourist / in',ex:'La ciudad recibe muchos turistas.'}];
VKDB.es[6]=[{w:'medio ambiente',p:'Nomen',tr:'Umwelt',ex:'Debemos proteger el medio ambiente.'},{w:'naturaleza',p:'Nomen',tr:'Natur',ex:'Me encanta pasar tiempo en la naturaleza.'},{w:'bosque',p:'Nomen',tr:'Wald',ex:'El bosque está lleno de animales.'},{w:'montaña',p:'Nomen',tr:'Berg',ex:'Suiza tiene muchas montañas.'},{w:'lago',p:'Nomen',tr:'See',ex:'Nos bañamos en el lago.'},{w:'río',p:'Nomen',tr:'Fluss',ex:'El Rin es un río largo.'},{w:'océano',p:'Nomen',tr:'Ozean / Meer',ex:'El plástico contamina el océano.'},{w:'isla',p:'Nomen',tr:'Insel',ex:'Cerdeña es una isla preciosa.'},{w:'clima',p:'Nomen',tr:'Klima',ex:'El cambio climático es un gran problema.'},{w:'tiempo',p:'Nomen',tr:'Wetter',ex:'El tiempo está soleado hoy.'},{w:'temperatura',p:'Nomen',tr:'Temperatur',ex:'La temperatura está bajando.'},{w:'lluvia',p:'Nomen',tr:'Regen',ex:'Mañana lloverá.'},{w:'nieve',p:'Nomen',tr:'Schnee',ex:'Los niños juegan en la nieve.'},{w:'viento',p:'Nomen',tr:'Wind',ex:'Sopla un viento fuerte.'},{w:'nube',p:'Nomen',tr:'Wolke',ex:'Se acercan nubes oscuras.'},{w:'sol',p:'Nomen',tr:'Sonne',ex:'El sol brilla con fuerza.'},{w:'tormenta',p:'Nomen',tr:'Sturm / Gewitter',ex:'Una tormenta golpeó la ciudad.'},{w:'contaminación',p:'Nomen',tr:'Verschmutzung',ex:'La contaminación del aire es grave.'},{w:'reciclaje',p:'Nomen',tr:'Recycling',ex:'El reciclaje ayuda al medio ambiente.'},{w:'energía',p:'Nomen',tr:'Energie',ex:'La energía solar es limpia.'},{w:'proteger',p:'Verb',tr:'schützen',ex:'Debemos proteger nuestros bosques.'},{w:'ahorrar',p:'Verb',tr:'sparen',ex:'Ahorra agua cada día.'},{w:'reducir',p:'Verb',tr:'reduzieren',ex:'Reduce los residuos plásticos.'},{w:'reutilizar',p:'Verb',tr:'wiederverwenden',ex:'Reutiliza las botellas de vidrio.'},{w:'reciclar',p:'Verb',tr:'recyceln',ex:'Recicla papel y plástico.'},{w:'plantar',p:'Verb',tr:'pflanzen',ex:'Plantamos un árbol en el jardín.'},{w:'amenazado/a',p:'Adj.',tr:'gefährdet',ex:'Muchos animales están amenazados.'},{w:'extinto/a',p:'Adj.',tr:'ausgestorben',ex:'El dodo está extinto.'},{w:'sostenible',p:'Adj.',tr:'nachhaltig',ex:'Necesitamos soluciones sostenibles.'},{w:'calentamiento global',p:'Nomen',tr:'Erderwärmung',ex:'El calentamiento global derrite los glaciares.'},{w:'combustible fósil',p:'Nomen',tr:'fossiler Brennstoff',ex:'Quemamos demasiados combustibles fósiles.'},{w:'renovable',p:'Adj.',tr:'erneuerbar',ex:'La energía renovable es el futuro.'},{w:'panel solar',p:'Nomen',tr:'Solaranlage',ex:'Los paneles solares producen electricidad.'},{w:'inundación',p:'Nomen',tr:'Überschwemmung',ex:'Las inundaciones pueden destruir pueblos.'},{w:'sequía',p:'Nomen',tr:'Dürre',ex:'La sequía destruyó las cosechas.'},{w:'deforestación',p:'Nomen',tr:'Abholzung',ex:'La deforestación destruye los hábitats.'},{w:'biodiversidad',p:'Nomen',tr:'Artenvielfalt',ex:'La biodiversidad es esencial para la vida.'},{w:'hábitat',p:'Nomen',tr:'Lebensraum',ex:'Los osos polares pierden su hábitat.'},{w:'carbono',p:'Nomen',tr:'Kohlenstoff / CO2',ex:'Reduce tu huella de carbono.'},{w:'emisión',p:'Nomen',tr:'Emission / Ausstoss',ex:'Las emisiones deben reducirse.'}];
VKDB.es[7]=[{w:'salud',p:'Nomen',tr:'Gesundheit',ex:'La salud es lo más importante.'},{w:'cuerpo',p:'Nomen',tr:'Körper',ex:'El deporte es bueno para el cuerpo.'},{w:'cabeza',p:'Nomen',tr:'Kopf',ex:'Me duele la cabeza.'},{w:'mano',p:'Nomen',tr:'Hand',ex:'Lávate las manos antes de comer.'},{w:'brazo',p:'Nomen',tr:'Arm',ex:'Se rompió el brazo.'},{w:'pierna',p:'Nomen',tr:'Bein',ex:'Me duele la pierna.'},{w:'estómago',p:'Nomen',tr:'Magen / Bauch',ex:'Me duele el estómago.'},{w:'espalda',p:'Nomen',tr:'Rücken',ex:'Me duele la espalda.'},{w:'garganta',p:'Nomen',tr:'Hals',ex:'Me duele la garganta.'},{w:'ojo',p:'Nomen',tr:'Auge',ex:'Ella tiene ojos verdes.'},{w:'médico/a',p:'Nomen',tr:'Arzt / Ärztin',ex:'Ayer fui al médico.'},{w:'hospital',p:'Nomen',tr:'Spital / Krankenhaus',ex:'Estuvo en el hospital dos días.'},{w:'medicamento',p:'Nomen',tr:'Medikament',ex:'Toma este medicamento dos veces al día.'},{w:'cita',p:'Nomen',tr:'Termin',ex:'Tengo una cita médica.'},{w:'dolor',p:'Nomen',tr:'Schmerz',ex:'El dolor era muy fuerte.'},{w:'fiebre',p:'Nomen',tr:'Fieber',ex:'Tiene mucha fiebre.'},{w:'resfriado',p:'Nomen',tr:'Erkältung',ex:'Tengo un resfriado esta semana.'},{w:'tos',p:'Nomen',tr:'Husten',ex:'La tos está mejorando.'},{w:'alergia',p:'Nomen',tr:'Allergie',ex:'Tengo alergia al polen.'},{w:'emergencia',p:'Nomen',tr:'Notfall',ex:'Llama al 112 en caso de emergencia.'},{w:'sano/a',p:'Adj.',tr:'gesund',ex:'Come sano cada día.'},{w:'enfermo/a',p:'Adj.',tr:'krank',ex:'Estaba enfermo la semana pasada.'},{w:'cansado/a',p:'Adj.',tr:'müde',ex:'Estoy muy cansado hoy.'},{w:'estresado/a',p:'Adj.',tr:'gestresst',ex:'Los exámenes me estresan.'},{w:'en forma',p:'Ausdruck',tr:'fit',ex:'El deporte te mantiene en forma.'},{w:'hacer ejercicio',p:'Verb',tr:'Sport machen',ex:'Haz ejercicio 30 minutos al día.'},{w:'dormir',p:'Verb',tr:'schlafen',ex:'Duerme al menos ocho horas.'},{w:'descansar',p:'Verb',tr:'ausruhen',ex:'Descansa cuando estés enfermo.'},{w:'recuperarse',p:'Verb',tr:'genesen / heilen',ex:'Se recuperó rápidamente.'},{w:'doler',p:'Verb',tr:'wehtun',ex:'Me duele la rodilla.'},{w:'nutrición',p:'Nomen',tr:'Ernährung',ex:'Una buena nutrición es esencial.'},{w:'vitamina',p:'Nomen',tr:'Vitamin',ex:'La fruta contiene muchas vitaminas.'},{w:'higiene',p:'Nomen',tr:'Hygiene',ex:'La higiene personal previene enfermedades.'},{w:'vacuna',p:'Nomen',tr:'Impfung',ex:'Vacúnate a tiempo.'},{w:'operación',p:'Nomen',tr:'Operation',ex:'La operación fue un éxito.'},{w:'salud mental',p:'Nomen',tr:'psychische Gesundheit',ex:'La salud mental es igual de importante.'},{w:'estrés',p:'Nomen',tr:'Stress',ex:'Demasiado estrés es perjudicial.'},{w:'equilibrio',p:'Nomen',tr:'Balance / Gleichgewicht',ex:'Encuentra el equilibrio entre trabajo y descanso.'},{w:'síntoma',p:'Nomen',tr:'Symptom',ex:'Describe tus síntomas al médico.'},{w:'tratamiento',p:'Nomen',tr:'Behandlung',ex:'El tratamiento dura dos semanas.'}];
VKDB.es[8]=[{w:'trabajo',p:'Nomen',tr:'Arbeit / Beruf',ex:'Mi madre tiene un buen trabajo.'},{w:'trabajar',p:'Verb',tr:'arbeiten',ex:'Trabaja en un hospital.'},{w:'carrera',p:'Nomen',tr:'Karriere',ex:'Tiene una gran carrera por delante.'},{w:'salario',p:'Nomen',tr:'Gehalt / Lohn',ex:'Un buen salario es importante.'},{w:'entrevista',p:'Nomen',tr:'Vorstellungsgespräch',ex:'Tengo una entrevista de trabajo mañana.'},{w:'solicitar',p:'Verb',tr:'sich bewerben',ex:'Solicité el puesto.'},{w:'CV',p:'Nomen',tr:'Lebenslauf',ex:'Escribe un CV claro.'},{w:'cualificación',p:'Nomen',tr:'Qualifikation',ex:'Tiene muchas cualificaciones.'},{w:'aprendizaje',p:'Nomen',tr:'Lehre',ex:'Está haciendo un aprendizaje.'},{w:'universidad',p:'Nomen',tr:'Universität',ex:'Estudia en la universidad.'},{w:'ingeniero/a',p:'Nomen',tr:'Ingenieur / in',ex:'Es ingeniera informática.'},{w:'enfermero/a',p:'Nomen',tr:'Krankenpfleger / in',ex:'La enfermera fue muy amable.'},{w:'abogado/a',p:'Nomen',tr:'Anwalt / Anwältin',ex:'Se convirtió en abogado de éxito.'},{w:'arquitecto/a',p:'Nomen',tr:'Architekt / in',ex:'El arquitecto diseñó un museo.'},{w:'empresario/a',p:'Nomen',tr:'Unternehmer / in',ex:'Es una joven empresaria.'},{w:'empleado/a',p:'Nomen',tr:'Angestellte / r',ex:'La empresa tiene 200 empleados.'},{w:'empleador',p:'Nomen',tr:'Arbeitgeber / in',ex:'Mi empleador es muy justo.'},{w:'colega',p:'Nomen',tr:'Kollege / Kollegin',ex:'Mis colegas son simpáticos.'},{w:'reunión',p:'Nomen',tr:'Sitzung / Meeting',ex:'Tenemos una reunión a las nueve.'},{w:'plazo',p:'Nomen',tr:'Frist',ex:'El plazo es el viernes.'},{w:'objetivo',p:'Nomen',tr:'Ziel',ex:'Fija objetivos claros para tu futuro.'},{w:'ambición',p:'Nomen',tr:'Ehrgeiz',ex:'Tiene mucha ambición.'},{w:'habilidad',p:'Nomen',tr:'Fähigkeit / Kompetenz',ex:'La comunicación es una habilidad clave.'},{w:'experiencia',p:'Nomen',tr:'Erfahrung',ex:'La experiencia laboral es valiosa.'},{w:'responsabilidad',p:'Nomen',tr:'Verantwortung',ex:'Este trabajo tiene mucha responsabilidad.'},{w:'trabajo en equipo',p:'Nomen',tr:'Teamarbeit',ex:'El trabajo en equipo es esencial.'},{w:'creativo/a',p:'Adj.',tr:'kreativ',ex:'Sé creativo en la resolución de problemas.'},{w:'motivado/a',p:'Adj.',tr:'motiviert',ex:'Está muy motivada.'},{w:'flexible',p:'Adj.',tr:'flexibel',ex:'El puesto exige una persona flexible.'},{w:'alcanzar',p:'Verb',tr:'erreichen',ex:'Ha alcanzado excelentes resultados.'},{w:'ser ascendido/a',p:'Verb',tr:'befördert werden',ex:'Fue ascendido a director.'},{w:'jubilarse',p:'Verb',tr:'in Rente gehen',ex:'Se jubilará a los 65 años.'},{w:'voluntario/a',p:'Nomen',tr:'Freiwillige / r',ex:'Muchos voluntarios ayudan en la comunidad.'},{w:'prácticas',p:'Nomen',tr:'Praktikum',ex:'Hizo prácticas en Zúrich.'},{w:'teletrabajo',p:'Nomen',tr:'Homeoffice',ex:'El teletrabajo es muy común.'},{w:'automatización',p:'Nomen',tr:'Automatisierung',ex:'La automatización cambia el mercado laboral.'},{w:'habilidades digitales',p:'Nomen',tr:'digitale Kompetenzen',ex:'Las habilidades digitales son esenciales.'},{w:'hacer contactos',p:'Verb',tr:'vernetzen',ex:'Haz contactos en tu sector profesional.'},{w:'liderazgo',p:'Nomen',tr:'Führung / Leadership',ex:'Un buen liderazgo inspira al equipo.'},{w:'pensión',p:'Nomen',tr:'Rente / Pension',ex:'Ahorra pronto para la pensión.'}];
VKDB.es[9]=[{w:'sociedad',p:'Nomen',tr:'Gesellschaft',ex:'Una sociedad justa beneficia a todos.'},{w:'cultura',p:'Nomen',tr:'Kultur',ex:'La cultura suiza es muy diversa.'},{w:'tradición',p:'Nomen',tr:'Tradition',ex:'Cada país tiene sus tradiciones.'},{w:'democracia',p:'Nomen',tr:'Demokratie',ex:'Suiza es una democracia directa.'},{w:'gobierno',p:'Nomen',tr:'Regierung',ex:'El gobierno aprobó una nueva ley.'},{w:'ley',p:'Nomen',tr:'Gesetz',ex:'Respeta la ley.'},{w:'derechos',p:'Nomen pl.',tr:'Rechte',ex:'Toda persona tiene derechos humanos.'},{w:'igualdad',p:'Nomen',tr:'Gleichheit',ex:'La igualdad es un valor fundamental.'},{w:'libertad',p:'Nomen',tr:'Freiheit',ex:'La libertad de expresión es importante.'},{w:'votar',p:'Verb',tr:'abstimmen / wählen',ex:'Los ciudadanos votan en las elecciones.'},{w:'medios de comunicación',p:'Nomen',tr:'Medien',ex:'Los medios influyen en las opiniones.'},{w:'internet',p:'Nomen',tr:'Internet',ex:'Internet conecta el mundo.'},{w:'redes sociales',p:'Nomen',tr:'soziale Medien',ex:'Las redes sociales pueden ser adictivas.'},{w:'noticias falsas',p:'Nomen',tr:'Falschinformationen',ex:'Las noticias falsas se propagan rápido.'},{w:'globalización',p:'Nomen',tr:'Globalisierung',ex:'La globalización cambia las economías.'},{w:'migración',p:'Nomen',tr:'Migration',ex:'La migración es un tema complejo.'},{w:'integración',p:'Nomen',tr:'Integration',ex:'La integración ayuda a los recién llegados.'},{w:'pobreza',p:'Nomen',tr:'Armut',ex:'Combatir la pobreza es un objetivo global.'},{w:'desigualdad',p:'Nomen',tr:'Ungleichheit',ex:'La desigualdad de ingresos está aumentando.'},{w:'prejuicio',p:'Nomen',tr:'Vorurteil',ex:'Cuestiona tus propios prejuicios.'},{w:'tolerancia',p:'Nomen',tr:'Toleranz',ex:'La tolerancia hace la sociedad pacífica.'},{w:'respeto',p:'Nomen',tr:'Respekt',ex:'Muestra respeto hacia los demás.'},{w:'solidaridad',p:'Nomen',tr:'Solidarität',ex:'La solidaridad es clave en momentos difíciles.'},{w:'conflicto',p:'Nomen',tr:'Konflikt',ex:'El diálogo ayuda a resolver conflictos.'},{w:'paz',p:'Nomen',tr:'Frieden',ex:'Debemos trabajar por la paz.'},{w:'justicia',p:'Nomen',tr:'Gerechtigkeit',ex:'La justicia debe ser equitativa.'},{w:'protestar',p:'Verb',tr:'protestieren',ex:'La gente protestó en la calle.'},{w:'debatir',p:'Verb',tr:'debattieren',ex:'Hubo un acalorado debate.'},{w:'opinión',p:'Nomen',tr:'Meinung',ex:'Todos tienen derecho a una opinión.'},{w:'argumento',p:'Nomen',tr:'Argument',ex:'Da buenos argumentos en el debate.'},{w:'generación',p:'Nomen',tr:'Generation',ex:'Cada generación enfrenta nuevos desafíos.'},{w:'valor',p:'Nomen',tr:'Wert',ex:'La honestidad es un valor importante.'},{w:'identidad',p:'Nomen',tr:'Identität',ex:'El idioma forma nuestra identidad.'},{w:'minoría',p:'Nomen',tr:'Minderheit',ex:'Los derechos de las minorías deben protegerse.'},{w:'mayoría',p:'Nomen',tr:'Mehrheit',ex:'La mayoría votó sí.'},{w:'influir',p:'Verb',tr:'beeinflussen',ex:'La publicidad influye en los consumidores.'},{w:'responsabilidad',p:'Nomen',tr:'Verantwortung',ex:'Tenemos responsabilidad hacia las generaciones futuras.'},{w:'comunidad',p:'Nomen',tr:'Gemeinschaft',ex:'Una comunidad fuerte ayuda a todos.'},{w:'iniciativa',p:'Nomen',tr:'Initiative',ex:'Toma la iniciativa para cambiar las cosas.'},{w:'campaña',p:'Nomen',tr:'Kampagne',ex:'Llevó una campaña exitosa.'}];


// ═══════════════════════════════════════════
// MATHE Z1 — ADAPTIV (Phase 6 Sprint 7: +Multiplikation Z1)
// ═══════════════════════════════════════════
function genMZ1(type,skill){
  let max=10;
  if(skill>=2)max=20; if(skill>=3)max=50; if(skill>=4)max=100; if(skill>=5)max=200;
  const a=Math.floor(Math.random()*max)+1;
  const b=Math.floor(Math.random()*(max/2))+1;
  if(type==='addition')return{q:`${a} + ${b} = ?`,a:String(a+b)};
  if(type==='subtraktion'){const big=Math.max(a,b),sm=Math.min(a,b);return{q:`${big} − ${sm} = ?`,a:String(big-sm)};}

  // LP21 Z1: Verdoppeln (Zahl × 2)
  if(type==='verdoppeln'){
    const n=skill<=1?Math.floor(Math.random()*10)+1:skill<=2?Math.floor(Math.random()*20)+1:Math.floor(Math.random()*50)+1;
    return{q:`${n} + ${n} = ?\n(Verdopple ${n})`,a:String(n*2)};
  }
  // LP21 Z1: Halbieren (gerade Zahl ÷ 2)
  if(type==='halbieren'){
    const maxH=skill<=1?10:skill<=2?20:50;
    const n=(Math.floor(Math.random()*(maxH/2))+1)*2; // immer gerade
    return{q:`${n} ÷ 2 = ?\n(Halbiere ${n})`,a:String(n/2)};
  }
  // LP21 Z1: Zehnerübergang (z.B. 8+5, 13-6)
  if(type==='zehner'){
    const base=Math.floor(Math.random()*9)+2; // 2–10
    const add=Math.floor(Math.random()*(10-base+1))+1;
    const sum=base+add;
    if(Math.random()<0.5)return{q:`${base} + ${add} = ?`,a:String(sum)};
    else return{q:`${sum} − ${add} = ?`,a:String(base)};
  }

  // LP21 Z1: Multiplikation als Einführung (Wiederholung gleicher Summanden)
  if(type==='mal_einf'){
    // Einstieg: x × kleine Zahl, Zahlenraum bis 30
    const factor = skill<=1 ? 2 : skill<=2 ? 3 : skill<=3 ? 4 : 5;
    const times  = Math.floor(Math.random()*(factor<=2?5:factor<=3?6:8))+1;
    // Zeige auch die Additions-Darstellung als Hinweis (Level 1)
    if(skill<=1){
      const addStr = Array(times).fill(factor).join(' + ');
      return{q:`${times} × ${factor} = ?\n(${addStr})`,a:String(times*factor),hint:addStr};
    }
    return{q:`${times} × ${factor} = ?`,a:String(times*factor)};
  }

  // Einmaleins 1×1 bis 10×10
  if(type==='mal_reihen'){
    const reihe = skill<=1 ? Math.floor(Math.random()*3)+1  // 1-3
                : skill<=2 ? Math.floor(Math.random()*5)+1  // 1-5
                : skill<=3 ? Math.floor(Math.random()*8)+1  // 1-8
                :            Math.floor(Math.random()*10)+1; // 1-10
    const b2 = Math.floor(Math.random()*10)+1;
    return{q:`${reihe} × ${b2} = ?`,a:String(reihe*b2)};
  }

  if(type==='mix'){
    const pool=['addition','subtraktion','verdoppeln','halbieren','zehner'];
    if(skill>=2)pool.push('mal_einf');
    if(skill>=3)pool.push('mal_reihen');
    return genMZ1(pool[Math.floor(Math.random()*pool.length)],skill);
  }
  return genMZ1('addition',skill);
}

function nextMZ1(){
  const m=MZ.z1; m.task=genMZ1(m.type,m.skill);
  const taskEl=document.getElementById('mz1-task');
  // Render \n as line breaks for hints
  if(m.task.q.includes('\n')){
    const parts=m.task.q.split('\n');
    taskEl.innerHTML=parts[0]+'<br><span style="font-size:16px;color:var(--text3)">'+parts.slice(1).join('<br>')+'</span>';
  } else {
    taskEl.textContent=m.task.q;
  }
  document.getElementById('mz1-ans').value='';
  document.getElementById('mz1-fb').textContent='';
  document.getElementById('mz1-ans').focus();
  updMZ1UI();
}

function checkMZ1(){
  const val=document.getElementById('mz1-ans').value.trim(); if(!val)return;
  const m=MZ.z1;
  const ok=val===m.task.a;
  if(ok){m.correct++;m.score+=10+m.streak*2;m.streak++;document.getElementById('mz1-fb').innerHTML=`<span style="color:var(--green)">✅ Richtig! +${10+(m.streak-1)*2}</span>`;addXP(5,'m','learn');}
  else{m.wrong++;m.streak=0;document.getElementById('mz1-fb').innerHTML=`<span style="color:var(--red)">❌ Antwort: ${m.task.a}</span>`;}
  adaptMZ(m,'mz1');
  updMZ1UI();
  setTimeout(nextMZ1,800);
}

function adaptMZ(m,prefix){
  const total=m.correct+m.wrong; if(total<5)return;
  const rate=m.correct/total;
  let moved=false;
  if(rate>=0.8&&m.skill<5){m.skill++;m.correct=0;m.wrong=0;toast('🚀 Level '+m.skill+'!');moved=true;}
  if(rate<0.5&&m.skill>1){m.skill--;m.correct=0;m.wrong=0;toast('💡 Etwas leichter.');moved=true;}
  const pct=Math.max(0,Math.min(100,(m.correct/(m.correct+m.wrong||1))*100));
  document.getElementById(prefix+'-bar').style.width=pct+'%';
  if(moved)updMZ1UI();
}

function updMZ1UI(){
  const m=MZ.z1;
  document.getElementById('mz1-sc').textContent=m.score;
  document.getElementById('mz1-st').textContent=m.streak;
  document.getElementById('mz1-ok').textContent=m.correct;
  document.getElementById('mz1-no').textContent=m.wrong;
  const bdg=document.getElementById('mz1-skillbdg');
  bdg.textContent='Level '+m.skill;
  const r=m.correct/(m.correct+m.wrong||1);
  bdg.className='aski '+(r>=0.8?'up':r<0.5?'dn':'eq');
}

// ═══════════════════════════════════════════
// MATHE Z2 — ADAPTIV
// ═══════════════════════════════════════════
function genMZ2(type,skill){
  const s=skill;
  if(type==='mal'){const a=Math.floor(Math.random()*(s<=2?10:s<=3?15:20))+1,b=Math.floor(Math.random()*(s<=1?5:10))+1;return{q:`${a} × ${b} = ?`,a:String(a*b)};}
  if(type==='geteilt'){const b=Math.floor(Math.random()*(s<=1?5:10))+1,a=b*(Math.floor(Math.random()*10)+1);return{q:`${a} ÷ ${b} = ?`,a:String(a/b)};}
  if(type==='brueche'){const n=Math.floor(Math.random()*4)+1,d=Math.floor(Math.random()*4)+2;if(s>=2){const n2=Math.floor(Math.random()*4)+1,d2=d;const rn=n*d2+n2*d,rd=d*d2;const g=gcd(rn,rd);return{q:`${n}/${d} + ${n2}/${d2} = ?`,a:`${rn/g}/${rd/g}`};}return{q:`${n}/${d} vereinfachen?`,a:gcd(n,d)>1?`${n/gcd(n,d)}/${d/gcd(n,d)}`:`${n}/${d}`};}
  if(type==='prozent'){const base=[50,100,200,400][Math.min(s-1,3)],pct=[10,25,50][Math.min(s-1,2)];return{q:`${pct}% von ${base} = ?`,a:String(base*pct/100)};}
  if(type==='mix'){const types=['mal','geteilt','prozent'];return genMZ2(types[Math.floor(Math.random()*types.length)],skill);}
  return genMZ2('mal',skill);
}
function gcd(a,b){return b===0?a:gcd(b,a%b);}

function nextMZ2(){
  const m=MZ.z2; m.task=genMZ2(m.type,m.skill);
  document.getElementById('mz2-task').textContent=m.task.q;
  document.getElementById('mz2-ans').value='';
  document.getElementById('mz2-fb').textContent='';
}

function checkMZ2(){
  const val=document.getElementById('mz2-ans').value.trim(); if(!val)return;
  const m=MZ.z2;
  const ok=val===m.task.a;
  if(ok){m.correct++;m.score+=10;document.getElementById('mz2-fb').innerHTML=`<span style="color:var(--green)">✅ Richtig!</span>`;addXP(6,'m','learn');}
  else{m.wrong++;document.getElementById('mz2-fb').innerHTML=`<span style="color:var(--red)">❌ Antwort: ${m.task.a}</span>`;}
  const t=m.correct+m.wrong; if(t>=5){const r=m.correct/t;if(r>=0.8&&m.skill<5){m.skill++;m.correct=0;m.wrong=0;toast('🚀 Level '+m.skill+'!');}else if(r<0.5&&m.skill>1){m.skill--;m.correct=0;m.wrong=0;toast('💡 Leichter.');}}
  document.getElementById('mz2-sc').textContent=m.score;
  document.getElementById('mz2-ok').textContent=m.correct;
  document.getElementById('mz2-no').textContent=m.wrong;
  document.getElementById('mz2-bar').style.width=Math.round((m.correct/(m.correct+m.wrong||1))*100)+'%';
  document.getElementById('mz2-skillbdg').textContent='Level '+m.skill;
  setTimeout(nextMZ2,900);
}

// ═══════════════════════════════════════════
// ═══════════════════════════════════════════
// ETAPPE 5 — MATHE SEK Z3 ENGINE
// Einheiten · Schritt · Erklaer · Aufgaben
// ═══════════════════════════════════════════

const MSEK_EINHEITEN = [
  {id:'msek-u1',icon:'📐',titel:'Algebra & Gleichungen',schuljahr:'7./8. Kl.',
   themen:['Lineare Gleichungen (ax + b = c)','Gleichungssysteme (2 Unbekannte)','Quadratische Gleichungen (Lösungsformel)','Ungleichungen und Lösungsmengen'],
   formeln:['ax + b = c → x = (c-b)/a','x = (-b ± √(b²-4ac)) / 2a']},
  {id:'msek-u2',icon:'📏',titel:'Geometrie & Trigonometrie',schuljahr:'7./8. Kl.',
   themen:['Pythagoras: a² + b² = c²','Flächenberechnung: Dreieck, Trapez, Kreis','Ähnlichkeit und Strahlensätze','sin, cos, tan am rechtwinkligen Dreieck'],
   formeln:['c² = a² + b²','A = ½ · g · h','sin α = Gegenkathete/Hypotenuse']},
  {id:'msek-u3',icon:'📈',titel:'Funktionen & Grafiken',schuljahr:'8./9. Kl.',
   themen:['Lineare Funktion: y = mx + b','Quadratische Funktion: y = ax² + bx + c','Funktionsgraph zeichnen und lesen','Nullstellen und Scheitelpunkt'],
   formeln:['y = mx + b','Scheitelpunkt: x_s = -b/(2a)','Nullstellen: x = (-b ± √D) / 2a']},
  {id:'msek-u4',icon:'🎲',titel:'Statistik & Wahrscheinlichkeit',schuljahr:'8./9. Kl.',
   themen:['Mittelwert, Median, Modus','Streuung: Spannweite, Standardabweichung','Wahrscheinlichkeit: Laplace, bedingt','Baumdiagramme und Kombinatorik'],
   formeln:['P(A) = günstige / alle','x̄ = Σx / n','P(A und B) = P(A) · P(B|A)']},
  {id:'msek-u5',icon:'🔢',titel:'Brüche & Prozentrechnung',schuljahr:'7. Kl.',
   themen:['Brüche: +, −, ×, ÷','Gemischte Zahlen und Kehrwert','Prozentsatz, Grundwert, Prozentwert','Zinsrechnung: einfach und zusammengesetzt'],
   formeln:['W = G · p%','G = W / p%','Zins = K · p · t / 100']},
  {id:'msek-u6',icon:'√',titel:'Potenzen, Wurzeln & Logarithmen',schuljahr:'8./9. Kl.',
   themen:['Potenzgesetze','Wurzeln vereinfachen','Wissenschaftliche Schreibweise','Einführung Logarithmus'],
   formeln:['aⁿ · aᵐ = aⁿ⁺ᵐ','(aⁿ)ᵐ = aⁿ·ᵐ','a⁻ⁿ = 1/aⁿ']},
  {id:'msek-u7',icon:'📝',titel:'Textaufgaben & Anwendungen',schuljahr:'7.–9. Kl.',
   themen:['Gleichungen aus Texten aufstellen','Mischaufgaben: Geometrie + Algebra','Realitätsbezogene Problemlösung','Plausibilitätskontrolle'],
   formeln:['1. Unbekannte definieren','2. Gleichung aufstellen','3. Lösen und prüfen']},
];

const MSEK_PROG_KEY='msek_prog';
function msekGetProg(){return JSON.parse(localStorage.getItem(MSEK_PROG_KEY)||'{}');}
function msekSaveProg(p){localStorage.setItem(MSEK_PROG_KEY,JSON.stringify(p));}
function msekGetPct(id){return msekGetProg()[id]||0;}
function msekTickEinheit(id){const p=msekGetProg();p[id]=Math.min(100,(p[id]||0)+15);msekSaveProg(p);msekRenderGrid();return p[id];}

function msekShowTab(tab){
  ['einheiten','aufgaben','erklaer'].forEach(t=>{
    const el=document.getElementById('msek-'+t+'-view');
    const btn=document.getElementById('msek-tab-'+t);
    if(el)el.style.display=t===tab?'':'none';
    if(btn)btn.className=t===tab?'btn btn-p':'btn';
  });
  if(tab==='einheiten')msekRenderGrid();
}

function msekRenderGrid(){
  const el=document.getElementById('msek-einheiten-grid');if(!el)return;
  el.innerHTML=MSEK_EINHEITEN.map(e=>{
    const pct=msekGetPct(e.id);
    const col=pct>=75?'var(--green)':pct>=25?'var(--gold)':'var(--blue)';
    return `<div class="unit-card" style="cursor:pointer;" data-msek-id="${e.id}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
        <span style="font-size:18px;">${e.icon}</span><span style="font-size:10px;font-weight:700;color:${col};">${pct}%</span>
      </div>
      <div style="font-size:12px;font-weight:700;margin-bottom:2px;">${e.titel}</div>
      <div style="font-size:10px;color:var(--text3);">${e.schuljahr}</div>
      <div style="height:4px;background:var(--bg);border-radius:2px;overflow:hidden;margin-top:6px;">
        <div style="height:100%;width:${pct}%;background:${col};border-radius:2px;"></div>
      </div>
    </div>`;
  }).join('');
  // Event delegation
  el.querySelectorAll('[data-msek-id]').forEach(card=>{
    card.addEventListener('click',()=>msekSelectEinheit(card.dataset.msekId));
  });
}

function msekSelectEinheit(id){
  const e=MSEK_EINHEITEN.find(x=>x.id===id);if(!e)return;
  const el=document.getElementById('msek-einheit-detail');if(!el)return;
  const pct=msekGetPct(id);
  const col=pct>=75?'var(--green)':pct>=25?'var(--gold)':'var(--blue)';
  el.innerHTML=`
    <div style="background:var(--bg3);border-radius:var(--r);padding:1rem;margin-bottom:1rem;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:.75rem;">
        <span style="font-size:32px;">${e.icon}</span>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:700;">${e.titel}</div>
          <div style="font-size:11px;color:var(--text3);">${e.schuljahr}</div>
        </div>
        <span style="font-size:14px;font-weight:800;color:${col};">${pct}%</span>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:5px;">THEMEN</div>
      ${e.themen.map(t=>`<div style="font-size:12px;color:var(--text2);margin-bottom:2px;">• ${t}</div>`).join('')}
      <div style="margin-top:.75rem;">
        <div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:5px;">FORMELN</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">
          ${e.formeln.map(f=>`<code style="font-size:11px;padding:3px 8px;background:rgba(56,189,248,.1);color:var(--blue);border-radius:6px;font-family:monospace;">${f}</code>`).join('')}
        </div>
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1rem;" id="msek-btn-row-${id}">
    </div>
    <div id="msek-einheit-out-${id}"></div>`;
  // Add buttons via JS to avoid inline quote issues
  const btnRow=document.getElementById('msek-btn-row-'+id);
  if(btnRow){
    [['schritt','🔢 Schritt-für-Schritt'],['aufgaben','✏️ Übungsaufgaben'],['erklaer','💡 Erklärung'],['realitaet','🌍 Realitätsbezug']].forEach(([typ,lbl])=>{
      const btn=document.createElement('button');
      btn.className='btn btn-p';btn.textContent=lbl;
      btn.style.cssText='flex:1;min-width:130px;';
      btn.addEventListener('click',()=>msekGenUebung(id,typ));
      btnRow.appendChild(btn);
    });
  }
  el.scrollIntoView({behavior:'smooth',block:'start'});
}

async function msekGenUebung(id, typ){
  const e=MSEK_EINHEITEN.find(x=>x.id===id);
  if(!e) return;
  const out=document.getElementById('msek-einheit-out-'+id);
  if(!out) return;
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){out.innerHTML='<div style="color:var(--gold);">⚠️ API-Schlüssel fehlt</div>';return;}
  out.innerHTML='<div class="sp" style="margin:1.5rem auto;width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin 1s linear infinite;"></div>';
  const thStr=e.themen.join('; ');
  const fmStr=e.formeln.join('; ');
  let fmt='';
  if(typ==='schritt') fmt='{"typ":"schritt","titel":"Beispiel","aufgabe":"Konkrete Aufgabe","schritte":[{"nr":1,"beschreibung":"","rechnung":""},{"nr":2,"beschreibung":"","rechnung":""},{"nr":3,"beschreibung":"Probe","rechnung":""}],"ergebnis":"","merke":"Wichtige Regel"}';
  else if(typ==='aufgaben') fmt='{"typ":"aufgaben","titel":"Übungsaufgaben","aufgaben":[{"nr":1,"aufgabe":"...","loesung":"vollständiger Rechenweg","niveau":"leicht"},{"nr":2,"aufgabe":"...","loesung":"...","niveau":"mittel"},{"nr":3,"aufgabe":"...","loesung":"...","niveau":"schwer"}]}';
  else if(typ==='erklaer') fmt='{"typ":"erklaer","titel":"verstehen","analogie":"Alltagsanalogie","konzept":"Kernidee einfach","beispiel_einfach":{"aufgabe":"...","schritte":["Schritt 1","Schritt 2"],"loesung":"..."},"beispiel_schwer":{"aufgabe":"...","schritte":["Schritt 1","Schritt 2","Schritt 3"],"loesung":"..."},"merksatz":"Merksatz"}';
  else fmt='{"typ":"realitaet","titel":"Mathe im Alltag","situation":"Reale Situation (2 Sätze)","aufgaben":[{"aufgabe":"...","loesung":"..."},{"aufgabe":"...","loesung":"..."}],"bezug":"Warum nützlich?"}';
  const sys=`Du bist LP21-Mathematiklehrer Z3 Schweiz. Thema: "${e.titel}". Topics: ${thStr}. Formeln: ${fmStr}. Antworte NUR als JSON: ${fmt}`;
  try{
    const raw=await claude([{role:'user',content:'Generiere.'}],sys);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    renderMsekResult(d, id, out);
    const pct=msekTickEinheit(id);
    addXP(12,'m','learn');
    toast('📊 +12 XP · '+pct+'%');
    out.scrollIntoView({behavior:'smooth',block:'nearest'});
  }catch(err){out.innerHTML='<div style="color:var(--red);">Fehler: '+err.message+'</div>';}
}

function renderMsekResult(d, id, out) {
  let html='';
  if(d.typ==='schritt'){
    html=`<div class="card">
      <div class="ctitle">🔢 ${d.titel} <span class="tag tag-lp">Z3</span></div>
      <div style="padding:12px;background:rgba(56,189,248,.07);border-radius:var(--r);font-size:15px;font-weight:600;margin-bottom:1rem;">${d.aufgabe}</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:1rem;">
        ${(d.schritte||[]).map(s=>`<div style="display:flex;gap:12px;padding:10px;background:var(--bg3);border-radius:var(--r);border-left:3px solid var(--blue);">
          <div style="font-size:16px;font-weight:800;color:var(--blue);min-width:24px;">${s.nr}</div>
          <div><div style="font-size:11px;color:var(--text3);">${s.beschreibung}</div>
          <code style="font-size:14px;font-family:monospace;">${s.rechnung}</code></div></div>`).join('')}
      </div>
      <div style="padding:10px;background:rgba(34,197,94,.08);border-radius:var(--r);margin-bottom:.75rem;">✅ <strong>${d.ergebnis}</strong></div>
      ${d.merke?`<div style="padding:8px;background:rgba(245,158,11,.07);border-radius:var(--r);font-size:12px;">📌 ${d.merke}</div>`:''}
    </div>`;
  } else if(d.typ==='aufgaben'){
    const nc={'leicht':'var(--green)','mittel':'var(--gold)','schwer':'var(--red)'};
    html=`<div class="card"><div class="ctitle">✏️ ${d.titel}</div>
      ${(d.aufgaben||[]).map((a,i)=>{
        const oid='msa-'+id+'-'+i;
        return `<div style="margin-bottom:1rem;padding:10px;background:var(--bg3);border-radius:var(--r);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;">
            <div style="font-size:13px;font-weight:600;">${a.nr||i+1}. ${a.aufgabe}</div>
            <span style="font-size:10px;color:${nc[a.niveau]||'var(--text3)'};">${a.niveau}</span>
          </div>
          <div style="display:flex;gap:8px;">
            <input class="inp" id="${oid}" placeholder="Lösung…" style="flex:1;font-family:monospace;"/>
            <button class="btn" id="${oid}-btn" style="padding:8px;font-size:12px;">📄</button>
          </div>
          <div id="${oid}-s" style="display:none;margin-top:4px;padding:6px;background:rgba(34,197,94,.08);border-radius:var(--r);font-size:12px;font-family:monospace;">${a.loesung}</div>
        </div>`;
      }).join('')}
    </div>`;
  } else if(d.typ==='erklaer'){
    html=`<div class="card">
      <div class="ctitle">💡 ${d.titel}</div>
      ${d.analogie?`<div style="padding:12px;background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.2);border-radius:var(--r);margin-bottom:1rem;font-size:14px;">🎯 ${d.analogie}</div>`:''}
      <div style="margin-bottom:1rem;"><div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:5px;">KONZEPT</div>
        <div style="font-size:14px;line-height:1.7;">${d.konzept}</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:1rem;">
        <div style="padding:12px;background:var(--bg3);border-radius:var(--r);">
          <div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:5px;">🟢 Einfach</div>
          <div style="font-size:12px;font-weight:600;margin-bottom:4px;">${d.beispiel_einfach?.aufgabe||''}</div>
          <ol style="padding-left:1rem;font-size:11px;font-family:monospace;line-height:1.8;margin:0;">
            ${(d.beispiel_einfach?.schritte||[]).map(s=>`<li>${s}</li>`).join('')}
          </ol>
          <div style="margin-top:5px;font-size:12px;font-weight:700;color:var(--green);">= ${d.beispiel_einfach?.loesung||''}</div>
        </div>
        <div style="padding:12px;background:var(--bg3);border-radius:var(--r);">
          <div style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:5px;">🟡 Anspruchsvoll</div>
          <div style="font-size:12px;font-weight:600;margin-bottom:4px;">${d.beispiel_schwer?.aufgabe||''}</div>
          <ol style="padding-left:1rem;font-size:11px;font-family:monospace;line-height:1.8;margin:0;">
            ${(d.beispiel_schwer?.schritte||[]).map(s=>`<li>${s}</li>`).join('')}
          </ol>
          <div style="margin-top:5px;font-size:12px;font-weight:700;color:var(--gold);">= ${d.beispiel_schwer?.loesung||''}</div>
        </div>
      </div>
      ${d.merksatz?`<div style="padding:10px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:var(--r);font-size:13px;font-weight:700;color:var(--gold);">📌 ${d.merksatz}</div>`:''}
    </div>`;
  } else {
    html=`<div class="card">
      <div class="ctitle">🌍 ${d.titel}</div>
      <div style="padding:12px;background:rgba(34,197,94,.07);border-radius:var(--r);margin-bottom:1rem;font-size:14px;line-height:1.7;">${d.situation}</div>
      ${(d.aufgaben||[]).map((a,i)=>{
        const oid='msr-'+id+'-'+i;
        return `<div style="margin-bottom:.75rem;">
          <div style="font-size:13px;font-weight:600;margin-bottom:.5rem;">${i+1}. ${a.aufgabe}</div>
          <div style="display:flex;gap:8px;">
            <input class="inp" id="${oid}" placeholder="…" style="flex:1;font-family:monospace;"/>
            <button class="btn" id="${oid}-btn" style="padding:8px;font-size:12px;">📄</button>
          </div>
          <div id="${oid}-s" style="display:none;margin-top:4px;padding:6px;background:rgba(34,197,94,.08);border-radius:var(--r);font-size:12px;font-family:monospace;">${a.loesung}</div>
        </div>`;
      }).join('')}
      ${d.bezug?`<div style="padding:8px;background:var(--bg3);border-radius:var(--r);font-size:12px;color:var(--text3);">💼 ${d.bezug}</div>`:''}
    </div>`;
  }
  out.innerHTML=html;
  // Attach solution button listeners (avoids inline onclick)
  out.querySelectorAll('[id$="-btn"]').forEach(btn=>{
    const solId=btn.id.replace('-btn','-s');
    btn.addEventListener('click',()=>{
      const sol=document.getElementById(solId);
      if(sol)sol.style.display=sol.style.display==='none'?'block':'none';
    });
  });
}

async function loadMSek(){
  const topic=document.getElementById('msek-topic')?.value||'Algebra & Gleichungen';
  const diff=parseInt(document.getElementById('msek-diff')?.value||'0');
  const chip=document.querySelector('[data-msektyp].on');
  const typ=chip?chip.dataset.msektyp:'aufgaben';
  const out=document.getElementById('msek-out');if(!out)return;
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){out.innerHTML='<div style="color:var(--gold);">⚠️ API-Schlüssel fehlt</div>';return;}
  const e=MSEK_EINHEITEN.find(x=>x.titel===topic)||{titel:topic,themen:[topic],formeln:[],id:'free'};
  const fakeId='free-'+Date.now();
  out.innerHTML='<div id="msek-einheit-out-'+fakeId+'"></div>';
  await msekGenUebung(fakeId, typ==='fehler'?'aufgaben':typ);
}

async function msekErklaer(){
  const thema=document.getElementById('msek-erklaer-inp')?.value.trim();
  if(!thema){toast('⚠️ Thema eingeben');return;}
  const out=document.getElementById('msek-erklaer-out');if(!out)return;
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){out.innerHTML='<div style="color:var(--gold);">⚠️ API-Schlüssel fehlt</div>';return;}
  out.innerHTML='<div class="sp" style="margin:1.5rem auto;width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin 1s linear infinite;"></div>';
  const fakeId='erkl-'+Date.now();
  const fakeE={id:fakeId,titel:thema,themen:[thema],formeln:[]};
  MSEK_EINHEITEN.push(fakeE);
  out.innerHTML='<div id="msek-einheit-out-'+fakeId+'"></div>';
  await msekGenUebung(fakeId,'erklaer');
}


// MATHE SEK (KI) — engine above (ETAPPE 5)
async function loadMathSek(){ loadMSek(); }

// ═══════════════════════════════════════════
// DEUTSCH (Phase 6 — Sprint 8: LP21 Kompetenzbereiche)
// KB1/KB4/KB5: via gram-gen-btn + loadGrammarBlock
// KB2 (Sprechen) + KB3 (Lesen): eigene Funktionen
// ═══════════════════════════════════════════

// Legacy-Stub (de-out wird nicht mehr verwendet, aber sicher abfangen)
async function loadDeutsch(){
  const el=document.getElementById('de-out');
  if(el)el.innerHTML='<div class="card" style="font-size:13px;color:var(--text2);">Bitte Kompetenzbereich über Akkordeon wählen.</div>';
}

// KB2: Sprechen — Aufgabengenerator
async function loadDeutschKB2(){
  const body = document.getElementById('de-kb2-gen-btn')?.closest('.acc-body');
  const selChip = body?.querySelector('.chip-row .chip.on[data-topic]');
  const topic = selChip?.dataset.topic || 'Erzählen';
  const out = document.getElementById('de-gram-out-blockkb2');
  if(!out) return;
  const key = ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){out.innerHTML=`<div class="card" style="color:var(--gold);">⚠️ API-Schlüssel fehlt.</div>`;return;}
  const zyklus = document.querySelector('#de-zyklus-filter .gram-lf-btn.on')?.dataset.dz || 'Z2';
  const schuljahr = document.getElementById('de-schuljahr-sel')?.value || '5';
  out.innerHTML = sp();
  try{
    const raw = await claude([{role:'user',content:'Generiere.'}],
      `Du bist LP21-Deutschlehrer. Kompetenzbereich: Sprechen. Thema: "${topic}". Zyklus: ${zyklus}, ${schuljahr}. Klasse.
Erstelle eine Sprechaufgabe. Antwort NUR als JSON:
{"title":"...","aufgabe":"Aufgabenstellung auf Deutsch (2-3 Sätze, motivierend)","vorbereitung":["Hinweis 1","Hinweis 2","Hinweis 3"],"strukturhilfe":["Satzanfang 1...","Satzanfang 2...","Satzanfang 3..."],"lp21_kompetenz":"LP21 Kompetenz-Code und Beschreibung (1 Satz)"}`);
    const d = JSON.parse(raw.replace(/```json|```/g,'').trim());
    out.innerHTML = `<div class="card">
      <div class="ctitle">${d.title} <span class="tag tag-lp">Sprechen</span></div>
      <div style="padding:12px 14px;background:rgba(56,189,248,.07);border:1px solid rgba(56,189,248,.2);border-radius:var(--r);font-size:14px;line-height:1.75;margin-bottom:1rem;">${d.aufgabe}</div>
      ${d.strukturhilfe?.length?`<div style="margin-bottom:.875rem;"><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">🗣️ Strukturhilfe — Satzanfänge</div><div style="display:flex;flex-wrap:wrap;gap:6px;">${d.strukturhilfe.map(s=>`<span style="padding:4px 10px;background:var(--bg3);border-radius:5px;font-size:13px;color:var(--text);">${s}</span>`).join('')}</div></div>`:''}
      ${d.vorbereitung?.length?`<div style="margin-bottom:.875rem;display:flex;flex-wrap:wrap;gap:5px;">${d.vorbereitung.map(h=>`<span style="padding:3px 10px;background:var(--bg3);border-radius:5px;font-size:12px;color:var(--text3);">💡 ${h}</span>`).join('')}</div>`:''}
      ${d.lp21_kompetenz?`<div style="font-size:11px;color:var(--text3);padding:6px 10px;background:rgba(168,85,247,.06);border-radius:5px;">📋 ${d.lp21_kompetenz}</div>`:''}
    </div>`;
    addXP(5,'s','learn');
  }catch(e){out.innerHTML=`<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`;}
}

// KB3: Lesen — Text + Aufgaben
async function loadDeutschKB3(){
  const body = document.getElementById('de-kb3-gen-btn')?.closest('.acc-body');
  const selChip = body?.querySelector('.chip-row .chip.on[data-topic]');
  const topic = selChip?.dataset.topic || 'Texte lesen';
  const thema = document.getElementById('de-kb3-thema')?.value.trim() || 'Allgemein';
  const out = document.getElementById('de-gram-out-blockkb3');
  if(!out) return;
  const key = ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){out.innerHTML=`<div class="card" style="color:var(--gold);">⚠️ API-Schlüssel fehlt.</div>`;return;}
  const zyklus = document.querySelector('#de-zyklus-filter .gram-lf-btn.on')?.dataset.dz || 'Z2';
  out.innerHTML = sp();
  try{
    const raw = await claude([{role:'user',content:'Generiere.'}],
      `LP21-Deutschlehrer. Lesekompetenz: "${topic}". Thema: "${thema}". Zyklus: ${zyklus}.
Schreibe einen kurzen Lesetext auf Deutsch (100-150 Wörter, altersgerecht) und Aufgaben.
NUR JSON:
{"title":"...","text":"Lesetext auf Deutsch","niveau":"Z1/Z2/Z3","aufgaben":[{"typ":"mc","q":"Frage zum Text","options":["a","b","c","d"],"correct":0},{"typ":"mc","q":"...","options":["...","...","...","..."],"correct":1},{"typ":"mc","q":"...","options":["...","...","...","..."],"correct":2}],"wortschatz":[{"wort":"Schlüsselwort","bedeutung":"Erklärung"}],"lp21_kompetenz":"LP21 Code"}`);
    const d = JSON.parse(raw.replace(/```json|```/g,'').trim());
    let html = `<div class="card">
      <div class="ctitle">${d.title} <span class="tag tag-lp">${d.niveau||zyklus}</span></div>
      <div style="padding:14px 16px;background:var(--bg3);border-radius:var(--r);font-size:15px;line-height:2;margin-bottom:1.25rem;border-left:3px solid var(--blue);">
        ${(d.text||'').replace(/\n\n/g,'</p><p style="margin-top:8px;">').replace(/^/,'<p>').replace(/$/,'</p>')}
        <button class="btn" style="display:block;margin-top:.75rem;padding:5px 14px;font-size:12px;" onclick="speak(this.parentElement.innerText,'de')">🔊 Vorlesen</button>
      </div>`;
    if(d.wortschatz?.length){
      html+=`<div style="margin-bottom:1rem;padding:8px 12px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);border-radius:var(--r);"><div style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:5px;">📖 Schlüsselwörter</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${d.wortschatz.map(w=>`<span style="padding:2px 9px;background:var(--bg2);border-radius:5px;font-size:12px;"><strong style="color:var(--gold);">${w.wort}</strong>: ${w.bedeutung}</span>`).join('')}</div></div>`;
    }
    if(d.aufgaben?.length){
      html+=`<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:.06em;margin-bottom:.75rem;">Aufgaben zum Text</div>`;
      d.aufgaben.forEach((q,qi)=>{
        html+=`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div><div class="mcopts">${(q.options||[]).map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div></div>`;
      });
      html+=`</div>`;
    }
    html+=`</div>`;
    out.innerHTML=html;
    out.querySelectorAll('.mcopts').forEach(opts=>opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);
      opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');addXP(8,'l','learn');toast('✅ Richtig!');}
      else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    })));
    addXP(5,'l','learn');
  }catch(e){out.innerHTML=`<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`;}
}

// ═══════════════════════════════════════════
// NMG (KI) — ERWEITERT Phase 4
// ═══════════════════════════════════════════

const NMG_THEMEN = {
  'Natur & Technik': [
    {nt:'Tiere und ihre Lebensräume',ico:'🐾'},{nt:'Pflanzen: Aufbau, Wachstum, Fotosynthese',ico:'🌿'},
    {nt:'Aggregatzustände: fest, flüssig, gasförmig',ico:'💧'},{nt:'Energie: Wärme, Licht, Strom',ico:'⚡'},
    {nt:'Einfache Maschinen: Hebel, Rad, schiefe Ebene',ico:'⚙️'},{nt:'Wetter und Klimazonen',ico:'🌦️'},
    {nt:'Ökosysteme: Wald, Wiese, Gewässer',ico:'🌲'},{nt:'Magnetismus und Elektrizität',ico:'🧲'},
    {nt:'Körper und Gesundheit: Sinnesorgane',ico:'👁️'},{nt:'Stoff und Material: Eigenschaften',ico:'🧪'},
    {nt:'Kreislauf: Wasser, Kohlenstoff, Stickstoff',ico:'🔄'},{nt:'Astronomie: Sonne, Mond, Planeten',ico:'🌍'},
  ],
  'Raum & Orientierung': [
    {nt:'Karten lesen und Orientierung im Raum',ico:'🗺️'},{nt:'Schweizer Kantone und Hauptstädte',ico:'🇨🇭'},
    {nt:'Kontinente und Ozeane der Welt',ico:'🌍'},{nt:'Gebirge, Flüsse und Seen der Schweiz',ico:'⛰️'},
    {nt:'Klimazonen und Vegetation weltweit',ico:'🌵'},{nt:'Stadt und Land: Siedlungsformen',ico:'🏙️'},
    {nt:'Migration und Mobilität',ico:'✈️'},
  ],
  'Zeit, Dauer & Wandel': [
    {nt:'Zeitstrahl: Antike, Mittelalter, Neuzeit',ico:'📜'},{nt:'Industrialisierung und ihre Auswirkungen',ico:'🏭'},
    {nt:'Schweizer Geschichte: Bundesstaat 1848',ico:'🇨🇭'},{nt:'Zweiter Weltkrieg: Ursachen und Folgen',ico:'⚔️'},
    {nt:'Kalter Krieg und Fall der Berliner Mauer',ico:'🧱'},{nt:'Wandel in Technik und Alltag über Jahrzehnte',ico:'📺'},
  ],
  'Mensch & Gemeinschaft': [
    {nt:'Familie und Zusammenleben',ico:'👨‍👩‍👧'},{nt:'Demokratie und politische Systeme',ico:'🗳️'},
    {nt:'Menschenrechte und Kinderrechte',ico:'⚖️'},{nt:'Integration und Vielfalt in der Schweiz',ico:'🤝'},
    {nt:'Medien und ihre Rolle in der Gesellschaft',ico:'📰'},{nt:'Armut und globale Ungleichheit',ico:'🌐'},
  ],
  'Wirtschaft & Konsum': [
    {nt:'Geld, Kreislauf und Banken',ico:'💶'},{nt:'Angebot und Nachfrage: Märkte',ico:'📊'},
    {nt:'Konsum und Werbung kritisch betrachten',ico:'🛍️'},{nt:'Globale Lieferketten: woher kommen unsere Produkte?',ico:'📦'},
    {nt:'Nachhaltiger Konsum und fairer Handel',ico:'♻️'},
  ],
  'Technik & Medien': [
    {nt:'Wie funktioniert ein Computer?',ico:'💻'},{nt:'Internet und digitale Kommunikation',ico:'🌐'},
    {nt:'Erneuerbare Energien: Solar, Wind, Wasser',ico:'☀️'},{nt:'Transport und Mobilität der Zukunft',ico:'🚆'},
  ],
  'Ethik & Religionen': [
    {nt:'Weltreligionen: Christentum, Islam, Judentum',ico:'✝️'},{nt:'Buddhismus und Hinduismus',ico:'☸️'},
    {nt:'Ethische Fragen: Was ist gerecht?',ico:'⚖️'},{nt:'Feste und Feiertage in verschiedenen Kulturen',ico:'🎉'},
  ],
  'Gesundheit & Ernährung': [
    {nt:'Gesunde Ernährung: Lebensmittelpyramide',ico:'🍎'},{nt:'Der menschliche Körper: Organe und Systeme',ico:'🫀'},
    {nt:'Hygiene und Krankheitsprävention',ico:'🧼'},{nt:'Erste Hilfe: Grundkenntnisse',ico:'🩹'},
  ],
  'Umwelt & Nachhaltigkeit': [
    {nt:'Klimawandel: Ursachen und Folgen',ico:'🌡️'},{nt:'Artensterben und Biodiversität',ico:'🐝'},
    {nt:'Abfall und Recycling',ico:'♻️'},{nt:'Nachhaltige Entwicklungsziele der UNO (SDGs)',ico:'🌍'},
  ],
};

function selectNMGFach(el){
  document.querySelectorAll('.nmg-fach-card').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  const fach = el.dataset.nf;
  const themen = NMG_THEMEN[fach]||[];
  const lbl = document.getElementById('nmg-fach-lbl');
  const chips = document.getElementById('nmg-themen-chips');
  if(lbl) lbl.textContent = fach + ' — Themen';
  if(chips){
    chips.innerHTML = themen.map((t,i)=>
      `<button class="chip${i===0?' on':''}" data-nt="${t.nt}">${t.ico} ${t.nt.split(':')[0].split(',')[0]}</button>`
    ).join('');
  }
  document.getElementById('nmg-out').innerHTML = '';
}

async function loadNMGEx(append=false){
  const fachEl = document.querySelector('.nmg-fach-card.on');
  const fach = fachEl?.dataset.nf||'Natur & Technik';
  const chipEl = document.querySelector('#nmg-themen-chips .chip.on');
  const thema = chipEl?.dataset.nt||fach;
  const sub = document.getElementById('nmg-sub')?.value.trim()||'';
  const zyklus = document.querySelector('#nmg-zyklus-filter .gram-lf-btn.on')?.dataset.nz||'Z2';
  const aufgabentyp = document.getElementById('nmg-aufgabentyp')?.value||'mix';
  const el = document.getElementById('nmg-out');
  const key = ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){ el.innerHTML=`<div class="card" style="color:var(--gold);">⚠️ API-Schlüssel fehlt.</div>`; return; }
  if(!append) el.innerHTML=sp(); else { const ld=document.createElement('div');ld.innerHTML=sp();el.appendChild(ld.firstChild); }

  const aufgabenAnweisung = aufgabentyp==='mc'
    ? `NUR JSON: {"title":"...","text":"Infotext (2-3 Sätze)","questions":[{"typ":"mc","q":"...","options":["a","b","c","d"],"correct":0},{"typ":"mc","q":"...","options":["a","b","c","d"],"correct":1},{"typ":"mc","q":"...","options":["a","b","c","d"],"correct":2},{"typ":"mc","q":"...","options":["a","b","c","d"],"correct":0}],"competency":"LP21 NMG ${fach}"}`
    : aufgabentyp==='experiment'
    ? `NUR JSON: {"title":"...","beschreibung":"Experiment-Anleitung (3-4 Sätze)","material":["Material 1","Material 2","Material 3"],"schritte":["Schritt 1","Schritt 2","Schritt 3","Schritt 4"],"fragen":[{"q":"Was beobachtest du?"},{"q":"Warum passiert das?"},{"q":"Was schliesst du daraus?"}],"competency":"LP21 NMG ${fach}"}`
    : aufgabentyp==='vergleich'
    ? `NUR JSON: {"title":"...","aspekte":["Begriff A","Begriff B"],"vergleich":[{"was":"Merkmal 1","a":"Wert A","b":"Wert B"},{"was":"Merkmal 2","a":"Wert A","b":"Wert B"},{"was":"Merkmal 3","a":"Wert A","b":"Wert B"}],"frage_offen":"Reflexionsfrage","competency":"LP21 NMG ${fach}"}`
    : `NUR JSON: {"title":"...","text":"Infotext (3-4 Sätze)","questions":[{"typ":"mc","q":"...","options":["a","b","c","d"],"correct":0},{"typ":"mc","q":"...","options":["a","b","c","d"],"correct":1},{"typ":"mc","q":"...","options":["a","b","c","d"],"correct":2},{"typ":"open","q":"...","muster":"Musterlösung"}],"competency":"LP21 NMG ${fach}"}`;

  try{
    const raw = await claude([{role:'user',content:'Generiere.'}],
      `Du bist LP21-Lehrperson für NMG. Unterfach: ${fach}. Thema: "${sub||thema}". Zyklus: ${zyklus}. ${ctx()} Sprache: immer Deutsch (unabhängig von Lernsprache), altersgerecht für Schweizer Schulen.
${aufgabenAnweisung}`);
    const d = JSON.parse(raw.replace(/```json|```/g,'').trim());
    const el2 = document.getElementById('nmg-out');
    const spEl = el2.querySelector('.sp'); if(spEl) spEl.remove();

    let html='';
    if(aufgabentyp==='experiment' && d.schritte){
      html=`<div class="card"><div class="ctitle">${d.title} <span class="tag tag-lp">${d.competency||'NMG'}</span><span class="tag tag-ai">Experiment</span></div>
        <div style="font-size:14px;line-height:1.85;padding:12px 14px;background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.2);border-radius:var(--r);margin-bottom:.875rem;">${d.beschreibung}</div>
        ${d.material?.length?`<div style="margin-bottom:.75rem;"><div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:5px;">🧰 MATERIAL</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${d.material.map(m=>`<span style="padding:2px 9px;background:var(--bg3);border-radius:5px;font-size:12px;">${m}</span>`).join('')}</div></div>`:''}
        ${d.schritte?.length?`<div style="margin-bottom:.875rem;"><div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:5px;">📋 SCHRITTE</div><ol style="padding-left:1.2rem;font-size:14px;line-height:1.9;">${d.schritte.map(s=>`<li>${s}</li>`).join('')}</ol></div>`:''}
        ${d.fragen?.length?`<div><div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:.5rem;">💡 BEOBACHTUNGSFRAGEN</div>${d.fragen.map((f,i)=>`<div style="margin-bottom:.5rem;padding:8px 12px;background:var(--bg3);border-radius:var(--r);font-size:14px;">${i+1}. ${f.q}</div>`).join('')}</div>`:''}
      </div>`;
    } else if(aufgabentyp==='vergleich' && d.vergleich){
      html=`<div class="card"><div class="ctitle">${d.title} <span class="tag tag-lp">${d.competency||'NMG'}</span><span class="tag tag-ai">Vergleich</span></div>
        <div style="overflow-x:auto;margin-bottom:.875rem;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="border-bottom:1px solid var(--border);">
          <th style="padding:7px 10px;text-align:left;color:var(--text3);font-size:11px;text-transform:uppercase;">Merkmal</th>
          <th style="padding:7px 10px;text-align:left;color:var(--blue);font-size:11px;text-transform:uppercase;">${d.aspekte?.[0]||'A'}</th>
          <th style="padding:7px 10px;text-align:left;color:var(--green);font-size:11px;text-transform:uppercase;">${d.aspekte?.[1]||'B'}</th>
        </tr></thead><tbody>
        ${(d.vergleich||[]).map(r=>`<tr style="border-bottom:1px solid rgba(45,63,86,.4);">
          <td style="padding:7px 10px;font-weight:600;">${r.was}</td>
          <td style="padding:7px 10px;color:var(--text2);">${r.a}</td>
          <td style="padding:7px 10px;color:var(--text2);">${r.b}</td>
        </tr>`).join('')}
        </tbody></table></div>
        ${d.frage_offen?`<div style="padding:10px 14px;background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.2);border-radius:var(--r);font-size:14px;">💬 ${d.frage_offen}</div>`:''}
      </div>`;
    } else {
      html=`<div class="card"><div class="ctitle">${d.title} <span class="tag tag-lp">${d.competency||'NMG'}</span></div>
        ${d.text?`<div style="font-size:14px;line-height:1.85;padding:12px 14px;background:var(--bg3);border-radius:var(--r);margin-bottom:.875rem;border-left:3px solid var(--blue);">${d.text}
          <button class="btn" style="display:block;margin-top:.625rem;padding:5px 14px;font-size:12px;" onclick="speak(this.closest('div').innerText.replace('Vorlesen','').trim(),'de')">🔊 Vorlesen</button>
        </div>`:''}`;
      (d.questions||[]).forEach((q,qi)=>{
        if(q.typ==='open'||q.muster){
          const oid='nmg-o-'+Date.now()+'-'+qi;
          html+=`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:.5rem;">${qi+1}. ${q.q}</div>
            <textarea id="${oid}" class="inp" rows="2" placeholder="Deine Antwort…" style="resize:vertical;"></textarea>
            <button class="btn" style="margin-top:4px;font-size:12px;padding:5px 12px;" onclick="document.getElementById('${oid}-m').style.display='block'">📄 Musterlösung</button>
            <div id="${oid}-m" style="display:none;margin-top:4px;padding:7px 11px;background:rgba(34,197,94,.08);border:1px solid var(--green);border-radius:var(--r);font-size:13px;color:var(--green);">${q.muster||'–'}</div>
          </div>`;
        } else {
          html+=`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div>
            <div class="mcopts">${(q.options||[]).map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div></div>`;
        }
      });
      html+='</div>';
    }

    const div=document.createElement('div'); div.innerHTML=html; el2.appendChild(div);
    div.querySelectorAll('.mcopts').forEach(opts=>opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);
      opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');addXP(8,'l','learn');toast('✅ Richtig!');}
      else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    })));
    addXP(5,'l','learn');
  }catch(e){
    const el2=document.getElementById('nmg-out');
    const spEl=el2.querySelector('.sp');if(spEl)spEl.remove();
    el2.innerHTML+=`<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`;
  }
}

async function loadNMG(){ await loadNMGEx(false); }

// ═══════════════════════════════════════════
// INFORMATIK (KI) — ERWEITERT Phase 4
// ═══════════════════════════════════════════
async function loadInfoEx(chipSrcId, outId){
  const outEl=document.getElementById(outId); if(!outEl) return;
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){ outEl.innerHTML=`<div class="card" style="color:var(--gold);">⚠️ API-Schlüssel fehlt.</div>`; return; }
  const chipEl=document.querySelector('#'+chipSrcId+' .chip.on');
  const thema=chipEl?.dataset.it||'Mediennutzung im Alltag';
  const zyklus=document.querySelector('#info-zyklus-filter .gram-lf-btn.on')?.dataset.iz||'Z2';
  outEl.innerHTML=sp();
  try{
    const raw=await claude([{role:'user',content:'Aufgabe.'}],
      `Du bist LP21-Lehrperson für Medien und Informatik (MI). Thema: "${thema}". Zyklus: ${zyklus}. ${ctx()}
Sprache: immer Deutsch (Sachfach — unabhängig von Lernsprache). Altersgerecht für ${zyklus}.
Erstelle eine Lernaufgabe mit Infotext, 3 MC-Fragen und 1 praktischer Aufgabe.
NUR JSON: {"title":"...","info":"Erklärungstext (3-4 Sätze)","aufgabe":"Praktische Aufgabe oder Reflexion","mc":[{"q":"...","options":["a","b","c","d"],"correct":0},{"q":"...","options":["a","b","c","d"],"correct":1},{"q":"...","options":["a","b","c","d"],"correct":2}],"tipp":"Praxistipp oder Merksatz","competency":"LP21 MI"}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    let html=`<div class="card"><div class="ctitle">${d.title} <span class="tag tag-lp">${d.competency||'MI'}</span><span class="tag tag-ai">KI</span></div>
      <div style="font-size:14px;line-height:1.85;padding:12px 14px;background:var(--bg3);border-radius:var(--r);margin-bottom:.875rem;border-left:3px solid var(--purple);">${d.info}</div>
      ${d.aufgabe?`<div style="padding:10px 14px;background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.2);border-radius:var(--r);font-size:14px;margin-bottom:.875rem;">🎯 <strong>Aufgabe:</strong> ${d.aufgabe}</div>`:''}
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.5rem;letter-spacing:.06em;">Wissensfragen</div>`;
    (d.mc||[]).forEach((q,qi)=>{
      html+=`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div>
        <div class="mcopts">${q.options.map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div></div>`;
    });
    if(d.tipp) html+=`<div style="margin-top:.875rem;padding:9px 13px;background:rgba(56,189,248,.07);border:1px solid rgba(56,189,248,.2);border-radius:var(--r);font-size:13px;color:var(--blue);">💡 ${d.tipp}</div>`;
    html+='</div>';
    outEl.innerHTML=html;
    outEl.querySelectorAll('.mcopts').forEach(opts=>opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);
      opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');addXP(8,'r','learn');toast('✅ Richtig!');}
      else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    })));
    addXP(5,'r','learn');
  }catch(e){outEl.innerHTML=`<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`;}
}

async function loadInfo(){ await loadInfoEx('info-medien-chips','info-out-medien'); }

// ═══════════════════════════════════════════
// VOKABEL-DETEKTIV GAME
// ═══════════════════════════════════════════
function startGame(){
  const db=VKDB[ST.lang]||VKDB.en;const all=db.flat();
  if(all.length<4)return;
  gmWords=[...all].sort(()=>Math.random()-.5);
  gmIdx=0;gmScore=0;gmStreak=0;updGm();nextGm();
}
function nextGm(){
  if(gmIdx>=gmWords.length){document.getElementById('gword').textContent='🎉';document.getElementById('gchoices').innerHTML='';document.getElementById('gres').textContent='Punkte: '+gmScore;addXP(Math.round(gmScore/2),null,'learn');return;}
  const db=VKDB[ST.lang]||VKDB.en;const all=db.flat();
  const cur=gmWords[gmIdx];document.getElementById('gword').textContent=cur.w;document.getElementById('gres').textContent='';
  const wrong=all.filter(w=>w.tr!==cur.tr).sort(()=>Math.random()-.5).slice(0,3);
  const ch=[...wrong.map(w=>w.tr),cur.tr].sort(()=>Math.random()-.5);
  const el=document.getElementById('gchoices');
  el.innerHTML=ch.map(c=>`<button class="gc">${c}</button>`).join('');
  el.querySelectorAll('.gc').forEach((btn,bi)=>btn.addEventListener('click',function(){
    el.querySelectorAll('.gc').forEach(b=>b.disabled=true);
    if(ch[bi]===cur.tr){this.classList.add('ok');gmScore+=10+gmStreak*2;gmStreak++;document.getElementById('gres').textContent='✅ +'+(10+(gmStreak-1)*2);}
    else{this.classList.add('no');Array.from(el.querySelectorAll('.gc')).find(b=>b.textContent===cur.tr)?.classList.add('ok');gmStreak=0;document.getElementById('gres').textContent='❌ '+cur.tr;}
    updGm();gmIdx++;setTimeout(nextGm,1100);
  }));
}
function updGm(){document.getElementById('gsc').textContent=gmScore;document.getElementById('gst').textContent=gmStreak;document.getElementById('grnd').textContent=gmIdx+1;}

// ═══════════════════════════════════════════
// MATHE SPEED GAME
// ═══════════════════════════════════════════
function startMathSpeed(){
  const m=MZ.speed;if(m.timer)clearInterval(m.timer);
  m.running=true;m.score=0;m.correct=0;m.timeLeft=30;
  document.getElementById('msp-sc').textContent=0;
  document.getElementById('msp-ok').textContent=0;
  document.getElementById('msp-ans').disabled=false;
  document.getElementById('msp-ok-btn').disabled=false;
  document.getElementById('btnmspstart').style.display='none';
  document.getElementById('btnmsprestart').style.display='none';
  document.getElementById('msp-fb').textContent='';
  nextMSpeed();
  m.timer=setInterval(()=>{
    m.timeLeft--;
    document.getElementById('msp-t').textContent=m.timeLeft;
    document.getElementById('msp-tbar').style.width=Math.round((m.timeLeft/30)*100)+'%';
    if(m.timeLeft<=0){
      clearInterval(m.timer);m.running=false;
      document.getElementById('msp-task').textContent='Zeit!';
      document.getElementById('msp-ans').disabled=true;
      document.getElementById('msp-ok-btn').disabled=true;
      document.getElementById('btnmsprestart').style.display='inline-block';
      document.getElementById('msp-fb').innerHTML=`<span style="color:var(--gold);font-size:16px;">🏆 ${m.score} Punkte · ${m.correct} richtig</span>`;
      addXP(Math.round(m.score/5),'m','learn');
      if(!earnedBadges.includes('speed')){earnedBadges.push('speed');saveProfile();checkBadges();}
    }
  },1000);
}

function nextMSpeed(){
  const skill=Math.min(5,Math.floor(MZ.speed.score/50)+1);
  MZ.speed.task=genMZ1(Math.random()>.5?'addition':'subtraktion',skill);
  document.getElementById('msp-task').textContent=MZ.speed.task.q;
  document.getElementById('msp-ans').value='';
  document.getElementById('msp-ans').focus();
}

function checkMathSpeed(){
  if(!MZ.speed.running)return;
  const val=document.getElementById('msp-ans').value.trim();if(!val)return;
  const ok=val===MZ.speed.task.a;
  if(ok){MZ.speed.score+=10;MZ.speed.correct++;document.getElementById('msp-fb').innerHTML='<span style="color:var(--green);">✅</span>';document.getElementById('msp-sc').textContent=MZ.speed.score;document.getElementById('msp-ok').textContent=MZ.speed.correct;}
  else{document.getElementById('msp-fb').innerHTML=`<span style="color:var(--red);">❌ ${MZ.speed.task.a}</span>`;}
  setTimeout(nextMSpeed,300);
}

// ═══════════════════════════════════════════
// ROLLENSPIEL
// ═══════════════════════════════════════════
function roleSystem(){return`Du bist ${LANG_NAMES[ST.lang]}-Muttersprachler. Szenario: ${SCEN_NAMES[ST.currentScenario]||'Gespräch'}. ${ctx()} Antworte auf ${LANG_NAMES[ST.lang]} (2–3 Sätze). Danach: [Feedback: LP21-Hinweis Deutsch]`;}
async function startRole(){
  const win=document.getElementById('chatwin');win.innerHTML=sp();
  try{const r=await claude([{role:'user',content:'Start.'}],roleSystem());chatHistory=[{role:'user',content:'Start.'},{role:'assistant',content:r}];win.innerHTML='';appendMsg('bot',r);}
  catch(e){win.innerHTML='Fehler: '+e.message;}
}
function appendMsg(who,text){
  const win=document.getElementById('chatwin');const div=document.createElement('div');div.className='msg '+who;
  const parts=text.split(/\[Feedback:/i);const main=parts[0].trim();div.textContent=main;
  if(who==='bot'){const b=document.createElement('button');b.className='tts';b.textContent='🔊';b.style.marginTop='5px';b.addEventListener('click',()=>speak(main,ST.lang));div.appendChild(document.createElement('br'));div.appendChild(b);}
  if(parts[1]){const fb=document.createElement('div');fb.className='fb';fb.textContent='💬 '+parts[1].replace(']','').trim();div.appendChild(fb);}
  win.appendChild(div);win.scrollTop=win.scrollHeight;
}
async function sendChat(){
  const inp=document.getElementById('chatinp');const msg=inp.value.trim();if(!msg)return;
  inp.value='';appendMsg('user',msg);chatHistory.push({role:'user',content:msg});
  const ld=document.createElement('div');ld.className='msg bot';ld.textContent='...';document.getElementById('chatwin').appendChild(ld);
  try{const r=await claude(chatHistory,roleSystem());chatHistory.push({role:'assistant',content:r});ld.remove();appendMsg('bot',r);addXP(5,'s','learn');}
  catch(e){ld.textContent='Fehler.';}
}
let roleMicOn=false;
function toggleRoleMic(){
  if(roleMicOn){if(activeRec)activeRec.stop();roleMicOn=false;return;}
  roleMicOn=true;
  startRec(ST.lang,(t)=>{document.getElementById('chatinp').value=t;},()=>{roleMicOn=false;sendChat();},
    document.getElementById('rolest'),document.getElementById('rolemic'));
}

// ═══════════════════════════════════════════
// TASTATURSCHREIBEN PRO
// ═══════════════════════════════════════════
const KBTEXTS={
  grundreihe:{leicht:'fff jjj fff jjj ddd kkk sss lll aaa ööö',mittel:'asdf jklö asdf jklö fj dk sl aö',schwer:'asdfg hjklö asdfg hjklö fgfg hjhj'},
  erweit:{leicht:'fgfg hjhj rfrf ujuj tgtg ygyg',mittel:'qwert zuiop asdfg hjklö',schwer:'qwertzuiop asdfghjklö yxcvbnm'},
  woerter:{leicht:'Hund Katze Haus Auto Baum',mittel:'Schule lernen arbeiten lesen schreiben',schwer:'Verantwortung Kommunikation Digitalisierung'},
  saetze:{leicht:'Der Hund bellt laut. Die Sonne scheint hell.',mittel:'Heute lernen wir etwas Neues in der Schule.',schwer:'Die digitale Transformation verändert die Bildungslandschaft fundamental.'},
};

async function loadKB(){
  const type=document.getElementById('kbtype').value,diff=document.getElementById('kbdiff').value;
  const display=document.getElementById('kbdisplay'),input=document.getElementById('kbinp');
  if(type==='schulstoff'){
    display.textContent='Wird generiert...';
    try{const raw=await claude([{role:'user',content:'Text.'}],`Kurzer Schulstoff-Text (2–3 Sätze) auf Deutsch, Schwierigkeit ${diff}, Niveau ${ST.user_config.level}. Nur Text, kein JSON.`);kbText=raw.replace(/```/g,'').trim();}
    catch(e){kbText='Die Digitalisierung verändert unsere Gesellschaft grundlegend und bietet neue Möglichkeiten.';}
  }else{kbText=(KBTEXTS[type]||KBTEXTS.saetze)[diff]||KBTEXTS.saetze.mittel;}
  kbPos=0;kbErrors=0;kbStartTime=null;if(kbTimer)clearInterval(kbTimer);
  renderKB();input.value='';input.disabled=false;input.focus();
  document.getElementById('kbwpm').textContent='0';const _kpmEl=document.getElementById('kbkpm');if(_kpmEl)_kpmEl.textContent='0';document.getElementById('kbacc').textContent='100%';
  document.getElementById('kbtime').textContent='0s';document.getElementById('kberr').textContent='0';
  document.getElementById('kbprogbar').style.width='0%';
}

function renderKB(){
  document.getElementById('kbdisplay').innerHTML=kbText.split('').map((ch,i)=>`<span class="kbc ${i<kbPos?'ok':i===kbPos?'cur':'pen'}">${ch}</span>`).join('');
}

function handleKBInput(e){
  const val=e.target.value;
  if(!kbStartTime&&val.length>0){kbStartTime=Date.now();if(kbTimer)clearInterval(kbTimer);kbTimer=setInterval(()=>{const el=(Date.now()-kbStartTime)/1000;document.getElementById('kbtime').textContent=Math.round(el)+'s';const wpm=el>0?Math.round((kbPos/5)/(el/60)):0;document.getElementById('kbwpm').textContent=wpm;const kpm=el>0?Math.round(kbPos/(el/60)):0;const kpmEl=document.getElementById('kbkpm');if(kpmEl)kpmEl.textContent=kpm;},500);}
  const expected=kbText[kbPos];const typed=val[val.length-1];
  if(typed===expected){kbPos++;if(kbPos>=kbText.length){finishKB();return;}}
  else if(val.length>0){kbErrors++;}
  e.target.value='';renderKB();
  const acc=kbPos>0?Math.round(kbPos/(kbPos+kbErrors)*100):100;
  document.getElementById('kbprogbar').style.width=Math.round(kbPos/kbText.length*100)+'%';
  document.getElementById('kbacc').textContent=acc+'%';document.getElementById('kberr').textContent=kbErrors;
}

function finishKB(){
  if(kbTimer)clearInterval(kbTimer);
  const el=((Date.now()-kbStartTime)/1000).toFixed(1);
  const wpm=Math.round((kbText.split(' ').length/(el/60)));const kpm=Math.round(kbPos/(el/60));const kpmEl2=document.getElementById('kbkpm');if(kpmEl2)kpmEl2.textContent=kpm;
  const acc=Math.round(kbPos/(kbPos+kbErrors)*100);
  document.getElementById('kbwpm').textContent=wpm;document.getElementById('kbacc').textContent=acc+'%';
  document.getElementById('kbtime').textContent=el+'s';document.getElementById('kbprogbar').style.width='100%';
  document.getElementById('kbinp').disabled=true;
  addXP(Math.min(20,Math.round(wpm/5)),'r','learn');toast(`🎉 ${wpm} WPM · ${acc}% Genauigkeit!`);
}

function restartKB(){if(kbText){kbPos=0;kbErrors=0;kbStartTime=null;if(kbTimer)clearInterval(kbTimer);renderKB();const inp=document.getElementById('kbinp');inp.value='';inp.disabled=false;inp.focus();document.getElementById('kbwpm').textContent='0';const _kpmEl=document.getElementById('kbkpm');if(_kpmEl)_kpmEl.textContent='0';document.getElementById('kbacc').textContent='100%';document.getElementById('kbtime').textContent='0s';document.getElementById('kberr').textContent='0';document.getElementById('kbprogbar').style.width='0%';}}

// ═══════════════════════════════════════════
// PRÜFUNG
// ═══════════════════════════════════════════
async function startExam(){
  const out=document.getElementById('examout');out.innerHTML=sp();
  try{
    const raw=await claude([{role:'user',content:'Prüfung.'}],
      `Cambridge-Prüfer. ${ctx()} Erstelle ${ST.currentExamType==='mixed'?'Reading+Writing':ST.currentExamType} Prüfung.
NUR JSON: {"title":"...","sections":[{"type":"reading|writing|listening","text":"optional","instruction":"Aufgabe Deutsch","questions":[{"q":"...","options":["a","b","c"],"correct":0}]}]}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    let html=`<div class="card"><h3 style="font-size:17px;font-weight:800;margin-bottom:1rem;">${d.title}</h3>`;
    d.sections.forEach((sec,si)=>{
      html+=`<div style="margin-bottom:1.25rem;padding:1rem;background:var(--bg3);border-radius:var(--r);">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.5rem;">Aufgabe ${si+1}</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:.625rem;">${sec.instruction}</div>`;
      if(sec.text)html+=`<div style="font-size:14px;line-height:1.8;padding:10px;background:var(--bg2);border-radius:var(--r);margin-bottom:.625rem;">${sec.text}${sec.type==='listening'?` <button class="tts" data-txt="${sec.text.replace(/"/g,"'")}">🔊</button>`:''}</div>`;
      if(sec.type==='writing'){html+=`<textarea class="warea" id="exw${si}" placeholder="Schreibe hier..."></textarea><button class="btn btn-p" style="margin-top:7px;" data-si="${si}" data-instr="${sec.instruction.replace(/"/g,"'")}">Abgeben ↗</button><div id="exwfb${si}"></div>`;}
      else if(sec.questions){sec.questions.forEach((q,qi)=>{html+=`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div><div class="mcopts">${q.options.map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div></div>`;});}
      html+=`</div>`;
    });
    html+='</div>';out.innerHTML=html;
    out.querySelectorAll('.tts[data-txt]').forEach(b=>b.addEventListener('click',()=>speak(b.dataset.txt,ST.lang)));
    out.querySelectorAll('.mcopts').forEach(opts=>opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');addXP(10,'l','exam');toast('✅');}else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    })));
    out.querySelectorAll('button[data-si]').forEach(btn=>btn.addEventListener('click',async function(){
      const si=this.dataset.si,instr=this.dataset.instr;
      const txt=document.getElementById('exw'+si).value.trim();if(!txt)return;
      const fb=document.getElementById('exwfb'+si);fb.innerHTML=sp();
      try{const r2=await claude([{role:'user',content:'Bewerten.'}],`Cambridge. Aufgabe: "${instr}". Text: "${txt}". ${ctx()} NUR JSON: {"score":0-100,"grade":"A-F","feedback":"Deutsch"}`);
        const r=JSON.parse(r2.replace(/```json|```/g,'').trim());const col=r.score>=70?'var(--green)':r.score>=50?'var(--gold)':'var(--red)';
        fb.innerHTML=`<div class="rescard ${r.score>=70?'res-g':r.score>=50?'res-m':'res-b'}" style="margin-top:7px;"><strong style="color:${col};">${r.grade} – ${r.score}/100</strong><br><span style="font-size:13px;">${r.feedback}</span></div>`;
        addXP(Math.round(r.score/8),'w','exam');
      }catch(e){fb.textContent='Fehler.';}
    }));
    addXP(5,null,'exam');
  }catch(e){out.innerHTML=`<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`;}
}

// ═══════════════════════════════════════════
// SETUP PROFILE PICKER
// ═══════════════════════════════════════════
function renderSetupProfilePick(){
  const LN={en:'🇬🇧 Englisch',de:'🇩🇪 Deutsch',fr:'🇫🇷 Français',it:'🇮🇹 Italiano',es:'🇪🇸 Español'};
  const TN={z1:'Zyklus 1',z2:'Zyklus 2',z3:'Zyklus 3',adult:'Erwachsene',hs:'Homeschool'};
  const grid=document.getElementById('setup-pick-grid');
  if(!grid)return;
  if(!ST.profiles||ST.profiles.length===0){
    grid.innerHTML='<div style="font-size:13px;color:var(--text2);padding:.5rem 0;">Noch keine Profile vorhanden.</div>';
    return;
  }
  grid.innerHTML=ST.profiles.map((p,i)=>`
    <div class="pick-item" data-pi="${i}">
      <div class="pick-av">${p.name[0].toUpperCase()}</div>
      <div class="pick-info">
        <div class="pick-name">${p.name}</div>
        <div class="pick-sub">${TN[p.type]||p.type} · ${p.type==='adult'?p.level:p.level+'. Kl.'} · ${LN[p.lang||'en']||p.lang} · ${p.xp||0} XP</div>
      </div>
      <div class="pick-arrow">→</div>
    </div>`).join('');
  grid.querySelectorAll('.pick-item').forEach(el=>el.addEventListener('click',function(){
    const i=parseInt(this.dataset.pi);
    applyProfile(i);
    document.getElementById('setup').style.display='none';
    document.body.classList.remove('setup-open');
    launchApp();
  }));
}

// ═══════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════
function renderProfiles(){
  const LN={en:'Englisch',de:'Deutsch',fr:'Französisch',it:'Italienisch',es:'Spanisch'};
  const TN={z1:'Zyklus 1',z2:'Zyklus 2',z3:'Zyklus 3',adult:'Erwachsene',hs:'Homeschool'};
  document.getElementById('proflist').innerHTML=ST.profiles.map((p,i)=>{
    const archiveHtml = (p.archive && p.archive.length)
      ? `<details style="margin-top:6px;">
           <summary style="font-size:11px;color:var(--text3);cursor:pointer;padding:4px 8px;background:var(--bg);border-radius:6px;list-style:none;display:flex;align-items:center;gap:4px;">
             📅 Vorjahre (${p.archive.length}) ▾
           </summary>
           <div style="padding:6px 8px;background:var(--bg);border-radius:0 0 6px 6px;margin-top:-4px;">
             ${p.archive.map(a=>`
               <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);padding:3px 0;border-bottom:1px solid var(--border);">
                 <span>${a.datum} · Klasse ${a.schuljahr||'?'}</span>
                 <span style="color:var(--gold)">${a.xp||0} XP · ${a.done||0} Üb.</span>
               </div>`).join('')}
           </div>
         </details>` : '';
    return `<div class="profitem ${i===ST.activeProfile?'ap':''}">
      <div style="display:flex;align-items:center;gap:11px;flex:1;min-width:0;">
        <div class="profav">${p.name[0].toUpperCase()}</div>
        <div style="min-width:0;flex:1;">
          <div style="font-size:14px;font-weight:700;">${p.name}</div>
          <div style="font-size:12px;color:var(--text2);">${TN[p.type]||p.type} · ${p.type==='adult'?p.level:p.level+'. Kl.'} · ${LN[p.lang]||p.lang} · ${p.xp||0} XP</div>
          ${archiveHtml}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        ${i!==ST.activeProfile?`<button class="btn" data-sw="${i}">Wechseln</button>`:'<span style="font-size:12px;color:var(--green);font-weight:700;">● Aktiv</span>'}
        ${ST.profiles.length>1?`<button class="btn btn-r" data-del="${i}" style="padding:8px 10px;">✕</button>`:''}
      </div>
    </div>`;
  }).join('');
  document.querySelectorAll('[data-sw]').forEach(b=>b.addEventListener('click',function(){switchProf(parseInt(this.dataset.sw));}));
  document.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',function(){delProf(parseInt(this.dataset.del));}));
}
function switchProf(i){
  applyProfile(i);
  updateTop();updateDash();updateSidebarByProfile();updateDashByProfile();
  loadVK();loadSpk();chatHistory=[];startRole();renderProfiles();renderBadges();
  // Phase 2: Einheiten-Grids nach Profilwechsel neu laden
  ['fr','it','es'].forEach(lang => {
    const grid = document.getElementById(lang+'-einheiten-grid');
    if(grid) buildEinheitenGrid(lang, lang+'-einheiten-grid');
  });
  // Sprint 4: Difficulty nach Profilwechsel neu setzen
  applyAutoDifficulty();
  nav('dashboard');
  toast('👤 Profil: '+ST.profiles[i].name);
}
function delProf(i){if(!confirm('Profil "'+ST.profiles[i].name+'" löschen?'))return;const pid=ST.profiles[i].id;ST.profiles.splice(i,1);localStorage.setItem('edu_profiles',JSON.stringify(ST.profiles));sbDeleteProfile(pid);if(ST.activeProfile>=ST.profiles.length)ST.activeProfile=0;applyProfile(ST.activeProfile);renderProfiles();updateTop();updateDash();}
function addProfile(){
  // Setup-Overlay wiederverwenden statt prompt()
  document.getElementById('sn').value='';
  setupPType='z1';
  document.querySelectorAll('#ptgrid .pto').forEach(x=>x.classList.remove('on'));
  const firstPto=document.querySelector('#ptgrid .pto[data-t="z1"]');
  if(firstPto)firstPto.classList.add('on');
  updateLevelOpts();
  // Supabase-Sync im Hintergrund
  sbSyncProfiles().then(()=>{ renderSetupProfilePick(); });
  document.getElementById('setup').style.display='block';
  document.body.classList.add('setup-open');
  showSetupScreen('ss1');
}
function resetApp(){if(!confirm('Alles löschen? Diese Aktion kann nicht rückgängig gemacht werden.'))return;localStorage.clear();location.reload();}

// ═══════════════════════════════════════════
// PHASE 2 — ZURÜCKSETZEN-OPTIONEN
// ═══════════════════════════════════════════

// Nur Übungsfortschritt zurücksetzen — Profil bleibt
function resetProgress() {
  const p = ST.profiles[ST.activeProfile]; if(!p) return;
  if(!confirm('Übungsfortschritt von «' + p.name + '» zurücksetzen?\nXP, Skills und Lernfortschritt werden auf 0 gesetzt.\nDas Profil bleibt erhalten.')) return;
  p.xp = 0; p.streak = 0; p.done = 0;
  p.progress = {learn:0, listen:0, exam:0};
  p.skills = {h:0, l:0, s:0, w:0, r:0, m:0};
  p.badges = [];
  localStorage.setItem('edu_profiles', JSON.stringify(ST.profiles));
  applyProfile(ST.activeProfile);
  updateTop(); updateDash(); renderBadges();
  toast('🔄 Übungsfortschritt zurückgesetzt');
}

// Schuljahreswechsel: Fortschritt archivieren, neu starten
function newSchoolYear() {
  const p = ST.profiles[ST.activeProfile]; if(!p) return;
  const yr = p.level || '?';
  if(!confirm('Schuljahreswechsel für «' + p.name + '»?\nDer aktuelle Fortschritt wird archiviert.\nDas neue Schuljahr startet bei 0.')) return;
  // Archiv anlegen
  if(!p.archive) p.archive = [];
  const stamp = new Date().toLocaleDateString('de-CH', {year:'numeric', month:'short'});
  p.archive.push({
    datum: stamp,
    schuljahr: yr,
    xp: p.xp||0, done: p.done||0, streak: p.streak||0,
    progress: {...(p.progress||{})},
    skills: {...(p.skills||{})}
  });
  // Neu starten
  p.xp = 0; p.streak = 0; p.done = 0;
  p.progress = {learn:0, listen:0, exam:0};
  p.skills = {h:0, l:0, s:0, w:0, r:0, m:0};
  p.badges = [];
  // Klasse um 1 erhöhen (falls LP21)
  if(p.type !== 'adult') {
    const nextYr = Math.min(11, (parseInt(p.level)||1) + 1);
    p.level = String(nextYr);
  }
  localStorage.setItem('edu_profiles', JSON.stringify(ST.profiles));
  applyProfile(ST.activeProfile);
  updateTop(); updateDash(); updateDashByProfile(); renderProfiles(); renderBadges();
  renderSjArchiv();
  toast('📅 Schuljahreswechsel gespeichert · ' + stamp);
}

// Phase 3 UX: Vorjahres-Archiv anzeigen/ausblenden
function toggleSjArchiv() {
  const wrap = document.getElementById('sj-archiv-wrap');
  const btn  = document.getElementById('btn-sj-archiv');
  if (!wrap) return;
  const visible = wrap.style.display !== 'none';
  wrap.style.display = visible ? 'none' : '';
  if (btn) btn.textContent = visible ? '📂 Vorjahre anzeigen' : '📂 Vorjahre ausblenden';
  if (!visible) renderSjArchiv();
}

function renderSjArchiv() {
  const p = ST.profiles[ST.activeProfile];
  const wrap = document.getElementById('sj-archiv-wrap');
  const list = document.getElementById('sj-archiv-list');
  const btn  = document.getElementById('btn-sj-archiv');
  if (!p || !list) return;
  const archive = p.archive || [];
  if (btn) btn.style.display = archive.length ? '' : 'none';
  if (!archive.length) { if(wrap) wrap.style.display='none'; return; }
  list.innerHTML = archive.slice().reverse().map(a => `
    <div style="padding:10px 12px;background:var(--bg3);border-radius:var(--r);border:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:12px;font-weight:700;">📅 ${a.datum} · Klasse ${a.schuljahr}</span>
        <span style="font-size:11px;color:var(--gold);">⭐ ${a.xp||0} XP</span>
      </div>
      <div style="display:flex;gap:10px;font-size:11px;color:var(--text3);">
        <span>✅ ${a.done||0} Übungen</span>
        <span>🔥 ${a.streak||0} Tage Serie</span>
        <span>📖 ${a.progress?.learn||0} Lernpunkte</span>
      </div>
    </div>`).join('');
}

// Aktives Profil löschen
function delActiveProfile() {
  const p = ST.profiles[ST.activeProfile]; if(!p) return;
  if(ST.profiles.length <= 1) { toast('⚠️ Mindestens ein Profil muss vorhanden sein'); return; }
  if(!confirm('Profil «' + p.name + '» löschen?\nAlle Daten dieses Profils werden entfernt.')) return;
  delProf(ST.activeProfile);
  toast('🗑️ Profil gelöscht');
}

// ═══════════════════════════════════════════
// PHASE 4a — GRAMMATIK-BACKBONE
// Einheitliche Engine für EN/FR/IT/ES/DE
// ═══════════════════════════════════════════

// ── Sprach-Konfiguration ──────────────────
const GRAM_LANG_CFG = {
  en: { name:'English', instrLang:'English', feedbackLang:'Deutsch',
        teacherRole:'expert English grammar teacher (LP21 + Cambridge standard)',
        levelMap:{Z2:'A1/A2',Z3:'B1'}, diffLbl:{'-1':'simpler','0':'standard','1':'more advanced'} },
  fr: { name:'Français', instrLang:'Français', feedbackLang:'Deutsch',
        teacherRole:'professeur de français expert (LP21 + DELF)',
        levelMap:{Z2:'A1/A2',Z3:'B1'}, diffLbl:{'-1':'plus facile','0':'standard','1':'plus difficile'} },
  it: { name:'Italiano', instrLang:'Italiano', feedbackLang:'Deutsch',
        teacherRole:'insegnante di italiano esperto (LP21 + CILS)',
        levelMap:{Z2:'A1/A2',Z3:'B1'}, diffLbl:{'-1':'più facile','0':'standard','1':'più difficile'} },
  es: { name:'Español', instrLang:'Español', feedbackLang:'Deutsch',
        teacherRole:'profesor de español experto (LP21 + DELE)',
        levelMap:{Z2:'A1/A2',Z3:'B1'}, diffLbl:{'-1':'más fácil','0':'estándar','1':'más difícil'} },
  de: { name:'Deutsch', instrLang:'Deutsch', feedbackLang:'Deutsch',
        teacherRole:'Deutschlehrer für DAZ/DaF (LP21 DAZ-Deskriptoren Z1–Z3)',
        levelMap:{Z1:'A1',Z2:'A2',Z3:'B1/B2'}, diffLbl:{'-1':'einfacher','0':'Standard','1':'anspruchsvoller'} }
};

// ── Aktuell ausgewählte Topics pro Block ──
const _gramState = {}; // key: `${lang}-${blockId}` → topic string
let _gramDiffOffset = 0; // global diff for EN panel; per-lang handled in panel

// ── Init: alles bei DOMContentLoaded ─────
document.addEventListener('DOMContentLoaded', function(){

  // ── Schuljahr-Filter (EN panel) ──────────
  document.getElementById('en-gram-level-filter')?.addEventListener('click', function(e){
    const btn = e.target.closest('.gram-lf-btn'); if(!btn) return;
    this.querySelectorAll('.gram-lf-btn').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    const lf = btn.dataset.lf;
    document.querySelectorAll('#panel-en-grammar .gram-block').forEach(block=>{
      const levels = block.dataset.levels||'';
      if(lf==='all'||levels.includes(lf)) block.classList.remove('level-hidden');
      else block.classList.add('level-hidden');
    });
  });

  // ── Schwierigkeits-Row (EN panel) ────────
  document.getElementById('panel-en-grammar')?.querySelectorAll('[data-d]').forEach(btn=>{
    btn.addEventListener('click',function(){
      document.querySelectorAll('#panel-en-grammar [data-d]').forEach(b=>b.classList.remove('on'));
      this.classList.add('on');
      _gramDiffOffset = parseInt(this.dataset.d)||0;
    });
  });

  // ── Chip-Selektion für ALLE Gram-Blöcke ─
  document.addEventListener('click', function(e){
    const chip = e.target.closest('.chip[data-topic]');
    if(!chip) return;
    const row = chip.closest('.chip-row');
    if(!row) return;
    row.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));
    chip.classList.add('on');
    // Update label in parent acc-body
    const body = chip.closest('.acc-body');
    if(body){
      const lbl = body.querySelector('.cur-topic-lbl');
      if(lbl) lbl.textContent = chip.dataset.topic;
    }
  });

  // ── Gram-Generate-Buttons ─────────────────
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.gram-gen-btn');
    if(!btn) return;
    const lang  = btn.dataset.lang;
    const block = btn.dataset.block;
    const body  = btn.closest('.acc-body');
    // Find selected chip in this block
    const selChip = body?.querySelector('.chip-row .chip.on[data-topic]');
    const topic = selChip?.dataset.topic || '(kein Thema gewählt)';
    const outId = `${lang}-gram-out-block${block}`;
    loadGrammarBlock(lang, block, topic, outId);
  });

  // Vocab
  let enVocabTopic='Family & Relationships';
  document.getElementById('en-vocab-topics')?.addEventListener('click',function(e){
    const b=e.target.closest('[data-vt]');if(!b)return;
    enVocabTopic=b.dataset.vt;
    document.getElementById('en-vocab-topic-lbl').textContent=enVocabTopic;
    this.querySelectorAll('[data-vt]').forEach(x=>x.classList.remove('btn-p'));
    b.classList.add('btn-p');
    document.getElementById('btn-en-vocab')._topic=enVocabTopic;
  });
  document.getElementById('btn-en-vocab')?.addEventListener('click',function(){
    loadEnVocab(this._topic||enVocabTopic||'Family & Relationships');
  });

  // Reading
  document.getElementById('btn-en-read')?.addEventListener('click',loadEnReading);

  // Writing
  document.getElementById('btn-en-write-new')?.addEventListener('click',loadEnWritePrompt);
  document.getElementById('btn-en-write-check')?.addEventListener('click',checkEnWriting);
  document.getElementById('en-write-input')?.addEventListener('input',function(){
    const wc=this.value.trim().split(/\s+/).filter(w=>w.length>0).length;
    document.getElementById('en-write-wc').textContent=wc+' word'+(wc!==1?'s':'');
  });

  // Listening type buttons
  let enListenType='conversation';
  document.querySelectorAll('[data-lt]').forEach(b=>b.addEventListener('click',function(){
    enListenType=this.dataset.lt;
    document.querySelectorAll('[data-lt]').forEach(x=>x.classList.remove('btn-p'));
    this.classList.add('btn-p');
    document.getElementById('btn-en-listen')._type=enListenType;
  }));
  document.getElementById('btn-en-listen')?.addEventListener('click',function(){
    loadEnListening(this._type||'conversation');
  });

  // Cambridge
  document.getElementById('btn-en-cam')?.addEventListener('click',loadEnCambridge);
});

async function loadEnGrammar(){
  // Legacy stub — redirects to backbone (should not normally be called in V13)
  const out=document.getElementById('en-gram-out');
  if(out) out.innerHTML='<div class="card" style="color:var(--text2);font-size:13px;">Bitte Thema über Akkordeon-Blöcke wählen.</div>';
}

// ═══════════════════════════════════════════
// PHASE 4a — EINHEITLICHE GRAMMATIK-ENGINE
// ═══════════════════════════════════════════
// SPRINT 10: ERFOLGSKONTROLLEN
// Z1=12 Fragen · Z2=20 · Z3=30
// Typen: MC · Lücke · Offen · Fehlerkorrektur (nur Z3)
// ═══════════════════════════════════════════

const EK_CFG = {
  Z1: { n:12, mc:8,  fill:3,  open:1, err:0, cefr:'A1', label:'Z1 · KG–2. Klasse' },
  Z2: { n:20, mc:10, fill:6,  open:4, err:0, cefr:'A2/B1', label:'Z2 · 3.–6. Klasse' },
  Z3: { n:30, mc:10, fill:8,  open:8, err:4, cefr:'B1/B2', label:'Z3 · 7.–9. Klasse' },
};

const EK_FACH_LABELS = {
  'de-kb1':'Deutsch KB1 Hören','de-kb2':'Deutsch KB2 Sprechen','de-kb3':'Deutsch KB3 Lesen',
  'de-kb4':'Deutsch KB4 Schreiben','de-kb5':'Deutsch KB5 Grammatik',
  'en':'Englisch','fr':'Français','it':'Italiano','es':'Español',
  'mathe-z1':'Mathematik Z1','mathe-z2':'Mathematik Z2','mathe-sek':'Mathematik Sek',
};

async function loadEK(){
  const out = document.getElementById('ek-out');
  const key = ST.apiKey || localStorage.getItem('edu_api_key') || '';
  if(!key){ out.innerHTML=`<div class="card" style="color:var(--gold);">⚠️ API-Schlüssel fehlt — unter <strong>Konto → API</strong> hinterlegen.</div>`; return; }

  const fach   = document.getElementById('ek-fach').value;
  const zyklus = document.getElementById('ek-zyklus').value;
  const cfg    = EK_CFG[zyklus];
  const fachLbl= EK_FACH_LABELS[fach] || fach;

  // Sek-Thema
  let sekTopic = '';
  if(fach === 'mathe-sek'){
    const aktChip = document.querySelector('#ek-sek-chips .chip.on');
    sekTopic = aktChip ? aktChip.dataset.sek : 'Algebra & Gleichungen';
  }

  out.innerHTML = `<div class="sp"><div class="sp-ring"></div><br>Generiere ${cfg.n} Fragen für ${fachLbl} · ${cfg.label}…</div>`;

  const errBlock = cfg.err > 0
    ? `,{"type":"error","count":${cfg.err},"instruction":"Finde und korrigiere den Fehler im Satz"}`
    : '';

  const fachContext = buildEKFachContext(fach, zyklus, sekTopic);

  const systemPrompt =
`Du bist eine Schweizer LP21-Lehrperson und erstellst eine Erfolgskontrolle.
Fach: ${fachLbl}${sekTopic?' · Thema: '+sekTopic:''}
Zyklus: ${zyklus} · Niveau: ${cfg.cefr}
Sprache der Fragen: Deutsch (Antwortoptionen je nach Fach auch in Zielsprache)
${fachContext}

Erstelle genau ${cfg.n} Fragen in dieser Verteilung:
- ${cfg.mc} Multiple-Choice (4 Optionen, 1 korrekt)
- ${cfg.fill} Lücken-Aufgaben (Satz mit ___ Lücke, korrekte Antwort)
- ${cfg.open} Offene Fragen (freie Antwort, Musterlösung angeben)
${cfg.err>0?`- ${cfg.err} Fehlerkorrektur-Aufgaben (fehlerhafter Satz + korrigierte Version)`:''}

Antworte NUR mit validem JSON (kein Markdown, keine Backticks):
{
  "titel": "Erfolgskontrolle ${fachLbl} · ${cfg.label}",
  "fragen": [
    {"typ":"mc","frage":"Fragetext","optionen":["A","B","C","D"],"korrekt":0},
    {"typ":"fill","frage":"Satz mit ___ Lücke","antwort":"korrekte Antwort"},
    {"typ":"open","frage":"Offene Frage?","musterantwort":"Musterlösung"},
    {"typ":"error","falsch":"Falscher Satz","korrekt":"Korrigierter Satz","regel":"kurze Regel"}
  ]
}`;

  try{
    const raw = await claude([{role:'user',content:'Generiere die Erfolgskontrolle.'}], systemPrompt);
    const d = JSON.parse(raw.replace(/```json|```/g,'').trim());
    renderEKQuiz(d, fach, zyklus, fachLbl, cfg, out);
  } catch(e){
    out.innerHTML=`<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`;
  }
}

function buildEKFachContext(fach, zyklus, sekTopic){
  const ctxMap = {
    'de-kb1': 'Hörverstehen: Dialoge, Anweisungen, Präsentationen verstehen',
    'de-kb2': 'Sprechen/Schreiben: Erzählen, Berichten, Argumentieren (als Schreib-EK)',
    'de-kb3': 'Leseverstehen: Texte lesen, Lesestrategien, Sach- und Literartexte',
    'de-kb4': 'Schreiben: Texte verfassen, Rechtschreibung, Zeichensetzung',
    'de-kb5': 'Grammatik & Sprachreflexion: Wortarten, Satzglieder, Rechtschreibregeln',
    'en':     'Englisch: Vocabulary, Grammar, Reading Comprehension, Writing (LP21)',
    'fr':     'Français: Vocabulaire, Grammaire, Compréhension de texte, Expression écrite',
    'it':     'Italiano: Vocabolario, Grammatica, Comprensione del testo, Produzione scritta',
    'es':     'Español: Vocabulario, Gramática, Comprensión de texto, Expresión escrita',
    'mathe-z1':'Mathematik Z1: Addition, Subtraktion, Grundformen, einfache Sachaufgaben',
    'mathe-z2':'Mathematik Z2: Multiplikation, Division, Brüche, Dezimalzahlen, Grössen',
    'mathe-sek':`Mathematik Sek: ${sekTopic} — Themen: Algebra & Gleichungen, Geometrie & Trigonometrie, Funktionen & Grafiken. Fokus: ${sekTopic}. Niveau ${zyklus} (B1/B2), realitätsbezogene Aufgaben.`,
  };
  return ctxMap[fach] || '';
}

function renderEKQuiz(d, fach, zyklus, fachLbl, cfg, out){
  const ekId = 'ek_' + Date.now();
  let totalPts = 0;
  // Punkte: MC=1, Fill=1, Open=2, Error=2
  d.fragen?.forEach(f=>{
    if(f.typ==='mc'||f.typ==='fill') totalPts++;
    else totalPts+=2;
  });

  let html = `<div class="card" id="${ekId}">
    <div class="ctitle">${d.titel||'Erfolgskontrolle'} <span class="tag tag-lp">${zyklus}</span><span class="tag tag-ai">KI</span></div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:1rem;">
      ${d.fragen?.length||0} Fragen · ${totalPts} Punkte total
      · MC=1 Pt · Lücke=1 Pt · Offen=2 Pt${cfg.err>0?' · Fehlerkorr.=2 Pt':''}
    </div>`;

  (d.fragen||[]).forEach((f,fi)=>{
    html += `<div class="card" style="background:var(--bg3);margin-bottom:.75rem;" id="${ekId}-q${fi}">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:.05em;margin-bottom:.5rem;">
        Aufgabe ${fi+1} · ${f.typ==='mc'?'Multiple Choice':f.typ==='fill'?'Lücke':f.typ==='open'?'Offene Frage':'Fehlerkorrektur'}
        <span style="float:right;color:var(--text3);">${f.typ==='mc'||f.typ==='fill'?'1 Pt':'2 Pt'}</span>
      </div>`;

    if(f.typ==='mc'){
      html += `<div style="font-size:14px;font-weight:600;margin-bottom:.5rem;">${f.frage}</div>
        <div class="mcopts">${(f.optionen||[]).map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${f.korrekt}" data-qid="${ekId}-q${fi}">${o}</button>`).join('')}</div>`;

    } else if(f.typ==='fill'){
      const id=`${ekId}-f${fi}`;
      const txt=(f.frage||'').replace('___',
        `<input id="${id}" class="inp" style="width:140px;display:inline-block;padding:5px 10px;vertical-align:middle;" placeholder="…" data-ans="${(f.antwort||'').replace(/"/g,"'")}"/>`);
      html += `<div style="font-size:14px;line-height:2.2;">${txt}</div>
        <div style="margin-top:.5rem;display:flex;gap:8px;">
          <button class="btn btn-p" style="padding:6px 14px;font-size:12px;" onclick="checkFill('${id}',true)">✓ Prüfen</button>
          <span id="${id}-fb" style="font-size:13px;line-height:2;min-width:24px;"></span>
        </div>`;

    } else if(f.typ==='open'){
      const id=`${ekId}-o${fi}`;
      html += `<div style="font-size:14px;font-weight:600;margin-bottom:.5rem;">${f.frage}</div>
        <textarea id="${id}" class="inp" rows="3" placeholder="Deine Antwort…" style="resize:vertical;"></textarea>
        <div style="margin-top:.5rem;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <button class="btn btn-p" style="padding:6px 14px;font-size:12px;" onclick="checkOpenEK('${id}','${(f.musterantwort||'').replace(/'/g,'\\x27')}')">✓ Prüfen</button>
          <button class="btn" style="padding:6px 14px;font-size:12px;" onclick="toggleMuster('${id}-muster')">📄 Musterlösung</button>
        </div>
        <div id="${id}-muster" style="display:none;margin-top:.5rem;padding:8px 12px;background:rgba(34,197,94,.08);border:1px solid var(--green);border-radius:var(--r);font-size:13px;color:var(--green);">
          <strong>Musterlösung:</strong> ${f.musterantwort||'–'}
        </div>
        <div id="${id}-fb" style="font-size:12px;margin-top:4px;min-height:16px;"></div>`;

    } else if(f.typ==='error'){
      const id=`${ekId}-e${fi}`;
      html += `<div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:4px;">Finde den Fehler im folgenden Satz:</div>
        <div style="font-size:14px;margin-bottom:.625rem;padding:8px 12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:var(--r);color:var(--text);">${f.falsch}</div>
        <div class="irow">
          <input class="inp" id="${id}" placeholder="Korrigierter Satz…" data-ans="${(f.korrekt||'').replace(/"/g,"'")}" style="flex:1;"/>
          <button class="btn btn-p" style="padding:6px 14px;" onclick="checkTransform('${id}')">✓</button>
        </div>
        <div id="${id}-fb" style="font-size:12px;margin-top:3px;min-height:18px;"></div>
        ${f.regel?`<div style="font-size:11px;color:var(--text3);margin-top:3px;">📌 ${f.regel}</div>`:''}`;
    }

    html += `</div>`; // card q
  });

  // Auswertungs-Button
  html += `<div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);">
    <button class="btn btn-g" onclick="auswertungEK('${ekId}',${totalPts},'${fach}','${zyklus}','${fachLbl.replace(/'/g,"\\x27")}')">
      📊 Auswertung & Note berechnen
    </button>
  </div></div>`;

  out.innerHTML = html;

  // MC-Listener
  out.querySelectorAll('.mcopts').forEach(opts => opts.querySelectorAll('.mcopt').forEach(btn => btn.addEventListener('click', function(){
    const c=parseInt(this.dataset.c), i=parseInt(this.dataset.i);
    opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
    if(i===c){ this.classList.add('ok'); toast('✅ Richtig!'); }
    else { this.classList.add('no'); opts.querySelectorAll('.mcopt')[c].classList.add('ok'); }
  })));
}

function checkOpenEK(id, muster){
  const inp = document.getElementById(id);
  const fb  = document.getElementById(id+'-fb');
  if(!inp||!inp.value.trim()){ toast('⚠️ Bitte Antwort eingeben'); return; }
  // Einfache Längen-/Inhaltsprüfung
  const ok = inp.value.trim().length >= 10;
  if(fb) fb.innerHTML = ok
    ? `<span style="color:var(--green)">✅ Antwort gespeichert — vergleiche mit Musterlösung</span>`
    : `<span style="color:var(--gold)">⚠️ Zu kurz — bitte ausführlicher antworten</span>`;
}

function toggleMuster(id){
  const el = document.getElementById(id);
  if(el) el.style.display = el.style.display==='none' ? 'block' : 'none';
}

function auswertungEK(ekId, totalPts, fach, zyklus, fachLbl){
  const card = document.getElementById(ekId);
  if(!card) return;

  // Punkte zählen
  let erreicht = 0;

  // MC: .ok Buttons
  card.querySelectorAll('.mcopt.ok').forEach(b=>{
    if(parseInt(b.dataset.i)===parseInt(b.dataset.c)) erreicht++;
  });
  // Fill: korrekte
  card.querySelectorAll('[id*="-f"][data-ans]').forEach(inp=>{
    const fb = document.getElementById(inp.id+'-fb');
    if(fb && fb.textContent.includes('✅')) erreicht++;
  });
  // Error: korrekte
  card.querySelectorAll('[id*="-e"][data-ans]').forEach(inp=>{
    const fb = document.getElementById(inp.id+'-fb');
    if(fb && fb.textContent.includes('✅')) erreicht+=2;
  });
  // Offene: gezählt als 1 Pt wenn ausgefüllt (max 2)
  card.querySelectorAll('textarea[id]').forEach(ta=>{
    if(ta.value.trim().length>=10) erreicht += 2;
  });

  const pct = Math.round(erreicht / totalPts * 100);
  const note = pctToNote(pct);
  const noteColor = note >= 4 ? 'var(--green)' : note >= 3 ? 'var(--gold)' : 'var(--red)';

  const resHtml = `<div class="rescard ${pct>=60?'res-g':pct>=40?'res-m':'res-b'}" style="margin-top:1rem;">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
      <div style="text-align:center;">
        <div style="font-size:32px;font-weight:800;color:${noteColor};">${note}</div>
        <div style="font-size:11px;color:var(--text3);">Note (1–6)</div>
      </div>
      <div>
        <div style="font-size:18px;font-weight:700;">${erreicht} / ${totalPts} Punkte</div>
        <div style="font-size:13px;color:var(--text2);">${pct}% · ${pct>=75?'Sehr gut':pct>=60?'Gut':pct>=50?'Ausreichend':'Ungenügend'}</div>
      </div>
      <button class="btn btn-p" style="margin-left:auto;" onclick="saveEKResult('${fach}','${zyklus}','${fachLbl}',${erreicht},${totalPts},${note})">
        💾 Ergebnis speichern
      </button>
    </div>
    <div class="scbar" style="margin-top:.75rem;"><div class="scfill" style="width:${pct}%;background:${noteColor};"></div></div>
  </div>`;

  // Ergebnis-Card nach Auswertungs-Button einfügen
  const existing = document.getElementById(ekId+'-result');
  if(existing) existing.remove();
  const div = document.createElement('div'); div.id = ekId+'-result'; div.innerHTML = resHtml;
  card.appendChild(div);
  div.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function pctToNote(pct){
  // Schweizer Skala 1–6: 6=100-87%, 5=86-75%, 4=74-60%, 3=59-45%, 2=44-25%, 1=<25%
  if(pct>=87) return 6;
  if(pct>=75) return 5;
  if(pct>=60) return 4;
  if(pct>=45) return 3;
  if(pct>=25) return 2;
  return 1;
}

function saveEKResult(fach, zyklus, fachLbl, erreicht, total, note){
  const key = 'edu_ek_results';
  const all = JSON.parse(localStorage.getItem(key)||'[]');
  const now = new Date();
  // Aktives Profil miterfassen
  const activeP = ST.profiles[ST.activeProfile];
  all.push({
    fach, zyklus, fachLbl,
    erreicht, total, note,
    pct: Math.round(erreicht/total*100),
    date: now.toISOString(),
    hj: now.getMonth() >= 7 ? 'hj1' : 'hj2',  // Aug-Feb = HJ1, Mär-Jul = HJ2
    profileId: activeP?.id || null,
    profileName: activeP?.name || '–',
  });
  // Max 50 Einträge behalten
  if(all.length > 50) all.splice(0, all.length-50);
  localStorage.setItem(key, JSON.stringify(all));
  toast('✅ Ergebnis gespeichert!');
  renderEKOverview('hj1');
  addXP(10,'r','exam');
}

function renderEKOverview(hj){
  const out = document.getElementById('ek-overview-out');
  if(!out) return;
  const all = JSON.parse(localStorage.getItem('edu_ek_results')||'[]');

  let filtered = hj==='year' ? all : all.filter(r=>r.hj===hj);

  if(!filtered.length){
    out.innerHTML = `<div style="font-size:13px;color:var(--text3);padding:.75rem 0;">Keine Einträge für diesen Zeitraum.</div>`;
    return;
  }

  filtered.sort((a,b)=>new Date(b.date)-new Date(a.date));

  // Sammle alle Profile und Fächer
  const profiles = [...new Set(filtered.map(r=>r.profileName||'–'))];
  const faecher  = [...new Set(filtered.map(r=>r.fachLbl))];

  let html = '';

  // ── 1. Gesamtübersicht pro Profil ────────────────────
  html += `<div style="margin-bottom:1.5rem;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:.07em;margin-bottom:.625rem;">Übersicht pro Kind</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:1rem;">`;

  profiles.forEach(pName=>{
    const pr = filtered.filter(r=>(r.profileName||'–')===pName);
    const avgNote = (pr.reduce((s,r)=>s+r.note,0)/pr.length).toFixed(1);
    const avgPct  = Math.round(pr.reduce((s,r)=>s+r.pct,0)/pr.length);
    const nc = parseFloat(avgNote)>=4?'var(--green)':parseFloat(avgNote)>=3?'var(--gold)':'var(--red)';
    html += `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px;">${pName}</div>
      <div style="display:flex;align-items:baseline;gap:8px;">
        <span style="font-size:28px;font-weight:800;color:${nc};">${avgNote}</span>
        <span style="font-size:12px;color:var(--text3);">Ø Note · ${avgPct}%</span>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px;">${pr.length} Kontrolle${pr.length!==1?'n':''}</div>
    </div>`;
  });
  html += `</div></div>`;

  // ── 2. Übersicht pro Fach (mit Ø Note je Kind) ──────
  html += `<div style="margin-bottom:1.5rem;">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:.07em;margin-bottom:.625rem;">Durchschnitt pro Fach</div>
    <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="border-bottom:1px solid var(--border);">
        <th style="text-align:left;padding:6px 10px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);">Fach</th>
        ${profiles.map(p=>`<th style="text-align:center;padding:6px 10px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);">${p}</th>`).join('')}
        <th style="text-align:center;padding:6px 10px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);">Ø Alle</th>
      </tr></thead><tbody>`;

  faecher.forEach(fach=>{
    const fachAll = filtered.filter(r=>r.fachLbl===fach);
    const avgAll  = (fachAll.reduce((s,r)=>s+r.note,0)/fachAll.length).toFixed(1);
    const ncAll   = parseFloat(avgAll)>=4?'var(--green)':parseFloat(avgAll)>=3?'var(--gold)':'var(--red)';
    html += `<tr style="border-bottom:1px solid rgba(45,63,86,.4);">
      <td style="padding:6px 10px;font-weight:600;">${fach}</td>`;
    profiles.forEach(pName=>{
      const pr = fachAll.filter(r=>(r.profileName||'–')===pName);
      if(!pr.length){ html += `<td style="padding:6px 10px;text-align:center;color:var(--text3);">–</td>`; return; }
      const avg = (pr.reduce((s,r)=>s+r.note,0)/pr.length).toFixed(1);
      const nc  = parseFloat(avg)>=4?'var(--green)':parseFloat(avg)>=3?'var(--gold)':'var(--red)';
      html += `<td style="padding:6px 10px;text-align:center;font-weight:700;color:${nc};">${avg}<span style="font-size:10px;color:var(--text3);font-weight:400;"> (${pr.length})</span></td>`;
    });
    html += `<td style="padding:6px 10px;text-align:center;font-weight:800;font-size:15px;color:${ncAll};">${avgAll}</td>
    </tr>`;
  });

  html += `</tbody></table></div></div>`;

  // ── 3. Detail-Tabelle (alle Einträge) ────────────────
  html += `<details style="margin-top:.5rem;">
    <summary style="font-size:12px;font-weight:700;color:var(--text3);cursor:pointer;padding:6px 10px;background:var(--bg3);border-radius:var(--r);list-style:none;display:flex;align-items:center;gap:6px;">
      📋 Alle Einträge (${filtered.length}) ▾
    </summary>
    <div style="margin-top:6px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="border-bottom:1px solid var(--border);">
        <th style="text-align:left;padding:5px 8px;color:var(--text3);">Datum</th>
        <th style="text-align:left;padding:5px 8px;color:var(--text3);">Kind</th>
        <th style="text-align:left;padding:5px 8px;color:var(--text3);">Fach</th>
        <th style="text-align:center;padding:5px 8px;color:var(--text3);">Zyklus</th>
        <th style="text-align:center;padding:5px 8px;color:var(--text3);">Punkte</th>
        <th style="text-align:center;padding:5px 8px;color:var(--text3);">%</th>
        <th style="text-align:center;padding:5px 8px;color:var(--text3);">Note</th>
      </tr></thead><tbody>`;

  filtered.forEach(r=>{
    const d = new Date(r.date);
    const dStr = `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}`;
    const nc = r.note>=4?'var(--green)':r.note>=3?'var(--gold)':'var(--red)';
    html += `<tr style="border-bottom:1px solid rgba(45,63,86,.3);">
      <td style="padding:5px 8px;color:var(--text3);">${dStr}</td>
      <td style="padding:5px 8px;font-weight:600;">${r.profileName||'–'}</td>
      <td style="padding:5px 8px;">${r.fachLbl}</td>
      <td style="padding:5px 8px;text-align:center;"><span style="font-size:10px;padding:1px 5px;border-radius:4px;background:rgba(56,189,248,.12);color:var(--blue);">${r.zyklus}</span></td>
      <td style="padding:5px 8px;text-align:center;">${r.erreicht}/${r.total}</td>
      <td style="padding:5px 8px;text-align:center;color:var(--text2);">${r.pct}%</td>
      <td style="padding:5px 8px;text-align:center;font-weight:800;font-size:15px;color:${nc};">${r.note}</td>
    </tr>`;
  });

  html += `</tbody></table></div></details>`;

  out.innerHTML = html;
}

// ═══════════════════════════════════════════
// DEUTSCH KB1: HÖREN (LP21 Kompetenzbereich 1)
// Generiert echten Hörtext → 🔊 vorlesen → Verständnisfragen
// ═══════════════════════════════════════════
async function loadDeKB1Listening(){
  const out = document.getElementById('de-kb1-listen-out');
  if(!out) return;
  const key = ST.apiKey || localStorage.getItem('edu_api_key') || '';
  if(!key){
    out.innerHTML=`<div class="card" style="color:var(--gold);font-size:14px;">⚠️ API-Schlüssel fehlt — unter <strong>Konto → API</strong> hinterlegen.</div>`;
    return;
  }
  // Aktiver Typ-Chip
  const activeChip = document.querySelector('#de-kb1-types .chip.on');
  const type = activeChip ? activeChip.dataset.kb1type : 'Alltagsgespräch';
  const topic = document.getElementById('de-kb1-topic').value.trim() || 'Schule';
  const level = document.getElementById('de-kb1-level').value || 'Z2';
  const levelMap = {Z1:'A1', Z2:'A2', Z3:'B1'};
  const cefr = levelMap[level] || 'A2';

  out.innerHTML = sp();

  const systemPrompt =
`Du bist eine Deutschlehrerin für LP21 (Schweizer Lehrplan, Zyklus ${level}, Niveau ${cefr}).
Erstelle einen Hörtext vom Typ "${type}" zum Thema "${topic}".
Schreibe natürlich gesprochenes Deutsch, das für ${cefr}-Niveau geeignet ist.
Antworte NUR mit validem JSON (kein Markdown, keine Backticks):
{
  "title": "Titel des Hörtexts",
  "type": "${type}",
  "level": "${cefr}",
  "script": "Der vollständige Hörtext (120-160 Wörter, bei Gespräch Sprecherwechsel mit '\\n' + Name markieren, z.B. 'Lena: ...')",
  "schluesselwoerter": [{"wort": "Wort auf Deutsch", "erklaerung": "einfache Erklärung"}],
  "fragen": [
    {"typ": "mc", "frage": "Frage zum Text", "optionen": ["Option A", "Option B", "Option C"], "korrekt": 0},
    {"typ": "mc", "frage": "...", "optionen": ["...", "...", "..."], "korrekt": 1},
    {"typ": "mc", "frage": "...", "optionen": ["...", "...", "..."], "korrekt": 2},
    {"typ": "offen", "frage": "Erkläre mit eigenen Worten: ...", "antwort": "Musterlösung"}
  ]
}`;

  try{
    const raw = await claude([{role:'user', content:'Generiere den Hörtext.'}], systemPrompt);
    const d = JSON.parse(raw.replace(/```json|```/g,'').trim());

    let html = `<div class="card">
      <div class="ctitle">${d.title} <span class="tag tag-lp">LP21 ${d.level}</span><span class="tag tag-ai">KI</span></div>
      <div style="padding:14px 16px;background:var(--bg3);border-radius:var(--r);margin-bottom:1rem;">
        <div style="font-size:12px;color:var(--text3);margin-bottom:.625rem;">📋 Höre den Text an — beantworte dann die Fragen ohne nochmals nachzuhören.</div>
        <div style="display:flex;gap:8px;margin-bottom:.75rem;flex-wrap:wrap;">
          <button class="btn btn-p" id="de-kb1-play">🔊 Vorlesen</button>
          <button class="btn" id="de-kb1-script-btn">📄 Text anzeigen</button>
        </div>
        <div id="de-kb1-script" style="display:none;font-size:14px;line-height:1.9;padding:10px;background:var(--bg2);border-radius:var(--r);">${(d.script||'').replace(/\n/g,'<br>')}</div>
      </div>`;

    // Schlüsselwörter
    if(d.schluesselwoerter?.length){
      html += `<div style="margin-bottom:1rem;display:flex;flex-wrap:wrap;gap:6px;">
        ${d.schluesselwoerter.map(sw=>`<span style="padding:4px 10px;background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.2);border-radius:5px;font-size:12px;color:var(--purple);">${sw.wort}: <span style="color:var(--text2);">${sw.erklaerung}</span></span>`).join('')}
      </div>`;
    }

    html += `<div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.75rem;letter-spacing:.06em;">Verständnisfragen</div>`;

    (d.fragen||[]).forEach((f,fi)=>{
      if(f.typ==='mc'){
        html += `<div style="margin-bottom:.875rem;">
          <div style="font-size:14px;font-weight:600;margin-bottom:5px;">${fi+1}. ${f.frage}</div>
          <div class="mcopts">${(f.optionen||[]).map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${f.korrekt}">${o}</button>`).join('')}</div>
        </div>`;
      } else {
        const id = `dekb1-offen-${fi}`;
        html += `<div style="margin-bottom:.875rem;">
          <div style="font-size:14px;font-weight:600;margin-bottom:5px;">${fi+1}. ${f.frage}</div>
          <div class="irow">
            <input class="inp" id="${id}" placeholder="Deine Antwort…" data-ans="${(f.antwort||'').replace(/"/g,"'")}" style="flex:1;"/>
            <button class="btn" onclick="checkTransform('${id}')">✓</button>
          </div>
          <div id="${id}-fb" style="font-size:12px;margin-top:3px;min-height:16px;"></div>
        </div>`;
      }
    });

    html += `</div>`;
    out.innerHTML = html;

    // Listeners
    const scriptEl = document.getElementById('de-kb1-script');
    document.getElementById('de-kb1-play').addEventListener('click', ()=>speak(d.script||'', 'de'));
    document.getElementById('de-kb1-script-btn').addEventListener('click', function(){
      const vis = scriptEl.style.display === 'none';
      scriptEl.style.display = vis ? 'block' : 'none';
      this.textContent = vis ? '📄 Text ausblenden' : '📄 Text anzeigen';
    });
    out.querySelectorAll('.mcopts').forEach(opts => opts.querySelectorAll('.mcopt').forEach(btn => btn.addEventListener('click', function(){
      const c = parseInt(this.dataset.c), i = parseInt(this.dataset.i);
      opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok'); addXP(8,'h','listen'); toast('✅ Richtig! +8 XP');}
      else{this.classList.add('no'); opts.querySelectorAll('.mcopt')[c].classList.add('ok'); toast('❌');}
    })));
    addXP(5,'h','listen');

  } catch(e){
    out.innerHTML=`<div style="color:var(--red);padding:1rem;font-size:13px;">Fehler: ${e.message}</div>`;
  }
}

// loadGrammarBlock(lang, blockId, topic, outId)
// ═══════════════════════════════════════════
async function loadGrammarBlock(lang, blockId, topic, outId){
  const out = document.getElementById(outId);
  if(!out) return;
  const key = ST.apiKey || localStorage.getItem('edu_api_key') || '';
  if(!key){
    out.innerHTML=`<div class="card" style="color:var(--gold);font-size:14px;">⚠️ API-Schlüssel fehlt — unter <strong>Konto → API</strong> hinterlegen.</div>`;
    return;
  }
  out.innerHTML = sp();
  const cfg = GRAM_LANG_CFG[lang] || GRAM_LANG_CFG.en;
  // Sprint 4: zentrale Diff-Logik statt _gramDiffOffset
  const diff = ST.learning_state?.difficulty_offset ?? getAutoDiffForProfile();
  const diffLabel = getDiffLabel(diff, lang);
  const zi = getZyklusInfo();
  const baseNiveau = zi.isAdult ? (zi.niveau||'B1') :
    (cfg.levelMap['Z'+(zi.zyklus||2)] || 'A2');
  const cefrLevel = getEffectiveNiveau(baseNiveau, diff);

  const systemPrompt =
`You are a ${cfg.teacherRole}.
Learner: ${cfg.name} · CEFR ${cefrLevel} · ${diffLabel} difficulty.
Grammar topic: "${topic}".
Respond ONLY with valid JSON (no markdown, no backticks):
{
  "title": "...",
  "lang": "${lang}",
  "explanation": "Rule explanation in Deutsch (3-5 sentences, clear, concise)",
  "examples": [
    {"target": "sentence in ${cfg.instrLang}", "translation": "Deutsch", "highlight": "word or phrase to notice"}
  ],
  "exercises": [
    {
      "type": "fill",
      "instruction": "Fill in the blank",
      "sentences": [
        {"text": "sentence with ___ gap", "answer": "correct word/form", "hint": "optional hint"},
        {"text": "...", "answer": "...", "hint": ""},
        {"text": "...", "answer": "...", "hint": ""},
        {"text": "...", "answer": "...", "hint": ""},
        {"text": "...", "answer": "...", "hint": ""}
      ]
    },
    {
      "type": "mc",
      "instruction": "Choose the correct answer",
      "questions": [
        {"q": "question sentence", "options": ["opt1","opt2","opt3","opt4"], "correct": 0},
        {"q": "...", "options": ["...","...","...","..."], "correct": 1},
        {"q": "...", "options": ["...","...","...","..."], "correct": 2},
        {"q": "...", "options": ["...","...","...","..."], "correct": 0}
      ]
    },
    {
      "type": "error",
      "instruction": "Find and correct the mistake",
      "sentences": [
        {"wrong": "incorrect sentence", "correct": "corrected version", "rule": "short rule note"},
        {"wrong": "...", "correct": "...", "rule": "..."},
        {"wrong": "...", "correct": "...", "rule": "..."}
      ]
    }
  ]
}`;

  try{
    const raw = await claude([{role:'user', content:'Generate grammar exercises.'}], systemPrompt);
    const d = JSON.parse(raw.replace(/```json|```/g,'').trim());

    // ── Build HTML ──────────────────────────
    let html = `<div class="card">
      <div class="ctitle">${d.title} <span class="tag tag-ai">KI</span> <span class="tag tag-lp">${topic}</span></div>
      <div style="padding:12px 16px;background:rgba(56,189,248,.07);border:1px solid rgba(56,189,248,.2);border-radius:var(--r);margin-bottom:1.25rem;">
        <div style="font-size:11px;font-weight:700;color:var(--blue);text-transform:uppercase;margin-bottom:6px;">📌 Regel</div>
        <div style="font-size:14px;line-height:1.8;">${d.explanation}</div>
        ${d.examples?.length ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;">
          ${d.examples.map(ex=>`<div style="padding:7px 12px;background:var(--bg2);border-radius:var(--r);font-size:13px;">
            <span style="color:var(--blue);font-weight:600;">${ex.target||ex.en||''}</span>
            ${ex.highlight?`<span style="padding:0 3px 1px;background:rgba(56,189,248,.2);border-radius:3px;font-size:12px;">${ex.highlight}</span>`:''}
            <span style="color:var(--text3);"> → ${ex.translation||ex.de||''}</span>
          </div>`).join('')}
        </div>` : ''}
      </div>`;

    d.exercises?.forEach((ex, ei) => {
      html += `<div style="margin-bottom:1.5rem;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.75rem;letter-spacing:.06em;">
          Aufgabe ${ei+1}: ${ex.instruction}
        </div>`;

      if(ex.type==='fill'){
        ex.sentences?.forEach((s,si)=>{
          const id=`gfv13-${lang}-${blockId}-${ei}-${si}`;
          const txt = (s.text||'').replace('___',
            `<input id="${id}" class="inp" style="width:130px;display:inline-block;padding:5px 10px;vertical-align:middle;" placeholder="…" data-ans="${s.answer||''}" />`);
          html+=`<div style="margin-bottom:.75rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-size:14px;flex:1;">${txt}</span>
            <button class="btn" style="padding:6px 12px;font-size:12px;" onclick="checkFill('${id}')">✓</button>
            <span id="${id}-fb" style="font-size:12px;min-width:24px;"></span>
            ${s.hint?`<span style="font-size:11px;color:var(--text3);width:100%;">💡 ${s.hint}</span>`:''}
          </div>`;
        });

      } else if(ex.type==='mc'){
        ex.questions?.forEach((q,qi)=>{
          html+=`<div style="margin-bottom:.875rem;">
            <div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div>
            <div class="mcopts">${(q.options||[]).map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div>
          </div>`;
        });

      } else if(ex.type==='error'){
        ex.sentences?.forEach((s,si)=>{
          const id=`erv13-${lang}-${blockId}-${ei}-${si}`;
          html+=`<div style="margin-bottom:.875rem;">
            <div style="font-size:14px;margin-bottom:5px;color:var(--red);text-decoration:line-through;">${s.wrong}</div>
            <div class="irow"><input class="inp" id="${id}" placeholder="Korrigierter Satz…" data-ans="${s.correct||''}" style="flex:1;" /><button class="btn" onclick="checkTransform('${id}')">✓</button></div>
            <div id="${id}-fb" style="font-size:12px;margin-top:3px;min-height:18px;"></div>
            ${s.rule?`<div style="font-size:11px;color:var(--text3);margin-top:2px;">📌 ${s.rule}</div>`:''}
          </div>`;
        });
      }
      html += `</div>`;
    });
    html += `</div>`;
    out.innerHTML = html;

    // MC listeners
    out.querySelectorAll('.mcopts').forEach(opts => opts.querySelectorAll('.mcopt').forEach(btn => btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c), i=parseInt(this.dataset.i);
      opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');addXP(5,'r','learn');toast('✅ Richtig!');}
      else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    })));
    addXP(8,'r','learn');

  } catch(e){
    out.innerHTML=`<div style="color:var(--red);padding:1rem;font-size:13px;">Fehler: ${e.message}</div>`;
  }
}


function checkFill(id){
  const inp=document.getElementById(id);if(!inp)return;
  const ans=inp.dataset.ans.toLowerCase().trim();
  const val=inp.value.toLowerCase().trim();
  const fb=document.getElementById(id+'-fb');
  if(val===ans){inp.style.borderColor='var(--green)';fb.innerHTML=`<span style="color:var(--green)">✅</span>`;addXP(3,'r','learn');}
  else{inp.style.borderColor='var(--red)';fb.innerHTML=`<span style="color:var(--red)">❌ ${inp.dataset.ans}</span>`;}
}

function checkTransform(id){
  const inp=document.getElementById(id);if(!inp)return;
  const norm=s=>s.toLowerCase().replace(/[^a-zàâäéèêëîïôùûüçœæ0-9 ']/g,'').trim();
  const ans=norm(inp.dataset.ans||'');
  const val=norm(inp.value||'');
  const fb=document.getElementById(id+'-fb');
  const ok=val===ans||val.includes(ans)||ans.includes(val);
  if(ok){inp.style.borderColor='var(--green)';fb.innerHTML=`<span style="color:var(--green)">✅ Correct!</span>`;addXP(4,'r','learn');}
  else{inp.style.borderColor='var(--red)';fb.innerHTML=`<span style="color:var(--red)">❌ ${inp.dataset.ans}</span>`;}
}

// ═══════════════════════════════════════════
// ENGLISCH: WORTSCHATZ
// ═══════════════════════════════════════════
async function loadEnVocab(topic){
  const out=document.getElementById('en-vocab-out');
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){out.innerHTML=`<div class="card" style="color:var(--gold);font-size:14px;">⚠️ Kein API-Schlüssel gesetzt. Bitte unter <strong>Profile &amp; API</strong> den Anthropic API-Schlüssel hinterlegen.</div>`;return;}
  out.innerHTML=sp();
  try{
    const raw=await claude([{role:'user',content:'Generate.'}],
      `English vocabulary teacher. Learner level: ${ST.user_config.level}. Topic: "${topic}".
Create a rich vocabulary set. Respond ONLY with valid JSON:
{
  "title":"...",
  "words":[
    {"word":"...","pos":"noun/verb/adj/adv","translation":"German","example":"English sentence","level":"A1-C2","collocations":["...","..."]},
    ... (12-16 words total)
  ],
  "phrases":[{"phrase":"...","meaning":"German","example":"..."}],
  "quiz":[{"type":"match","word":"...","options":["correct German","wrong1","wrong2","wrong3"],"correct":0}]
}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    let html=`<div class="card">
      <div class="ctitle">${d.title} <span class="tag tag-new">Vocabulary</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin-bottom:1.25rem;">
        ${d.words.map(w=>`<div style="padding:12px 14px;background:var(--bg3);border-radius:var(--r);border-left:3px solid var(--blue);">
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;">
            <span style="font-size:16px;font-weight:700;color:var(--text);">${w.word}</span>
            <span style="font-size:11px;color:var(--text3);font-style:italic;">${w.pos}</span>
            <span style="font-size:10px;padding:1px 6px;background:rgba(56,189,248,.15);color:var(--blue);border-radius:5px;">${w.level}</span>
            <button class="tts" data-txt="${w.word}" style="margin-left:auto;">🔊</button>
          </div>
          <div style="font-size:13px;color:var(--gold);font-weight:600;margin-top:4px;">${w.translation}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px;font-style:italic;">"${w.example}"</div>
          ${w.collocations?.length?`<div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:4px;">${w.collocations.map(c=>`<span style="font-size:11px;padding:2px 7px;background:var(--bg2);border-radius:4px;color:var(--text3);">${c}</span>`).join('')}</div>`:''}
        </div>`).join('')}
      </div>`;
    if(d.phrases?.length){
      html+=`<div style="margin-bottom:1.25rem;"><div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.75rem;">💬 Key Phrases</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${d.phrases.map(p=>`<div style="padding:8px 12px;background:var(--bg3);border-radius:var(--r);font-size:13px;">
            <span style="color:var(--blue);font-weight:600;">${p.phrase}</span>
            <span style="color:var(--text3);"> → ${p.meaning}</span>
            <span style="color:var(--text2);font-style:italic;"> · "${p.example}"</span>
          </div>`).join('')}
        </div>
      </div>`;
    }
    if(d.quiz?.length){
      html+=`<div><div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.75rem;">🎯 Quick Quiz – Match the word to its German translation</div>
        ${d.quiz.map((q,qi)=>`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. <span style="color:var(--blue);">${q.word}</span></div>
          <div class="mcopts">${q.options.map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div>
        </div>`).join('')}
      </div>`;
    }
    html+=`</div>`;
    out.innerHTML=html;
    out.querySelectorAll('.tts[data-txt]').forEach(b=>b.addEventListener('click',()=>speak(b.dataset.txt,'en')));
    out.querySelectorAll('.mcopts').forEach(opts=>opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);
      opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');addXP(5,'l','learn');toast('✅ Correct!');}
      else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    })));
    addXP(10,'l','learn');
  }catch(e){out.innerHTML=`<div style="color:var(--red);padding:1rem;">Error: ${e.message}</div>`;}
}

// ═══════════════════════════════════════════
// ENGLISCH: READING
// ═══════════════════════════════════════════
async function loadEnReading(){
  const out=document.getElementById('en-read-out');
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){out.innerHTML=`<div class="card" style="color:var(--gold);font-size:14px;">⚠️ Kein API-Schlüssel gesetzt. Bitte unter <strong>Profile &amp; API</strong> den Anthropic API-Schlüssel hinterlegen.</div>`;return;}
  out.innerHTML=sp();
  const type=document.getElementById('en-read-type').value;
  const topic=document.getElementById('en-read-topic').value.trim()||'everyday life';
  const diff=ST.learning_state.difficulty_offset;
  const level=diff===-1?'A1/A2':diff===1?'C1/C2':'B1/B2';
  const wantMC=document.getElementById('en-read-mc').checked;
  const wantTF=document.getElementById('en-read-tf').checked;
  const wantGap=document.getElementById('en-read-gap').checked;
  const wantSum=document.getElementById('en-read-sum').checked;
  try{
    const raw=await claude([{role:'user',content:'Generate.'}],
      `You are a Cambridge English reading expert. Create a ${type} about "${topic}" at ${level} level.
Respond ONLY with valid JSON:
{
  "title":"...",
  "text":"(6-10 sentences, clear paragraphs separated by \\n\\n)",
  "wordCount": 120,
  ${wantMC?`"mc":[{"q":"...","options":["a","b","c","d"],"correct":0,"line":"reference in text"},{"q":"...","options":["a","b","c","d"],"correct":1},{"q":"...","options":["a","b","c","d"],"correct":2}],`:''}
  ${wantTF?`"tf":[{"statement":"...","answer":true,"justification":"..."},{"statement":"...","answer":false,"justification":"..."},{"statement":"...","answer":true,"justification":"..."}],`:''}
  ${wantGap?`"gap":{"text":"same text but with [G1][G2][G3][G4] gaps replacing key words","answers":[{"id":1,"word":"...","options":["correct","wrong1","wrong2"]},{"id":2,"word":"...","options":["correct","wrong1","wrong2"]},{"id":3,"word":"...","options":["correct","wrong1","wrong2"]},{"id":4,"word":"...","options":["correct","wrong1","wrong2"]}]},`:''}
  ${wantSum?`"summary_task":"Write a 2-3 sentence summary of the text in your own words.",`:''}
  "vocab_highlight":[{"word":"...","definition":"..."}]
}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    let html=`<div class="card">
      <div class="ctitle">${d.title} <span class="tag tag-lp">${type}</span><span class="tag" style="background:rgba(34,197,94,.12);color:var(--green);border:1px solid rgba(34,197,94,.2);">${level}</span></div>
      <div style="font-size:15px;line-height:2;margin-bottom:1.25rem;padding:14px 16px;background:var(--bg3);border-radius:var(--r);">
        ${d.text.replace(/\n\n/g,'</p><p style="margin-top:12px;">').replace(/^/,'<p>').replace(/$/,'</p>')}
        <button class="btn" style="display:block;margin-top:10px;padding:6px 14px;font-size:12px;" onclick="speak(document.querySelector('#en-read-out .card div:nth-child(2)').textContent,'en')">🔊 Listen</button>
      </div>`;
    if(d.vocab_highlight?.length){
      html+=`<div style="margin-bottom:1rem;padding:10px 14px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2);border-radius:var(--r);">
        <div style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:6px;">📖 Key Vocabulary</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${d.vocab_highlight.map(v=>`<span style="padding:3px 10px;background:var(--bg2);border-radius:5px;font-size:12px;"><strong style="color:var(--gold);">${v.word}</strong>: ${v.definition}</span>`).join('')}</div>
      </div>`;
    }
    if(d.mc?.length){
      html+=`<div style="margin-bottom:1.25rem;"><div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.75rem;">📋 Multiple Choice</div>
        ${d.mc.map((q,qi)=>`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div>
          <div class="mcopts">${q.options.map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div>
        </div>`).join('')}
      </div>`;
    }
    if(d.tf?.length){
      html+=`<div style="margin-bottom:1.25rem;"><div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.75rem;">✅ True / False</div>
        ${d.tf.map((t,ti)=>`<div style="margin-bottom:.75rem;padding:10px 14px;background:var(--bg3);border-radius:var(--r);">
          <div style="font-size:14px;margin-bottom:6px;">${ti+1}. ${t.statement}</div>
          <div style="display:flex;gap:8px;">
            <button class="btn" data-tfans="${t.answer}" data-tfj="${(t.justification||'').replace(/"/g,"'")}">True</button>
            <button class="btn" data-tfans="${!t.answer}" data-tfj="${(t.justification||'').replace(/"/g,"'")}">False</button>
          </div>
          <div id="tf-fb-${ti}" style="font-size:12px;margin-top:4px;min-height:16px;"></div>
        </div>`).join('')}
      </div>`;
    }
    if(d.gap){
      let gt=d.gap.text;
      d.gap.answers.forEach(a=>{gt=gt.replace('[G'+a.id+']',mkBlank(a.word,a.options));});
      html+=`<div style="margin-bottom:1.25rem;"><div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.75rem;">✏️ Gap-Fill</div>
        <div class="stxt">${gt}</div>
      </div>`;
    }
    if(d.summary_task){
      html+=`<div><div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.75rem;">📝 Summary Task</div>
        <div style="font-size:14px;color:var(--text2);padding:10px;background:var(--bg3);border-radius:var(--r);margin-bottom:.5rem;">${d.summary_task}</div>
        <textarea class="warea" id="en-read-sum-inp" placeholder="Write your summary here..." style="min-height:80px;"></textarea>
        <div class="btn-row" style="justify-content:flex-start;margin-top:.5rem;">
          <button class="btn btn-p" onclick="checkEnReadSummary()">Submit ↗</button>
        </div>
        <div id="en-read-sum-fb"></div>
      </div>`;
    }
    html+=`</div>`;
    out.innerHTML=html;
    out.querySelectorAll('.mcopts').forEach(opts=>opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);
      opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');addXP(8,'l','learn');toast('✅ Correct!');}
      else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    })));
    out.querySelectorAll('[data-tfans]').forEach((btn,bi)=>{
      btn.addEventListener('click',function(){
        const ti=Math.floor(bi/2);
        const fb=document.getElementById('tf-fb-'+ti);
        const isTrue=this.textContent==='True';
        const correctIsTrue=this.dataset.tfans==='true';
        const ok=isTrue===correctIsTrue;
        const row=this.closest('div[style]');
        row.querySelectorAll('[data-tfans]').forEach(b=>b.disabled=true);
        if(ok){this.classList.add('ok');addXP(5,'l','learn');}else{this.classList.add('no');}
        if(fb)fb.innerHTML=`<span style="color:${ok?'var(--green)':'var(--red)'};">${ok?'✅':'❌'} ${this.dataset.tfj}</span>`;
      });
    });
    wireBlankClick(out);
    addXP(8,'l','learn');
  }catch(e){out.innerHTML=`<div style="color:var(--red);padding:1rem;">Error: ${e.message}</div>`;}
}

async function checkEnReadSummary(){
  const txt=document.getElementById('en-read-sum-inp')?.value.trim();if(!txt)return;
  const fb=document.getElementById('en-read-sum-fb');fb.innerHTML=sp();
  try{
    const raw=await claude([{role:'user',content:'Check.'}],
      `Cambridge English teacher. Check this summary for accuracy, grammar, vocabulary (B1/B2). Text: "${txt}". ${ctx()} Respond ONLY JSON: {"score":0-100,"grade":"A-F","content":"...","grammar":"...","vocab":"...","tip":"..."}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    const col=d.score>=70?'var(--green)':d.score>=50?'var(--gold)':'var(--red)';
    fb.innerHTML=`<div class="rescard ${d.score>=70?'res-g':d.score>=50?'res-m':'res-b'}" style="margin-top:.75rem;">
      <strong style="color:${col};">${d.grade} – ${d.score}/100</strong><br>
      <span style="font-size:13px;">${d.content} · ${d.grammar} · ${d.vocab}</span>
      ${d.tip?`<br><span style="font-size:12px;color:${col};">💡 ${d.tip}</span>`:''}
    </div>`;
    addXP(Math.round(d.score/10),'l','learn');
  }catch(e){fb.textContent='Error: '+e.message;}
}

// ═══════════════════════════════════════════
// ENGLISCH: WRITING
// ═══════════════════════════════════════════
async function loadEnWritePrompt(){
  const el=document.getElementById('en-write-prompt');el.textContent='Loading...';
  document.getElementById('en-write-input').value='';
  document.getElementById('en-write-fb').innerHTML='';
  document.getElementById('en-write-wc').textContent='0 words';
  const type=document.getElementById('en-write-type').value;
  const topic=document.getElementById('en-write-topic').value.trim();
  const diff=ST.learning_state.difficulty_offset;
  const level=diff===-1?'A1/A2':diff===1?'C1/C2':'B1/B2';
  try{
    const raw=await claude([{role:'user',content:'Task.'}],
      `Cambridge writing teacher. Create a ${type} writing task about "${topic||'any topic'}" at ${level} level.
Respond ONLY JSON: {"task":"Full task instructions in English","context":"Situation/background","bullets":["Point 1","Point 2","Point 3"],"wordCount":{"min":80,"max":120},"format":"email|essay|story|letter|report"}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    el.innerHTML=`<strong style="color:var(--blue);">${d.format.toUpperCase()} Task (${d.wordCount.min}–${d.wordCount.max} words)</strong><br><br>
      <span style="color:var(--text);">${d.task}</span><br><br>
      <em style="color:var(--text2);">${d.context}</em>
      ${d.bullets?.length?`<ul style="margin-top:8px;margin-left:18px;color:var(--text2);font-size:13px;">${d.bullets.map(b=>`<li>${b}</li>`).join('')}</ul>`:''}`;
  }catch(e){el.textContent='Error: '+e.message;}
}

async function checkEnWriting(){
  const txt=document.getElementById('en-write-input').value.trim();if(!txt){toast('⚠️ Please write something first');return;}
  const task=document.getElementById('en-write-prompt').textContent;
  const fb=document.getElementById('en-write-fb');fb.innerHTML=sp();
  try{
    const raw=await claude([{role:'user',content:'Assess.'}],
      `Cambridge writing examiner. Task: "${task.substring(0,300)}". Student text: "${txt}".
Assess against Cambridge criteria. Respond ONLY JSON:
{"score":0-100,"grade":"A-F","content":0-25,"language":0-25,"organisation":0-25,"vocabulary":0-25,
"content_fb":"feedback","language_fb":"feedback","organisation_fb":"feedback","vocabulary_fb":"feedback",
"improved_opening":"...","tip":"One key improvement tip"}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    const col=d.score>=70?'var(--green)':d.score>=50?'var(--gold)':'var(--red)';
    fb.innerHTML=`<div class="rescard ${d.score>=70?'res-g':d.score>=50?'res-m':'res-b'}" style="margin-top:.875rem;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:.875rem;">
        <div style="font-family:'DM Serif Display',serif;font-size:44px;color:${col};">${d.grade}</div>
        <div>
          <div style="font-size:18px;font-weight:700;color:${col};">${d.score}/100</div>
          <div class="scbar" style="width:180px;"><div class="scfill" style="width:${d.score}%;background:${col};"></div></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:.875rem;">
        <div style="padding:8px;background:var(--bg3);border-radius:var(--r);"><strong style="color:var(--blue);">📖 Content (${d.content}/25)</strong><br>${d.content_fb}</div>
        <div style="padding:8px;background:var(--bg3);border-radius:var(--r);"><strong style="color:var(--green);">📐 Language (${d.language}/25)</strong><br>${d.language_fb}</div>
        <div style="padding:8px;background:var(--bg3);border-radius:var(--r);"><strong style="color:var(--gold);">🏗️ Organisation (${d.organisation}/25)</strong><br>${d.organisation_fb}</div>
        <div style="padding:8px;background:var(--bg3);border-radius:var(--r);"><strong style="color:var(--purple);">💬 Vocabulary (${d.vocabulary}/25)</strong><br>${d.vocabulary_fb}</div>
      </div>
      ${d.improved_opening?`<div style="padding:9px 12px;background:var(--bg3);border-radius:var(--r);font-size:13px;margin-bottom:.5rem;">✨ <strong>Better opening:</strong> <em>${d.improved_opening}</em></div>`:''}
      ${d.tip?`<div style="font-size:13px;color:${col};">💡 ${d.tip}</div>`:''}
    </div>`;
    addXP(Math.round(d.score/10),'w','learn');toast('✅ Grade: '+d.grade);
  }catch(e){fb.textContent='Error: '+e.message;}
}

// ═══════════════════════════════════════════
// ENGLISCH: LISTENING
// ═══════════════════════════════════════════
async function loadEnListening(type){
  const out=document.getElementById('en-listen-out');
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){out.innerHTML=`<div class="card" style="color:var(--gold);font-size:14px;">⚠️ Kein API-Schlüssel gesetzt. Bitte unter <strong>Profile &amp; API</strong> den Anthropic API-Schlüssel hinterlegen.</div>`;return;}
  out.innerHTML=sp();
  const topic=document.getElementById('en-listen-topic').value.trim()||'everyday life';
  const level=document.getElementById('en-listen-level').value;
  try{
    const raw=await claude([{role:'user',content:'Generate.'}],
      `Cambridge listening teacher. Create a ${type} about "${topic}" at ${level} level.
Respond ONLY JSON:
{"title":"...","text":"The full listening text (natural spoken English, 100-150 words, formatted as dialogue if applicable)","speakers":["Name1","Name2"],"questions":[{"type":"mc","q":"...","options":["a","b","c"],"correct":0},{"type":"mc","q":"...","options":["a","b","c"],"correct":1},{"type":"short","q":"...","answer":"..."},{"type":"mc","q":"...","options":["a","b","c"],"correct":2}],"vocab":[{"word":"...","meaning":"..."}]}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    let html=`<div class="card">
      <div class="ctitle">${d.title} <span class="tag tag-lp">${type}</span><span class="tag" style="background:rgba(34,197,94,.12);color:var(--green);border:1px solid rgba(34,197,94,.2);">${level}</span></div>
      <div style="padding:14px 16px;background:var(--bg3);border-radius:var(--r);margin-bottom:1rem;">
        <div style="font-size:13px;color:var(--text3);margin-bottom:.5rem;">📋 Read the questions first, then listen.</div>
        <div style="display:flex;gap:8px;margin-bottom:.75rem;">
          <button class="btn btn-p" id="en-listen-play">🔊 Play Audio</button>
          <button class="btn" id="en-listen-script-btn">Show Script</button>
        </div>
        <div id="en-listen-script" style="display:none;font-size:14px;line-height:1.9;padding:10px;background:var(--bg2);border-radius:var(--r);">${d.text.replace(/\n/g,'<br>')}</div>
      </div>
      ${d.vocab?.length?`<div style="margin-bottom:1rem;display:flex;flex-wrap:wrap;gap:6px;">${d.vocab.map(v=>`<span style="padding:4px 10px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);border-radius:5px;font-size:12px;color:var(--gold);">${v.word}: <span style="color:var(--text2);">${v.meaning}</span></span>`).join('')}</div>`:''}
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.75rem;">Comprehension Questions</div>`;
    d.questions.forEach((q,qi)=>{
      if(q.type==='mc'){
        html+=`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div>
          <div class="mcopts">${q.options.map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div></div>`;
      } else {
        const id=`enl-sh-${qi}`;
        html+=`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div>
          <div class="irow"><input class="inp" id="${id}" placeholder="Your answer..." data-ans="${(q.answer||'').replace(/"/g,"'")}"/><button class="btn" onclick="checkTransform('${id}')">✓</button></div>
          <div id="${id}-fb" style="font-size:12px;margin-top:3px;min-height:16px;"></div>
        </div>`;
      }
    });
    html+=`</div>`;
    out.innerHTML=html;
    document.getElementById('en-listen-play').addEventListener('click',()=>speak(d.text,'en'));
    document.getElementById('en-listen-script-btn').addEventListener('click',function(){
      const sc=document.getElementById('en-listen-script');
      const vis=sc.style.display==='none';
      sc.style.display=vis?'block':'none';
      this.textContent=vis?'Hide Script':'Show Script';
    });
    out.querySelectorAll('.mcopts').forEach(opts=>opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);
      opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');addXP(8,'h','listen');toast('✅ Correct!');}
      else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    })));
    addXP(5,'h','listen');
  }catch(e){out.innerHTML=`<div style="color:var(--red);padding:1rem;">Error: ${e.message}</div>`;}
}

// ═══════════════════════════════════════════
// ENGLISCH: CAMBRIDGE PREP
// ═══════════════════════════════════════════
// ── JSON-Repair: schliesst abgebrochene Strings/Arrays/Objekte ──
function repairJson(raw){
  let s=raw.replace(/```json|```/g,'').trim();
  // Entferne trailing Komma vor } oder ]
  s=s.replace(/,\s*([}\]])/g,'$1');
  // Versuche direktes Parsen
  try{return JSON.parse(s);}catch(e){}
  // Repair: zähle offene Klammern und schliesse sie
  let d=0,sq=0,inStr=false,esc=false;
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(esc){esc=false;continue;}
    if(c==='\\'&&inStr){esc=true;continue;}
    if(c==='"'&&!esc){inStr=!inStr;continue;}
    if(inStr)continue;
    if(c==='{'||c==='[')d++;
    if(c==='}'||c===']')d--;
    if(c==='[')sq++;
  }
  // Falls String offen: schliesse ihn
  if(inStr)s+='"';
  // Schliesse offene Arrays/Objekte
  while(d>0){s+=d%2===1?'}':']';d--;}
  try{return JSON.parse(s);}catch(e2){throw new Error('JSON-Parsing fehlgeschlagen: '+e2.message);}
}

async function loadEnCambridge(){
  const out=document.getElementById('en-cam-out');
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){out.innerHTML=`<div class="card" style="color:var(--gold);font-size:14px;">⚠️ Kein API-Schlüssel gesetzt. Bitte unter <strong>Profile &amp; API</strong> den Anthropic API-Schlüssel hinterlegen.</div>`;return;}
  out.innerHTML=sp();
  const exam=document.getElementById('en-cam-exam').value;
  const part=document.getElementById('en-cam-part').value;
  // B2/C1 Reading-Texte sind länger — mehr tokens
  const isLongTask=part.startsWith('reading')||(exam==='FCE'||exam==='CAE');
  try{
    const raw=await claudeEx([{role:'user',content:'Generate.'}],
      `You are an official Cambridge ${exam} examiner and teacher. Create an authentic ${exam} ${part} practice task.
IMPORTANT: Keep the reading text SHORT (max 120 words) to ensure complete JSON output.
Respond ONLY with valid JSON, no markdown, no extra text:
{
  "title":"${exam} ${part.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}",
  "instructions":"Official exam instructions in English",
  "text":"(reading/listening tasks only: max 120 words)",
  "items":[
    {"type":"mc|gap|open|writing","q":"question","options":["a","b","c","d"],"correct":0,"answer":"for open tasks"}
  ],
  "time_allowed":"15 minutes",
  "marks_per_item":1,
  "examiner_notes":"What the examiner looks for"
}`,isLongTask?2200:1600);
    const d=repairJson(raw);
    const examNivMap={KET:'A2',PET:'B1',FCE:'B2',CAE:'C1'};
    const examNiv=examNivMap[exam]||'';
    const nivCls=examNiv==='A2'?'niv-a2':examNiv==='B1'?'niv-b1':examNiv==='B2'?'niv-b2':'niv-b1';
    let html=`<div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem;flex-wrap:wrap;">
        <div style="padding:6px 14px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);border-radius:var(--r);font-size:13px;font-weight:700;color:var(--gold);">${exam}</div>
        ${examNiv?`<span class="niv-badge ${nivCls}">${examNiv}</span>`:''}
        <div class="ctitle" style="margin-bottom:0;">${d.title}</div>
        <div style="margin-left:auto;font-size:12px;color:var(--text3);">⏱ ${d.time_allowed||'15 min'}</div>
      </div>
      <div style="padding:10px 14px;background:rgba(56,189,248,.07);border-left:3px solid var(--blue);border-radius:0 var(--r) var(--r) 0;font-size:13px;margin-bottom:1rem;">${d.instructions}</div>
      ${d.text?`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:.375rem;">
        <button class="btn cam-tts-btn" style="padding:5px 12px;font-size:12px;">🔊 Text vorlesen</button>
        <span style="font-size:11px;color:var(--text3);">Chrome/Edge</span>
      </div>
      <div class="cam-tts-src" style="font-size:14px;line-height:1.9;padding:12px 16px;background:var(--bg3);border-radius:var(--r);margin-bottom:1rem;">${d.text.replace(/\n/g,'<br>')}</div>`
      :''}`;

    d.items.forEach((item,ii)=>{
      if(item.type==='mc'&&item.options){
        html+=`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${ii+1}. ${item.q}</div>
          <div class="mcopts">${item.options.map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${item.correct}">${o}</button>`).join('')}</div></div>`;
      } else if(item.type==='gap'){
        const id=`cam-gap-${ii}`;
        html+=`<div style="margin-bottom:.75rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:14px;">${ii+1}. ${item.q.replace('___',`<input id="${id}" class="inp" style="width:130px;display:inline-block;padding:5px 10px;vertical-align:middle;" placeholder="…" data-ans="${item.answer||''}" />`)}</span>
          <button class="btn" style="padding:6px 12px;font-size:12px;" onclick="checkFill('${id}')">✓</button>
          <span id="${id}-fb" style="font-size:12px;"></span>
        </div>`;
      } else if(item.type==='writing'||item.type==='open'){
        const id=`cam-wr-${ii}`;
        html+=`<div style="margin-bottom:.875rem;">
          <div style="font-size:14px;font-weight:600;margin-bottom:6px;">${ii+1}. ${item.q}</div>
          <textarea class="warea" id="${id}" placeholder="Write your answer here…" style="min-height:100px;"></textarea>
          <div class="btn-row" style="justify-content:flex-start;margin-top:.5rem;gap:6px;">
            <button class="btn cam-mic-btn" data-target="${id}" style="padding:7px 12px;font-size:13px;" title="Antwort einsprechen">🎤</button>
            <div class="micst cam-mic-st" id="${id}-micst" style="font-size:11px;align-self:center;min-width:60px;"></div>
            <button class="btn btn-p" data-wrid="${id}" data-task="${(item.q||'').replace(/"/g,"'")}" onclick="checkCambridgeWriting(this)">Submit ↗</button>
          </div>
          <div id="${id}-fb"></div>
        </div>`;
      }
    });
    if(d.examiner_notes){
      html+=`<div style="margin-top:1rem;padding:10px 14px;background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.2);border-radius:var(--r);font-size:13px;">
        <strong style="color:var(--purple);">📋 Examiner Notes:</strong> ${d.examiner_notes}
      </div>`;
    }
    html+=`</div>`;
    out.innerHTML=html;
    // TTS: Text vorlesen
    out.querySelectorAll('.cam-tts-btn').forEach(btn=>{
      const src=btn.parentElement.nextElementSibling;
      btn.addEventListener('click',function(){
        if(!window.speechSynthesis)return;
        if(this.textContent.startsWith('⏹')){window.speechSynthesis.cancel();this.textContent='🔊 Text vorlesen';return;}
        window.speechSynthesis.cancel();
        const u=new SpeechSynthesisUtterance((src?.innerText||'').replace(/\n/g,' '));
        u.lang='en-GB';u.rate=0.85;
        this.textContent='⏹ Stop';
        u.onend=()=>{this.textContent='🔊 Text vorlesen';};
        window.speechSynthesis.speak(u);
      });
    });
    // Mikrofon für Speaking/Writing-Tasks
    out.querySelectorAll('.cam-mic-btn').forEach(btn=>{
      btn.addEventListener('click',function(){
        const targetId=this.dataset.target;
        const ta=document.getElementById(targetId);
        const st=document.getElementById(targetId+'-micst');
        const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
        if(!SR){toast('⚠️ Chrome/Edge erforderlich');return;}
        if(this.classList.contains('on')){
          if(window._camRec){try{window._camRec.stop();}catch(e){}}
          this.classList.remove('on');this.textContent='🎤';if(st)st.textContent='';return;
        }
        const r=new SR();r.lang='en-GB';r.interimResults=true;r.continuous=false;
        window._camRec=r;
        r.onstart=()=>{btn.classList.add('on');btn.textContent='⏹';if(st){st.textContent='🔴 Höre…';st.className='micst cam-mic-st act';}};
        r.onresult=(e)=>{
          const t=Array.from(e.results).map(x=>x[0].transcript).join('');
          if(ta)ta.value=t;
          if(e.results[e.results.length-1].isFinal&&st){st.textContent='✅';st.className='micst cam-mic-st';}
        };
        r.onerror=r.onend=()=>{btn.classList.remove('on');btn.textContent='🎤';if(st&&st.textContent.includes('höre')){st.textContent='';st.className='micst cam-mic-st';}window._camRec=null;};
        r.start();
      });
    });
    // MC click handlers
    out.querySelectorAll('.mcopts').forEach(opts=>opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);
      opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');addXP(10,'r','exam');toast('✅ Correct! +10 XP');}
      else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    })));
    addXP(5,'r','exam');
  }catch(e){out.innerHTML=`<div style="color:var(--red);padding:1rem;">Error: ${e.message}</div>`;}
}

async function checkCambridgeWriting(btn){
  const id=btn.dataset.wrid;const task=btn.dataset.task;
  const txt=document.getElementById(id)?.value.trim();if(!txt)return;
  const fb=document.getElementById(id+'-fb');fb.innerHTML=sp();
  const exam=document.getElementById('en-cam-exam')?.value||'Cambridge';
  try{
    const raw=await claude([{role:'user',content:'Check.'}],
      `${exam} examiner. Task: "${task}". Student answer: "${txt}".
Assess against ${exam} criteria. Respond ONLY JSON: {"score":0-100,"grade":"A-F","content":"...","language":"...","tip":"..."}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    const col=d.score>=70?'var(--green)':d.score>=50?'var(--gold)':'var(--red)';
    fb.innerHTML=`<div class="rescard ${d.score>=70?'res-g':d.score>=50?'res-m':'res-b'}" style="margin-top:.5rem;">
      <strong style="color:${col};">${d.grade} – ${d.score}/100</strong>
      <div style="font-size:13px;margin-top:4px;">${d.content} · ${d.language}</div>
      ${d.tip?`<div style="font-size:12px;color:${col};margin-top:3px;">💡 ${d.tip}</div>`:''}
    </div>`;
    addXP(Math.round(d.score/10),'w','exam');toast('✅ '+d.grade);
  }catch(e){fb.textContent='Error: '+e.message;}
}


// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800);}

// ═══════════════════════════════════════════
// GENERISCHES SPRACH-MODUL (FR/IT/ES/DE)
// Alle Panels verwenden dieselbe Logik,
// nur Sprache + Prompt-Sprache variiert
// ═══════════════════════════════════════════
const LANG_PROMPT={
  fr:{name:'Français',instrLang:'Français',feedbackLang:'Deutsch',examName:'DELF'},
  it:{name:'Italiano',instrLang:'Italiano',feedbackLang:'Deutsch',examName:'CILS'},
  es:{name:'Español',instrLang:'Español',feedbackLang:'Deutsch',examName:'DELE'},
  de:{name:'Deutsch',instrLang:'Deutsch',feedbackLang:'Englisch',examName:'Goethe'},
};

// ── Grammatik — Legacy-Stub (leitet auf Backbone weiter) ──
async function loadLangGrammar(lang, topic, outId){
  // Phase 4a/4b: Alle Sprachen nutzen jetzt loadGrammarBlock().
  // Dieser Stub bleibt für eventuelle externe Aufrufe erhalten.
  await loadGrammarBlock(lang, 'legacy', topic, outId);
}

// ── Vokabeln (KI-generiert, thematisch) ──
async function loadLangVocab(lang,topic,outId){
  const out=document.getElementById(outId);if(!out)return;
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){out.innerHTML=`<div class="card" style="color:var(--gold);font-size:14px;">⚠️ Kein API-Schlüssel.</div>`;return;}
  out.innerHTML=sp();
  const lp=LANG_PROMPT[lang]||{name:lang};
  try{
    const raw=await claude([{role:'user',content:'Generate.'}],
      `Expert ${lp.name} vocabulary teacher. Learner level: ${ST.user_config.level}. Topic: "${topic}".
Generate 12 important vocabulary items. Respond ONLY valid JSON:
{"topic":"...","items":[{"word":"...","pos":"Nomen/Verb/Adj./Adv.","translation":"Deutsch","example":"sentence in ${lp.name}","example_de":"Deutschübersetzung"}]}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    let html=`<div class="card"><div class="ctitle">${d.topic} <span class="tag tag-ai">Wortschatz</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;">`;
    (d.items||[]).forEach((it,i)=>{
      html+=`<div style="padding:10px 14px;background:var(--bg3);border-radius:var(--r);border:1px solid var(--border);">
        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:4px;">
          <span style="font-size:16px;font-weight:700;color:var(--blue);">${it.word}</span>
          <span style="font-size:10px;color:var(--text3);background:var(--bg4);padding:1px 6px;border-radius:4px;">${it.pos}</span>
        </div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:4px;">→ ${it.translation}</div>
        <div style="font-size:12px;color:var(--text3);font-style:italic;">${it.example}</div>
        <div style="font-size:11px;color:var(--text3);">${it.example_de||''}</div>
      </div>`;
    });
    html+=`</div>
      <div class="btn-row" style="margin-top:1rem;">
        <button class="btn" onclick="speak('${(d.items||[]).map(i=>i.word).join(', ')}','${lang}')">🔊 Alle vorlesen</button>
      </div>
    </div>`;
    out.innerHTML=html;addXP(5,'l','learn');
  }catch(e){out.innerHTML=`<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`;}
}

// ── Reading ──
async function loadLangReading(lang,type,topic,outId){
  const out=document.getElementById(outId);if(!out)return;
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){out.innerHTML=`<div class="card" style="color:var(--gold);font-size:14px;">⚠️ Kein API-Schlüssel.</div>`;return;}
  out.innerHTML=sp();
  const lp=LANG_PROMPT[lang]||{name:lang};
  const diff=ST.learning_state.difficulty_offset;
  const lvl=diff===-1?'A1/A2':diff===1?'B2/C1':'B1';
  try{
    const raw=await claude([{role:'user',content:'Generate.'}],
      `Expert ${lp.name} reading teacher. Level: ${ST.user_config.level} / ${lvl}. Text type: ${type}. Topic: "${topic||'Alltag'}".
Write a text in ${lp.name} (8-12 sentences) with 4 comprehension questions. Respond ONLY valid JSON:
{"title":"...","text":"...","blanks":[{"id":1,"answer":"word","options":["a","b","c"]}],"questions":[{"q":"...","options":["a","b","c"],"correct":0}]}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    let textHtml=d.text;
    (d.blanks||[]).forEach(b=>{
      textHtml=textHtml.replace('[L'+b.id+']',`<span class="blank" data-ans="${b.answer}" data-opts="${JSON.stringify(b.options).replace(/"/g,'&quot;')}">&nbsp;&nbsp;&nbsp;&nbsp;</span>`);
    });
    let html=`<div class="card">
      <div class="ctitle">${d.title}</div>
      <button class="btn" onclick="speak('${d.text.replace(/'/g,'').substring(0,200)}','${lang}')" style="margin-bottom:.75rem;">🔊 Vorlesen</button>
      <div style="font-size:15px;line-height:1.9;padding:12px;background:var(--bg3);border-radius:var(--r);margin-bottom:1rem;">${textHtml}</div>
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.75rem;">Verständnisfragen</div>`;
    (d.questions||[]).forEach((q,qi)=>{
      html+=`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div>
        <div class="mcopts">${q.options.map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div></div>`;
    });
    html+=`</div>`;out.innerHTML=html;
    out.querySelectorAll('.blank').forEach(el=>el.addEventListener('click',()=>showGapDD(el)));
    out.querySelectorAll('.mcopts').forEach(opts=>opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');addXP(8,'l','learn');toast('✅');}else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    })));
    addXP(5,'l','learn');
  }catch(e){out.innerHTML=`<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`;}
}

// ── Writing Prompt + Check ──
async function loadLangWritePrompt(lang,type,level,promptId,fbId){
  const el=document.getElementById(promptId);if(!el)return;
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){el.textContent='⚠️ Kein API-Schlüssel.';return;}
  el.innerHTML=sp();
  const lp=LANG_PROMPT[lang]||{name:lang};
  try{
    const raw=await claude([{role:'user',content:'Task.'}],
      `${lp.name} writing teacher. Level: ${level}. Task type: ${type}.
Create a writing task prompt in ${lp.instrLang}. Respond ONLY JSON: {"prompt":"Aufgabenstellung","min_words":50,"tips":["tip1","tip2"]}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    el.innerHTML=`<div style="font-size:14px;font-weight:600;margin-bottom:6px;">${d.prompt}</div>
      ${d.tips?`<div style="font-size:12px;color:var(--text3);">💡 ${d.tips.join(' · ')}</div>`:''}
      <div style="font-size:11px;color:var(--text3);margin-top:4px;">Min. ${d.min_words} Wörter</div>`;
  }catch(e){el.textContent='Fehler: '+e.message;}
}
async function checkLangWriting(lang,type,level,promptId,inputId,fbId){
  const prompt=document.getElementById(promptId)?.textContent||'';
  const txt=document.getElementById(inputId)?.value.trim();
  const fb=document.getElementById(fbId);if(!txt||!fb)return;
  fb.innerHTML=sp();
  const lp=LANG_PROMPT[lang]||{name:lang};
  try{
    const raw=await claude([{role:'user',content:'Check.'}],
      `${lp.name} teacher. Task: "${prompt.substring(0,200)}". Student text: "${txt.substring(0,500)}". Level: ${level}.
Give detailed feedback. Respond ONLY JSON: {"score":0-100,"grade":"A-F","content":"Inhalt-Feedback auf Deutsch","language":"Sprach-Feedback auf Deutsch","tip":"Verbesserungstipp"}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    const col=d.score>=70?'var(--green)':d.score>=50?'var(--gold)':'var(--red)';
    fb.innerHTML=`<div class="rescard ${d.score>=70?'res-g':d.score>=50?'res-m':'res-b'}" style="margin-top:.875rem;">
      <strong style="color:${col};">${d.grade} – ${d.score}/100</strong>
      <div style="font-size:13px;margin-top:5px;">${d.content}</div>
      <div style="font-size:13px;margin-top:3px;">${d.language}</div>
      ${d.tip?`<div style="font-size:12px;color:${col};margin-top:4px;">💡 ${d.tip}</div>`:''}
    </div>`;
    addXP(Math.round(d.score/10),'w','learn');toast('✅ '+d.grade);
  }catch(e){fb.textContent='Fehler: '+e.message;}
}

// ── Listening ──
async function loadLangListening(lang,type,topic,level,outId){
  const out=document.getElementById(outId);if(!out)return;
  const key=ST.apiKey||localStorage.getItem('edu_api_key')||'';
  if(!key){out.innerHTML=`<div class="card" style="color:var(--gold);font-size:14px;">⚠️ Kein API-Schlüssel.</div>`;return;}
  out.innerHTML=sp();
  const lp=LANG_PROMPT[lang]||{name:lang};
  try{
    const raw=await claude([{role:'user',content:'Generate.'}],
      `Expert ${lp.name} listening teacher. Level: ${level}. Type: ${type||'dialogue'}. Topic: "${topic||'Alltag'}".
Write a ${lp.name} listening text (6-8 sentences) with 3 comprehension questions. Respond ONLY valid JSON:
{"title":"...","text":"...","questions":[{"q":"...","options":["a","b","c"],"correct":0}]}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    let html=`<div class="card">
      <div class="ctitle">${d.title} <span class="tag tag-ai">Hören</span></div>
      <div id="${outId}-text" style="font-size:15px;line-height:1.9;margin-bottom:1rem;color:var(--text2);padding:10px;background:var(--bg3);border-radius:var(--r);display:none;">${d.text}</div>
      <div style="display:flex;gap:8px;margin-bottom:1rem;">
        <button class="btn" onclick="speak('${d.text.replace(/'/g,'').substring(0,300)}','${lang}')">🔊 Vorlesen</button>
        <button class="btn" onclick="const sc=document.getElementById('${outId}-text');const vis=sc.style.display==='none';sc.style.display=vis?'block':'none';this.textContent=vis?'Skript ausblenden':'Skript anzeigen';">Skript anzeigen</button>
      </div>
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:.75rem;">Fragen</div>`;
    (d.questions||[]).forEach((q,qi)=>{
      html+=`<div style="margin-bottom:.875rem;"><div style="font-size:14px;font-weight:600;margin-bottom:5px;">${qi+1}. ${q.q}</div>
        <div class="mcopts">${q.options.map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${q.correct}">${o}</button>`).join('')}</div></div>`;
    });
    html+=`</div>`;out.innerHTML=html;
    out.querySelectorAll('.mcopts').forEach(opts=>opts.querySelectorAll('.mcopt').forEach(btn=>btn.addEventListener('click',function(){
      const c=parseInt(this.dataset.c),i=parseInt(this.dataset.i);opts.querySelectorAll('.mcopt').forEach(b=>b.disabled=true);
      if(i===c){this.classList.add('ok');addXP(8,'h','listen');toast('✅');}else{this.classList.add('no');opts.querySelectorAll('.mcopt')[c].classList.add('ok');}
    })));
    addXP(5,'h','listen');
  }catch(e){out.innerHTML=`<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`;}
}

// ── Prüfung (DELF/CILS/DELE/Goethe) ──
// ═══════════════════════════════════════════
// PHASE 1 ABSCHLUSS — DELF SCHULISCH (LP21)
// Auto-Niveau nach Schuljahr, LP21-Themenkontext
// ═══════════════════════════════════════════
function updateDelfPanel() {
  const zi = getZyklusInfo();
  const infoEl = document.getElementById('fr-delf-info');
  const examSel = document.getElementById('fr-delf-exam');
  if (!infoEl || !examSel) return;

  if (zi.isAdult) {
    infoEl.style.display = 'none';
    return;
  }
  const sj = parseInt(zi.schuljahr) || 5;
  // LP21 Empfehlung: Z2 (5./6. Kl.) → A1/A2, Z3 (7.–9. Kl.) → A2/B1
  let rec, level;
  if (zi.zyklus === 2) {
    level = sj === 5 ? 'DELF-A1' : 'DELF-A2';
    rec = sj === 5
      ? '📗 Empfehlung: DELF A1 — Einstiegsjahr Französisch (5. Klasse, LP21 Z2)'
      : '📘 Empfehlung: DELF A2 — 6. Klasse, Abschluss Zyklus 2';
  } else if (zi.zyklus === 3) {
    level = sj <= 8 ? 'DELF-A2' : 'DELF-B1';
    rec = sj <= 8
      ? '📘 Empfehlung: DELF A2 — 7./8. Klasse (LP21 Z3 Einstieg)'
      : '📕 Empfehlung: DELF B1 — 9. Klasse, Abschluss Zyklus 3';
  } else {
    infoEl.style.display = 'none';
    return;
  }
  // Automatisch richtiges Niveau vorwählen
  examSel.value = level;
  infoEl.textContent = rec;
  infoEl.style.display = 'block';
}

async function loadLangExam(lang, exam, part, outId){
  const out = document.getElementById(outId); if(!out) return;
  const key = ST.apiKey || localStorage.getItem('edu_api_key') || '';
  if(!key){ out.innerHTML=`<div class="card" style="color:var(--gold);font-size:14px;">⚠️ Kein API-Schlüssel.</div>`; return; }
  out.innerHTML = sp();

  // Sprint 4: LP21 Schulkontext für Prüfungsaufgaben
  const zi = getZyklusInfo();
  const diff = ST.learning_state?.difficulty_offset ?? getAutoDiffForProfile();
  const lp = LANG_PROMPT[lang] || {name:lang};
  const isSchool = !zi.isAdult;
  const sj = parseInt(zi.schuljahr) || 5;

  // LP21 Themenkontext nach Zyklus
  const lp21Topics = {
    2: 'school life, family, hobbies, food, nature (LP21 Zyklus 2, class 5–6)',
    3: 'society, media, environment, future careers, travel (LP21 Zyklus 3, class 7–9)',
  };
  const topicCtx = isSchool
    ? `LP21 school context (Switzerland), class ${sj}: ${lp21Topics[zi.zyklus] || lp21Topics[2]}`
    : 'adult learner context, professional and everyday topics';

  const diffNote = diff === -1 ? 'slightly simplified (revision level)'
                : diff ===  1 ? 'slightly more demanding (advanced prep)'
                : 'authentic exam level';

  const examLabel = exam.replace('-',' ');
  const partLabel = part.replace(/-/g,' ');

  try {
    const raw = await claude([{role:'user',content:'Generate.'}],
      `You are an official ${examLabel} examiner creating a practice task for a Swiss LP21 school student.
Context: ${topicCtx}. Difficulty: ${diffNote}.
Create an authentic ${examLabel} ${partLabel} practice task in ${lp.name}.

Respond ONLY valid JSON (no markdown, no backticks):
{"title":"...","examLevel":"${examLabel}","part":"${partLabel}","instructions":"task instructions in ${lp.name}","text":"optional reading/listening text in ${lp.name} (leave empty if not needed)","items":[{"type":"mc|gap|writing","q":"question or sentence in ${lp.name}","options":["a","b","c","d"],"correct":0,"answer":"correct word for gap"}],"time_minutes":15,"examiner_notes":"brief Deutsch tip for the student"}`);

    const d = JSON.parse(raw.replace(/```json|```/g,'').trim());
    let html = `<div class="card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem;flex-wrap:wrap;">
        <div style="padding:6px 14px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);border-radius:var(--r);font-size:13px;font-weight:700;color:var(--gold);">${d.examLevel||examLabel}</div>
        <div style="font-size:12px;color:var(--text2);">${d.part||partLabel}</div>
        ${d.time_minutes?`<div style="margin-left:auto;font-size:11px;color:var(--text3);">⏱️ ${d.time_minutes} Min.</div>`:''}
      </div>
      <div class="ctitle" style="margin-bottom:.75rem;">${d.title||''}</div>
      <div style="padding:10px 14px;background:rgba(56,189,248,.07);border-left:3px solid var(--blue);border-radius:0 var(--r) var(--r) 0;font-size:13px;margin-bottom:1rem;">${d.instructions||''}</div>
      ${d.text?`<div style="font-size:14px;line-height:1.9;padding:12px 16px;background:var(--bg3);border-radius:var(--r);margin-bottom:1rem;">${d.text.replace(/\n/g,'<br>')}<button class="btn" style="display:block;margin-top:.5rem;padding:5px 12px;font-size:12px;" onclick="speak(this.parentElement.innerText,'${lang}')">🔊 Vorlesen</button></div>`:''}`;

    (d.items||[]).forEach((item, ii) => {
      if(item.type==='mc' && item.options){
        html += `<div style="margin-bottom:.875rem;">
          <div style="font-size:14px;font-weight:600;margin-bottom:5px;">${ii+1}. ${item.q}</div>
          <div class="mcopts">${item.options.map((o,oi)=>`<button class="mcopt" data-i="${oi}" data-c="${item.correct}">${String.fromCharCode(65+oi)}. ${o}</button>`).join('')}</div>
        </div>`;
      } else if(item.type==='gap'){
        const id = `lexam-gap-${lang}-${ii}`;
        html += `<div style="margin-bottom:.75rem;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:14px;flex:1;">${ii+1}. ${(item.q||'').replace('___',`<input id="${id}" class="inp" style="width:130px;display:inline-block;padding:5px 10px;vertical-align:middle;" placeholder="…" data-ans="${(item.answer||'').replace(/"/g,"'")}" />`)}</span>
          <button class="btn" style="padding:6px 12px;font-size:12px;" onclick="checkFill('${id}')">✓</button>
          <span id="${id}-fb" style="font-size:12px;"></span>
        </div>`;
      } else if(item.type==='writing'){
        const id = `lexam-wr-${lang}-${ii}`;
        html += `<div style="margin-bottom:.875rem;">
          <div style="font-size:14px;font-weight:600;margin-bottom:6px;">${ii+1}. ${item.q}</div>
          <textarea class="warea" id="${id}" placeholder="Écris ici…" style="min-height:100px;width:100%;padding:10px;background:var(--bg3);border:1.5px solid var(--border);border-radius:var(--r);color:var(--text);font-family:inherit;font-size:14px;resize:vertical;"></textarea>
          <div class="btn-row" style="justify-content:flex-start;margin-top:.5rem;">
            <button class="btn btn-p" data-lang="${lang}" data-exam="${examLabel}" data-task="${(item.q||'').replace(/"/g,"'")}" data-wrid="${id}" onclick="checkLangExamWriting(this)">Abgeben ↗</button>
          </div>
          <div id="${id}-fb"></div>
        </div>`;
      }
    });

    if(d.examiner_notes){
      html += `<div style="margin-top:1rem;padding:10px 14px;background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.2);border-radius:var(--r);font-size:13px;">
        <strong style="color:var(--purple);">📋 Tipp:</strong> ${d.examiner_notes}
      </div>`;
    }
    html += `</div>`;
    out.innerHTML = html;

    out.querySelectorAll('.mcopts').forEach(opts => opts.querySelectorAll('.mcopt').forEach(btn => btn.addEventListener('click', function(){
      const c = parseInt(this.dataset.c), i = parseInt(this.dataset.i);
      opts.querySelectorAll('.mcopt').forEach(b => b.disabled = true);
      if(i===c){ this.classList.add('ok'); addXP(10,'r','exam'); toast('✅ +10 XP'); }
      else { this.classList.add('no'); opts.querySelectorAll('.mcopt')[c].classList.add('ok'); }
    })));
    addXP(5,'r','exam');
  } catch(e) {
    out.innerHTML = `<div style="color:var(--red);padding:1rem;">Fehler: ${e.message}</div>`;
  }
}

async function checkLangExamWriting(btn){
  const lang=btn.dataset.lang,exam=btn.dataset.exam,task=btn.dataset.task,id=btn.dataset.wrid;
  const txt=document.getElementById(id)?.value.trim();if(!txt)return;
  const fb=document.getElementById(id+'-fb');fb.innerHTML=sp();
  try{
    const raw=await claude([{role:'user',content:'Check.'}],
      `${exam} examiner. Task: "${task}". Answer: "${txt.substring(0,500)}".
Respond ONLY JSON: {"score":0-100,"grade":"A-F","content":"...","language":"...","tip":"..."}`);
    const d=JSON.parse(raw.replace(/```json|```/g,'').trim());
    const col=d.score>=70?'var(--green)':d.score>=50?'var(--gold)':'var(--red)';
    fb.innerHTML=`<div class="rescard ${d.score>=70?'res-g':d.score>=50?'res-m':'res-b'}" style="margin-top:.5rem;">
      <strong style="color:${col};">${d.grade} – ${d.score}/100</strong>
      <div style="font-size:13px;margin-top:4px;">${d.content} · ${d.language}</div>
      ${d.tip?`<div style="font-size:12px;color:${col};margin-top:3px;">💡 ${d.tip}</div>`:''}
    </div>`;
    addXP(Math.round(d.score/10),'w','exam');toast('✅ '+d.grade);
  }catch(e){fb.textContent='Fehler: '+e.message;}
}

// ═══════════════════════════════════════════
// PHASE 1b — ACCORDION FUNKTION (wiederverwendbar)
// Aufruf: toggleAcc(headerElement)
// Findet automatisch das zugehörige .acc-body
// ═══════════════════════════════════════════
// ── Sidebar Accordion: Sprach-Sektionen auf/zuklappen ──
function toggleSiAcc(lang) {
  const hdr  = document.getElementById('siacc-' + lang);
  const body = document.getElementById('siacc-body-' + lang);
  if (!hdr || !body) return;
  const isOpen = hdr.classList.contains('open');
  hdr.classList.toggle('open', !isOpen);
  // Inline-style entfernen damit CSS-Klasse greift
  body.style.display = '';
  body.classList.toggle('open', !isOpen);
}

function toggleSiSubAcc(id) {
  const hdr  = document.querySelector('.siacc-sub-hdr[onclick="toggleSiSubAcc(\'' + id + '\')"]');
  const body = document.getElementById('siacc-sub-body-' + id);
  if (!body) return;
  const isOpen = hdr ? hdr.classList.contains('open') : (body.style.display !== 'none');
  if (hdr) hdr.classList.toggle('open', !isOpen);
  body.style.display = isOpen ? 'none' : '';
}

function toggleAcc(hdr) {
  const body = hdr.nextElementSibling;
  if (!body || !body.classList.contains('acc-body')) return;
  const isOpen = body.classList.contains('open');
  // Optional: alle anderen auf der gleichen Ebene schliessen
  // (auskommentiert - alle können gleichzeitig offen sein, besser für Lernen)
  // hdr.closest('.main')?.querySelectorAll('.acc-body.open').forEach(b => {
  //   b.classList.remove('open'); b.previousElementSibling?.classList.remove('open');
  // });
  body.classList.toggle('open', !isOpen);
  hdr.classList.toggle('open', !isOpen);
}

// Globaler Accordion-Initialisator: erste Sektion automatisch öffnen
function initFirstAcc(panelId) {
  const panel = document.getElementById('panel-' + panelId);
  if (!panel) return;
  const firstHdr = panel.querySelector('.acc-hdr');
  if (firstHdr && !firstHdr.classList.contains('open')) {
    toggleAcc(firstHdr);
  }
}

// ═══════════════════════════════════════════
// LISTENER: Alle neuen Sprachpanels
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded',function(){
  // ── FRANÇAIS ── (gram handled by Phase 4a backbone)

  let frVocabTopic='La famille';
  document.getElementById('fr-vocab-topics')?.addEventListener('click',function(e){
    const b=e.target.closest('[data-fvt]');if(!b)return;
    frVocabTopic=b.dataset.fvt;document.getElementById('fr-vocab-topic-lbl').textContent=frVocabTopic;
    this.querySelectorAll('[data-fvt]').forEach(x=>x.classList.remove('btn-p'));b.classList.add('btn-p');
  });
  document.getElementById('btn-fr-vocab')?.addEventListener('click',()=>loadLangVocab('fr',frVocabTopic,'fr-vocab-out'));
  document.getElementById('btn-fr-read')?.addEventListener('click',()=>loadLangReading('fr',document.getElementById('fr-read-type')?.value||'histoire',document.getElementById('fr-read-topic')?.value,'fr-read-out'));
  document.getElementById('btn-fr-write-new')?.addEventListener('click',()=>loadLangWritePrompt('fr',document.getElementById('fr-write-type')?.value,'B1','fr-write-prompt','fr-write-fb'));
  document.getElementById('btn-fr-write-check')?.addEventListener('click',()=>checkLangWriting('fr',document.getElementById('fr-write-type')?.value,document.getElementById('fr-write-level')?.value,'fr-write-prompt','fr-write-input','fr-write-fb'));
  document.getElementById('fr-write-input')?.addEventListener('input',function(){
    const wc=this.value.trim().split(/\s+/).filter(w=>w.length>0).length;
    const el=document.querySelector('#panel-fr-writing .wc-count');if(el)el.textContent=wc+' mots';
  });
  let frListenType='dialogue';
  document.getElementById('fr-listen-types')?.addEventListener('click',function(e){
    const b=e.target.closest('[data-flt]');if(!b)return;frListenType=b.dataset.flt;
    this.querySelectorAll('[data-flt]').forEach(x=>x.classList.remove('btn-p'));b.classList.add('btn-p');
  });
  document.getElementById('btn-fr-listen')?.addEventListener('click',()=>loadLangListening('fr',frListenType,document.getElementById('fr-listen-topic')?.value,document.getElementById('fr-listen-level')?.value,'fr-listen-out'));
  document.getElementById('btn-fr-delf')?.addEventListener('click',()=>loadLangExam('fr',document.getElementById('fr-delf-exam')?.value,document.getElementById('fr-delf-part')?.value,'fr-delf-out'));

  // ── SPRINT 3: FR/IT/ES Themen-Panels ──
  // Gemeinsame Funktion: Chip-Selektion + KI-Generierung pro Thema
  function setupThemaChips(lang, chipAttr) {
    document.querySelectorAll(`.${lang}-thema-btn`).forEach(btn => {
      btn.addEventListener('click', async function() {
        const theme = this.dataset.theme;
        // Finde aktiven Chip im selben acc-body
        const body = this.closest('.acc-body');
        const activeChip = body?.querySelector(`.chip.on[data-${chipAttr}]`);
        const mode = activeChip?.dataset[chipAttr] || 'vocabulaire';
        const outId = this.nextElementSibling?.id || '';
        const out = document.getElementById(outId); if(!out) return;
        const zi = getZyklusInfo();
        const diff = ST.learning_state?.difficulty_offset || 0;
        const baseNiv = zi.isAdult ? 'B1' : (zi.niveau || 'A2');
        const niv = getEffectiveNiveau(baseNiv, diff);
        const diffInstr = getDiffLabel(diff, lang);
        out.innerHTML = '<div class="sp">⏳ Génération…</div>';
        this.disabled = true;
        try {
          const langNames = {fr:'French',it:'Italian',es:'Spanish'};
          const langName = langNames[lang] || lang;

          // Sprint 5: Vokabeln aus EDU_BACKBONE für dieses Thema einbeziehen
          const backbone = EDU_BACKBONE[lang];
          let seedVocab = '';
          if (backbone?.einheiten) {
            // Suche Einheit die zum Thema passt (fuzzy match auf thema-String)
            const themeLC = theme.toLowerCase();
            const matchedUnit = backbone.einheiten.find(e =>
              e.thema.toLowerCase().includes(themeLC.split(' ')[0]) ||
              themeLC.includes(e.thema.toLowerCase().split(' ')[0])
            );
            if (matchedUnit?.vokabeln?.length) {
              seedVocab = `\nUse these vocabulary words naturally: ${matchedUnit.vokabeln.join(', ')}.`;
            }
          }

          const modePrompts = {
            vocabulaire:'Create a vocabulary exercise (10–15 words with translations, example sentences, and a gap-fill task)',
            dialogo:    'Write a short realistic dialogue (8–12 lines)',
            dialogo_es: 'Escribe un diálogo corto y realista (8–12 líneas)',
            dialogo_it: 'Scrivi un breve dialogo realistico (8–12 battute)',
            grammaire:  'Create a grammar exercise focusing on the most relevant grammar point for this topic',
            grammatica: 'Crea un esercizio di grammatica relativo a questo tema',
            gramatica:  'Crea un ejercicio de gramática relacionado con este tema',
            ecriture:   'Give a short writing task (2–3 sentences prompt, then a model answer)',
            scrittura:  'Proponi un breve compito di scrittura (prompt 2–3 frasi + risposta modello)',
            escritura:  'Propón una breve tarea de escritura (consigna 2–3 frases + respuesta modelo)',
            vocabulario:'Crea un ejercicio de vocabulario (10–15 palabras con traducciones, frases ejemplo, tarea de espacios)',
            vocabolario:'Crea un esercizio di vocabolario (10–15 parole con traduzioni, frasi esempio, completamento)',
          };
          const modeInstr = modePrompts[mode] || modePrompts['vocabulaire'];
          const prompt = `You are a ${langName} teacher for Swiss LP21 school (level ${niv}, difficulty: ${diffInstr}).
Topic: "${theme}". ${modeInstr}.${seedVocab}
Keep it age-appropriate for school students, level ${niv}.
Format clearly with headings. Answer key at the end.
Respond entirely in ${langName}.`;
          out.innerHTML = '<div class="ai-out">' + markdownToHtml(await callApi(prompt)) + '</div>';
          addXP(5,'l','learn'); toast('✅ Exercice généré!');
        } catch(e) { out.innerHTML = `<div style="color:var(--red)">${e.message}</div>`; }
        finally { this.disabled = false; }
      });
    });
    // Chip-Selektion — scoped zum jeweiligen chip-row Container
    document.querySelectorAll(`[data-${chipAttr}]`).forEach(chip => {
      chip.addEventListener('click', function() {
        const row = this.closest('.chip-row');
        if(row) row.querySelectorAll('[data-' + chipAttr + ']').forEach(c => c.classList.remove('on'));
        this.classList.add('on');
      });
    });
  }
  setupThemaChips('fr','fthema');
  setupThemaChips('it','ithema');
  setupThemaChips('es','esthema');

  // ── ITALIANO ──
  // IT gram handled by Phase 4a backbone
  let itVocabTopic='La famiglia';
  document.getElementById('it-vocab-topics')?.addEventListener('click',function(e){
    const b=e.target.closest('[data-ivt]');if(!b)return;
    itVocabTopic=b.dataset.ivt;document.getElementById('it-vocab-topic-lbl').textContent=itVocabTopic;
    this.querySelectorAll('[data-ivt]').forEach(x=>x.classList.remove('btn-p'));b.classList.add('btn-p');
  });
  document.getElementById('btn-it-vocab')?.addEventListener('click',()=>loadLangVocab('it',itVocabTopic,'it-vocab-out'));
  document.getElementById('btn-it-read')?.addEventListener('click',()=>loadLangReading('it',document.getElementById('it-read-type')?.value||'storia',document.getElementById('it-read-topic')?.value,'it-read-out'));
  document.getElementById('btn-it-write-new')?.addEventListener('click',()=>loadLangWritePrompt('it',document.getElementById('it-write-type')?.value,'B1','it-write-prompt','it-write-fb'));
  document.getElementById('btn-it-write-check')?.addEventListener('click',()=>checkLangWriting('it',document.getElementById('it-write-type')?.value,document.getElementById('it-write-level')?.value,'it-write-prompt','it-write-input','it-write-fb'));
  document.getElementById('btn-it-listen')?.addEventListener('click',()=>loadLangListening('it','dialogue',document.getElementById('it-listen-topic')?.value,document.getElementById('it-listen-level')?.value,'it-listen-out'));
  document.getElementById('btn-it-cils')?.addEventListener('click',()=>loadLangExam('it',document.getElementById('it-cils-exam')?.value,document.getElementById('it-cils-part')?.value,'it-cils-out'));

  // ── ESPAÑOL ──
  // ES gram handled by Phase 4a backbone
  let esVocabTopic='La familia';
  document.getElementById('es-vocab-topics')?.addEventListener('click',function(e){
    const b=e.target.closest('[data-esvt]');if(!b)return;
    esVocabTopic=b.dataset.esvt;document.getElementById('es-vocab-topic-lbl').textContent=esVocabTopic;
    this.querySelectorAll('[data-esvt]').forEach(x=>x.classList.remove('btn-p'));b.classList.add('btn-p');
  });
  document.getElementById('btn-es-vocab')?.addEventListener('click',()=>loadLangVocab('es',esVocabTopic,'es-vocab-out'));
  document.getElementById('btn-es-read')?.addEventListener('click',()=>loadLangReading('es',document.getElementById('es-read-type')?.value||'historia',document.getElementById('es-read-topic')?.value,'es-read-out'));
  document.getElementById('btn-es-write-new')?.addEventListener('click',()=>loadLangWritePrompt('es',document.getElementById('es-write-type')?.value,'B1','es-write-prompt','es-write-fb'));
  document.getElementById('btn-es-write-check')?.addEventListener('click',()=>checkLangWriting('es',document.getElementById('es-write-type')?.value,document.getElementById('es-write-level')?.value,'es-write-prompt','es-write-input','es-write-fb'));
  document.getElementById('btn-es-listen')?.addEventListener('click',()=>loadLangListening('es','dialogue',document.getElementById('es-listen-topic')?.value,document.getElementById('es-listen-level')?.value,'es-listen-out'));
  document.getElementById('btn-es-dele')?.addEventListener('click',()=>loadLangExam('es',document.getElementById('es-dele-exam')?.value,document.getElementById('es-dele-part')?.value,'es-dele-out'));

  // ── ERFOLGSKONTROLLEN (Sprint 10) ──
  document.getElementById('btn-ek-start')?.addEventListener('click', ()=>loadEK());

  // Fach-Wechsel: Sek-Themen ein-/ausblenden + Info-Text
  document.getElementById('ek-fach')?.addEventListener('change', function(){
    document.getElementById('ek-sek-topics').style.display = this.value==='mathe-sek' ? 'block' : 'none';
  });
  document.getElementById('ek-zyklus')?.addEventListener('change', function(){
    const cfg = EK_CFG[this.value];
    const infoEl = document.getElementById('ek-info');
    if(infoEl) infoEl.textContent = `${this.value}: ${cfg.n} Fragen · MC + Lücke + Offen${cfg.err>0?' + Fehlerkorr.':''}`;
  });
  document.getElementById('ek-sek-chips')?.addEventListener('click', function(e){
    const b = e.target.closest('[data-sek]'); if(!b) return;
    this.querySelectorAll('[data-sek]').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
  });

  // Konto-Tab: Halbjahr-Tabs
  document.getElementById('ek-hj-tabs')?.addEventListener('click', function(e){
    const b = e.target.closest('[data-hj]'); if(!b) return;
    this.querySelectorAll('[data-hj]').forEach(x=>{ x.classList.remove('btn-p'); x.classList.add('btn'); });
    b.classList.remove('btn'); b.classList.add('btn-p');
    renderEKOverview(b.dataset.hj);
  });

  // EK-Übersicht beim Öffnen des Profil-Panels laden
  document.querySelector('[data-p="profile"]')?.addEventListener('click', ()=>{
    setTimeout(()=>renderEKOverview('hj1'), 50);
  });

  // ── DEUTSCH KB1: Hören ──
  document.getElementById('de-kb1-types')?.addEventListener('click', function(e){
    const b = e.target.closest('[data-kb1type]'); if(!b) return;
    this.querySelectorAll('[data-kb1type]').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
  });
  document.getElementById('btn-de-kb1-listen')?.addEventListener('click', ()=>loadDeKB1Listening());

  // ── DEUTSCH (DaF) —— gram handled by Phase 4b backbone ──
  let dafVocabTopic='Familie';
  document.getElementById('daf-vocab-topics')?.addEventListener('click',function(e){
    const b=e.target.closest('[data-dvt]');if(!b)return;
    dafVocabTopic=b.dataset.dvt;document.getElementById('daf-vocab-topic-lbl').textContent=dafVocabTopic;
    this.querySelectorAll('[data-dvt]').forEach(x=>x.classList.remove('btn-p'));b.classList.add('btn-p');
  });
  document.getElementById('btn-daf-vocab')?.addEventListener('click',()=>loadLangVocab('de',dafVocabTopic,'daf-vocab-out'));
  document.getElementById('btn-daf-read')?.addEventListener('click',()=>loadLangReading('de',document.getElementById('daf-read-type')?.value||'Kurzgeschichte',document.getElementById('daf-read-topic')?.value,'daf-read-out'));
  document.getElementById('btn-daf-write-new')?.addEventListener('click',()=>loadLangWritePrompt('de',document.getElementById('daf-write-type')?.value,'B1','daf-write-prompt','daf-write-fb'));
  document.getElementById('btn-daf-write-check')?.addEventListener('click',()=>checkLangWriting('de',document.getElementById('daf-write-type')?.value,document.getElementById('daf-write-level')?.value,'daf-write-prompt','daf-write-input','daf-write-fb'));
  document.getElementById('btn-daf-listen')?.addEventListener('click',()=>loadLangListening('de','dialogue',document.getElementById('daf-listen-topic')?.value,document.getElementById('daf-listen-level')?.value,'daf-listen-out'));
  document.getElementById('btn-daf-pruf')?.addEventListener('click',()=>loadLangExam('de',document.getElementById('daf-pruf-exam')?.value,document.getElementById('daf-pruf-part')?.value,'daf-pruf-out'));

  // ── NMG (erweitert) ──
  document.getElementById('nmg-zyklus-filter')?.addEventListener('click',function(e){
    const b=e.target.closest('[data-nz]');if(!b)return;
    this.querySelectorAll('[data-nz]').forEach(x=>x.classList.remove('on'));b.classList.add('on');
  });
  document.getElementById('nmg-themen-chips')?.addEventListener('click',function(e){
    const b=e.target.closest('[data-nt]');if(!b)return;
    this.querySelectorAll('[data-nt]').forEach(x=>x.classList.remove('on'));b.classList.add('on');
  });
  document.getElementById('btnnmg')?.addEventListener('click',()=>loadNMGEx(false));
  document.getElementById('btnnmg2')?.addEventListener('click',()=>loadNMGEx(true));

  // ── INFORMATIK (erweitert) ──
  document.getElementById('info-zyklus-filter')?.addEventListener('click',function(e){
    const b=e.target.closest('[data-iz]');if(!b)return;
    this.querySelectorAll('[data-iz]').forEach(x=>x.classList.remove('on'));b.classList.add('on');
  });
  // Chip-Selection in Informatik-Panels
  ['info-medien-chips','info-daten-chips','info-algo-chips','info-internet-chips'].forEach(cid=>{
    document.getElementById(cid)?.addEventListener('click',function(e){
      const b=e.target.closest('[data-it]');if(!b)return;
      this.querySelectorAll('[data-it]').forEach(x=>x.classList.remove('on'));b.classList.add('on');
    });
  });
  // Generier-Buttons (delegiert an loadInfoEx)
  document.querySelectorAll('.info-gen-btn').forEach(btn=>{
    btn.addEventListener('click',function(){
      const src=this.dataset.topicSrc;
      const outId=this.closest('.acc-body')?.querySelector('.info-out')?.id;
      loadInfoEx(src,outId);
    });
  });
});


// ── EN Lektionen Helper-Shims ──────────────────────────
// Wrappers um die bestehenden claude() / sp() Funktionen
async function callApi(prompt) {
  return claude([{role:'user', content: prompt}], '');
}
function markdownToHtml(text) {
  if (!text) return '';
  var t = text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Bold, italic
  t = t.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  t = t.replace(/\*([^*]+)\*/g,'<em>$1</em>');
  // Headers
  t = t.replace(/^### (.+)$/mg,'<h4 style="margin:.6rem 0 .2rem;color:var(--text);">$1</h4>');
  t = t.replace(/^## (.+)$/mg,'<h3 style="margin:.75rem 0 .25rem;color:var(--text);">$1</h3>');
  t = t.replace(/^# (.+)$/mg,'<h2 style="margin:.875rem 0 .25rem;color:var(--blue);">$1</h2>');
  // Lists
  t = t.replace(/^[-*] (.+)$/mg,'<li style="margin:.15rem 0 .15rem 1.25rem;">$1</li>');
  t = t.replace(/^(\d+)\. (.+)$/mg,'<li style="margin:.15rem 0 .15rem 1.25rem;list-style:decimal;">$1. $2</li>');
  // Paragraphs
  t = t.replace(/\n\n/g,'</p><p style="margin:.4rem 0;">');
  t = t.replace(/\n/g,'<br>');
  return '<p style="line-height:1.65;margin:.4rem 0;">' + t + '</p>';
}
function renderApiKeyHint() {
  return '<div style="color:var(--gold);background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);border-radius:var(--r);padding:.875rem;font-size:13px;">⚠️ Kein API-Schlüssel gesetzt. Bitte unter <strong>Konto → Profile & API</strong> eintragen.</div>';
}
async function callApiMessages(messages) {
  const key = ST.apiKey || localStorage.getItem('edu_api_key') || '';
  if (!key) { toast('⚠️ Kein API-Schlüssel'); throw new Error('No key'); }
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({ model: MDL, max_tokens: 600, messages })
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'API ' + res.status); }
  const d = await res.json();
  return d.content.map(c => c.text || '').join('');
}
// ── Loading indicator for EN Lektionen ──
function enLekSpinner(out) {
  out.innerHTML = sp();
}

// ════════════════════════════════════════════════════════
//  PHASE 2 — EN LEKTIONEN (Niveau + Kontext parametrisiert)
//  LP21 Z1–Z3 & Erwachsene · alle Niveaus A1–B2
// ════════════════════════════════════════════════════════

const EN_LEK_UNITS = [
  {id:1,  title:'Family & Home',       theme:'family life and living at home',      icon:'🏠', themeAdult:'family, housing and living arrangements'},
  {id:2,  title:'School & Daily Life', theme:'school and daily routine',             icon:'📚', themeAdult:'work, daily routines and time management'},
  {id:3,  title:'Food & Health',       theme:'food, meals and healthy habits',       icon:'🍎', themeAdult:'nutrition, restaurants and health'},
  {id:4,  title:'Free Time & Hobbies', theme:'free time activities and hobbies',     icon:'🎮', themeAdult:'leisure, sport and personal interests'},
  {id:5,  title:'Friends & Feelings',  theme:'friendship, emotions and social life', icon:'🤝', themeAdult:'relationships, social skills and emotions'},
  {id:6,  title:'Shopping & Money',    theme:'shopping and spending money',          icon:'🛒', themeAdult:'shopping, budgeting and financial decisions'},
  {id:7,  title:'Nature & Weather',    theme:'nature, animals and the weather',      icon:'🌿', themeAdult:'environment, climate change and sustainability'},
  {id:8,  title:'Travel & Transport',  theme:'travel, holidays and getting around',  icon:'✈️', themeAdult:'travel, business trips and transport'},
  {id:9,  title:'Work & Future',       theme:'jobs, school subjects and the future', icon:'💼', themeAdult:'career, job applications and professional life'},
  {id:10, title:'Society & Media',     theme:'society, media and current events',    icon:'🌍', themeAdult:'society, media literacy and global issues'},
];

// Grammar topics per niveau
const EN_LEK_GRAM_TOPICS = {
  A1: [
    {key:'to_be',        label:'verb "to be"'},
    {key:'present_simple_basics', label:'Present Simple (basics)'},
    {key:'articles',     label:'Articles (a/an/the)'},
    {key:'pronouns',     label:'Pronouns & Possessives'},
    {key:'numbers_time', label:'Numbers & Time'},
    {key:'there_is',     label:'There is / There are'},
  ],
  A2: [
    {key:'present_simple',      label:'Present Simple'},
    {key:'present_continuous',  label:'Present Continuous'},
    {key:'past_simple',         label:'Past Simple'},
    {key:'future_going_to',     label:'Future (going to)'},
    {key:'questions',           label:'Questions (wh- / yes-no)'},
    {key:'adjectives',          label:'Adjectives & Comparatives'},
    {key:'prepositions',        label:'Prepositions'},
  ],
  B1: [
    {key:'present_perfect',     label:'Present Perfect'},
    {key:'past_continuous',     label:'Past Continuous'},
    {key:'future_will',         label:'Future (will / shall)'},
    {key:'conditionals_1',      label:'1st Conditional'},
    {key:'modal_verbs',         label:'Modal Verbs (can/must/should)'},
    {key:'passive_intro',       label:'Passive Voice (intro)'},
    {key:'reported_speech',     label:'Reported Speech'},
    {key:'relative_clauses',    label:'Relative Clauses'},
  ],
  B2: [
    {key:'passive_advanced',    label:'Passive (advanced)'},
    {key:'conditionals_2_3',    label:'2nd & 3rd Conditional'},
    {key:'subjunctive_wish',    label:'Subjunctive / Wish'},
    {key:'inversion',           label:'Inversion & Emphasis'},
    {key:'phrasal_verbs',       label:'Phrasal Verbs'},
    {key:'cohesion',            label:'Discourse & Cohesion'},
    {key:'gerund_infinitive',   label:'Gerund vs. Infinitive'},
    {key:'quantifiers',         label:'Quantifiers & Determiners'},
  ],
};

// Context descriptions for prompts
const EN_LEK_CTX = {
  school: {
    label: 'Schule / LP21',
    persona: 'school student (age 10–16)',
    setting: 'school and teenage life in Switzerland',
    tone: 'friendly, age-appropriate, encouraging',
  },
  adult: {
    label: 'Erwachsene',
    persona: 'adult learner',
    setting: 'adult life, work and social situations',
    tone: 'professional, practical, motivating',
  },
};

let enLekActiveUnit  = 1;
let enLekNiveau      = 'A2';
let enLekKontext     = 'school';
let enLekVkMode      = 'flashcard';
let enLekListenType  = 'dialogue';
let enLekReadType    = 'article';
let enLekSpeakType   = 'roleplay';
let enLekGramTopic   = null; // set dynamically after niveau change
let enLekSpeakHistory = [];

function enLekGetTheme() {
  const u = EN_LEK_UNITS.find(u => u.id === enLekActiveUnit) || EN_LEK_UNITS[0];
  return enLekKontext === 'adult' ? u.themeAdult : u.theme;
}
function enLekGetCtx()   { return EN_LEK_CTX[enLekKontext] || EN_LEK_CTX.school; }
function enLekGetWords(n) {
  const vks = VKDB.en[enLekActiveUnit] || [];
  return vks.slice(0, n || 15).map(v => v.w + ' (' + v.tr + ')').join(', ');
}

// ── Update mode badge ──
function enLekUpdateBadge() {
  const b = document.getElementById('en-lek-mode-badge');
  if (b) b.textContent = enLekNiveau + ' · ' + enLekGetCtx().label;
}

// ── Build grammar chips for current niveau ──
function enLekBuildGramChips() {
  const topics = EN_LEK_GRAM_TOPICS[enLekNiveau] || EN_LEK_GRAM_TOPICS.A2;
  if (!enLekGramTopic || !topics.find(t => t.key === enLekGramTopic)) {
    enLekGramTopic = topics[0].key;
  }
  const row = document.getElementById('en-lek-gram-topic');
  const lbl = document.getElementById('en-lek-gram-niveau-lbl');
  if (!row) return;
  row.innerHTML = topics.map(t =>
    `<button class="chip${t.key === enLekGramTopic ? ' on' : ''}" data-gt="${t.key}">${t.label}</button>`
  ).join('');
  if (lbl) lbl.innerHTML = 'Themen für Niveau <strong>' + enLekNiveau + '</strong> — wähle einen Block:';
}

// ── Build unit grid ──
function buildEnLekUnitGrid() {
  const grid = document.getElementById('en-lek-unit-grid');
  if (!grid) return;
  grid.innerHTML = EN_LEK_UNITS.map(u => {
    const vkCount = (VKDB.en[u.id] || []).length;
    const active  = u.id === enLekActiveUnit
      ? 'border-color:var(--blue);background:rgba(56,189,248,.1);'
      : '';
    return `<div style="background:var(--bg3);border:1.5px solid var(--border);border-radius:var(--r);padding:.75rem;cursor:pointer;transition:all .15s;${active}"
      onclick="selectEnLekUnit(${u.id})">
      <div style="font-size:18px;margin-bottom:3px;">${u.icon}</div>
      <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px;">Einheit ${u.id}</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.3;">${u.title}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:5px;">
        <span style="font-size:10px;color:var(--text3);">${vkCount} Vokabeln</span>
        <button class="btn" style="padding:2px 7px;font-size:10px;border-color:rgba(168,85,247,.3);color:var(--purple);"
          onclick="event.stopPropagation();enLekOpenEK(${u.id},'${u.title.replace(/'/g,'')}')" title="Erfolgskontrolle zu dieser Einheit">📝 EK</button>
      </div>
    </div>`;
  }).join('');
}

// ── EK-Shortcut aus Lektion (Punkt 4) ──
function enLekOpenEK(unitId, unitTitle) {
  // Englisch vorwählen im EK-Fach-Selector
  const ekFach = document.getElementById('ek-fach');
  if (ekFach) ekFach.value = 'en';
  // Zyklus aus aktuellem Profil setzen
  const zi = getZyklusInfo();
  const ekZyklus = document.getElementById('ek-zyklus');
  if (ekZyklus && !zi.isAdult) {
    ekZyklus.value = 'Z' + (zi.zyklus || 2);
  }
  // Hinweis-Banner befüllen
  const hint = document.getElementById('ek-lektion-hint');
  const hintTxt = document.getElementById('ek-lektion-hint-text');
  if (hint && hintTxt) {
    hintTxt.textContent = ' Einheit ' + unitId + ' – ' + unitTitle + ' · Englisch · ' + enLekNiveau;
    hint.style.display = '';
  }
  nav('ek');
  toast('📝 EK für Einheit ' + unitId + ' vorbereitet');
}

function selectEnLekUnit(id) {
  enLekActiveUnit = id;
  const unit = EN_LEK_UNITS.find(u => u.id === id);
  const vks  = VKDB.en[id] || [];
  // Clear all outputs
  ['en-lek-vk-out','en-lek-listen-out','en-lek-read-out','en-lek-speak-out',
   'en-lek-gram-out','en-lek-write-fb','en-lek-write-prompt'].forEach(i => {
    const el = document.getElementById(i); if (el) el.innerHTML = '';
  });
  ['en-lek-write-input','btn-en-lek-write-check','en-lek-wc-wrap'].forEach(i => {
    const el = document.getElementById(i); if (el) el.style.display = 'none';
  });
  const ia = document.getElementById('en-lek-speak-input-area'); if (ia) ia.remove();
  enLekSpeakHistory = [];

  // Header
  const badge   = document.getElementById('en-lek-unit-badge');
  const titleEl = document.getElementById('en-lek-title');
  const vkCount = document.getElementById('en-lek-vk-count');
  if (badge)   badge.textContent   = 'Einheit ' + id;
  if (titleEl) titleEl.textContent = unit ? unit.title : '';
  if (vkCount) vkCount.textContent = vks.length + ' Wörter';

  // Vocab chips
  const chips = document.getElementById('en-lek-vocab-chips');
  if (chips) {
    chips.innerHTML = vks.slice(0, 20).map(v =>
      `<span style="background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.25);
       border-radius:20px;padding:3px 10px;font-size:11px;color:var(--blue);">${v.w}</span>`
    ).join('') + (vks.length > 20
      ? `<span style="font-size:11px;color:var(--text3);">+${vks.length - 20} weitere</span>`
      : '');
  }
  document.getElementById('en-lek-content').style.display = '';
  buildEnLekUnitGrid();
}

// ── Vocabulary ──
async function enLekVocab() {
  const out    = document.getElementById('en-lek-vk-out');
  if (!out) return;
  const vks    = VKDB.en[enLekActiveUnit] || [];
  if (!vks.length) { out.innerHTML = '<div style="color:var(--text2);">Keine Vokabeln für diese Einheit.</div>'; return; }

  if (enLekVkMode === 'flashcard') {
    let idx = 0;
    function showCard() {
      const v = vks[idx % vks.length];
      out.innerHTML = `<div style="background:var(--bg3);border:1.5px solid var(--border);border-radius:var(--r);
        padding:1.25rem;text-align:center;max-width:340px;margin:0 auto;">
        <div style="font-size:22px;font-weight:800;color:var(--text);margin-bottom:.5rem;">${v.w}</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:.75rem;font-style:italic;">${v.p}</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:.875rem;line-height:1.5;">"${v.ex}"</div>
        <div id="fc-ans" style="display:none;font-size:18px;color:var(--green);font-weight:700;margin-bottom:.75rem;">🇩🇪 ${v.tr}</div>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:.5rem;">
          <button class="btn" style="background:var(--bg4);" onclick="document.getElementById('fc-ans').style.display=''">Lösung</button>
          <button class="btn btn-g" onclick="enLekFcNext(${idx + 1})">Nächste →</button>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:.5rem;">${(idx % vks.length) + 1} / ${vks.length}</div>
      </div>`;
    }
    window.enLekFcNext = i => { idx = i; showCard(); };
    showCard();
    return;
  }

  // API key handled by claude() / callApi()
  const words = enLekGetWords(15);
  const niveau = enLekNiveau;
  const ctx    = enLekGetCtx();
  const modeMap = {
    translate: `Create 6 translation exercises (German→English) at ${niveau} level using these vocabulary words: ${words}. Context: ${ctx.setting}. Format as numbered list: "German word → ___". Then show "Answers: ..." at the end.`,
    fillgap:   `Write a short text (6–8 sentences) at ${niveau} level about "${enLekGetTheme()}" for a ${ctx.persona}. Leave 6 key words as blanks (___). Then write "Missing words: ..." listing the blanks in order.`,
    context:   `For each of these 8 vocabulary words: ${words} — write one natural English example sentence at ${niveau} level in the context of "${enLekGetTheme()}" for a ${ctx.persona}. Format: word: sentence`,
  };
  out.innerHTML = sp();
  try {
    const nivClsV=enLekNiveau==='A1'?'niv-a1':enLekNiveau==='A2'?'niv-a2':enLekNiveau==='B1'?'niv-b1':'niv-b2';
    out.innerHTML = '<div class="ai-out"><span class="niv-badge '+nivClsV+'" style="margin-bottom:.5rem;display:inline-block;">'+enLekNiveau+'</span> ' + markdownToHtml(await callApi(modeMap[enLekVkMode])) + '</div>';
  } catch(e) { out.innerHTML = '<div style="color:var(--red);">' + e.message + '</div>'; }
}

// ── Listening ──
async function enLekListening() {
  const out = document.getElementById('en-lek-listen-out');
  if (!out) return;
  // API key handled by claude() / callApi()
  const words = enLekGetWords(12);
  const ctx   = enLekGetCtx();
  const niv   = enLekNiveau;
  const theme = enLekGetTheme();
  const typeMap = {
    dialogue:     `Write a natural dialogue (8–12 exchanges) at ${niv} level between two ${ctx.persona}s about "${theme}". Setting: ${ctx.setting}. Use at least 8 of these words naturally: ${words}. Tone: ${ctx.tone}.

After the dialogue, add:
**Comprehension Questions** (3 questions with answers)
**Key Vocabulary** (list 5 words used with short definition)`,
    story:        `Write a short story (8–10 sentences) at ${niv} level about "${theme}" from the perspective of a ${ctx.persona}. Setting: ${ctx.setting}. Use at least 8 of these words: ${words}.

After the story, add:
**Comprehension Questions** (3 questions with answers)
**Key Vocabulary** (5 words with definitions)`,
    announcement: `Write a short announcement or notice (5–7 sentences) at ${niv} level related to "${theme}" for a ${ctx.setting}. Use at least 6 of these words: ${words}.

After the text, add:
**Comprehension Questions** (2 questions with answers)`,
  };
  out.innerHTML = sp();
  try {
    const txt = await callApi(typeMap[enLekListenType]);
    const nivCls2=enLekNiveau==='A1'?'niv-a1':enLekNiveau==='A2'?'niv-a2':enLekNiveau==='B1'?'niv-b1':'niv-b2';
    // Ganzen Text bis zur Comprehension-Section extrahieren (nicht nur erste Zeile)
    const mainText = txt.split(/\*\*Comprehension|\*\*Key Vocab/i)[0].replace(/\*\*/g,'').trim();
    out.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:.5rem;">' +
        `<span class="niv-badge ${nivCls2}">${enLekNiveau}</span>` +
        '<button class="btn" style="padding:6px 14px;font-size:12px;" onclick="enLekTTS(this,\'listen-tts-src\')">' +
          '🔊 Vorlesen</button>' +
        '<span style="font-size:11px;color:var(--text3);">Web Speech API · Chrome/Edge</span>' +
      '</div>' +
      '<span id="listen-tts-src" style="display:none">' + mainText.replace(/</g,'&lt;') + '</span>' +
      '<div class="ai-out">' + markdownToHtml(txt) + '</div>';
  } catch(e) { out.innerHTML = '<div style="color:var(--red);">' + e.message + '</div>'; }
}

// ── Reading ──
async function enLekReading() {
  const out = document.getElementById('en-lek-read-out');
  if (!out) return;
  // API key handled by claude() / callApi()
  const words = enLekGetWords(12);
  const ctx   = enLekGetCtx();
  const niv   = enLekNiveau;
  const theme = enLekGetTheme();
  const typeMap = {
    article:  `Write a short informational article (8–10 sentences) at ${niv} level about "${theme}". Audience: ${ctx.persona} in ${ctx.setting}. Use at least 10 of these words: ${words}.

After the article:
**Comprehension Questions** (4 questions — mix multiple choice and open — with answers)
**Vocabulary in context** (3 words from the text with meaning explained)`,
    story:    `Write an engaging short story (8–10 sentences) at ${niv} level about "${theme}" featuring a ${ctx.persona}. Use at least 8 of these words: ${words}.

After the story:
**Comprehension Questions** (3 questions with answers)
**Discussion question** (1 open question to think about)`,
    email:    `Write a realistic email or letter (8–10 sentences) at ${niv} level related to "${theme}" in the context of ${ctx.setting}. Use at least 8 of these words: ${words}.

After the email:
**Comprehension Questions** (3 questions with answers)
**Writing task**: Reply to this email in 3–4 sentences.`,
    dialogue: `Write a longer dialogue (12–16 exchanges) at ${niv} level about "${theme}" between two ${ctx.persona}s. Use at least 10 of these words: ${words}. Tone: ${ctx.tone}.

After the dialogue:
**Comprehension Questions** (4 questions with answers)
**Role-play task**: Continue the dialogue with 4 more exchanges.`,
  };
  out.innerHTML = sp();
  try {
    const txt = await callApi(typeMap[enLekReadType]);
    const nivClsR=enLekNiveau==='A1'?'niv-a1':enLekNiveau==='A2'?'niv-a2':enLekNiveau==='B1'?'niv-b1':'niv-b2';
    // Ganzen Text bis zur Comprehension-Section extrahieren
    const mainText = txt.split(/\*\*Comprehension|\*\*Discussion|\*\*Writing task|\*\*Vocabulary in context/i)[0].replace(/\*\*/g,'').trim();
    out.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:.5rem;">' +
        `<span class="niv-badge ${nivClsR}">${enLekNiveau}</span>` +
        '<button class="btn" style="padding:6px 14px;font-size:12px;" onclick="enLekTTS(this,\'read-tts-src\')">' +
          '🔊 Text vorlesen</button>' +
        '<span style="font-size:11px;color:var(--text3);">Web Speech API · Chrome/Edge</span>' +
      '</div>' +
      '<span id="read-tts-src" style="display:none">' + mainText.replace(/</g,'&lt;') + '</span>' +
      '<div class="ai-out">' + markdownToHtml(txt) + '</div>';
  } catch(e) { out.innerHTML = '<div style="color:var(--red);">' + e.message + '</div>'; }
}

// ── Speaking ──
async function enLekSpeakTurn(userInput) {
  const out = document.getElementById('en-lek-speak-out');
  // API key handled by claude() / callApi()
  const ctx   = enLekGetCtx();
  const niv   = enLekNiveau;
  const words = enLekGetWords(10);
  const theme = enLekGetTheme();
  const typeMap = {
    roleplay:  `You are a friendly English conversation partner for a ${niv} ${ctx.persona}. Topic: "${theme}". Naturally use some of these words: ${words}. Keep each response to 2–3 sentences. After every 5 exchanges, give brief friendly feedback on grammar or vocabulary (in German). Start with a warm opening line.`,
    describe:  `You are helping a ${niv} ${ctx.persona} practise describing things about "${theme}". Ask them to describe something related to the topic, then give gentle feedback and ask a follow-up question. Use vocabulary: ${words}. Keep responses to 2–3 sentences.`,
    interview: `You are interviewing a ${niv} ${ctx.persona} about "${theme}" in ${ctx.setting}. Ask one question at a time. Use some of these words: ${words}. After every 5 questions, give brief feedback in German on their language use.`,
  };
  if (enLekSpeakHistory.length === 0) {
    enLekSpeakHistory = [{ role:'user', content: typeMap[enLekSpeakType] + '\n\nStart the conversation now.' }];
  } else {
    enLekSpeakHistory.push({ role:'user', content: userInput });
  }
  if (userInput) {
    out.innerHTML += `<div style="background:rgba(56,189,248,.08);border-radius:var(--r);padding:.625rem .875rem;margin-bottom:.5rem;font-size:13px;"><strong style="color:var(--blue)">Du:</strong> ${userInput}</div>`;
  }
  const thinking = document.createElement('div');
  thinking.className = 'loading-dots'; thinking.innerHTML = '<span></span><span></span><span></span>';
  out.appendChild(thinking);
  try {
    const res = await callApiMessages(enLekSpeakHistory);
    thinking.remove();
    enLekSpeakHistory.push({ role:'assistant', content: res });
    out.innerHTML += `<div style="background:var(--bg3);border-radius:var(--r);padding:.625rem .875rem;margin-bottom:.5rem;font-size:13px;"><strong style="color:var(--green)">Partner:</strong> ${res}</div>`;
    if (!document.getElementById('en-lek-speak-input-area')) {
      const ia = document.createElement('div');
      ia.id = 'en-lek-speak-input-area';
      ia.style.cssText = 'display:flex;gap:8px;margin-top:.75rem;align-items:center;flex-wrap:wrap;';
      ia.innerHTML =
        '<input class="inp" id="en-lek-speak-inp" placeholder="Type or use mic…" style="flex:1;min-width:140px;">' +
        '<button class="micbtn" id="en-lek-speak-mic" title="Mikrofon" onclick="enLekMicToggle()">🎤</button>' +
        '<div id="en-lek-speak-micst" class="micst" style="width:100%;font-size:11px;"></div>' +
        '<button class="btn btn-p" onclick="enLekSpeakSend()" style="flex-shrink:0;">Send ↗</button>';
      out.parentNode.appendChild(ia);
      // TTS-Button für Partner-Antwort
      const ttsRow = document.createElement('div');
      ttsRow.id = 'en-lek-speak-tts-row';
      ttsRow.style.cssText = 'margin-top:.375rem;';
      ttsRow.innerHTML = '<button class="btn" style="padding:5px 12px;font-size:11px;" ' +
        'onclick="enLekTTSLast()">🔊 Letzte Antwort vorlesen</button>';
      out.parentNode.appendChild(ttsRow);
      document.getElementById('en-lek-speak-inp')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') enLekSpeakSend();
      });
    }
  } catch(e) { thinking.remove(); out.innerHTML += '<div style="color:var(--red);">' + e.message + '</div>'; }
}
window.enLekSpeakSend = function() {
  const inp = document.getElementById('en-lek-speak-inp');
  if (!inp || !inp.value.trim()) return;
  const val = inp.value.trim(); inp.value = '';
  enLekSpeakTurn(val);
};

// ── TTS / Mic Helper für Lektionen ──
// TTS: liest Text aus einem versteckten Span vor
window.enLekTTS = function(btn, srcId) {
  if (!window.speechSynthesis) { toast('⚠️ TTS nicht verfügbar'); return; }
  const src = document.getElementById(srcId);
  if (!src) return;
  const text = src.textContent || src.innerText;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  // Sprache: EN-Lektionen immer Englisch
  u.lang = 'en-GB';
  u.rate = 0.85;
  btn.textContent = '⏹ Stop';
  btn.onclick = function() {
    window.speechSynthesis.cancel();
    btn.textContent = '🔊 Vorlesen';
    btn.onclick = function() { window.enLekTTS(btn, srcId); };
  };
  u.onend = function() {
    btn.textContent = '🔊 Vorlesen';
    btn.onclick = function() { window.enLekTTS(btn, srcId); };
  };
  window.speechSynthesis.speak(u);
};

// TTS: liest letzte KI-Antwort im Speak-Panel vor
window.enLekTTSLast = function() {
  if (!window.speechSynthesis) { toast('⚠️ TTS nicht verfügbar'); return; }
  if (!enLekSpeakHistory.length) return;
  // Letzte assistant-Nachricht finden
  const last = [...enLekSpeakHistory].reverse().find(m => m.role === 'assistant');
  if (!last) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(last.content.replace(/[*_#`]/g, ''));
  u.lang = 'en-GB'; u.rate = 0.88;
  window.speechSynthesis.speak(u);
};

// Mikrofon-Toggle im Speaking-Tab
let enLekMicRec = null;
window.enLekMicToggle = function() {
  const micBtn = document.getElementById('en-lek-speak-mic');
  const micSt  = document.getElementById('en-lek-speak-micst');
  const inp    = document.getElementById('en-lek-speak-inp');
  if (enLekMicRec) {
    try { enLekMicRec.stop(); } catch(e) {}
    enLekMicRec = null;
    if (micBtn) { micBtn.classList.remove('on'); micBtn.textContent = '🎤'; }
    if (micSt)  micSt.textContent = '';
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('⚠️ Spracheingabe benötigt Chrome/Edge'); return; }
  enLekMicRec = new SR();
  enLekMicRec.lang = 'en-GB';
  enLekMicRec.interimResults = true;
  enLekMicRec.continuous = false;
  enLekMicRec.onstart = () => {
    if (micBtn) { micBtn.classList.add('on'); micBtn.textContent = '⏹'; }
    if (micSt)  { micSt.textContent = '🔴 Ich höre…'; micSt.className = 'micst act'; }
  };
  enLekMicRec.onresult = (e) => {
    const t = Array.from(e.results).map(r => r[0].transcript).join('');
    if (inp) inp.value = t;
    if (e.results[e.results.length - 1].isFinal) {
      if (micSt) { micSt.textContent = '✅ Erkannt'; micSt.className = 'micst'; }
    }
  };
  enLekMicRec.onerror = () => {
    if (micBtn) { micBtn.classList.remove('on'); micBtn.textContent = '🎤'; }
    if (micSt)  micSt.textContent = '';
    enLekMicRec = null;
  };
  enLekMicRec.onend = () => {
    if (micBtn) { micBtn.classList.remove('on'); micBtn.textContent = '🎤'; }
    if (micSt && micSt.textContent.includes('höre')) micSt.textContent = '';
    enLekMicRec = null;
  };
  enLekMicRec.start();
};

// ── Writing ──
async function enLekWritePrompt() {
  const out      = document.getElementById('en-lek-write-prompt');
  const fb       = document.getElementById('en-lek-write-fb');
  const inp      = document.getElementById('en-lek-write-input');
  const checkBtn = document.getElementById('btn-en-lek-write-check');
  const wcWrap   = document.getElementById('en-lek-wc-wrap');
  if (!out) return;
  // API key handled by claude() / callApi()
  const ctx   = enLekGetCtx();
  const niv   = enLekNiveau;
  const words = enLekGetWords(12);
  const theme = enLekGetTheme();
  const type  = document.getElementById('en-lek-write-type')?.value || 'email';
  const typeMap = {
    email:       `Write a clear email writing task at ${niv} level for a ${ctx.persona}. Topic: "${theme}" in ${ctx.setting}. The student must use at least 6 of these words: ${words}. Specify: to, subject line, purpose, and any required content points. 3–4 sentences of instructions.`,
    story:       `Write a creative writing prompt at ${niv} level for a ${ctx.persona}. Topic: "${theme}". The student must use at least 8 of these words: ${words}. Give an interesting starting sentence or situation. 2–3 sentences.`,
    description: `Write a descriptive writing task at ${niv} level for a ${ctx.persona}. Topic: "${theme}" in ${ctx.setting}. The student must use at least 6 of these words: ${words}. 2–3 sentences.`,
    opinion:     `Write an opinion/argumentative writing task at ${niv} level for a ${ctx.persona}. Topic: "${theme}". The student must use at least 6 of these words: ${words}. Mention 2 points to address. 2–3 sentences.`,
  };
  out.innerHTML = sp();
  if (fb) fb.innerHTML = '';
  try {
    const res = await callApi(typeMap[type]);
    out.innerHTML = `<div style="background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.2);
      border-radius:var(--r);padding:.875rem;font-size:14px;line-height:1.6;">${markdownToHtml(res)}</div>`;
    if (inp)      { inp.style.display = ''; inp.value = ''; }
    if (checkBtn) checkBtn.style.display = '';
    if (wcWrap)   wcWrap.style.display = '';
  } catch(e) { out.innerHTML = '<div style="color:var(--red);">' + e.message + '</div>'; }
}
async function enLekWriteCheck() {
  const inp    = document.getElementById('en-lek-write-input');
  const fb     = document.getElementById('en-lek-write-fb');
  const prompt = document.getElementById('en-lek-write-prompt');
  if (!inp || !fb) return;
  // API key handled by claude() / callApi()
  const text = inp.value.trim();
  if (!text) { fb.innerHTML = '<div style="color:var(--gold);font-size:13px;">Bitte erst einen Text schreiben.</div>'; return; }
  const ctx   = enLekGetCtx();
  const niv   = enLekNiveau;
  const words = enLekGetWords(12);
  fb.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
  try {
    const res = await callApi(`You are an encouraging English teacher. A ${ctx.persona} at ${niv} level wrote this in response to: "${prompt?.textContent || 'writing task'}"

Student text: "${text}"

Target vocabulary words: ${words}

Give feedback in German:
1. ✅ Was gut ist (2–3 Punkte)
2. ⚠️ Grammatikfehler korrigieren (mit richtiger Form)
3. 📇 Vokabeln aus der Liste richtig verwendet
4. 💡 Ein konkreter Verbesserungshinweis

Ton: ermutigend, konstruktiv, altersgerecht für ${ctx.persona}.`);
    fb.innerHTML = `<div class="ai-out" style="background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);
      border-radius:var(--r);padding:.875rem;">${markdownToHtml(res)}</div>`;
  } catch(e) { fb.innerHTML = '<div style="color:var(--red);">' + e.message + '</div>'; }
}

// ── Grammar ──
async function enLekGrammar() {
  const out = document.getElementById('en-lek-gram-out');
  if (!out) return;
  // API key handled by claude() / callApi()
  const ctx   = enLekGetCtx();
  const niv   = enLekNiveau;
  const words = enLekGetWords(10);
  const theme = enLekGetTheme();
  const topics = EN_LEK_GRAM_TOPICS[niv] || EN_LEK_GRAM_TOPICS.A2;
  const topicLabel = topics.find(t => t.key === enLekGramTopic)?.label || enLekGramTopic;

  out.innerHTML = sp();
  try {
    const prompt = `You are an English grammar teacher. Create 5 varied grammar exercises on the topic "${topicLabel}" at ${niv} level for a ${ctx.persona}.

Context: all exercises should relate to the theme "${theme}" in ${ctx.setting}.
Use some of these vocabulary words naturally: ${words}.

Exercise mix (choose appropriate types for ${niv}):
- Gap-fill / sentence completion
- Error correction
- Sentence transformation
- Matching or multiple choice
- One short production exercise (write 2–3 sentences using the grammar point)

After the exercises, provide a clear answer key.
Tone: ${ctx.tone}. Keep instructions clear and concise.`;
    const nivClsG=enLekNiveau==='A1'?'niv-a1':enLekNiveau==='A2'?'niv-a2':enLekNiveau==='B1'?'niv-b1':'niv-b2';
    out.innerHTML = '<div class="ai-out"><span class="niv-badge '+nivClsG+'" style="margin-bottom:.5rem;display:inline-block;">'+enLekNiveau+'</span> ' + markdownToHtml(await callApi(prompt)) + '</div>';
  } catch(e) { out.innerHTML = '<div style="color:var(--red);">' + e.message + '</div>'; }
}

// callApiMessages defined above as shim

// ── Init ──
document.addEventListener('DOMContentLoaded', function() {
  buildEnLekUnitGrid();
  enLekBuildGramChips();
  enLekUpdateBadge();

  // Niveau chips
  document.getElementById('en-lek-niveau')?.addEventListener('click', function(e) {
    const b = e.target.closest('[data-niv]'); if (!b) return;
    enLekNiveau = b.dataset.niv;
    this.querySelectorAll('[data-niv]').forEach(x => x.classList.toggle('on', x === b));
    enLekBuildGramChips();
    enLekUpdateBadge();
    // Clear all outputs on niveau change
    ['en-lek-vk-out','en-lek-listen-out','en-lek-read-out','en-lek-speak-out','en-lek-gram-out','en-lek-write-fb','en-lek-write-prompt'].forEach(i => {
      const el = document.getElementById(i); if (el) el.innerHTML = '';
    });
    enLekSpeakHistory = [];
    const ia = document.getElementById('en-lek-speak-input-area'); if (ia) ia.remove();
  });

  // Kontext chips
  document.getElementById('en-lek-kontext')?.addEventListener('click', function(e) {
    const b = e.target.closest('[data-ctx]'); if (!b) return;
    enLekKontext = b.dataset.ctx;
    this.querySelectorAll('[data-ctx]').forEach(x => x.classList.toggle('on', x === b));
    enLekUpdateBadge();
    ['en-lek-vk-out','en-lek-listen-out','en-lek-read-out','en-lek-speak-out','en-lek-gram-out','en-lek-write-fb','en-lek-write-prompt'].forEach(i => {
      const el = document.getElementById(i); if (el) el.innerHTML = '';
    });
    enLekSpeakHistory = [];
    const ia = document.getElementById('en-lek-speak-input-area'); if (ia) ia.remove();
  });

  // Vocab mode
  document.getElementById('en-lek-vk-mode')?.addEventListener('click', function(e) {
    const b = e.target.closest('[data-vkm]'); if (!b) return;
    enLekVkMode = b.dataset.vkm;
    this.querySelectorAll('[data-vkm]').forEach(x => x.classList.toggle('on', x === b));
  });
  // Listen type
  document.getElementById('en-lek-listen-type')?.addEventListener('click', function(e) {
    const b = e.target.closest('[data-lt]'); if (!b) return;
    enLekListenType = b.dataset.lt;
    this.querySelectorAll('[data-lt]').forEach(x => x.classList.toggle('on', x === b));
  });
  // Read type
  document.getElementById('en-lek-read-type')?.addEventListener('click', function(e) {
    const b = e.target.closest('[data-rt]'); if (!b) return;
    enLekReadType = b.dataset.rt;
    this.querySelectorAll('[data-rt]').forEach(x => x.classList.toggle('on', x === b));
  });
  // Speak type
  document.getElementById('en-lek-speak-type')?.addEventListener('click', function(e) {
    const b = e.target.closest('[data-st]'); if (!b) return;
    enLekSpeakType = b.dataset.st;
    this.querySelectorAll('[data-st]').forEach(x => x.classList.toggle('on', x === b));
    enLekSpeakHistory = [];
    const out = document.getElementById('en-lek-speak-out'); if (out) out.innerHTML = '';
    const ia  = document.getElementById('en-lek-speak-input-area'); if (ia) ia.remove();
  });
  // Grammar topic (delegated — chips are dynamic)
  document.getElementById('en-lek-gram-topic')?.addEventListener('click', function(e) {
    const b = e.target.closest('[data-gt]'); if (!b) return;
    enLekGramTopic = b.dataset.gt;
    this.querySelectorAll('[data-gt]').forEach(x => x.classList.toggle('on', x === b));
  });

  // Action buttons
  document.getElementById('btn-en-lek-vk')?.addEventListener('click', enLekVocab);
  document.getElementById('btn-en-lek-listen')?.addEventListener('click', enLekListening);
  document.getElementById('btn-en-lek-read')?.addEventListener('click', enLekReading);
  document.getElementById('btn-en-lek-speak-start')?.addEventListener('click', () => enLekSpeakTurn(''));
  document.getElementById('btn-en-lek-write-new')?.addEventListener('click', enLekWritePrompt);
  document.getElementById('btn-en-lek-write-check')?.addEventListener('click', enLekWriteCheck);
  document.getElementById('btn-en-lek-gram')?.addEventListener('click', enLekGrammar);

  // Word count
  document.getElementById('en-lek-write-input')?.addEventListener('input', function() {
    const wc = this.value.trim().split(/\s+/).filter(w => w.length > 0).length;
    const el = document.getElementById('en-lek-wc'); if (el) el.textContent = wc;
  });

  // Auto-set niveau from profile on panel open
  const origNav = window.nav;
  if (origNav) {
    window.nav = function(name) {
      origNav(name);
      if (name === 'en-lektionen') {
        const zi = getZyklusInfo();
        if (zi) {
          const niv = zi.isAdult ? 'B1' :
            zi.zyklus === 1 ? 'A1' :
            zi.zyklus === 2 ? 'A2' : 'B1';
          const ctx = zi.isAdult ? 'adult' : 'school';
          if (enLekNiveau !== niv || enLekKontext !== ctx) {
            enLekNiveau  = niv;
            enLekKontext = ctx;
            // Update chips
            document.querySelectorAll('#en-lek-niveau [data-niv]').forEach(b =>
              b.classList.toggle('on', b.dataset.niv === niv));
            document.querySelectorAll('#en-lek-kontext [data-ctx]').forEach(b =>
              b.classList.toggle('on', b.dataset.ctx === ctx));
            enLekBuildGramChips();
            enLekUpdateBadge();
          }
        }
      }
    };
  }

  // Select unit 1 by default
  selectEnLekUnit(1);
});


// ═══════════════════════════════════════════
// SUPABASE — PROFILE HELPERS
// ═══════════════════════════════════════════

async function sbSaveProfile(profile) {
  if (!sb) return;
  try {
    const { error } = await sb
      .from('profiles')
      .upsert({
        id:           profile.id,
        name:         profile.name,
        profile_type: profile.type,
        level:        profile.level,
        updated_at:   new Date().toISOString()
      }, { onConflict: 'id' });
    if (error) console.warn('Supabase Profile save:', error.message);
  } catch(e) { console.warn('Supabase offline:', e.message); }
}

async function sbSaveAllProfiles() {
  if (!sb || !ST.profiles.length) return;
  for (const p of ST.profiles) await sbSaveProfile(p);
}

async function sbLoadProfiles() {
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) { console.warn('Supabase Profile load:', error.message); return null; }
    return data;
  } catch(e) { console.warn('Supabase offline:', e.message); return null; }
}

async function sbDeleteProfile(profileId) {
  if (!sb) return;
  try {
    const { error } = await sb
      .from('profiles')
      .delete()
      .eq('id', profileId);
    if (error) console.warn('Supabase Profile delete:', error.message);
  } catch(e) { console.warn('Supabase offline:', e.message); }
}

async function sbSyncProfiles() {
  // Lädt Profile aus Supabase und merged mit localStorage
  // Supabase gewinnt bei Konflikten (neueres Gerät)
  const remote = await sbLoadProfiles();
  if (!remote || remote.length === 0) {
    // Nichts remote — lokale Profile zu Supabase hochladen
    await sbSaveAllProfiles();
    return;
  }
  // Remote-Profile in ST.profiles-Format umwandeln
  const localById = {};
  ST.profiles.forEach(p => localById[p.id] = p);
  remote.forEach(r => {
    if (!localById[r.id]) {
      // Neu von anderem Gerät — hinzufügen
      ST.profiles.push({
        id: r.id, name: r.name, type: r.profile_type, level: r.level,
        lang: 'en', xp: 0, streak: 0, done: 0,
        progress: {learn:0,listen:0,exam:0},
        skills: {h:0,l:0,s:0,w:0,r:0,m:0}, badges: []
      });
    }
  });
  localStorage.setItem('edu_profiles', JSON.stringify(ST.profiles));
}

// ═══════════════════════════════════════════
// SUPABASE — VOCAB PROGRESS HELPERS
// ═══════════════════════════════════════════

async function sbSaveVocabWord(lang, unitIdx, wordIdx, known) {
  if (!sb) return;
  const p = ST.profiles[ST.activeProfile]; if (!p) return;
  try {
    const { error } = await sb
      .from('vocab_progress')
      .upsert({
        profile_id:  p.id,
        language:    lang,
        word:        `${unitIdx}:${wordIdx}`,  // key: "unit:wordIdx"
        known:       known,
        updated_at:  new Date().toISOString()
      }, { onConflict: 'profile_id,language,word' });
    if (error) console.warn('Supabase Vocab save:', error.message);
  } catch(e) { console.warn('Supabase offline:', e.message); }
}

async function sbLoadVocabProgress(lang) {
  if (!sb) return null;
  const p = ST.profiles[ST.activeProfile]; if (!p) return null;
  try {
    const { data, error } = await sb
      .from('vocab_progress')
      .select('word,known')
      .eq('profile_id', p.id)
      .eq('language', lang);
    if (error) { console.warn('Supabase Vocab load:', error.message); return null; }
    return data;
  } catch(e) { console.warn('Supabase offline:', e.message); return null; }
}

async function sbSyncVocabProgress(lang) {
  const remote = await sbLoadVocabProgress(lang);
  if (!remote || remote.length === 0) {
    // Nichts remote — lokalen Stand hochladen
    const key = 'vk_prog_' + lang;
    const prog = JSON.parse(localStorage.getItem(key) || '{}');
    for (const [unitIdx, unitProg] of Object.entries(prog)) {
      for (const [wordIdx, known] of Object.entries(unitProg)) {
        if (known) await sbSaveVocabWord(lang, unitIdx, wordIdx, true);
      }
    }
    return;
  }
  // Remote in localStorage mergen
  const key = 'vk_prog_' + lang;
  const prog = JSON.parse(localStorage.getItem(key) || '{}');
  let changed = false;
  for (const row of remote) {
    const [unitIdx, wordIdx] = row.word.split(':');
    if (!prog[unitIdx]) prog[unitIdx] = {};
    if (prog[unitIdx][wordIdx] !== row.known) {
      prog[unitIdx][wordIdx] = row.known;
      changed = true;
    }
  }
  if (changed) localStorage.setItem(key, JSON.stringify(prog));
}
