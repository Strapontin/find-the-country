import { closenessColor } from '../lib/closeness';
import { getCountry, type Lang } from '../lib/countries';
import type { Guess } from '../lib/game';
import { formatKm, t } from '../i18n';

interface Props {
  lang: Lang;
  guesses: Guess[];
  onPick: (code: string) => void;
}

/** Guesses as flight strips, closest first; the strip's edge carries its heat colour. */
export default function GuessList({ lang, guesses, onPick }: Props) {
  const s = t(lang);
  const latest = guesses.at(-1)?.code;
  const sorted = guesses.map((g, i) => ({ ...g, n: i + 1 })).sort((a, b) => a.km - b.km);

  return (
    <ol className="strips">
      {sorted.map((g) => {
        const c = getCountry(g.code);
        return (
          <li key={g.code}>
            <button
              type="button"
              className={`strip${g.code === latest ? ' is-latest' : ''}${g.km === 0 ? ' is-found' : ''}`}
              style={{ ['--heat' as string]: closenessColor(g.km) }}
              onClick={() => onPick(g.code)}
            >
              <span className="strip-n" aria-label={`#${g.n}`}>
                {g.n}
              </span>
              <span className="strip-place">
                <span className="strip-name">{c.name[lang]}</span>
                <span className="strip-capital">
                  {c.capital[lang]}
                  {g.code === latest && g.km > 0 && guesses.length > 1 && (
                    <span className="strip-latest">{s.latest}</span>
                  )}
                </span>
              </span>
              <span className="strip-km">{g.km === 0 ? '✓' : formatKm(lang, g.km)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
