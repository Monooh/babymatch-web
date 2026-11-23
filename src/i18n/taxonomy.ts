import { LOCALES, type Locale } from './config'
import { type Culture, type Fame, type Tag, type Root, type Gender, type ListKey, parseListKey, slugify } from '@/lib/model'
import type { Dict } from './dict/en'

type Six = [string, string, string, string, string, string] // es, en, fr, de, it, pt
const at = (six: Six, l: Locale) => six[LOCALES.indexOf(l)]

// ── Cultures: [label for chips, plural adjective for titles] per language ──
// English and German derive the adjective from the label ("Basque", "Baskisch" → "baskische").
const CULTURE_LABEL: Record<Culture, Six> = {
  spanish: ['Español', 'Spanish', 'Espagnol', 'Spanisch', 'Spagnolo', 'Espanhol'],
  basque: ['Vasco', 'Basque', 'Basque', 'Baskisch', 'Basco', 'Basco'],
  catalan: ['Catalán', 'Catalan', 'Catalan', 'Katalanisch', 'Catalano', 'Catalão'],
  galician: ['Gallego', 'Galician', 'Galicien', 'Galicisch', 'Galiziano', 'Galego'],
  portuguese: ['Portugués', 'Portuguese', 'Portugais', 'Portugiesisch', 'Portoghese', 'Português'],
  french: ['Francés', 'French', 'Français', 'Französisch', 'Francese', 'Francês'],
  italian: ['Italiano', 'Italian', 'Italien', 'Italienisch', 'Italiano', 'Italiano'],
  german: ['Alemán', 'German', 'Allemand', 'Deutsch', 'Tedesco', 'Alemão'],
  english: ['Inglés', 'English', 'Anglais', 'Englisch', 'Inglese', 'Inglês'],
  irish: ['Irlandés', 'Irish', 'Irlandais', 'Irisch', 'Irlandese', 'Irlandês'],
  scottish: ['Escocés', 'Scottish', 'Écossais', 'Schottisch', 'Scozzese', 'Escocês'],
  welsh: ['Galés', 'Welsh', 'Gallois', 'Walisisch', 'Gallese', 'Galês'],
  scandinavian: ['Escandinavo', 'Scandinavian', 'Scandinave', 'Skandinavisch', 'Scandinavo', 'Escandinavo'],
  dutch: ['Holandés', 'Dutch', 'Néerlandais', 'Niederländisch', 'Olandese', 'Holandês'],
  russian: ['Eslavo', 'Slavic', 'Slave', 'Slawisch', 'Slavo', 'Eslavo'],
  polish: ['Polaco', 'Polish', 'Polonais', 'Polnisch', 'Polacco', 'Polonês'],
  greek: ['Griego', 'Greek', 'Grec', 'Griechisch', 'Greco', 'Grego'],
  hebrew: ['Hebreo', 'Hebrew', 'Hébreu', 'Hebräisch', 'Ebraico', 'Hebraico'],
  arabic: ['Árabe', 'Arabic', 'Arabe', 'Arabisch', 'Arabo', 'Árabe'],
  turkish: ['Turco', 'Turkish', 'Turc', 'Türkisch', 'Turco', 'Turco'],
  persian: ['Persa', 'Persian', 'Persan', 'Persisch', 'Persiano', 'Persa'],
  indian: ['Indio', 'Indian', 'Indien', 'Indisch', 'Indiano', 'Indiano'],
  japanese: ['Japonés', 'Japanese', 'Japonais', 'Japanisch', 'Giapponese', 'Japonês'],
  chinese: ['Chino', 'Chinese', 'Chinois', 'Chinesisch', 'Cinese', 'Chinês'],
  korean: ['Coreano', 'Korean', 'Coréen', 'Koreanisch', 'Coreano', 'Coreano'],
  african: ['Africano', 'African', 'Africain', 'Afrikanisch', 'Africano', 'Africano'],
  hawaiian: ['Hawaiano', 'Hawaiian', 'Hawaïen', 'Hawaiianisch', 'Hawaiano', 'Havaiano'],
  intl: ['Internacional', 'International', 'International', 'International', 'Internazionale', 'Internacional'],
}
// Plural adjectives where they cannot be derived: es, fr, it, pt.
const CULTURE_PLURAL: Record<Culture, [string, string, string, string]> = {
  spanish: ['españoles', 'espagnols', 'spagnoli', 'espanhóis'],
  basque: ['vascos', 'basques', 'baschi', 'bascos'],
  catalan: ['catalanes', 'catalans', 'catalani', 'catalães'],
  galician: ['gallegos', 'galiciens', 'galiziani', 'galegos'],
  portuguese: ['portugueses', 'portugais', 'portoghesi', 'portugueses'],
  french: ['franceses', 'français', 'francesi', 'franceses'],
  italian: ['italianos', 'italiens', 'italiani', 'italianos'],
  german: ['alemanes', 'allemands', 'tedeschi', 'alemães'],
  english: ['ingleses', 'anglais', 'inglesi', 'ingleses'],
  irish: ['irlandeses', 'irlandais', 'irlandesi', 'irlandeses'],
  scottish: ['escoceses', 'écossais', 'scozzesi', 'escoceses'],
  welsh: ['galeses', 'gallois', 'gallesi', 'galeses'],
  scandinavian: ['escandinavos', 'scandinaves', 'scandinavi', 'escandinavos'],
  dutch: ['holandeses', 'néerlandais', 'olandesi', 'holandeses'],
  russian: ['eslavos', 'slaves', 'slavi', 'eslavos'],
  polish: ['polacos', 'polonais', 'polacchi', 'poloneses'],
  greek: ['griegos', 'grecs', 'greci', 'gregos'],
  hebrew: ['hebreos', 'hébraïques', 'ebraici', 'hebraicos'],
  arabic: ['árabes', 'arabes', 'arabi', 'árabes'],
  turkish: ['turcos', 'turcs', 'turchi', 'turcos'],
  persian: ['persas', 'persans', 'persiani', 'persas'],
  indian: ['indios', 'indiens', 'indiani', 'indianos'],
  japanese: ['japoneses', 'japonais', 'giapponesi', 'japoneses'],
  chinese: ['chinos', 'chinois', 'cinesi', 'chineses'],
  korean: ['coreanos', 'coréens', 'coreani', 'coreanos'],
  african: ['africanos', 'africains', 'africani', 'africanos'],
  hawaiian: ['hawaianos', 'hawaïens', 'hawaiani', 'havaianos'],
  intl: ['internacionales', 'internationaux', 'internazionali', 'internacionais'],
}

