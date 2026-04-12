'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { nameToSlug, genderLabel, popularityStars } from '@/lib/slug'


const FAMOSOS_BASE: Record<string, string[]> = {
  "lucia": [
    "Lucía de Siracusa (santa mártir, siglo III)",
    "Lucía Etxebarria (escritora española)",
    "Lucía Méndez (cantante mexicana)"
  ],
  "sofia": [
    "Sofía de Grecia (reina emérita de España)",
    "Sofía Vergara (actriz colombiana)",
    "Sofía Loren (actriz italiana)"
  ],
  "hugo": [
    "Victor Hugo (escritor francés)",
    "Hugo Sánchez (futbolista mexicano)",
    "Hugo Boss (diseñador alemán)"
  ],
  "mateo": [
    "Mateo (evangelista y apóstol)",
    "Mateo Kovacic (futbolista croata)",
    "Mateo Musacchio (futbolista argentino)"
  ],
  "martina": [
    "Martina Navratilova (tenista checa)",
    "Martina García (actriz española)",
    "Santa Martina (mártir romana)"
  ],
  "pablo": [
    "Pablo Picasso (pintor español)",
    "Pablo Neruda (poeta chileno)",
    "San Pablo (apóstol)"
  ],
  "maria": [
    "María de Nazaret (madre de Jesús)",
    "María Callas (soprano griega)",
    "María Montessori (pedagoga italiana)"
  ],
  "ana": [
    "Ana Frank (escritora holandesa)",
    "Ana de Austria (reina de Francia)",
    "Ana Belén (cantante española)"
  ],
  "alba": [
    "Alba Flores (actriz española)",
    "La duquesa de Alba (aristócrata)",
    "Alba Adriática (emperatriz romana)"
  ],
  "luna": [
    "Luna Maya (actriz indonesia)",
    "Luna Rossa (navegante italiano)",
    "Luna (diosa romana)"
  ],
  "leo": [
    "Leonardo DiCaprio (actor estadounidense)",
    "Leo Messi (futbolista argentino)",
    "León XIII (papa)"
  ],
  "lucas": [
    "San Lucas (evangelista)",
    "Lucas Vázquez (futbolista español)",
    "George Lucas (director estadounidense)"
  ],
  "emma": [
    "Emma Watson (actriz británica)",
    "Emma Stone (actriz estadounidense)",
    "Emma Bovary (personaje de Flaubert)"
  ],
  "carlos": [
    "Carlos III (rey de España)",
    "Carlos Sainz (piloto español)",
    "Carlos Gardel (cantante argentino)"
  ],
  "jorge": [
    "Jorge Luis Borges (escritor argentino)",
    "Jorge Lorenzo (piloto español)",
    "Jorge Drexler (músico uruguayo)"
  ],
  "david": [
    "David (rey bíblico de Israel)",
    "David Bowie (músico británico)",
    "David Silva (futbolista español)"
  ],
  "sara": [
    "Sara (esposa de Abraham en la Biblia)",
    "Sara Baras (bailaora española)",
    "Sara Carbonero (periodista española)"
  ],
  "laura": [
    "Laura Pausini (cantante italiana)",
    "Laura Ingalls Wilder (escritora estadounidense)",
    "Laura (musa de Petrarca)"
  ],
  "elena": [
    "Elena de Troya (personaje mitológico)",
    "Elena Anaya (actriz española)",
    "Elena Ochoa (médica y mecenas española)"
  ],
  "daniel": [
    "Daniel (profeta bíblico)",
    "Daniel Craig (actor británico)",
    "Daniel Carvajal (futbolista español)"
  ],
  "miguel": [
    "Miguel Ángel (artista renacentista)",
    "Miguel de Cervantes (escritor español)",
    "Miguel Bosé (cantante español)"
  ],
  "iker": [
    "Iker Casillas (portero español)",
    "Iker Muniain (futbolista español)",
    "Iker Lecuona (piloto de MotoGP)"
  ],
  "valentina": [
    "Valentina Tereshkova (cosmonauta soviética)",
    "Valentina Vezzali (esgrimista italiana)",
    "Valentina Lisitsa (pianista ucraniana)"
  ],
  "alejandro": [
    "Alejandro Magno (rey macedonio)",
    "Alejandro Sanz (cantante español)",
    "Alejandro González Iñárritu (director mexicano)"
  ],
  "marcos": [
    "San Marcos (evangelista)",
    "Marcos Llorente (futbolista español)",
    "Marcos Alonso (futbolista español)"
  ],
  "antonio": [
    "Antonio Gaudí (arquitecto español)",
    "Antonio Banderas (actor español)",
    "Antonio Vivaldi (compositor italiano)"
  ],
  "ivan": [
    "Iván el Terrible (zar ruso)",
    "Iván Rakitić (futbolista croata)",
    "Iván Ferreiro (músico español)"
  ],
  "pedro": [
    "San Pedro (apóstol de Jesús)",
    "Pedro Almodóvar (director español)",
    "Pedro Sánchez (político español)"
  ],
  "manuel": [
    "Manuel de Falla (compositor español)",
    "Manuel Pellegrini (entrenador chileno)",
    "Manuel Valls (político francés)"
  ],
  "jose": [
    "San José (padre adoptivo de Jesús)",
    "José Carreras (tenor español)",
    "José Saramago (escritor portugués)"
  ],
  "juan": [
    "San Juan (apóstol de Jesús)",
    "Juan Rulfo (escritor mexicano)",
    "Juan Carlos I (rey emérito de España)"
  ],
  "luis": [
    "Luis de Góngora (poeta español)",
    "Luis Buñuel (director español)",
    "Luis Figo (futbolista portugués)"
  ],
  "angel": [
    "Ángel Di María (futbolista argentino)",
    "Ángel Nieto (piloto español)",
    "Ángel (figura religiosa cristiana)"
  ],
  "victor": [
    "Victor Hugo (escritor francés)",
    "Víctor Manuel (cantante español)",
    "Víctor García de la Concha (lingüista español)"
  ],
  "sergio": [
    "Sergio Ramos (futbolista español)",
    "Sergio Leone (director italiano)",
    "Sergio García (golfista español)"
  ],
  "rafael": [
    "Rafael Nadal (tenista español)",
    "Rafael (arcángel bíblico)",
    "Rafael Alberti (poeta español)"
  ],
  "francisco": [
    "Francisco de Asís (santo italiano)",
    "Francisco Goya (pintor español)",
    "Papa Francisco (Jorge Bergoglio)"
  ],
  "javier": [
    "Javier Bardem (actor español)",
    "San Francisco Javier (misionero español)",
    "Javier Solana (político español)"
  ],
  "roberto": [
    "Roberto Baggio (futbolista italiano)",
    "Roberto Bolaño (escritor chileno)",
    "Roberto Carlos (futbolista brasileño)"
  ],
  "alberto": [
    "Alberto Contador (ciclista español)",
    "Alberto Moravia (escritor italiano)",
    "Alberto Durero (pintor alemán)"
  ],
  "fernando": [
    "Fernando Alonso (piloto español)",
    "Fernando Botero (pintor colombiano)",
    "Fernando de Rojas (escritor español)"
  ],
  "oscar": [
    "Óscar Wilde (escritor irlandés)",
    "Óscar Niemeyer (arquitecto brasileño)",
    "Óscar de la Renta (diseñador dominicano)"
  ],
  "raul": [
    "Raúl González (futbolista español)",
    "Raúl Zurita (poeta chileno)",
    "Raúl Julia (actor puertorriqueño)"
  ],
  "mario": [
    "Mario Vargas Llosa (escritor peruano)",
    "Mario Benedetti (poeta uruguayo)",
    "Mario Moreno 'Cantinflas' (actor mexicano)"
  ],
  "diego": [
    "Diego Velázquez (pintor español)",
    "Diego Maradona (futbolista argentino)",
    "Diego Rivera (muralista mexicano)"
  ],
  "andres": [
    "Andrés Iniesta (futbolista español)",
    "Andrés Segovia (guitarrista español)",
    "San Andrés (apóstol de Jesús)"
  ],
  "alvaro": [
    "Álvaro de Luna (condestable español)",
    "Álvaro Morata (futbolista español)",
    "Álvaro Mutis (escritor colombiano)"
  ],
  "ruben": [
    "Rubén Darío (poeta nicaragüense)",
    "Rubén Blades (cantante panameño)",
    "Rubén (tribu de Israel en la Biblia)"
  ],
  "eric": [
    "Eric Clapton (músico británico)",
    "Eric Cantona (futbolista francés)",
    "Eric Schmidt (empresario estadounidense)"
  ],
  "alex": [
    "Alexander el Grande (rey macedonio)",
    "Alex Crivillé (piloto español)",
    "Alex Morgan (futbolista estadounidense)"
  ],
  "marc": [
    "Marc Márquez (piloto español)",
    "Marc Chagall (pintor ruso-francés)",
    "Marc Anthony (cantante estadounidense)"
  ],
  "pau": [
    "Pau Gasol (baloncestista español)",
    "Pau Donés (músico español)",
    "San Pablo (apóstol)"
  ],
  "oliver": [
    "Oliver Hardy (actor estadounidense)",
    "Jamie Oliver (chef británico)",
    "Oliver Cromwell (político inglés)"
  ],
  "noah": [
    "Noé (patriarca bíblico)",
    "Noah Baumbach (director estadounidense)",
    "Noah Centineo (actor estadounidense)"
  ],
  "luca": [
    "Luca Modric (futbolista croata)",
    "Luca Guadagnino (director italiano)",
    "Luca Pacioli (matemático italiano)"
  ],
  "iris": [
    "Iris Apfel (diseñadora estadounidense)",
    "Iris Murdoch (escritora británica)",
    "Iris (diosa griega del arcoíris)"
  ],
  "naia": [
    "Naia (figura mitológica vasca)",
    "Naia Enos (modelo)",
    "Naia (personaje de leyendas vascas)"
  ],
  "aroa": [
    "Aroa Moreno Durán (escritora española)",
    "Aroa (personaje de la serie Cuéntame)",
    "Aroa (nombre vasco popular)"
  ],
  "amaia": [
    "Amaia Montero (cantante española)",
    "Amaia Salamanca (actriz española)",
    "Amaia Romero (cantante española)"
  ],
  "ane": [
    "Ane Santesteban (ciclista española)",
    "Ane Zuazubiskar (actriz vasca)",
    "Ane Irazabal (arquitecta vasca)"
  ],
  "miren": [
    "Miren Gaztañaga (actriz vasca)",
    "Miren Arzalluz (directora del museo Balenciaga)",
    "Miren Agur Meabe (escritora vasca)"
  ],
  "ainhoa": [
    "Ainhoa Arteta (soprano española)",
    "Ainhoa Tirapu (portera de fútbol)",
    "Ainhoa Timmer (tenista española)"
  ],
  "maite": [
    "Maite Perroni (actriz mexicana)",
    "Maite Kelly (cantante alemana)",
    "Maite Zubiaurre (escritora vasca)"
  ],
  "itziar": [
    "Itziar Ituño (actriz vasca)",
    "Itziar González (política española)",
    "Itziar Bilbao (artista vasca)"
  ],
  "leire": [
    "Leire Martínez (cantante española)",
    "Leire Pajín (política española)",
    "Leire Olaberria (ciclista vasca)"
  ],
  "nerea": [
    "Nerea Barros (actriz española)",
    "Nerea Camacho (actriz española)",
    "Nerea Garmendia (cantante vasca)"
  ],
  "laia": [
    "Laia Sanz (piloto española)",
    "Laia Marull (actriz española)",
    "Laia Palau (baloncestista española)"
  ],
  "carla": [
    "Carla Bruni (modelo y cantante italiana)",
    "Carla Suárez (tenista española)",
    "Carla Fracci (bailarina italiana)"
  ],
  "nuria": [
    "Núria Espert (actriz española)",
    "Núria Feliu (cantante catalana)",
    "Virgen de Núria (santuario catalán)"
  ],
  "rosa": [
    "Rosa Parks (activista estadounidense)",
    "Rosa Luxemburgo (política alemana)",
    "Santa Rosa de Lima (santa peruana)"
  ],
  "clara": [
    "Clara Schumann (pianista alemana)",
    "Santa Clara de Asís (santa italiana)",
    "Clara Bow (actriz estadounidense)"
  ],
  "julia": [
    "Julia Roberts (actriz estadounidense)",
    "Julia Child (chef estadounidense)",
    "Julia de Córdoba (santa española)"
  ],
  "paula": [
    "Paula Abdul (cantante estadounidense)",
    "Paula Badosa (tenista española)",
    "Paula Echevarría (actriz española)"
  ],
  "claudia": [
    "Claudia Schiffer (modelo alemana)",
    "Claudia Cardinale (actriz italiana)",
    "Claudia Sheinbaum (política mexicana)"
  ],
  "silvia": [
    "Silvia de Suecia (reina de Suecia)",
    "Silvia Pinal (actriz mexicana)",
    "Silvia Abascal (actriz española)"
  ],
  "teresa": [
    "Santa Teresa de Ávila (mística española)",
    "Madre Teresa de Calcuta (santa india)",
    "Teresa Berganza (soprano española)"
  ],
  "beatriz": [
    "Beatriz de Holanda (reina de Países Bajos)",
    "Beatriz (personaje de Dante Alighieri)",
    "Beatriz Luengo (actriz española)"
  ],
  "pilar": [
    "Pilar Miró (directora española)",
    "Pilar López de Ayala (actriz española)",
    "Pilar Bardem (actriz española)"
  ],
  "carmen": [
    "Carmen Amaya (bailaora española)",
    "Carmen Maura (actriz española)",
    "Carmen (ópera de Georges Bizet)"
  ],
  "lola": [
    "Lola Flores (cantante española)",
    "Lola Membrives (actriz argentina)",
    "Dolores Ibárruri 'La Pasionaria' (política española)"
  ],
  "dolores": [
    "Dolores Ibárruri La Pasionaria (política española)",
    "Dolores Huerta (activista estadounidense)",
    "Dolores O'Riordan (cantante irlandesa)"
  ],
  "rocio": [
    "Rocío Jurado (cantante española)",
    "Rocío Dúrcal (cantante española)",
    "Rocío Carrasco (personaje mediático español)"
  ],
  "patricia": [
    "Patricia Highsmith (escritora estadounidense)",
    "Patricia Arquette (actriz estadounidense)",
    "Santa Patricia de Nápoles"
  ],
  "sandra": [
    "Sandra Bullock (actriz estadounidense)",
    "Sandra Oh (actriz canadiense)",
    "Sandra Ibarra (activista española)"
  ],
  "monica": [
    "Mónica Bellucci (actriz italiana)",
    "Mónica Seles (tenista yugoslava)",
    "Santa Mónica (madre de San Agustín)"
  ],
  "angela": [
    "Ángela Merkel (canciller alemana)",
    "Ángela Molina (actriz española)",
    "Ángela Lansbury (actriz británica)"
  ],
  "diana": [
    "Diana de Gales (princesa británica)",
    "Diana (diosa romana de la caza)",
    "Diana Ross (cantante estadounidense)"
  ],
  "ines": [
    "Sor Juana Inés de la Cruz (poetisa mexicana)",
    "Inés Arrimadas (política española)",
    "Santa Inés (mártir romana)"
  ],
  "inés": [
    "Sor Juana Inés de la Cruz (poetisa mexicana)",
    "Inés Arrimadas (política española)",
    "Santa Inés (mártir romana)"
  ],
  "noelia": [
    "Noelia (cantante española)",
    "Noelia López (modelo española)",
    "Noelia Marzol (actriz argentina)"
  ],
  "mireia": [
    "Mireia Belmonte (nadadora española)",
    "Mireia Lalaguna (Miss Mundo 2015)",
    "Mireia Ros (política española)"
  ],
  "miriam": [
    "Miriam (hermana de Moisés en la Biblia)",
    "Miriam Bryant (cantante sueca)",
    "Miriam Díaz-Aroca (presentadora española)"
  ],
  "victoria": [
    "Victoria de Gran Bretaña (reina)",
    "Victoria Beckham (cantante y diseñadora)",
    "Victoria Abril (actriz española)"
  ],
  "natalia": [
    "Natalia Lafourcade (cantante mexicana)",
    "Natalia Oreiro (actriz uruguaya)",
    "Natalia Vodianova (modelo rusa)"
  ],
  "eva": [
    "Eva Perón (primera dama argentina)",
    "Eva Longoria (actriz estadounidense)",
    "Eva (primera mujer según el Génesis)"
  ],
  "adriana": [
    "Adriana Lima (modelo brasileña)",
    "Adriana Ugarte (actriz española)",
    "Adriana Ozores (actriz española)"
  ],
  "blanca": [
    "Blanca de Castilla (reina de Francia)",
    "Blanca Portillo (actriz española)",
    "Blanca Suárez (actriz española)"
  ],
  "vera": [
    "Vera Wang (diseñadora estadounidense)",
    "Vera Farmiga (actriz estadounidense)",
    "Vera Lynn (cantante británica)"
  ],
  "nora": [
    "Nora Ephron (escritora estadounidense)",
    "Norah Jones (cantante estadounidense)",
    "Nora (personaje de Ibsen en 'Casa de muñecas')"
  ],
  "zoe": [
    "Zoe Saldana (actriz estadounidense)",
    "Zoe Kravitz (actriz estadounidense)",
    "Zoe Ball (presentadora británica)"
  ],
  "maya": [
    "Maya Angelou (escritora estadounidense)",
    "Maya (civilización mesoamericana)",
    "Maya Deren (cineasta ucraniana)"
  ],
  "nadia": [
    "Nadia Comaneci (gimnasta rumana)",
    "Nadia Calviño (economista española)",
    "Nadia Bjorlin (actriz estadounidense)"
  ],
  "greta": [
    "Greta Garbo (actriz sueca)",
    "Greta Thunberg (activista sueca)",
    "Greta Gerwig (directora estadounidense)"
  ],
  "mia": [
    "Mia Farrow (actriz estadounidense)",
    "Mia Wasikowska (actriz australiana)",
    "Mia (personaje de 'Pulp Fiction')"
  ],
  "ava": [
    "Ava Gardner (actriz estadounidense)",
    "Ava DuVernay (directora estadounidense)",
    "Ava Max (cantante albanesa)"
  ],
  "elsa": [
    "Elsa Pataky (actriz española)",
    "Elsa Lanchester (actriz británica)",
    "Elsa Morante (escritora italiana)"
  ],
  "abril": [
    "Abril Zamora (actriz española)",
    "Abril Schreiber (actriz mexicana)",
    "Abril (nombre inspirado en el mes de la primavera)"
  ],
  "unai": [
    "Unai Emery (entrenador de fútbol vasco)",
    "Unai Simón (portero español)",
    "Unai Elorza (político vasco)"
  ],
  "aitor": [
    "Aitor Karanka (entrenador español)",
    "Aitor Ocio (futbolista español)",
    "Aitor (padre mítico legendario de los vascos)"
  ],
  "ander": [
    "Ander Herrera (futbolista español)",
    "Ander Mirambell (esqueleto español)",
    "Ander Cominges (cantante español)"
  ],
  "jon": [
    "Jon Kortajarena (modelo español)",
    "Jon Rahm (golfista español)",
    "Jon Bernthal (actor estadounidense)"
  ],
  "gorka": [
    "Gorka Marquez (bailarín español)",
    "Gorka Otegi (saxofonista vasco)",
    "Gorka Aguinagalde (balonmanista español)"
  ],
  "asier": [
    "Asier Etxeandía (actor vasco)",
    "Asier Illarramendi (futbolista vasco)",
    "Asier del Horno (futbolista vasco)"
  ],
  "mikel": [
    "Mikel Arteta (entrenador español)",
    "Mikel Landa (ciclista español)",
    "Mikel Laboa (músico vasco)"
  ],
  "xabi": [
    "Xabi Alonso (futbolista español)",
    "Xabi Prieto (futbolista español)",
    "Xabi San Martín (ciclista español)"
  ],
  "gaizka": [
    "Gaizka Mendieta (futbolista español)",
    "Gaizka Totorika (político vasco)",
    "Gaizka Urresti (político vasco)"
  ],
  "eneko": [
    "Eneko Atxa (chef vasco con estrellas Michelin)",
    "Eneko Sagardoy (actor vasco)",
    "Eneko Goia (político vasco)"
  ],
  "txomin": [
    "Txomin Agirre (escritor vasco del siglo XIX)",
    "Txomin Artola (bertsolari vasco)",
    "Txomin Letamendia (político vasco)"
  ],
  "garazi": [
    "Garazi Santesteban (esquiadora alpina española)",
    "Garazi Murua (piragüista española)",
    "Garazi Gabantxo (directora vasca)"
  ],
  "maddi": [
    "Maddi Oiarzabal (alpinista vasca)",
    "Maddi Ane Goikoetxea (actriz vasca)",
    "Maddi (nombre vasco tradicional)"
  ],
  "olatz": [
    "Olatz Hammond (cineasta estadounidense de origen vasco)",
    "Olatz González (actriz vasca)",
    "Olatz Larrea (tenista española)"
  ],
  "peio": [
    "Peio Urbeltz (músico vasco)",
    "Peio Serbielle (ciclista francés)",
    "Peio Etxeberri (actor vasco)"
  ],
  "noa": [
    "Noa (cantante israelí)",
    "Noa Kirel (cantante israelí)",
    "Noa Argamani (activista israelí)"
  ],
  "mar": [
    "Mar Saura (actriz española)",
    "Mar Barberán (meteoróloga española)",
    "Mar Flores (modelo española)"
  ],
  "luz": [
    "Luz Casal (cantante española)",
    "Luz Valdenebro (actriz española)",
    "Luz Long (atleta alemán)"
  ],
  "candela": [
    "Candela Peña (actriz española)",
    "Candela Serrat (hija de Joan Manuel Serrat)",
    "Candela Olmedo (actriz argentina)"
  ],
  "africa": [
    "África Baeza (actriz española)",
    "África Zamorano (fotógrafa española)",
    "África (nombre bíblico y geográfico)"
  ],
  "celia": [
    "Celia Cruz (cantante cubana)",
    "Celia Villalobos (política española)",
    "Santa Celia (mártir cristiana)"
  ],
  "sofia2": [
    "Sofía de Grecia (reina emérita de España)",
    "Sofía Vergara (actriz colombiana)",
    "Sofía Loren (actriz italiana)"
  ],
  "vega": [
    "Vega (estrella más brillante de la constelación Lira)",
    "Vega (cantante española)",
    "Lope de Vega (dramaturgo español)"
  ],
  "arantza": [
    "Arantza Santesteban (política vasca)",
    "Arantza Quiroga (política vasca)",
    "Arantxa Sánchez Vicario (tenista española)"
  ],
  "arantxa": [
    "Arantxa Sánchez Vicario (tenista española)",
    "Arantxa Quiroga (política vasca)",
    "Arantxa (nombre vasco popular)"
  ],
  "edurne": [
    "Edurne (cantante española)",
    "Edurne Pasabán (alpinista española)",
    "Edurne Ormazabal (empresaria vasca)"
  ],
  "idoia": [
    "Idoia Zenarruzabeitia (actriz vasca)",
    "Idoia López Riaño (activista vasca)",
    "Idoia (nombre vasco popular)"
  ],
  "uxue": [
    "Uxue Barkos (política navarra)",
    "Uxue Alberdi (bertsolari vasca)",
    "Uxue Apaolaza (periodista vasca)"
  ],
  "izaro": [
    "Izaro (cantante española)",
    "Izaro (isla vasca del País Vasco)",
    "Izaro Andrés (actriz vasca)"
  ],
  "onintze": [
    "Onintze Unzueta (actriz vasca)",
    "Onintze Salazar (bailarina vasca)",
    "Onintze (nombre vasco tradicional)"
  ],
  "alaia": [
    "Alaia Martín (actriz española)",
    "Azzedine Alaïa (diseñador tunecino-francés)",
    "Alaia (nombre vasco que significa alegría)"
  ],
  "june": [
    "June Carter Cash (cantante estadounidense)",
    "June Allyson (actriz estadounidense)",
    "June Squibb (actriz estadounidense)"
  ],
  "eider": [
    "Eider Arevalo (marchadora colombiana)",
    "Eider Merino (marchadora española)",
    "Eider Dones (escritora vasca)"
  ],
  "nahia": [
    "Nahia Legarreta (actriz vasca)",
    "Nahia (nombre vasco)",
    "Nahia Iribarren (deportista vasca)"
  ],
  "irati": [
    "Irati Sagarzazu (atleta vasca)",
    "Irati Anda (actriz vasca)",
    "Irati (nombre vasco e historia navarra)"
  ],
  "ainara": [
    "Ainara (golondrina en euskera)",
    "Ainara Zulueta (artista vasca)",
    "Ainara Quijada (cantante vasca)"
  ],
  "maddalen": [
    "Maddalen Arzalluz (política vasca)",
    "Maddalen (forma vasca de Magdalena)",
    "María Magdalena (santa bíblica)"
  ],
  "kattalin": [
    "Kattalin Miner (periodista vasca)",
    "Kattalin Olano (política vasca)",
    "Kattalin (forma vasca de Catalina)"
  ],
  "maitane": [
    "Maitane Robinson (actriz británica)",
    "Maitane (nombre vasco)",
    "Maitane López (presentadora vasca)"
  ],
  "haizea": [
    "Haizea Ayarza (actriz vasca)",
    "Haizea (viento en euskera)",
    "Haizea López (deportista vasca)"
  ],
  "ane3": [
    "Ane Santesteban (ciclista española)",
    "Ane Zuazubiskar (actriz vasca)",
    "Ane Irazabal (arquitecta vasca)"
  ],
  "amara": [
    "Amara La Negra (cantante dominicana)",
    "Amara (nombre de origen africano)",
    "Amara Nwosu (activista estadounidense)"
  ],
  "sophie": [
    "Sophie Marceau (actriz francesa)",
    "Sophie Ellis-Bextor (cantante británica)",
    "Sophie Turner (actriz británica)"
  ],
  "sofia3": [
    "Sofía de Grecia (reina emérita de España)",
    "Sofía Vergara (actriz colombiana)",
    "Sofía Loren (actriz italiana)"
  ],
  "chloe": [
    "Chloé Zhao (directora china)",
    "Chloe Grace Moretz (actriz estadounidense)",
    "Chloé (marca de moda francesa)"
  ],
  "lea": [
    "Lea Seydoux (actriz francesa)",
    "Lea Michele (actriz estadounidense)",
    "Lea (esposa de Jacob en la Biblia)"
  ],
  "lena": [
    "Lena Headey (actriz británica)",
    "Lena Dunham (actriz y directora)",
    "Lena Meyer-Landrut (cantante alemana)"
  ],
  "emma2": [
    "Emma Watson (actriz británica)",
    "Emma Stone (actriz estadounidense)",
    "Emma Thompson (actriz británica)"
  ],
  "alice": [
    "Alice Cooper (músico estadounidense)",
    "Alice Munro (escritora canadiense)",
    "Alicia en el País de las Maravillas (personaje literario)"
  ],
  "alicia": [
    "Alicia Keys (cantante estadounidense)",
    "Alicia Vikander (actriz sueca)",
    "Alicia Silverstone (actriz estadounidense)"
  ],
  "natasha": [
    "Natasha Romanova (personaje Marvel)",
    "Natasha Richardson (actriz británica)",
    "Natasha Bedingfield (cantante británica)"
  ],
  "isabella": [
    "Isabella de Castilla (reina de España)",
    "Isabella Rossellini (actriz italiana)",
    "Isabella (nombre literario de Shakespeare)"
  ],
  "valentina2": [
    "Valentina Tereshkova (cosmonauta soviética)",
    "Valentina Vezzali (esgrimista italiana)",
    "Valentina Lisitsa (pianista ucraniana)"
  ],
  "adrián": [
    "Adriano (emperador romano)",
    "Adrian Brody (actor estadounidense)",
    "Adrián Uribe (comediante mexicano)"
  ],
  "adrian": [
    "Adriano (emperador romano)",
    "Adrian Brody (actor estadounidense)",
    "Adrián Uribe (comediante mexicano)"
  ],
  "marcos2": [
    "San Marcos (evangelista)",
    "Marcos Llorente (futbolista español)",
    "Marcos Alonso (futbolista español)"
  ],
  "nacho": [
    "Nacho Fernández (futbolista español)",
    "Nacho Vegas (músico español)",
    "Nacho (nombre popular español)"
  ],
  "rodrigo": [
    "Rodrigo Díaz de Vivar 'El Cid' (héroe español)",
    "Rodrigo de Triana (marinero español)",
    "Rodrigo Santoro (actor brasileño)"
  ],
  "gonzalo": [
    "Gonzalo Fernández de Córdoba 'El Gran Capitán'",
    "Gonzalo Higuaín (futbolista argentino)",
    "Gonzalo Rubalcaba (pianista cubano)"
  ],
  "ignacio": [
    "San Ignacio de Loyola (fundador jesuitas)",
    "Ignacio Zuloaga (pintor español)",
    "Ignacio Zaragoza (militar mexicano)"
  ],
  "ramón": [
    "Ramón y Cajal (científico español)",
    "Ramón Llull (filósofo mallorquín)",
    "Ramón Barros Luco (político chileno)"
  ],
  "ramon": [
    "Ramón y Cajal (científico español)",
    "Ramón Llull (filósofo mallorquín)",
    "Ramón Barros Luco (político chileno)"
  ],
  "arturo": [
    "Arturo (rey legendario británico)",
    "Arturo Vidal (futbolista chileno)",
    "Arturo Pérez-Reverte (escritor español)"
  ],
  "ernesto": [
    "Ernesto 'Che' Guevara (revolucionario argentino)",
    "Ernesto Sábato (escritor argentino)",
    "Ernesto Cardenal (poeta nicaragüense)"
  ],
  "gabriel": [
    "Gabriel García Márquez (escritor colombiano)",
    "Gabriel Batistuta (futbolista argentino)",
    "Arcángel Gabriel (figura bíblica)"
  ],
  "santiago": [
    "Santiago (apóstol de Jesús)",
    "Santiago Calatrava (arquitecto español)",
    "Santiago Segura (actor español)"
  ],
  "felipe": [
    "Felipe VI (rey de España)",
    "Felipe González (político español)",
    "Felipe II (rey de España)"
  ],
  "nicolas": [
    "Nicolás Maquiavelo (político italiano)",
    "Nicolás Copérnico (astrónomo polaco)",
    "Nicolas Cage (actor estadounidense)"
  ],
  "nicolás": [
    "Nicolás Maquiavelo (político italiano)",
    "Nicolás Copérnico (astrónomo polaco)",
    "Nicolas Cage (actor estadounidense)"
  ],
  "sebastian": [
    "Sebastián (santo mártir romano)",
    "Sebastián Vettel (piloto alemán)",
    "Sebastián Piñera (político chileno)"
  ],
  "sebastián": [
    "San Sebastián (santo mártir romano)",
    "Sebastián Vettel (piloto alemán)",
    "Sebastián Piñera (político chileno)"
  ],
  "cristian": [
    "Cristian Pavón (futbolista argentino)",
    "Cristian Castro (cantante mexicano)",
    "Cristian Mungiu (director rumano)"
  ],
  "cristina": [
    "Cristina Kirchner (política argentina)",
    "Cristina Aguilera (cantante estadounidense)",
    "Cristina de Borbón (infanta española)"
  ],
  "patricia2": [
    "Patricia Highsmith (escritora estadounidense)",
    "Patricia Arquette (actriz estadounidense)",
    "Santa Patricia de Nápoles"
  ],
  "lorena": [
    "Lorena Ochoa (golfista mexicana)",
    "Lorena Bernal (modelo española)",
    "Lorena Bobbitt (personaje mediático)"
  ],
  "jennifer": [
    "Jennifer Lopez (cantante y actriz)",
    "Jennifer Aniston (actriz estadounidense)",
    "Jennifer Lawrence (actriz estadounidense)"
  ],
  "jessica": [
    "Jessica Alba (actriz estadounidense)",
    "Jessica Chastain (actriz estadounidense)",
    "Jessica Rabbit (personaje animado)"
  ],
  "andrea": [
    "Andrea Pirlo (futbolista italiano)",
    "Andrea Bocelli (cantante italiano)",
    "Andrea (nombre de origen griego)"
  ],
  "marcos3": [
    "San Marcos (evangelista)",
    "Marcos Llorente (futbolista español)",
    "Marcos Alonso (futbolista español)"
  ],
  "hector": [
    "Héctor (héroe troyano de la Ilíada)",
    "Héctor Bellerín (futbolista español)",
    "Héctor Elizondo (actor estadounidense)"
  ],
  "héctor": [
    "Héctor (héroe troyano de la Ilíada)",
    "Héctor Bellerín (futbolista español)",
    "Héctor Elizondo (actor estadounidense)"
  ],
  "omar": [
    "Omar Sharif (actor egipcio)",
    "Omar Khayyam (poeta persa)",
    "Omar Epps (actor estadounidense)"
  ],
  "adam": [
    "Adam Smith (economista escocés)",
    "Adam Sandler (actor estadounidense)",
    "Adam (primer hombre según la Biblia)"
  ],
  "lucas2": [
    "San Lucas (evangelista)",
    "Lucas Vázquez (futbolista español)",
    "George Lucas (director estadounidense)"
  ],
  "leo2": [
    "Leonardo DiCaprio (actor)",
    "Leo Messi (futbolista)",
    "León XIII (papa)"
  ],
  "max": [
    "Max Planck (físico alemán)",
    "Max Weber (sociólogo alemán)",
    "Max Ernst (pintor alemán)"
  ],
  "leo3": [
    "Leonardo DiCaprio (actor)",
    "Leo Messi (futbolista)",
    "León XIII (papa)"
  ],
  "martin": [
    "Martín Luther King (activista estadounidense)",
    "San Martín de Tours (santo)",
    "Martín (personaje de Cervantes)"
  ],
  "martín": [
    "Martín Luther King (activista estadounidense)",
    "San Martín de Tours (santo)",
    "José de San Martín (libertador argentino)"
  ],
  "pablo2": [
    "Pablo Picasso (pintor)",
    "Pablo Neruda (poeta)",
    "San Pablo (apóstol)"
  ],
  "tom": [
    "Tom Hanks (actor estadounidense)",
    "Tom Cruise (actor estadounidense)",
    "Tom Jones (cantante galés)"
  ],
  "james": [
    "James Joyce (escritor irlandés)",
    "James Dean (actor estadounidense)",
    "James Brown (músico estadounidense)"
  ],
  "jack": [
    "Jack Nicholson (actor estadounidense)",
    "Jack London (escritor estadounidense)",
    "Jack Kerouac (escritor estadounidense)"
  ],
  "nico": [
    "Nico (cantante alemana del grupo Velvet Underground)",
    "Nico Rosberg (piloto alemán)",
    "Nico Williams (futbolista español)"
  ],
  "liam": [
    "Liam Neeson (actor irlandés)",
    "Liam Gallagher (músico británico)",
    "Liam Payne (cantante británico)"
  ],
  "marco": [
    "Marco Polo (explorador italiano)",
    "Marco Aurelio (emperador romano)",
    "Marco van Basten (futbolista neerlandés)"
  ],
  "ivan2": [
    "Iván el Terrible (zar ruso)",
    "Iván Rakitić (futbolista croata)",
    "Iván Ferreiro (músico español)"
  ],
  "nicolas2": [
    "Nicolás Maquiavelo (político italiano)",
    "Nicolás Copérnico (astrónomo polaco)",
    "Nicolas Cage (actor estadounidense)"
  ],
  "tomas": [
    "Tomás de Aquino (filósofo y teólogo)",
    "Tomás Edison (inventor estadounidense)",
    "Tomás Morales (poeta español)"
  ],
  "tomás": [
    "Santo Tomás de Aquino (filósofo)",
    "Tomás Edison (inventor estadounidense)",
    "Tomás Gutiérrez Alea (director cubano)"
  ],
  "simon": [
    "Simón Bolívar (libertador venezolano)",
    "Simon & Garfunkel (dúo musical)",
    "Simón el Mago (figura bíblica)"
  ],
  "simón": [
    "Simón Bolívar (libertador venezolano)",
    "Simon & Garfunkel (dúo musical)",
    "San Simón (apóstol de Jesús)"
  ],
  "rafa": [
    "Rafa Nadal (tenista español)",
    "Rafa Benítez (entrenador español)",
    "Rafa Martínez (baloncestista español)"
  ],
  "pablo3": [
    "Pablo Picasso (pintor)",
    "Pablo Neruda (poeta)",
    "San Pablo (apóstol)"
  ],
  "guillem": [
    "Guillem Balague (periodista español)",
    "Guillem Agulló (activista valenciano)",
    "Guillem (forma catalana de Guillermo)"
  ],
  "guillermo": [
    "Guillermo de Orange (rey inglés)",
    "Guillermo del Toro (director mexicano)",
    "Guillermo Tell (héroe suizo)"
  ],
  "jaume": [
    "Jaume I El Conquistador (rey aragonés)",
    "Jaume Matas (político español)",
    "Jaume (forma catalana de Jaime)"
  ],
  "enric": [
    "Enric Granados (compositor español)",
    "Enric Prat de la Riba (político catalán)",
    "Enric (forma catalana de Enrique)"
  ],
  "enrique": [
    "Enrique VIII (rey de Inglaterra)",
    "Enrique Iglesias (cantante español)",
    "Enrique Granados (compositor español)"
  ],
  "joan": [
    "Joan Miró (pintor español)",
    "Joan Manuel Serrat (cantante español)",
    "Joan de Arc (heroína francesa)"
  ],
  "jordi": [
    "Jordi Pujol (político catalán)",
    "Jordi Évole (periodista español)",
    "San Jorge (santo patrón de Cataluña)"
  ],
  "pau2": [
    "Pau Gasol (baloncestista español)",
    "Pau Donés (músico español)",
    "Marc Pau (ciclista español)"
  ],
  "arnau": [
    "Arnau de Vilanova (médico medieval)",
    "Arnau Dalmau (político catalán)",
    "Arnau (nombre catalán de origen germánico)"
  ],
  "biel": [
    "Biel Bosch (músico español)",
    "Biel (forma catalana de Gabriel)",
    "Biel Sanmartín (actor catalán)"
  ],
  "bernat": [
    "Bernat Metge (humanista catalán)",
    "Bernat (forma catalana de Bernardo)",
    "San Bernardo de Claraval (santo francés)"
  ],
  "ferran": [
    "Ferran Adrià (chef español)",
    "Ferran Soriano (ejecutivo catalán)",
    "Ferran (forma catalana de Fernando)"
  ],
  "oriol": [
    "Oriol Bohigas (arquitecto catalán)",
    "Oriol Junqueras (político catalán)",
    "Oriol (nombre catalán de origen latino)"
  ],
  "pol": [
    "Pol Pot (dictador camboyano)",
    "Pol (forma catalana de Pablo)",
    "Pol Espargaró (piloto español)"
  ],
  "xavier": [
    "Xavier Bardem (actor español)",
    "Xavier Solano (periodista español)",
    "San Francisco Javier (misionero español)"
  ],
  "ricard": [
    "Ricard Moragas (diseñador catalán)",
    "Ricard (forma catalana de Ricardo)",
    "Ricardo I Corazón de León (rey inglés)"
  ],
  "lluís": [
    "Lluís Companys (político catalán)",
    "Lluís Llach (cantante catalán)",
    "Lluís (forma catalana de Luis)"
  ],
  "lluis": [
    "Lluís Companys (político catalán)",
    "Lluís Llach (cantante catalán)",
    "Luis XIV (rey de Francia)"
  ],
  "montserrat": [
    "Montserrat Caballé (soprano española)",
    "Montserrat Roig (escritora catalana)",
    "Virgen de Montserrat (patrona de Cataluña)"
  ],
  "núria": [
    "Núria Espert (actriz española)",
    "Núria Feliu (cantante catalana)",
    "Virgen de Núria (santuario catalán)"
  ],
  "mercè": [
    "Mercè Rodoreda (escritora catalana)",
    "Mercè (forma catalana de Mercedes)",
    "La Mercè (festividad barcelonesa)"
  ],
  "merce": [
    "Mercè Rodoreda (escritora catalana)",
    "Merce Cunningham (coreógrafo estadounidense)",
    "Mercè Sala (política española)"
  ],
  "dolors": [
    "Dolors Monserdà (escritora catalana)",
    "Dolors (forma catalana de Dolores)",
    "María de los Dolores (advocación mariana)"
  ],
  "anna": [
    "Anna Karenina (personaje de Tolstói)",
    "Anna Pavlova (bailarina rusa)",
    "Anna Frank (escritora holandesa)"
  ],
  "marc2": [
    "Marc Márquez (piloto español)",
    "Marc Chagall (pintor ruso-francés)",
    "Marc Anthony (cantante estadounidense)"
  ],
  "alejandra": [
    "Alejandra de Rusia (emperatriz)",
    "Alejandra Pizarnik (poetisa argentina)",
    "Alejandra (personaje histórico)"
  ],
  "valeria": [
    "Valeria Mazza (modelo argentina)",
    "Valeria Golino (actriz italiana)",
    "Valeria (nombre de origen romano)"
  ],
  "daniela": [
    "Daniela Chávez (modelo chilena)",
    "Daniela Mercury (cantante brasileña)",
    "Daniela Romo (cantante mexicana)"
  ],
  "camila": [
    "Camila Cabello (cantante cubana)",
    "Camila (personaje mitológico romano)",
    "Camila de Cornualles (princesa británica)"
  ],
  "renata": [
    "Renata Litvinova (actriz rusa)",
    "Renata Scotto (soprano italiana)",
    "Renata Flores (cantante peruana)"
  ],
  "florencia": [
    "Florencia Nightingale (enfermera británica)",
    "Florencia (ciudad italiana)",
    "Florencia Lozano (actriz colombiana)"
  ],
  "agustina": [
    "Agustina de Aragón (heroína española)",
    "Agustina Bazterrica (escritora argentina)",
    "Agustina Palma (actriz argentina)"
  ],
  "catalina": [
    "Catalina de Aragón (reina de Inglaterra)",
    "Catalina la Grande (emperatriz rusa)",
    "Catalina de Siena (santa italiana)"
  ],
  "isabel": [
    "Isabel I de Castilla (reina de España)",
    "Isabel II (reina del Reino Unido)",
    "Isabel Preysler (modelo filipina)"
  ],
  "consuelo": [
    "Consuelo Velázquez (compositora mexicana)",
    "Consuelo de Saint-Exupéry (escritora salvadoreña)",
    "Consuelo Berlanga (política española)"
  ],
  "amparo": [
    "Amparo Muñoz (actriz española)",
    "Amparo Rivelles (actriz española)",
    "Amparo (advocación mariana)"
  ],
  "remedios": [
    "Remedios Varo (pintora española)",
    "Remedios Amaya (cantante española)",
    "Nuestra Señora de los Remedios"
  ],
  "asuncion": [
    "Asunción (capital de Paraguay)",
    "Nuestra Señora de la Asunción (advocación mariana)",
    "Asunción (festividad católica del 15 de agosto)"
  ],
  "asunción": [
    "Nuestra Señora de la Asunción (advocación mariana)",
    "Asunción (capital de Paraguay)",
    "Asunción Balaguer (actriz española)"
  ],
  "encarnacion": [
    "Encarnación (advocación mariana)",
    "Encarnación Moya (política española)",
    "Encarnación Salgado (política española)"
  ],
  "encarnación": [
    "Encarnación Moya (política española)",
    "Encarnación (advocación mariana)",
    "Encarnación López Júlvez (bailaora española)"
  ],
  "concepcion": [
    "María Inmaculada Concepción (advocación mariana)",
    "Concepción Gimeno de Flaquer (escritora española)",
    "Concepción Arenal (socióloga española)"
  ],
  "concepción": [
    "Concepción Arenal (socióloga española)",
    "María Inmaculada Concepción (advocación mariana)",
    "Concepción Gimeno de Flaquer (escritora española)"
  ],
  "soledad": [
    "Soledad Acosta de Samper (escritora colombiana)",
    "Soledad Bravo (cantante venezolana)",
    "Nuestra Señora de la Soledad"
  ],
  "trinidad": [
    "Trinidad (concepto teológico cristiano)",
    "Trinidad Jiménez (política española)",
    "Trinidad Silva (actor español)"
  ],
  "nieves": [
    "Nuestra Señora de las Nieves (advocación mariana)",
    "Nieves Álvarez (modelo española)",
    "Nieves Herrero (periodista española)"
  ],
  "felicidad": [
    "Santa Felicidad (mártir romana)",
    "Felicidad (concepto filosófico)",
    "Felicidad Blanc (escritora española)"
  ],
  "esperanza": [
    "Esperanza Aguirre (política española)",
    "Esperanza Roy (actriz española)",
    "Esperanza (virtud cristiana)"
  ],
  "milagros": [
    "Milagros de la Torre (artista peruana)",
    "Milagros Fernández Marín (política española)",
    "Nuestra Señora de los Milagros"
  ],
  "paz": [
    "Paz Vega (actriz española)",
    "Paz (virtud cristiana)",
    "Paz Errázuriz (fotógrafa chilena)"
  ],
  "rosario": [
    "Rosario Flores (cantante española)",
    "Nuestra Señora del Rosario (advocación mariana)",
    "Rosario Dawson (actriz estadounidense)"
  ],
  "natividad": [
    "Natividad (festividad cristiana)",
    "Natividad Yarza (política española)",
    "Natividad de Jesús (advocación mariana)"
  ],
  "inmaculada": [
    "Inmaculada Concepción (advocación mariana)",
    "Inmaculada Fuentes (política española)",
    "Inmaculada (virtud mariana)"
  ],
  "purificacion": [
    "Purificación (advocación mariana)",
    "Purificación García (diseñadora española)",
    "La Candelaria (celebración de la Purificación)"
  ],
  "purificación": [
    "Purificación García (diseñadora española)",
    "La Candelaria (celebración cristiana)",
    "Purificación (advocación mariana)"
  ],
  "visitacion": [
    "La Visitación (misterio bíblico)",
    "Visitación Álvarez Otero (política española)",
    "Visitación (festividad mariana)"
  ],
  "presentacion": [
    "La Presentación de Jesús en el Templo (festividad)",
    "Presentación Urteaga (política vasca)",
    "Presentación (advocación mariana)"
  ],
  "encarna": [
    "Encarna Paso (actriz española)",
    "Encarna Salgado (política española)",
    "Encarna (forma coloquial de Encarnación)"
  ],
  "petra": [
    "Santa Petra (mártir romana)",
    "Petra (ciudad antigua de Jordania)",
    "Petra (cantante española)"
  ],
  "gertrudis": [
    "Santa Gertrudis la Magna (mística alemana)",
    "Gertrudis Gómez de Avellaneda (escritora cubana)",
    "Gertrudis de Hefta (santa)"
  ],
  "eulalia": [
    "Santa Eulalia de Mérida (mártir española)",
    "Santa Eulalia de Barcelona (mártir)",
    "Eulalia (nombre de origen griego)"
  ],
  "genoveva": [
    "Santa Genoveva (patrona de París)",
    "Genoveva de Brabante (leyenda medieval)",
    "Genoveva Casanova (modelo española)"
  ],
  "hildegarda": [
    "Hildegarda de Bingen (mística alemana)",
    "Hildegarda (nombre de origen germánico)",
    "Santa Hildegarda (doctora de la Iglesia)"
  ],
  "hortensia": [
    "Hortensia de Beauharnais (reina de Holanda)",
    "Hortensia (nombre de origen latino)",
    "Hortensia Bussi (esposa de Allende)"
  ],
  "leocadia": [
    "Santa Leocadia (mártir de Toledo)",
    "Leocadia Alba (actriz española)",
    "Leocadia Zorilla de San Martín (escritora uruguaya)"
  ],
  "albano": [
    "San Albano (primer mártir británico)",
    "Albano (cantante italiano)",
    "Albano (nombre de origen latino)"
  ],
  "alfredo": [
    "Alfredo di Stéfano (futbolista argentino)",
    "Alfredo Kraus (tenor español)",
    "Alfredo Hitchcock (director británico)"
  ],
  "amador": [
    "San Amador (obispo de Auxerre)",
    "Amador de los Ríos (historiador español)",
    "Amador (nombre de origen latino)"
  ],
  "amancio": [
    "Amancio Ortega (empresario español)",
    "Amancio Prada (cantante español)",
    "Amancio (nombre de origen latino)"
  ],
  "ambrosio": [
    "San Ambrosio (doctor de la Iglesia)",
    "Ambrosio Bierce (escritor estadounidense)",
    "Ambrosio O'Higgins (militar irlandés-español)"
  ],
  "anselmo": [
    "San Anselmo de Canterbury (filósofo medieval)",
    "Anselmo López (músico español)",
    "Anselmo (nombre de origen germánico)"
  ],
  "anunciacion": [
    "La Anunciación (misterio bíblico)",
    "Anunciación Martínez (política española)",
    "La Anunciación (advocación mariana)"
  ],
  "aquilino": [
    "San Aquilino (mártir romano)",
    "Aquilino Duque (escritor español)",
    "Aquilino (nombre de origen latino)"
  ],
  "arcadio": [
    "San Arcadio (mártir africano)",
    "Arcadio (nombre de origen griego)",
    "Arcadio García Sbell (pintor español)"
  ],
  "arsenio": [
    "Arsenio Hall (presentador estadounidense)",
    "Arsenio Iglesias (entrenador español)",
    "San Arsenio el Grande (monje egipcio)"
  ],
  "asterio": [
    "San Asterio (obispo de Amasia)",
    "Asterio (nombre de origen griego)",
    "Asterio (personaje de la mitología griega)"
  ],
  "atanasio": [
    "San Atanasio de Alejandría (padre de la Iglesia)",
    "Atanasio Kircher (jesuita alemán)",
    "Atanasio (nombre de origen griego)"
  ],
  "baudilio": [
    "San Baudilio (mártir de Nîmes)",
    "Baudilio (nombre de origen germánico)",
    "San Baudilio de Llobregat (pueblo catalán)"
  ],
  "benedicto": [
    "San Benedicto de Nursia (fundador benedictinos)",
    "Benedicto XVI (papa alemán)",
    "Benedicto (nombre de origen latino)"
  ],
  "benito": [
    "Benito Pérez Galdós (escritor español)",
    "Benito Mussolini (político italiano)",
    "San Benito de Nursia (fundador benedictinos)"
  ],
  "bernardino": [
    "San Bernardino de Siena (fraile italiano)",
    "Bernardino de Sahagún (misionero español)",
    "Bernardino (nombre de origen germánico)"
  ],
  "bernardo": [
    "San Bernardo de Claraval (místico francés)",
    "Bernardo O'Higgins (libertador chileno)",
    "Bernardo Bertolucci (director italiano)"
  ],
  "blas": [
    "San Blas (obispo mártir)",
    "Blas de Lezo (marino español)",
    "Blas Infante (político español)"
  ],
  "bonifacio": [
    "San Bonifacio (apóstol de Germania)",
    "Bonifacio (Papa del siglo XII)",
    "Bonifacio (nombre de origen latino)"
  ],
  "cayetano": [
    "San Cayetano (fundador teatinos)",
    "Cayetano Martínez de Irujo (aristócrata español)",
    "Cayetano Rivera Ordóñez (torero español)"
  ],
  "celestino": [
    "San Celestino V (papa ermitaño)",
    "Celestino (nombre de origen latino)",
    "Celestino Mutis (botánico español-colombiano)"
  ],
  "celedonio": [
    "San Celedonio (mártir español)",
    "Celedonio (nombre de origen latino)",
    "San Celedonio de Calahorra (mártir)"
  ],
  "ciriaco": [
    "San Ciriaco (mártir romano)",
    "Ciriaco (nombre de origen griego)",
    "San Ciriaco de Cartago (mártir)"
  ],
  "cipriano": [
    "San Cipriano de Cartago (obispo mártir)",
    "Cipriano de Valera (reformador español)",
    "Cipriano (nombre de origen latino)"
  ],
  "cirilo": [
    "San Cirilo (misionero eslavo, creador del alfabeto cirílico)",
    "Cirilo (nombre de origen griego)",
    "Cirilo de Alejandría (padre de la Iglesia)"
  ],
  "ciro": [
    "Ciro el Grande (rey persa)",
    "Ciro Ferrante (actor italiano)",
    "Ciro (nombre de origen persa)"
  ],
  "claudio": [
    "Claudio (emperador romano)",
    "Claudio Monteverdi (compositor italiano)",
    "Claudio Abbado (director de orquesta italiano)"
  ],
  "clemente": [
    "San Clemente (papa mártir)",
    "Clemente VII (papa durante el Saco de Roma)",
    "Clemente de Alejandría (padre de la Iglesia)"
  ],
  "cornelio": [
    "San Cornelio (papa mártir)",
    "Cornelio Escipión (general romano)",
    "Cornelio (nombre de origen latino)"
  ],
  "cosme": [
    "San Cosme (médico mártir)",
    "Cosme de Médici (mecenas florentino)",
    "Cosme (nombre de origen griego)"
  ],
  "cristóbal": [
    "Cristóbal Colón (navegante genovés)",
    "San Cristóbal (santo patrón de los viajeros)",
    "Cristóbal Balenciaga (diseñador vasco)"
  ],
  "damian": [
    "San Damián (médico mártir)",
    "Damián (nombre de origen griego)",
    "Damián Alcázar (actor mexicano)"
  ],
  "damián": [
    "San Damián (médico mártir)",
    "Damián Alcázar (actor mexicano)",
    "Damián (nombre de origen griego)"
  ],
  "dario": [
    "Darío I el Grande (rey persa)",
    "Rubén Darío (poeta nicaragüense)",
    "Darío Fo (dramaturgo italiano)"
  ],
  "darío": [
    "Darío I el Grande (rey persa)",
    "Rubén Darío (poeta nicaragüense)",
    "Darío Fo (dramaturgo italiano)"
  ],
  "demetrio": [
    "San Demetrio (mártir de Tesalónica)",
    "Demetrio (nombre de origen griego)",
    "Demetrio Stratos (músico griego-italiano)"
  ],
  "dionisio": [
    "Dioniso (dios griego del vino)",
    "San Dionisio el Areopagita (filósofo)",
    "Dionisio Areopagita (padre de la Iglesia)"
  ],
  "domingo": [
    "Santo Domingo de Guzmán (fundador dominicos)",
    "Domingo Faustino Sarmiento (político argentino)",
    "Plácido Domingo (tenor español)"
  ],
  "doroteo": [
    "San Doroteo (mártir romano)",
    "Doroteo Arango 'Pancho Villa' (revolucionario mexicano)",
    "Doroteo (nombre de origen griego)"
  ],
  "edmundo": [
    "Edmundo Dantés (personaje de Dumas)",
    "Edmund Hillary (montañista neozelandés)",
    "Edmundo (nombre de origen anglosajón)"
  ],
  "edgardo": [
    "Edgardo Allan Poe (escritor estadounidense)",
    "Edgardo Bauza (entrenador argentino)",
    "Edgardo (nombre de origen anglosajón)"
  ],
  "eladio": [
    "San Eladio (obispo de Toledo)",
    "Eladio Dieste (ingeniero uruguayo)",
    "Eladio (nombre de origen griego)"
  ],
  "elías": [
    "Elías (profeta bíblico)",
    "Elías Canetti (escritor búlgaro)",
    "Elías (nombre de origen hebreo)"
  ],
  "elias": [
    "Elías (profeta bíblico)",
    "Elias Canetti (escritor búlgaro-británico)",
    "Elías Ahuja (empresario español)"
  ],
  "eliseo": [
    "Eliseo (profeta bíblico)",
    "Eliseo Reclus (geógrafo francés)",
    "Eliseo (nombre de origen hebreo)"
  ],
  "emilio": [
    "Emilio Salgari (escritor italiano)",
    "Emilio Pettoruti (pintor argentino)",
    "Emilio Fede (periodista italiano)"
  ],
  "esteban": [
    "San Esteban (primer mártir cristiano)",
    "Esteban Granero (futbolista español)",
    "Esteban de la Fuente (político español)"
  ],
  "eusebio": [
    "Eusebio de Cesarea (historiador cristiano)",
    "Eusebio (futbolista portugués)",
    "San Eusebio de Vercelli (obispo)"
  ],
  "ezequiel": [
    "Ezequiel (profeta bíblico)",
    "Ezequiel Garay (futbolista argentino)",
    "Ezequiel Lavezzi (futbolista argentino)"
  ],
  "fabio": [
    "Fabio Capello (entrenador italiano)",
    "Fabio Lanzoni (modelo italiano)",
    "Quinto Fabio Máximo (dictador romano)"
  ],
  "fabian": [
    "San Fabián (papa mártir)",
    "Fabián Esperon (compositor mexicano)",
    "Fabián García (político español)"
  ],
  "fabián": [
    "San Fabián (papa mártir)",
    "Fabián Esperon (compositor mexicano)",
    "Fabián García (político español)"
  ],
  "fausto": [
    "Fausto (personaje de Goethe)",
    "Fausto Coppi (ciclista italiano)",
    "San Fausto (mártir romano)"
  ],
  "félix": [
    "San Félix de Nola (mártir)",
    "Félix Rodríguez de la Fuente (naturalista español)",
    "Félix de Azúa (escritor español)"
  ],
  "felix": [
    "San Félix de Nola (mártir)",
    "Félix Rodríguez de la Fuente (naturalista español)",
    "Félix Hernández (beisbolista venezolano)"
  ],
  "fidel": [
    "Fidel Castro (político cubano)",
    "San Fidel de Sigmaringa (mártir)",
    "Fidel (nombre de origen latino)"
  ],
  "florencio": [
    "Florencio Sánchez (dramaturgo uruguayo)",
    "Florencio (nombre de origen latino)",
    "San Florencio (mártir)"
  ],
  "flavio": [
    "Flavio Josefo (historiador judío-romano)",
    "Flavio Briatore (empresario italiano)",
    "Flavio (nombre de origen romano)"
  ],
  "fulgencio": [
    "San Fulgencio de Ruspe (obispo africano)",
    "Fulgencio Batista (político cubano)",
    "Fulgencio (nombre de origen latino)"
  ],
  "genaro": [
    "San Jenaro (mártir de Nápoles)",
    "Genaro García Luna (político mexicano)",
    "Genaro (nombre de origen latino)"
  ],
  "gerardo": [
    "Gerard Depardieu (actor francés)",
    "Gerardo Diego (poeta español)",
    "Gerardo (nombre de origen germánico)"
  ],
  "germán": [
    "Saint-Germain (santo patrón de París)",
    "Germán Cano (futbolista argentino)",
    "Germán Sánchez (portera español)"
  ],
  "german": [
    "Saint-Germain (santo patrón de París)",
    "Germán Cano (futbolista argentino)",
    "Germán (nombre de origen latino)"
  ],
  "gines": [
    "San Ginés (mártir romano)",
    "Ginés de Sepúlveda (humanista español)",
    "Ginés Liébana (pintor español)"
  ],
  "ginés": [
    "San Ginés (mártir romano)",
    "Ginés de Sepúlveda (humanista español)",
    "Ginés García Millán (actor español)"
  ],
  "gregorio": [
    "San Gregorio Magno (papa y doctor de la Iglesia)",
    "Gregorio Marañón (médico español)",
    "Gregorio Samsa (personaje de Kafka)"
  ],
  "heliodoro": [
    "San Heliodoro (obispo mártir)",
    "Heliodoro (escritor griego antiguo)",
    "Heliodoro (nombre de origen griego)"
  ],
  "heraclio": [
    "Heraclio I (emperador bizantino)",
    "Heraclio (nombre de origen griego)",
    "Heraclio Fournier (empresario español)"
  ],
  "hermenegildo": [
    "San Hermenegildo (príncipe mártir visigodo)",
    "Hermenegildo (nombre de origen germánico)",
    "Hermenegildo Anglada Camarasa (pintor español)"
  ],
  "hilario": [
    "San Hilario de Poitiers (doctor de la Iglesia)",
    "Hilario (nombre de origen latino)",
    "Papa Hilario (papa del siglo V)"
  ],
  "hipólito": [
    "San Hipólito (mártir romano)",
    "Hipólito (personaje de la mitología griega)",
    "Hipólito Yrigoyen (político argentino)"
  ],
  "honorio": [
    "Honorio (emperador romano de Occidente)",
    "Papa Honorio I (papa)",
    "Honorio (nombre de origen latino)"
  ],
  "horacio": [
    "Horacio (poeta latino)",
    "Horacio Nelson (almirante británico)",
    "Horacio Quiroga (escritor uruguayo)"
  ],
  "isidoro": [
    "San Isidoro de Sevilla (doctor de la Iglesia)",
    "Isidoro (nombre de origen griego)",
    "Isidoro Maiztegui (compositor argentino)"
  ],
  "isidro": [
    "San Isidro Labrador (patrón de Madrid)",
    "Isidre Nonell (pintor catalán)",
    "Isidro (nombre de origen griego)"
  ],
  "jacinto": [
    "San Jacinto (dominico polaco)",
    "Jacinto Benavente (dramaturgo español)",
    "Jacinto (nombre de origen griego)"
  ],
  "jeronimo": [
    "San Jerónimo (padre de la Iglesia)",
    "Jerónimo (cacique apache)",
    "Jerónimo de Ayanz (inventor español)"
  ],
  "jerónimo": [
    "San Jerónimo (padre de la Iglesia)",
    "Jerónimo (cacique apache)",
    "Jerónimo de Ayanz (inventor español)"
  ],
  "jesus": [
    "Jesucristo (figura religiosa central del cristianismo)",
    "Jesús Gil (político español)",
    "Jesús Navas (futbolista español)"
  ],
  "jesús": [
    "Jesucristo (figura religiosa central del cristianismo)",
    "Jesús Gil (político español)",
    "Jesús Navas (futbolista español)"
  ],
  "joaquin": [
    "Joaquin Phoenix (actor estadounidense)",
    "San Joaquín (padre de la Virgen María)",
    "Joaquín Sorolla (pintor español)"
  ],
  "joaquín": [
    "Joaquín Phoenix (actor estadounidense)",
    "San Joaquín (padre de la Virgen María)",
    "Joaquín Sorolla (pintor español)"
  ],
  "jonas": [
    "Jonás (profeta bíblico)",
    "Jonas Brothers (grupo musical)",
    "Jonas Salk (científico estadounidense)"
  ],
  "jonás": [
    "Jonás (profeta bíblico)",
    "Jonas Brothers (grupo musical)",
    "Jonas Salk (creador de la vacuna antipolio)"
  ],
  "jose2": [
    "San José (padre adoptivo de Jesús)",
    "José Carreras (tenor español)",
    "José Saramago (escritor portugués)"
  ],
  "julian": [
    "Julián el Apóstata (emperador romano)",
    "Julian Assange (periodista australiano)",
    "Julián Besteiro (político español)"
  ],
  "julián": [
    "Julián el Apóstata (emperador romano)",
    "San Julián (mártir cristiano)",
    "Julián Besteiro (político español)"
  ],
  "justo": [
    "San Justo (mártir de Alcalá)",
    "Justo de Jorge (político español)",
    "Justo Sierra (intelectual mexicano)"
  ],
  "ladislao": [
    "Ladislao I de Hungría (rey santo)",
    "Ladislao Kubala (futbolista húngaro-español)",
    "Ladislao (nombre de origen eslavo)"
  ],
  "lamberto": [
    "San Lamberto (obispo mártir de Lieja)",
    "Lamberto (nombre de origen germánico)",
    "Lamberto Maggiorani (actor italiano)"
  ],
  "laureano": [
    "San Laureano (obispo mártir de Sevilla)",
    "Laureano Gómez (político colombiano)",
    "Laureano López Rodó (político español)"
  ],
  "lázaro": [
    "Lázaro (personaje bíblico resucitado por Jesús)",
    "Lázaro Cárdenas (presidente mexicano)",
    "Lázaro de Tormes (personaje literario)"
  ],
  "lazaro": [
    "Lázaro (personaje bíblico)",
    "Lázaro Cárdenas (presidente mexicano)",
    "Lázaro de Tormes (personaje del Lazarillo)"
  ],
  "leandro": [
    "San Leandro de Sevilla (obispo)",
    "Leandro Proust (cocinero francés)",
    "Leandro (personaje mitológico griego)"
  ],
  "leon": [
    "León I el Grande (papa)",
    "León Tolstói (escritor ruso)",
    "León Trotsky (político ruso)"
  ],
  "leoncio": [
    "San Leoncio (mártir romano)",
    "Leoncio (nombre de origen latino)",
    "Leoncio Vega (militar español)"
  ],
  "leonidas": [
    "Leónidas I (rey espartano)",
    "Leonidas Santos (futbolista brasileño)",
    "Leonidas (nombre de origen griego)"
  ],
  "leopardo": [
    "San Leopardo (mártir romano)",
    "Leopardo (animal mamífero)",
    "Leopardo (nombre poco común)"
  ],
  "leopoldo": [
    "Leopoldo Alas 'Clarín' (escritor español)",
    "Leopoldo Calvo-Sotelo (político español)",
    "Leopoldo II de Bélgica (rey)"
  ],
  "lorenzo": [
    "San Lorenzo (mártir romano)",
    "Lorenzo de Médici el Magnífico (mecenas florentino)",
    "Lorenzo Lamas (actor estadounidense)"
  ],
  "lucas3": [
    "San Lucas (evangelista)",
    "Lucas Vázquez (futbolista español)",
    "George Lucas (director estadounidense)"
  ],
  "lucio": [
    "Lucio Anneo Séneca (filósofo romano)",
    "Lucio Battisti (cantante italiano)",
    "San Lucio (papa mártir)"
  ],
  "macario": [
    "San Macario de Alejandría (monje del desierto)",
    "Macario (nombre de origen griego)",
    "Macario (personaje de obras de teatro)"
  ],
  "magdalena": [
    "María Magdalena (santa bíblica)",
    "Magdalena de Medici (aristócrata italiana)",
    "Magdalena Álvarez (política española)"
  ],
  "marcelo": [
    "Marcelo Bielsa (entrenador argentino)",
    "Marcelo Vieira (futbolista brasileño)",
    "San Marcelo (papa mártir)"
  ],
  "marcelino": [
    "San Marcelino (papa mártir)",
    "Marcelino Menéndez Pelayo (intelectual español)",
    "Marcelino Sautu Uriburu (político argentino)"
  ],
  "marino": [
    "San Marino (fundador de la República de San Marino)",
    "Marino Marini (escultor italiano)",
    "Marino (nombre de origen latino)"
  ],
  "martin2": [
    "Martín Luther King (activista estadounidense)",
    "San Martín de Tours (santo)",
    "José de San Martín (libertador argentino)"
  ],
  "matías": [
    "San Matías (apóstol sucesor de Judas)",
    "Matías Fernández (futbolista chileno)",
    "Matías Prats (periodista español)"
  ],
  "matias": [
    "San Matías (apóstol)",
    "Matías Fernández (futbolista chileno)",
    "Matías Prats (periodista español)"
  ],
  "máximo": [
    "Máximo (nombre de origen latino)",
    "Máximo Kirchner (político argentino)",
    "Máximo Gómez (general cubano)"
  ],
  "maximo": [
    "Máximo Gómez (general cubano)",
    "Máximo Kirchner (político argentino)",
    "San Máximo (obispo de Turín)"
  ],
  "melchor": [
    "Melchor (uno de los Reyes Magos)",
    "Melchor de Jovellanos (ilustrado español)",
    "Melchor Ocampo (político mexicano)"
  ],
  "metodio": [
    "San Metodio (misionero eslavo, hermano de Cirilo)",
    "Metodio (nombre de origen griego)",
    "Metodio de Olimpo (mártir cristiano)"
  ],
  "modesto": [
    "San Modesto (mártir romano)",
    "Modesto Lafuente (historiador español)",
    "Modesto (nombre de origen latino)"
  ],
  "narciso": [
    "Narciso (personaje mitológico griego)",
    "Narcís Serra (político catalán)",
    "San Narciso (obispo de Gerona)"
  ],
  "nemesio": [
    "San Nemesio (mártir romano)",
    "Nemesio (nombre de origen griego)",
    "Nemesio García Naranjo (político mexicano)"
  ],
  "nicanor": [
    "Nicanor Parra (poeta chileno)",
    "San Nicanor (diácono de Jerusalén)",
    "Nicanor (nombre de origen griego)"
  ],
  "noel": [
    "Noel Coward (dramaturgo británico)",
    "Noel Gallagher (músico británico)",
    "Noel (nombre relacionado con la Navidad)"
  ],
  "norberto": [
    "San Norberto (fundador premonstratenses)",
    "Norberto Bobbio (filósofo italiano)",
    "Norberto Alonso (futbolista argentino)"
  ],
  "octavio": [
    "Octavio Paz (poeta mexicano)",
    "Octavio Augusto (primer emperador romano)",
    "Octavio (nombre de origen latino)"
  ],
  "olegario": [
    "San Olegario (obispo de Barcelona)",
    "Olegario (nombre de origen germánico)",
    "Olegario González de Cardedal (teólogo español)"
  ],
  "onofre": [
    "San Onofre (ermitaño del desierto)",
    "Onofre (nombre de origen germánico)",
    "Onofre Beuvron (personaje histórico)"
  ],
  "orestes": [
    "Orestes (personaje mitológico griego)",
    "Orestes Cendrero (geólogo español)",
    "Orestes (nombre de origen griego)"
  ],
  "osvaldo": [
    "Osvaldo (nombre de origen germánico)",
    "Osvaldo Ardiles (futbolista argentino)",
    "Osvaldo Golijov (compositor argentino)"
  ],
  "otilio": [
    "San Otilio (obispo fundador)",
    "Otilio Ulate (político costarricense)",
    "Otilio (nombre de origen germánico)"
  ],
  "pantaleón": [
    "San Pantaleón (médico mártir)",
    "Pantaleón (nombre de origen griego)",
    "Pantaleón Álvarez (político español)"
  ],
  "pascual": [
    "San Pascual Baylón (fraile español)",
    "Pascual Maragall (político catalán)",
    "Pascual (nombre de origen latino)"
  ],
  "patricio": [
    "San Patricio (patrón de Irlanda)",
    "Patricio Aylwin (presidente chileno)",
    "Patricio (nombre de origen latino)"
  ],
  "paulino": [
    "Paulino Uzcudun (boxeador español)",
    "San Paulino de Nola (obispo)",
    "Paulino (nombre de origen latino)"
  ],
  "pelayo": [
    "Pelayo (rey asturiano, inicio de la Reconquista)",
    "Pelayo (nombre de origen latino)",
    "Álvarez Pelayo (filósofo medieval)"
  ],
  "plácido": [
    "Plácido Domingo (tenor español)",
    "San Plácido (mártir benedictino)",
    "Plácido (nombre de origen latino)"
  ],
  "policarpo": [
    "San Policarpo de Esmirna (obispo mártir)",
    "Policarpo (nombre de origen griego)",
    "San Policarpo (discípulo de San Juan apóstol)"
  ],
  "poncio": [
    "Poncio Pilato (prefecto romano)",
    "Poncio de Aguirre (cronista español)",
    "Poncio (nombre de origen latino)"
  ],
  "primitivo": [
    "Primitivo (nombre de origen latino)",
    "Primitivo Rojas (periodista español)",
    "San Primitivo (mártir español)"
  ],
  "procopio": [
    "Procopio de Cesarea (historiador bizantino)",
    "San Procopio (mártir de Palestina)",
    "Procopio (nombre de origen griego)"
  ],
  "próspero": [
    "Próspero (personaje de La Tempestad de Shakespeare)",
    "San Próspero de Aquitania (teólogo)",
    "Próspero (nombre de origen latino)"
  ],
  "prudencio": [
    "Prudencio (poeta cristiano hispanorromano)",
    "San Prudencio (obispo de Tarazona)",
    "Prudencio de la Marca (escritor francés)"
  ],
  "quintín": [
    "San Quintín (mártir romano)",
    "Quintín Lame (activista colombiano)",
    "Quintín (nombre de origen latino)"
  ],
  "quinto": [
    "Quinto Fabio Máximo (dictador romano)",
    "Quinto (nombre de origen latino)",
    "Quinto Curcio Rufo (historiador romano)"
  ],
  "rafael2": [
    "Rafael Nadal (tenista español)",
    "Rafael (arcángel)",
    "Rafael Alberti (poeta español)"
  ],
  "raimundo": [
    "Raimundo Lulio (filósofo mallorquín)",
    "San Raimundo de Peñafort (canonista)",
    "Raimundo (nombre de origen germánico)"
  ],
  "reinaldo": [
    "Reinaldo (nombre de origen germánico)",
    "Reinaldo Guilizzoni (humorista español)",
    "Reinaldo Ángel García (deportista)"
  ],
  "renato": [
    "Renato Carosone (cantante italiano)",
    "Renato Zero (cantante italiano)",
    "Renato Descartes (filósofo y matemático)"
  ],
  "restituto": [
    "San Restituto (mártir romano)",
    "Restituto Valero (político español)",
    "Restituto (nombre de origen latino)"
  ],
  "ricardo": [
    "Ricardo III (rey de Inglaterra)",
    "Ricardo Corazón de León (rey cruzado)",
    "Ricardo Darín (actor argentino)"
  ],
  "roque": [
    "San Roque (patrón de los enfermos)",
    "Roque Sáenz Peña (presidente argentino)",
    "Roque (nombre de origen germánico)"
  ],
  "rosendo": [
    "San Rosendo (obispo gallego)",
    "Rosendo Mercado (músico español)",
    "Rosendo (nombre de origen germánico)"
  ],
  "ruperto": [
    "San Ruperto (obispo de Salzburgo)",
    "Ruperto Chapí (compositor español)",
    "Ruperto (nombre de origen germánico)"
  ],
  "salomon": [
    "Salomón (rey bíblico)",
    "Salomón Huerta (pintor mexicano)",
    "Salomón (símbolo de sabiduría)"
  ],
  "salomón": [
    "Salomón (rey bíblico de Israel)",
    "Salomón Huerta (pintor mexicano)",
    "Salomón (símbolo de sabiduría)"
  ],
  "saturnino": [
    "San Saturnino (primer obispo de Toulouse)",
    "Saturnino Herrán (pintor mexicano)",
    "Saturnino (nombre de origen latino)"
  ],
  "secundino": [
    "San Secundino (misionero irlandés)",
    "Secundino Zuazo (arquitecto español)",
    "Secundino (nombre de origen latino)"
  ],
  "serafín": [
    "San Serafín de Sarov (místico ruso)",
    "Serafín Álvarez Quintero (dramaturgo español)",
    "Serafín (figura celestial cristiana)"
  ],
  "serafin": [
    "San Serafín de Sarov (místico ruso)",
    "Serafín Álvarez Quintero (dramaturgo español)",
    "Serafín (figura celestial cristiana)"
  ],
  "silvano": [
    "San Silvano (mártir romano)",
    "Silvano Arieti (psiquiatra italiano)",
    "Silvano (nombre de origen latino)"
  ],
  "silverio": [
    "San Silverio (papa mártir)",
    "Silverio (nombre de origen latino)",
    "Silverio Franconetti (cantaor español)"
  ],
  "silvestre": [
    "San Silvestre I (papa)",
    "Silvestre Revueltas (compositor mexicano)",
    "Silvestre (nombre de origen latino)"
  ],
  "simeón": [
    "Simeón (patriarca bíblico)",
    "Simeón de Bulgaria (zar y primer ministro)",
    "Simeón el Estilita (asceta sirio)"
  ],
  "simplicio": [
    "San Simplicio (papa)",
    "Simplicio (filósofo griego)",
    "Simplicio (nombre de origen latino)"
  ],
  "sixto": [
    "Sixto IV (papa del Renacimiento)",
    "Sixto V (papa que reformó Roma)",
    "Sixto (nombre de origen latino)"
  ],
  "telesforo": [
    "San Telesforo (papa mártir)",
    "Telesforo (nombre de origen griego)",
    "Telesforo Nieto (político español)"
  ],
  "teodoro": [
    "Teodoro Roosvelt (presidente estadounidense)",
    "San Teodoro de Amasea (mártir)",
    "Teodoro (nombre de origen griego)"
  ],
  "teódulo": [
    "San Teódulo (mártir romano)",
    "Teódulo (nombre de origen griego)",
    "San Teódulo de Cesarea (mártir)"
  ],
  "timoteo": [
    "San Timoteo (discípulo de San Pablo)",
    "Timoteo (nombre de origen griego)",
    "Timoteo Leguía (político peruano)"
  ],
  "tito": [
    "Tito (emperador romano)",
    "Tito Livio (historiador romano)",
    "Tito Vilanova (entrenador español)"
  ],
  "tobias": [
    "Tobías (personaje bíblico)",
    "Tobías (nombre de origen hebreo)",
    "Tobias Wolf (escritor estadounidense)"
  ],
  "tobías": [
    "Tobías (personaje bíblico)",
    "Tobias Wolff (escritor estadounidense)",
    "Tobías (nombre de origen hebreo)"
  ],
  "toribio": [
    "San Toribio de Mogrovejo (arzobispo de Lima)",
    "Toribio Alfarache (personaje literario)",
    "Toribio (nombre de origen griego)"
  ],
  "urbano": [
    "Urbano VIII (papa del Barroco)",
    "San Urbano I (papa mártir)",
    "Urbano (nombre de origen latino)"
  ],
  "valentín": [
    "San Valentín (patrón de los enamorados)",
    "Valentín Fuster (cardiólogo español)",
    "Valentín González El Campesino (militar español)"
  ],
  "valentin": [
    "San Valentín (patrón de los enamorados)",
    "Valentín Fuster (cardiólogo español)",
    "Valentín Barenbrug (empresario holandés)"
  ],
  "valeriano": [
    "Valeriano I (emperador romano)",
    "Valeriano Bécquer (pintor español)",
    "Valeriano (nombre de origen latino)"
  ],
  "valerio": [
    "Valerio Máximo (escritor romano)",
    "Valerio Borghese (militar italiano)",
    "San Valerio (obispo de Zaragoza)"
  ],
  "venancio": [
    "San Venancio Fortunato (poeta)",
    "Venancio Arias (político español)",
    "Venancio (nombre de origen latino)"
  ],
  "venerando": [
    "San Venerando (mártir romano)",
    "Venerando (nombre de origen latino)",
    "Venerando (festividad católica)"
  ],
  "wenceslao": [
    "San Wenceslao (patrón de Bohemia)",
    "Wenceslao González Moreno (pintor español)",
    "Wenceslao (nombre de origen eslavo)"
  ],
  "zacarías": [
    "Zacarías (profeta bíblico)",
    "San Zacarías (papa)",
    "Zacarías Taylor (presidente estadounidense)"
  ],
  "zacarias": [
    "Zacarías (profeta bíblico)",
    "San Zacarías (papa)",
    "Zacarías (padre de San Juan Bautista)"
  ]
}
function getFamosos(slug: string, nameStr: string): string[] {
  if (FAMOSOS_BASE[slug]) return FAMOSOS_BASE[slug]
  const normalized = nameStr.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (FAMOSOS_BASE[normalized]) return FAMOSOS_BASE[normalized]
  // No mostrar nada si no hay famosos conocidos — mejor no tener que tener datos falsos
  return []
}


