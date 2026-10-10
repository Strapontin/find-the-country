import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import GuessInput from './components/GuessInput';
import GuessList from './components/GuessList';
import Legend from './components/Legend';
import { closenessColor, FOUND_COLOR } from './lib/closeness';
import { getCountry, type Lang } from './lib/countries';
import { puzzleNumber } from './lib/daily';
import { closestGuess, giveUp, makeGuess, newFreeGame, shareText, type GameState, type Mode } from './lib/game';
import {
  loadDaily,
  loadFree,
  loadLang,
  loadMode,
  loadStats,
  recordDaily,
  saveGame,
  saveLang,
  saveMode,
} from './lib/storage';
import { defaultLang, formatKm, t } from './i18n';

// three.js is most of the download: let the rest of the page render first.
const GlobeView = lazy(() => import('./components/GlobeView'));

const isTouch = () => window.matchMedia?.('(hover: none)').matches ?? false;

function msUntilMidnight(now: Date): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => loadLang() ?? defaultLang());
  const [mode, setMode] = useState<Mode>(loadMode);
  const [now, setNow] = useState(() => new Date());
  const [daily, setDaily] = useState<GameState>(() => loadDaily(puzzleNumber()));
  const [free, setFree] = useState<GameState>(() => loadFree() ?? newFreeGame());
  const [stats, setStats] = useState(loadStats);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ code: string; zoom?: boolean } | null>(null);
  const [confirmingGiveUp, setConfirmingGiveUp] = useState(false);
  const [copied, setCopied] = useState(false);

  const s = t(lang);
  const game = mode === 'daily' ? daily : free;
  const setGame = mode === 'daily' ? setDaily : setFree;
  const finished = game.status !== 'playing';
  const target = getCountry(game.target);

  useEffect(() => {
    saveLang(lang);
    document.documentElement.lang = lang;
    document.title = s.title;
  }, [lang, s.title]);
  useEffect(() => saveMode(mode), [mode]);
  useEffect(() => saveGame(daily), [daily]);
  useEffect(() => saveGame(free), [free]);
  useEffect(() => {
    if (daily.status !== 'playing') setStats(recordDaily(daily));
  }, [daily]);

  // Clock for the countdown, and the switch to the next daily puzzle at midnight.
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d);
      setDaily((current) => {
        const p = puzzleNumber(d);
        return current.puzzle === p ? current : loadDaily(p);
      });
    };
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  // When a game ends, fly to the answer.
  useEffect(() => {
    if (game.status === 'playing') return;
    setSelected(null);
    setRevealed(null);
    setFocus({ code: game.target, zoom: true });
  }, [game.status, game.target, mode]);

  const guessed = useMemo(() => new Set(game.guesses.map((g) => g.code)), [game.guesses]);

  const colors = useMemo(() => {
    const m = new Map(game.guesses.map((g) => [g.code, closenessColor(g.km)]));
    if (finished) m.set(game.target, FOUND_COLOR);
    return m;
  }, [game.guesses, game.target, finished]);

  const onGuess = useCallback(
    (code: string) => {
      setGame((g) => makeGuess(g, code));
      setSelected(null);
      setRevealed(null);
      setFocus({ code });
    },
    [setGame],
  );

  const onSelect = useCallback(
    (code: string | null) => {
      if (code && code === selected) setRevealed(code);
      else {
        setSelected(code);
        setRevealed(null);
      }
    },
    [selected],
  );

  const onPickStrip = useCallback((code: string) => {
    setSelected(code);
    setRevealed(code);
    setFocus({ code });
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setSelected(null);
    setRevealed(null);
    setConfirmingGiveUp(false);
    setCopied(false);
  }

  function newGame() {
    setFree((g) => newFreeGame(g.target));
    setSelected(null);
    setRevealed(null);
  }

  async function share() {
    const text = `${shareText(daily, s.title)}\n${location.origin}${location.pathname}`;
    if (isTouch() && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // cancelled or unsupported: fall back to the clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      window.prompt(s.share, text);
    }
  }

  const closest = closestGuess(game);
  const left = msUntilMidnight(now);
  const hours = Math.floor(left / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);

  const selectedGuess = selected ? game.guesses.find((g) => g.code === selected) : undefined;
  let hint: string | null = null;
  if (revealed) {
    const name = getCountry(revealed).name[lang];
    const g = game.guesses.find((x) => x.code === revealed);
    hint = g && g.km > 0 ? `${name}, ${formatKm(lang, g.km)}` : name;
  } else if (selected) {
    hint = selectedGuess ? s.alreadyGuessed(formatKm(lang, selectedGuess.km)) : s.tapAgain(isTouch());
  }

  return (
    <div className="app">
      <header className="bar">
        <h1>{s.title}</h1>
        <div className="lang" role="group" aria-label="Language / Langue">
          {(['fr', 'en'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <nav className="modes" aria-label={s.title}>
        <button type="button" aria-pressed={mode === 'daily'} onClick={() => switchMode('daily')}>
          {s.daily(daily.puzzle ?? 1)}
        </button>
        <button type="button" aria-pressed={mode === 'free'} onClick={() => switchMode('free')}>
          {s.free}
        </button>
      </nav>

      <section className="play">
        {!finished ? (
          <>
            <GuessInput lang={lang} guessed={guessed} onGuess={onGuess} />
            <div className="play-meta">
              <span aria-live="polite">
                {closest && (
                  <>
                    {s.closest}
                    <strong>{getCountry(closest.code).name[lang]}</strong>, {formatKm(lang, closest.km)}
                  </>
                )}
              </span>
              {confirmingGiveUp ? (
                <span className="confirm">
                  {s.giveUpConfirm}
                  <button type="button" className="link danger" onClick={() => setGame(giveUp)}>
                    {s.giveUpYes}
                  </button>
                  <button type="button" className="link" onClick={() => setConfirmingGiveUp(false)}>
                    {s.giveUpNo}
                  </button>
                </span>
              ) : (
                <button type="button" className="link" onClick={() => setConfirmingGiveUp(true)}>
                  {s.giveUp}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className={`result ${game.status === 'won' ? 'is-won' : 'is-lost'}`} aria-live="polite">
            <p className="result-lead">{game.status === 'won' ? s.found(game.guesses.length) : s.wasCountry}</p>
            <p className="result-country">{target.name[lang]}</p>
            <p className="result-capital">{s.capital(target.capital[lang])}</p>
            <div className="result-actions">
              {mode === 'daily' ? (
                <>
                  <button type="button" className="primary" onClick={share}>
                    {copied ? s.copied : s.share}
                  </button>
                  <button type="button" className="link" onClick={() => switchMode('free')}>
                    {s.playFree}
                  </button>
                </>
              ) : (
                <button type="button" className="primary" onClick={newGame}>
                  {s.newCountry}
                </button>
              )}
            </div>
            {mode === 'daily' && (
              <p className="result-meta">
                {s.nextDaily(hours, minutes)}
                {stats.streak > 0 && <span>{s.streak(stats.streak)}</span>}
              </p>
            )}
          </div>
        )}
      </section>

      <main className="globe-area">
        <Suspense fallback={<p className="globe-loading">{s.loading}</p>}>
          <GlobeView
            lang={lang}
            colors={colors}
            selected={selected}
            revealed={revealed}
            onSelect={onSelect}
            focus={focus}
            label={s.globeLabel}
          />
        </Suspense>
        {hint && (
          <p className="globe-hint" role="status">
            {hint}
          </p>
        )}
      </main>

      <section className="log" aria-label={s.guesses(game.guesses.length)}>
        {game.guesses.length === 0 ? (
          <p className="intro">{s.intro}</p>
        ) : (
          <>
            <div className="log-head">
              <span>{s.guesses(game.guesses.length)}</span>
              <Legend lang={lang} />
            </div>
            <GuessList lang={lang} guesses={game.guesses} onPick={onPickStrip} />
          </>
        )}
        <p className="credits">
          {s.credits} <a href="https://www.naturalearthdata.com/">Natural Earth</a>,{' '}
          <a href="https://github.com/mledoze/countries">mledoze/countries</a> (ODbL)
        </p>
      </section>
    </div>
  );
}