// ── Tags: chip label + how the tag enters a title. "a:" adjective, "p:" phrase after the noun. ──
const TAG_LABEL: Record<Tag, Six> = {
  biblical: ['Bíblicos', 'Biblical', 'Bibliques', 'Biblisch', 'Biblici', 'Bíblicos'],
  saint: ['Santos', 'Saints', 'Saints', 'Heilige', 'Santi', 'Santos'],
  mythology: ['Mitológicos', 'Mythological', 'Mythologiques', 'Mythologisch', 'Mitologici', 'Mitológicos'],
  nature: ['Naturaleza', 'Nature', 'Nature', 'Natur', 'Natura', 'Natureza'],
  flower: ['Flores', 'Flowers', 'Fleurs', 'Blumen', 'Fiori', 'Flores'],
  celestial: ['Cielo y estrellas', 'Sky and stars', 'Ciel et étoiles', 'Himmel und Sterne', 'Cielo e stelle', 'Céu e estrelas'],
  sea: ['Mar', 'Sea', 'Mer', 'Meer', 'Mare', 'Mar'],
  royal: ['Realeza', 'Royal', 'Royaux', 'Königlich', 'Reali', 'Realeza'],
  literary: ['Literarios', 'Literary', 'Littéraires', 'Literarisch', 'Letterari', 'Literários'],
  classic: ['Clásicos', 'Classic', 'Classiques', 'Klassisch', 'Classici', 'Clássicos'],
  vintage: ['Antiguos', 'Vintage', 'Anciens', 'Altmodisch', 'Antichi', 'Antigos'],
  modern: ['Modernos', 'Modern', 'Modernes', 'Modern', 'Moderni', 'Modernos'],
  trendy: ['De moda', 'Trendy', 'Tendance', 'Angesagt', 'Di tendenza', 'Da moda'],
  strong: ['Fuertes', 'Strong', 'Forts', 'Stark', 'Forti', 'Fortes'],
  sweet: ['Dulces', 'Sweet', 'Doux', 'Süß', 'Dolci', 'Doces'],
  virtue: ['Virtudes', 'Virtues', 'Vertus', 'Tugenden', 'Virtù', 'Virtudes'],
  gem: ['Piedras preciosas', 'Gemstones', 'Pierres précieuses', 'Edelsteine', 'Pietre preziose', 'Pedras preciosas'],
  animal: ['Animales', 'Animals', 'Animaux', 'Tiere', 'Animali', 'Animais'],
  place: ['Lugares', 'Places', 'Lieux', 'Orte', 'Luoghi', 'Lugares'],
  warrior: ['Guerreros', 'Warriors', 'Guerriers', 'Krieger', 'Guerrieri', 'Guerreiros'],
  light: ['Luz', 'Light', 'Lumière', 'Licht', 'Luce', 'Luz'],
  love: ['Amor', 'Love', 'Amour', 'Liebe', 'Amore', 'Amor'],
  music: ['Musicales', 'Musical', 'Musicaux', 'Musikalisch', 'Musicali', 'Musicais'],
}
const TAG_MOD: Record<Tag, Six> = {
  biblical: ['a:bíblicos', 'a:Biblical', 'a:bibliques', 'a:Biblische', 'a:biblici', 'a:bíblicos'],
  saint: ['p:de santos', 'p:of saints', 'p:de saints', 'p:von Heiligen', 'p:di santi', 'p:de santos'],
  mythology: ['a:mitológicos', 'a:Mythological', 'a:mythologiques', 'a:Mythologische', 'a:mitologici', 'a:mitológicos'],
  nature: ['p:inspirados en la naturaleza', 'a:Nature', 'p:inspirés de la nature', 'p:aus der Natur', 'p:ispirati alla natura', 'p:inspirados na natureza'],
  flower: ['p:de flores', 'a:Flower', 'p:de fleurs', 'p:mit Blumenbedeutung', 'p:di fiori', 'p:de flores'],
  celestial: ['p:del cielo y las estrellas', 'a:Celestial', 'p:du ciel et des étoiles', 'p:von Himmel und Sternen', 'p:del cielo e delle stelle', 'p:do céu e das estrelas'],
  sea: ['p:del mar', 'a:Ocean', 'p:de la mer', 'p:vom Meer', 'p:del mare', 'p:do mar'],
  royal: ['p:de reyes y reinas', 'a:Royal', 'a:royaux', 'a:Königliche', 'a:reali', 'p:da realeza'],
  literary: ['a:literarios', 'a:Literary', 'a:littéraires', 'a:Literarische', 'a:letterari', 'a:literários'],
  classic: ['a:clásicos', 'a:Classic', 'a:classiques', 'a:Klassische', 'a:classici', 'a:clássicos'],
  vintage: ['a:antiguos', 'a:Vintage', 'a:anciens', 'a:Altmodische', 'a:antichi', 'a:antigos'],
  modern: ['a:modernos', 'a:Modern', 'a:modernes', 'a:Moderne', 'a:moderni', 'a:modernos'],
  trendy: ['p:de moda', 'a:Trendy', 'a:tendance', 'a:Angesagte', 'p:di tendenza', 'p:da moda'],
  strong: ['a:fuertes', 'a:Strong', 'a:forts', 'a:Starke', 'a:forti', 'a:fortes'],
  sweet: ['a:dulces', 'a:Sweet', 'a:doux', 'a:Süße', 'a:dolci', 'a:doces'],
  virtue: ['p:de virtudes', 'a:Virtue', 'p:de vertus', 'p:nach Tugenden', 'p:di virtù', 'p:de virtudes'],
  gem: ['p:de piedras preciosas', 'a:Gemstone', 'p:de pierres précieuses', 'p:nach Edelsteinen', 'p:di pietre preziose', 'p:de pedras preciosas'],
  animal: ['p:de animales', 'a:Animal', "p:d'animaux", 'p:nach Tieren', 'p:di animali', 'p:de animais'],
  place: ['p:de lugares', 'a:Place', 'p:de lieux', 'p:nach Orten', 'p:di luoghi', 'p:de lugares'],
  warrior: ['p:de guerreros', 'a:Warrior', 'p:de guerriers', 'p:von Kriegern', 'p:di guerrieri', 'p:de guerreiros'],
  light: ['p:que significan luz', 'p:that mean light', 'p:qui signifient lumière', 'p:mit der Bedeutung Licht', 'p:che significano luce', 'p:que significam luz'],
  love: ['p:que significan amor', 'p:that mean love', 'p:qui signifient amour', 'p:mit der Bedeutung Liebe', 'p:che significano amore', 'p:que significam amor'],
  music: ['a:musicales', 'a:Musical', 'a:musicaux', 'a:Musikalische', 'a:musicali', 'a:musicais'],
}