const CATEGORIES: Record<string, any> = {'nina': {'label': 'Nombres de niña', 'description': 'Los mejores nombres para tu bebé niña con significado y origen.', 'emoji': '👧', 'gender': 'f'}, 'nino': {'label': 'Nombres de niño', 'description': 'Los mejores nombres para tu bebé niño con significado y origen.', 'emoji': '👦', 'gender': 'm'}, 'espanoles': {'label': 'Nombres españoles', 'description': 'Nombres de bebé de origen español con mucha tradición.', 'emoji': '🇪🇸', 'origin': 'Español'}, 'vascos': {'label': 'Nombres vascos', 'description': 'Nombres vascos (euskera). Únicos y con mucha personalidad.', 'emoji': '🌊', 'origin': 'Euskera'}, 'franceses': {'label': 'Nombres franceses', 'description': 'Nombres franceses. Elegantes y muy de moda.', 'emoji': '🥖', 'origin': 'Francés'}, 'italianos': {'label': 'Nombres italianos', 'description': 'Nombres italianos. Con música e historia mediterránea.', 'emoji': '🍕', 'origin': 'Italiano'}, 'escandinavos': {'label': 'Nombres escandinavos', 'description': 'Nombres nórdicos y vikingos. Fuertes y muy en tendencia.', 'emoji': '🏔️', 'origin': 'Escandinavo'}, 'biblicos': {'label': 'Nombres bíblicos', 'description': 'Nombres bíblicos con significado espiritual profundo.', 'emoji': '✨', 'tag': 'bíblico'}, 'catalanes': {'label': 'Nombres catalanes', 'description': 'Nombres catalanes con fuerte identidad cultural.', 'emoji': '🌹', 'origin': 'Catalán'}, 'arabes': {'label': 'Nombres árabes', 'description': 'Nombres árabes. Exóticos y con significados especiales.', 'emoji': '🌙', 'origin': 'Árabe'}, 'griegos': {'label': 'Nombres griegos', 'description': 'Nombres griegos con historia mitológica.', 'emoji': '🏛️', 'origin': 'Griego'}, 'irlandeses': {'label': 'Nombres irlandeses', 'description': 'Nombres irlandeses y celtas. Únicos con mucha personalidad.', 'emoji': '☘️', 'origin': 'Irlandés'}, 'cortos': {'label': 'Nombres cortos para bebé', 'description': 'Nombres de 1 o 2 sílabas. Modernos y con mucho carácter.', 'emoji': '⚡'}}

