import type { Lang } from './lib/countries';

// French typography: non-breaking space before ":" and narrow one before "?" "!".
const NB = '\u00A0';
const NNB = '\u202F';

const en = {
  title: 'Find the Country',
  intro:
    "Guess any country. Each guess shows how far its capital is from the mystery country's capital, as the crow flies.",
  daily: (n: number) => `Daily #${n}`,
  free: 'Free play',
  placeholder: 'Type a country',
  noMatch: (q: string) => `No country matches “${q}”`,
  guesses: (n: number) => (n === 1 ? '1 guess' : `${n} guesses`),
  closest: 'Closest so far: ',
  far: 'Far',
  close: 'Close',
  giveUp: 'Give up',
  giveUpConfirm: 'Show the answer?',
  giveUpYes: 'Show it',
  giveUpNo: 'Keep playing',
  found: (n: number) => (n === 1 ? 'Found on the first guess!' : `Found in ${n} guesses`),
  wasCountry: 'The country was',
  capital: (c: string) => `Capital: ${c}`,
  share: 'Share result',
  copied: 'Copied',
  newCountry: 'New country',
  playFree: 'Play free mode',
  nextDaily: (h: number, m: number) => `Next daily country in ${h} h ${String(m).padStart(2, '0')} min`,
  streak: (n: number) => `Streak: ${n}`,
  tapAgain: (touch: boolean) => (touch ? 'Tap again to see its name' : 'Click again to see its name'),
  tapToGuess: (touch: boolean) => (touch ? 'Tap again to guess it' : 'Click again to guess it'),
  globeGuess: (touch: boolean) =>
    touch ? 'Guess a country by tapping it twice' : 'Guess a country by double-clicking it on the globe',
  alreadyGuessed: (km: string) => `Already guessed: ${km}`,
  globeLabel: (guess: boolean) =>
    `Globe. Tap a country to highlight it, tap again to ${guess ? 'guess it' : 'see its name'}.`,
  km: (n: string) => `${n} km`,
  latest: 'Latest',
  loading: 'Loading the globe…',
  credits: 'Data:',
  friends: 'With friends',
  challengeTitle: 'Challenge a friend',
  challengeNote: 'Same mystery country, without giving it away: every link is different, even for the same country.',
  copyLink: (touch: boolean) => (touch ? 'Share link' : 'Copy link'),
  linkCopied: 'Link copied',
  linkShared: 'Link shared',
  copyManually: 'Copy this link',
  codeLabel: 'Code',
  shareMessage: (code: string) => `Find the same mystery country as me. Code ${code}`,
  haveCode: 'Got a code?',
  playCode: 'Play',
  badCode: "This code doesn't match a country. Check the 8 characters.",
  badLink: "This link's code doesn't match a country. Ask for the link again or type the code.",
  sharedIntro: (code: string) => `Shared country, code ${code}.`,
};

/** Every entry is a string, or a function returning one. */
export type Strings = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => string ? (...args: A) => string : string;
};

const fr: Strings = {
  title: 'Trouve le pays',
  intro: "Propose un pays. Chaque essai indique la distance à vol d'oiseau entre sa capitale et celle du pays mystère.",
  daily: (n: number) => `Pays du jour n°${n}`,
  free: 'Partie libre',
  placeholder: 'Tape un pays',
  noMatch: (q: string) => `Aucun pays ne correspond à «${NNB}${q}${NNB}»`,
  guesses: (n: number) => (n === 1 ? '1 essai' : `${n} essais`),
  closest: `Le plus proche${NB}: `,
  far: 'Loin',
  close: 'Proche',
  giveUp: 'Abandonner',
  giveUpConfirm: `Afficher la réponse${NNB}?`,
  giveUpYes: 'Afficher',
  giveUpNo: 'Continuer',
  found: (n: number) => (n === 1 ? `Trouvé du premier coup${NNB}!` : `Trouvé en ${n} essais`),
  wasCountry: 'Le pays était',
  capital: (c: string) => `Capitale${NB}: ${c}`,
  share: 'Partager le résultat',
  copied: 'Copié',
  newCountry: 'Nouveau pays',
  playFree: 'Jouer en partie libre',
  nextDaily: (h: number, m: number) => `Prochain pays du jour dans ${h}${NB}h ${String(m).padStart(2, '0')}${NB}min`,
  streak: (n: number) => `Série${NB}: ${n}`,
  tapAgain: (touch: boolean) => (touch ? 'Touche encore pour voir son nom' : 'Clique encore pour voir son nom'),
  tapToGuess: (touch: boolean) => (touch ? 'Touche encore pour le proposer' : 'Clique encore pour le proposer'),
  globeGuess: (touch: boolean) =>
    touch ? 'Proposer un pays en le touchant deux fois' : 'Proposer un pays en double-cliquant sur le globe',
  alreadyGuessed: (km: string) => `Déjà proposé${NB}: ${km}`,
  globeLabel: (guess: boolean) =>
    `Globe. Touche un pays pour le mettre en évidence, touche-le encore pour ${guess ? 'le proposer' : 'voir son nom'}.`,
  km: (n: string) => `${n}${NB}km`,
  latest: 'Dernier',
  loading: 'Chargement du globe…',
  credits: `Données${NB}:`,
  friends: 'Entre amis',
  challengeTitle: 'Lancer un défi',
  challengeNote: `Même pays mystère, sans le dévoiler${NB}: chaque lien est différent, même pour le même pays.`,
  copyLink: (touch: boolean) => (touch ? 'Partager le lien' : 'Copier le lien'),
  linkCopied: 'Lien copié',
  linkShared: 'Lien partagé',
  copyManually: 'Copie ce lien',
  codeLabel: 'Code',
  shareMessage: (code: string) => `Trouve le même pays mystère que moi. Code ${code}`,
  haveCode: `Tu as un code${NNB}?`,
  playCode: 'Jouer',
  badCode: 'Ce code ne correspond à aucun pays. Vérifie les 8 caractères.',
  badLink: 'Le code de ce lien ne correspond à aucun pays. Redemande le lien ou tape le code.',
  sharedIntro: (code: string) => `Pays partagé, code ${code}.`,
};

const strings: Record<Lang, Strings> = { en, fr };

export const t = (lang: Lang): Strings => strings[lang];

export function formatKm(lang: Lang, km: number): string {
  return t(lang).km(new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 0 }).format(km));
}

export function defaultLang(): Lang {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}