// ── Etymological roots, inflected to follow "origin" in each language ──
const ROOT_ADJ: Record<Root, Six> = {
  latin: ['latino', 'Latin', 'latine', 'lateinischer', 'latina', 'latina'],
  greek: ['griego', 'Greek', 'grecque', 'griechischer', 'greca', 'grega'],
  hebrew: ['hebreo', 'Hebrew', 'hébraïque', 'hebräischer', 'ebraica', 'hebraica'],
  germanic: ['germánico', 'Germanic', 'germanique', 'germanischer', 'germanica', 'germânica'],
  celtic: ['celta', 'Celtic', 'celtique', 'keltischer', 'celtica', 'celta'],
  norse: ['nórdico', 'Norse', 'nordique', 'nordischer', 'norrena', 'nórdica'],
  slavic: ['eslavo', 'Slavic', 'slave', 'slawischer', 'slava', 'eslava'],
  arabic: ['árabe', 'Arabic', 'arabe', 'arabischer', 'araba', 'árabe'],
  persian: ['persa', 'Persian', 'persane', 'persischer', 'persiana', 'persa'],
  turkish: ['turco', 'Turkish', 'turque', 'türkischer', 'turca', 'turca'],
  sanskrit: ['sánscrito', 'Sanskrit', 'sanskrite', 'indischer', 'sanscrita', 'sânscrita'],
  japanese: ['japonés', 'Japanese', 'japonaise', 'japanischer', 'giapponese', 'japonesa'],
  chinese: ['chino', 'Chinese', 'chinoise', 'chinesischer', 'cinese', 'chinesa'],
  korean: ['coreano', 'Korean', 'coréenne', 'koreanischer', 'coreana', 'coreana'],
  african: ['africano', 'African', 'africaine', 'afrikanischer', 'africana', 'africana'],
  polynesian: ['polinesio', 'Polynesian', 'polynésienne', 'polynesischer', 'polinesiana', 'polinésia'],
  basque: ['vasco', 'Basque', 'basque', 'baskischer', 'basca', 'basca'],
  native: ['indígena americano', 'Native American', 'amérindienne', 'indigen-amerikanischer', 'nativa americana', 'indígena americana'],
  other: ['incierto', 'uncertain', 'incertaine', 'ungeklärter', 'incerta', 'incerta'],
}