function CategoryPage({ cat, slug }: { cat: any; slug: string }) {
  const [names, setNames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      let query = supabase.from('names').select('id,name,gender,origin').order('popularity', { ascending: false })
      if (cat.gender) query = (query as any).eq('gender', cat.gender)
      else if (cat.origin) query = (query as any).eq('origin', cat.origin)
      const { data } = await query
      let result = data || []
      if (cat.tag) result = result.filter((n: any) => (n.style_tags || []).includes(cat.tag))
      if (slug === 'cortos') result = result.filter((n: any) => n.syllables <= 2)
      setNames(result)
      setLoading(false)
    }
    load()
  }, [slug])

  const byLetter: Record<string, any[]> = {}
  names.forEach((n: any) => {
    const l = n.name[0].toUpperCase()
    if (!byLetter[l]) byLetter[l] = []
    byLetter[l].push(n)
  })
  const letters = Object.keys(byLetter).sort()

  return (
    <>
      <div style={{ background:'#fff', borderBottom:'1px solid #e8d8d4', padding:'12px 24px', fontSize:'0.85rem', color:'#999' }}>
        <div className="container"><a href="/" style={{color:'#999'}}>Inicio</a> / <a href="/nombres" style={{color:'#999'}}>Nombres</a> / <strong style={{color:'#3D1A1A'}}>{cat.label}</strong></div>
      </div>
      <section style={{ background:'linear-gradient(135deg,#FFF4F1 0%,#FDDCDC 100%)', padding:'60px 24px' }}>
        <div className="container" style={{ textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'16px' }}>{cat.emoji}</div>
          <h1 style={{ fontSize:'clamp(2rem,4vw,3rem)', fontWeight:900, color:'#3D1A1A', marginBottom:'16px' }}>{cat.label}</h1>
          <p style={{ fontSize:'1.1rem', color:'#666', maxWidth:'560px', margin:'0 auto 24px', lineHeight:1.7 }}>{cat.description}</p>
          {!loading && <div style={{ display:'inline-block', background:'rgba(139,32,32,0.08)', color:'#8B2020', padding:'6px 16px', borderRadius:'20px', fontSize:'0.9rem', fontWeight:600 }}>{names.length} nombres</div>}
        </div>
      </section>
      {loading ? (
        <div style={{ textAlign:'center', padding:'80px 24px', color:'#999' }}><div style={{ fontSize:'2rem', marginBottom:'16px' }}>🍼</div><p>Cargando nombres...</p></div>
      ) : (
        <>
          {letters.length > 0 && (
            <div style={{ background:'#fff', borderBottom:'1px solid #e8d8d4', padding:'12px 24px', position:'sticky', top:'64px', zIndex:50 }}>
              <div className="container" style={{ display:'flex', gap:'6px', flexWrap:'wrap', justifyContent:'center' }}>
                {letters.map(l => <a key={l} href={'#letra-'+l} style={{ display:'inline-block', width:'32px', height:'32px', lineHeight:'32px', textAlign:'center', borderRadius:'8px', fontSize:'0.85rem', fontWeight:700, color:'#8B2020', background:'#FFF4F1' }}>{l}</a>)}
              </div>
            </div>
          )}
          <div className="container" style={{ padding:'48px 24px' }}>
            {letters.map(letter => (
              <section key={letter} id={'letra-'+letter} style={{ marginBottom:'48px' }}>
                <h2 style={{ fontSize:'1.8rem', fontWeight:900, color:'#8B2020', borderBottom:'2px solid #FDDCDC', paddingBottom:'8px', marginBottom:'20px' }}>{letter}</h2>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'12px' }}>
                  {byLetter[letter].map((n: any) => (
                    <a key={n.id} href={'/nombres/'+nameToSlug(n.name)} className="card" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:'12px' }}>
                      <span className={'badge badge-'+n.gender} style={{ flexShrink:0, fontSize:'0.7rem' }}>{n.gender==='f'?'♀':n.gender==='m'?'♂':'⚥'}</span>
                      <div><div style={{ fontWeight:700, color:'#3D1A1A' }}>{n.name}</div><div style={{ fontSize:'0.75rem', color:'#999' }}>{n.origin}</div></div>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
      <section style={{ background:'linear-gradient(135deg,#3D1A1A 0%,#8B2020 100%)', padding:'60px 24px', textAlign:'center', color:'#fff' }}>
        <div className="container">
          <h2 style={{ fontSize:'1.8rem', fontWeight:800, marginBottom:'16px' }}>¿Te gustan estos nombres?</h2>
          <p style={{ opacity:0.85, marginBottom:'28px' }}>Prueba BabyMatch con tu pareja y descubrid en cuáles coincidís.</p>
          <a href="/app" className="btn" style={{ background:'#fff', color:'#8B2020', fontWeight:700 }}>Probar gratis →</a>
        </div>
      </section>
    </>
  )
}

function NamePage({ slug }: { slug: string }) {
  const [name, setName] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [sameLetter, setSameLetter] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: all } = await supabase.from('names').select('*')
      const found = (all||[]).find((n: any) => nameToSlug(n.name) === slug)
      if (found) {
        setName(found)
        setRelated((all||[]).filter((n: any) => n.id !== found.id && (n.gender === found.gender || n.origin === found.origin)).sort(()=>Math.random()-0.5).slice(0,8))
        setSameLetter((all||[]).filter((n: any) => n.id !== found.id && n.name[0].toLowerCase() === found.name[0].toLowerCase() && n.gender === found.gender).sort((a: any,b: any)=>b.popularity-a.popularity).slice(0,6))
      }
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <div style={{ textAlign:'center', padding:'80px 24px' }}><div style={{ fontSize:'3rem', marginBottom:'16px' }}>🍼</div><p style={{ color:'#999' }}>Cargando...</p></div>
  if (!name) return <div style={{ textAlign:'center', padding:'80px 24px' }}><h1 style={{ color:'#3D1A1A', marginBottom:'16px' }}>Nombre no encontrado</h1><a href="/nombres" className="btn btn-primary">Ver todos los nombres</a></div>

  const gender = genderLabel(name.gender)
  const genderEmoji = name.gender === 'f' ? '👧' : name.gender === 'm' ? '👦' : '👶'
  const famososList = getFamosos(slug, name?.name || slug)

  return (
    <>
      <div style={{ background:'#fff', borderBottom:'1px solid #e8d8d4', padding:'12px 24px', fontSize:'0.85rem', color:'#999' }}>
        <div className="container"><a href="/" style={{color:'#999'}}>Inicio</a> / <a href="/nombres" style={{color:'#999'}}>Nombres</a> / <strong style={{color:'#3D1A1A'}}>{name.name}</strong></div>
      </div>
      <section style={{ background:name.gender==='f'?'linear-gradient(135deg,#FFF4F1,#FDDCDC)':name.gender==='m'?'linear-gradient(135deg,#F1F4FF,#DCE4FD)':'linear-gradient(135deg,#F4FFF1,#DCFDDC)', padding:'60px 24px' }}>
        <div className="container" style={{ maxWidth:'760px' }}>
          <div style={{ marginBottom:'16px' }}><span className={'badge badge-'+name.gender} style={{ fontSize:'0.9rem', padding:'6px 16px' }}>{genderEmoji} Nombre de {gender.toLowerCase()}</span></div>
          <h1 style={{ fontSize:'clamp(3rem,8vw,5rem)', fontWeight:900, color:'#3D1A1A', marginBottom:'8px', letterSpacing:'-0.02em', lineHeight:1 }}>{name.name}</h1>
          <p style={{ fontSize:'1.1rem', color:'#666', marginBottom:'24px' }}>Origen: <strong style={{color:'#3D1A1A'}}>{name.origin}</strong> · {name.syllables} sílaba{name.syllables!==1?'s':''} · Popularidad: {popularityStars(name.popularity)}</p>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>{(name.style_tags||[]).map((tag: string) => <span key={tag} style={{ background:'rgba(139,32,32,0.08)', color:'#8B2020', padding:'4px 12px', borderRadius:'20px', fontSize:'0.8rem' }}>{tag}</span>)}</div>
        </div>
      </section>
      <div className="container" style={{ maxWidth:'760px', padding:'48px 24px' }}>
        <section style={{ marginBottom:'48px' }}>
          <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#3D1A1A', marginBottom:'16px' }}>¿Qué significa el nombre {name.name}?</h2>
          <p style={{ fontSize:'1.05rem', lineHeight:1.8, color:'#444' }}>{name.meaning}</p>
        </section>
        <section style={{ marginBottom:'48px' }}>
          <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#3D1A1A', marginBottom:'20px' }}>Datos del nombre {name.name}</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'16px' }}>
            {[{label:'Género',value:genderEmoji+' '+gender},{label:'Origen',value:name.origin},{label:'Sílabas',value:name.syllables+' sílaba'+(name.syllables!==1?'s':'')},{label:'Popularidad',value:popularityStars(name.popularity)}].map(item => (
              <div key={item.label} className="card" style={{ padding:'20px' }}>
                <div style={{ fontSize:'0.75rem', color:'#999', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{item.label}</div>
                <div style={{ fontSize:'1.05rem', fontWeight:700, color:'#3D1A1A' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </section>
        {famososList.length > 0 && (
          <section style={{ marginBottom:'48px' }}>
            <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#3D1A1A', marginBottom:'16px' }}>Personas famosas llamadas {name.name}</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {famososList.map((f: string, i: number) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'16px', padding:'16px 20px', background:'#FFF4F1', borderRadius:'12px', border:'1px solid #e8d8d4' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'linear-gradient(135deg,#8B2020,#C4830A)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'1rem', flexShrink:0 }}>{name.name[0]}</div>
                  <span style={{ color:'#3D1A1A', fontWeight:500 }}>{f}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        {sameLetter.length > 0 && (
          <section style={{ marginBottom:'48px' }}>
            <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#3D1A1A', marginBottom:'16px' }}>Otros nombres de {gender.toLowerCase()} que empiezan por {name.name[0].toUpperCase()}</h2>
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
              {sameLetter.map((n: any) => <a key={n.id} href={'/nombres/'+nameToSlug(n.name)} style={{ background:'#fff', border:'1px solid #e8d8d4', padding:'8px 18px', borderRadius:'20px', color:'#3D1A1A', fontWeight:600, fontSize:'0.9rem' }}>{n.name}</a>)}
            </div>
          </section>
        )}
        <section style={{ background:'linear-gradient(135deg,#3D1A1A,#8B2020)', borderRadius:'20px', padding:'36px 32px', color:'#fff', textAlign:'center', marginBottom:'48px' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'12px' }}>💑</div>
          <h2 style={{ fontSize:'1.4rem', fontWeight:800, marginBottom:'12px' }}>¿Le gustará {name.name} a tu pareja?</h2>
          <p style={{ opacity:0.85, marginBottom:'24px', lineHeight:1.6 }}>Usad BabyMatch para votar por separado. Si los dos le dais like a {name.name}, es un <strong>Match</strong>.</p>
          <a href="/app" className="btn" style={{ background:'#fff', color:'#8B2020', fontWeight:700 }}>Probar BabyMatch gratis →</a>
        </section>
        {related.length > 0 && (
          <section>
            <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#3D1A1A', marginBottom:'20px' }}>Nombres similares a {name.name}</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'12px' }}>
              {related.map((n: any) => (
                <a key={n.id} href={'/nombres/'+nameToSlug(n.name)} className="card" style={{ padding:'16px', textAlign:'center' }}>
                  <div style={{ marginBottom:'6px' }}><span className={'badge badge-'+n.gender} style={{ fontSize:'0.7rem' }}>{n.gender==='f'?'Niña':n.gender==='m'?'Niño':'Unisex'}</span></div>
                  <div style={{ fontWeight:700, color:'#3D1A1A', fontSize:'1.1rem' }}>{n.name}</div>
                  <div style={{ fontSize:'0.75rem', color:'#999', marginTop:'4px' }}>{n.origin}</div>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

export default function SlugPage() {
  const params = useParams()
  const slug = params.slug as string
  const cat = CATEGORIES[slug]
  if (cat) return <CategoryPage cat={cat} slug={slug} />
  return <NamePage slug={slug} />
}