const GENDER_ADJ: Record<Gender, Six> = {
  f: ['femenino', 'girl’s', 'féminin', 'weiblicher', 'femminile', 'feminino'],
  m: ['masculino', 'boy’s', 'masculin', 'männlicher', 'maschile', 'masculino'],
  u: ['unisex', 'unisex', 'mixte', 'geschlechtsneutraler', 'unisex', 'unissex'],
}
const AND: Six = ['y', 'and', 'et', 'und', 'e', 'e']

// ── Lists made from real people: "Nombres de youtubers", "Names of famous YouTubers" ──
const FAME_MOD: Record<Fame, Six> = {
  youtuber: ['de youtubers', 'of famous YouTubers', 'de youtubeurs', 'von YouTubern', 'di youtuber', 'de youtubers'],
  tiktoker: ['de tiktokers', 'of famous TikTokers', 'de tiktokeurs', 'von TikTokern', 'di tiktoker', 'de tiktokers'],
  influencer: ['de influencers', 'of famous influencers', 'd’influenceurs', 'von Influencern', 'di influencer', 'de influencers'],
  singer: ['de cantantes', 'of famous singers', 'de chanteurs et chanteuses', 'von Sängerinnen und Sängern', 'di cantanti', 'de cantores'],
  actor: ['de actores y actrices', 'of famous actors', 'd’acteurs et d’actrices', 'von Schauspielerinnen und Schauspielern', 'di attori e attrici', 'de atores e atrizes'],
  footballer: ['de futbolistas', 'of famous footballers', 'de footballeurs', 'von Fußballern', 'di calciatori', 'de jogadores de futebol'],
  model: ['de modelos', 'of famous models', 'de mannequins', 'von Models', 'di modelle e modelli', 'de modelos'],
  // Stories: "Nombres de personajes de Harry Potter", "Names of Harry Potter characters".
  'harry-potter': ['de personajes de Harry Potter', 'of Harry Potter characters', 'de personnages de Harry Potter', 'von Figuren aus Harry Potter', 'di personaggi di Harry Potter', 'de personagens de Harry Potter'],
  'disney': ['de personajes de Disney', 'of Disney characters', 'de personnages Disney', 'von Disney-Figuren', 'di personaggi Disney', 'de personagens da Disney'],
  'pixar': ['de personajes de Pixar', 'of Pixar characters', 'de personnages Pixar', 'von Pixar-Figuren', 'di personaggi Pixar', 'de personagens da Pixar'],
  'star-wars': ['de personajes de Star Wars', 'of Star Wars characters', 'de personnages de Star Wars', 'von Figuren aus Star Wars', 'di personaggi di Star Wars', 'de personagens de Star Wars'],
  'marvel': ['de personajes de Marvel', 'of Marvel characters', 'de personnages Marvel', 'von Marvel-Figuren', 'di personaggi Marvel', 'de personagens da Marvel'],
  'dc': ['de personajes de DC', 'of DC characters', 'de personnages DC', 'von DC-Figuren', 'di personaggi DC', 'de personagens da DC'],
  'game-of-thrones': ['de personajes de Juego de Tronos', 'of Game of Thrones characters', 'de personnages de Game of Thrones', 'von Figuren aus Game of Thrones', 'di personaggi de Il Trono di Spade', 'de personagens de Game of Thrones'],
  'middle-earth': ['de personajes de El Señor de los Anillos', 'of The Lord of the Rings characters', 'de personnages du Seigneur des anneaux', 'von Figuren aus Der Herr der Ringe', 'di personaggi de Il Signore degli Anelli', 'de personagens de O Senhor dos Anéis'],
  'twilight': ['de personajes de Crepúsculo', 'of Twilight characters', 'de personnages de Twilight', 'von Figuren aus Twilight', 'di personaggi di Twilight', 'de personagens de Crepúsculo'],
  'stranger-things': ['de personajes de Stranger Things', 'of Stranger Things characters', 'de personnages de Stranger Things', 'von Figuren aus Stranger Things', 'di personaggi di Stranger Things', 'de personagens de Stranger Things'],
  'friends': ['de personajes de Friends', 'of Friends characters', 'de personnages de Friends', 'von Figuren aus Friends', 'di personaggi di Friends', 'de personagens de Friends'],
  'simpsons': ['de personajes de Los Simpson', 'of The Simpsons characters', 'de personnages des Simpson', 'von Figuren aus Die Simpsons', 'di personaggi dei Simpson', 'de personagens de Os Simpsons'],
  'pokemon': ['de personajes de Pokémon', 'of Pokémon characters', 'de personnages de Pokémon', 'von Figuren aus Pokémon', 'di personaggi dei Pokémon', 'de personagens de Pokémon'],
  'shakespeare': ['de personajes de Shakespeare', 'of Shakespeare characters', 'de personnages de Shakespeare', 'von Shakespeare-Figuren', 'di personaggi di Shakespeare', 'de personagens de Shakespeare'],
  'attack-on-titan': ['de personajes de Ataque a los Titanes', 'of Attack on Titan characters', 'de personnages de L’Attaque des Titans', 'von Figuren aus Attack on Titan', 'di personaggi de L’attacco dei giganti', 'de personagens de Attack on Titan'],
  'greys-anatomy': ['de personajes de Anatomía de Grey', 'of Grey’s Anatomy characters', 'de personnages de Grey’s Anatomy', 'von Figuren aus Grey’s Anatomy', 'di personaggi di Grey’s Anatomy', 'de personagens de Grey’s Anatomy'],
}

// ── The country whose ranking each site language reads, and the body that publishes it ──
const COUNTRY: Record<Locale, Six> = {
  es: ['España', 'Spain', 'Espagne', 'Spanien', 'Spagna', 'Espanha'],
  en: ['Estados Unidos', 'United States', 'États-Unis', 'USA', 'Stati Uniti', 'Estados Unidos'],
  fr: ['Francia', 'France', 'France', 'Frankreich', 'Francia', 'França'],
  de: ['Alemania', 'Germany', 'Allemagne', 'Deutschland', 'Germania', 'Alemanha'],
  it: ['Italia', 'Italy', 'Italie', 'Italien', 'Italia', 'Itália'],
  pt: ['Portugal', 'Portugal', 'Portugal', 'Portugal', 'Portogallo', 'Portugal'],
}
export const countryName = (country: Locale, l: Locale) => at(COUNTRY[country], l)
export const RANK_SOURCE: Record<Locale, string> = { es: 'INE', en: 'SSA', fr: 'INSEE', de: 'GfdS', it: 'ISTAT', pt: 'IRN' }
/** The year in list titles: "popular in <this year>", "rising for <next year>". Fixed when the site is built. */
export const YEAR_NOW = new Date().getFullYear()

export const cultureLabel = (c: Culture, l: Locale) => at(CULTURE_LABEL[c], l)
export const tagLabel = (t: Tag, l: Locale) => at(TAG_LABEL[t], l)
export const rootAdj = (r: Root, l: Locale) => at(ROOT_ADJ[r], l)
export const genderAdj = (g: Gender, l: Locale) => at(GENDER_ADJ[g], l)

function culturePlural(c: Culture, l: Locale): string {
  if (l === 'en') return cultureLabel(c, l)
  if (l === 'de') return cultureLabel(c, l).toLowerCase() + 'e'
  return CULTURE_PLURAL[c][['es', 'fr', 'it', 'pt'].indexOf(l)]
}

/** "vascos y españoles" / "Basque and Spanish" / "baskischen und spanischen" (German dative plural). */
export function cultureListPhrase(cs: Culture[], l: Locale): string {
  const words = cs.filter(c => c !== 'intl').slice(0, 3).map(c => (l === 'de' ? culturePlural(c, l) + 'n' : culturePlural(c, l)))
  if (words.length <= 1) return words[0] || ''
  return `${words.slice(0, -1).join(', ')} ${at(AND, l)} ${words[words.length - 1]}`
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** The human title of a list in one language, e.g. "Nombres vascos de niña", "Basque girl names". */
export function listTitle(key: ListKey, l: Locale, d: Dict): string {
  const { kind, value, gender } = parseListKey(key)
  const T = d.listTitle
  const gWord = gender === 'f' ? T.girl : gender === 'm' ? T.boy : gender === 'u' ? T.unisex : ''

  if (kind === 'y') {
    const now = value === 'now'
    const tpl = gender === 'f' ? (now ? T.yNowF : T.yNextF) : gender === 'm' ? (now ? T.yNowM : T.yNextM) : now ? T.yNow : T.yNext
    return tpl.replace('{year}', String(now ? YEAR_NOW : YEAR_NOW + 1))
  }
  if (kind === 'fame') {
    const of = at(FAME_MOD[value as Fame], l)
    if (l === 'en' || l === 'de') return `${gWord || (l === 'en' ? cap(T.names) : T.names)} ${of}`
    // "Nombres de youtubers para niña": the people come first, they are what the list is about.
    return [T.names, of, gender === 'f' ? T.forGirl : gender === 'm' ? T.forBoy : ''].filter(Boolean).join(' ')
  }

  let mod = '' // "a:…" adjective or "p:…" phrase
  if (kind === 'c') mod = 'a:' + culturePlural(value as Culture, l)
  else if (kind === 't') mod = at(TAG_MOD[value as Tag], l)
  else if (kind === 'l') mod = 'p:' + T.letter.replace('{letter}', value.toUpperCase())
  else if (kind === 'len') mod = 'a:' + (value === 'short' ? T.short : T.long)
  else if (kind === 'syl') mod = (l === 'en' || l === 'de' ? 'a:' : 'p:') + (value === '1' ? T.syl1 : T.syl2)
  else if (kind === 'pop') mod = 'a:' + (value === 'top' ? T.top : T.rare)
  const isAdj = mod.startsWith('a:')
  const m = mod.slice(2)

  if (l === 'en' || l === 'de') {
    // Modifier + compound noun: "Basque girl names", "Baskische Mädchennamen"; phrases trail: "Girl names that mean light".
    const noun = gWord || (l === 'en' ? cap(T.names) : T.names)
    if (!m) return noun
    return isAdj ? `${cap(m)} ${l === 'en' ? noun.toLowerCase() : noun}` : `${noun} ${m}`
  }
  // Romance order: "Nombres vascos de niña" / "Nombres de niña que empiezan por A".
  const parts = [T.names]
  if (m && isAdj) parts.push(m)
  if (gWord) parts.push(gWord)
  if (m && !isAdj) parts.push(m)
  return parts.join(' ')
}

export function listSlug(key: ListKey, l: Locale, d: Dict): string {
  return slugify(listTitle(key, l, d))
}

/** Labels the client app needs, as plain data. */
export function clientLabels(l: Locale) {
  const cultures = Object.fromEntries(Object.keys(CULTURE_LABEL).map(c => [c, cultureLabel(c as Culture, l)]))
  const tags = Object.fromEntries(Object.keys(TAG_LABEL).map(t => [t, tagLabel(t as Tag, l)]))
  return { cultures, tags } as { cultures: Record<Culture, string>; tags: Record<Tag, string> }
}
