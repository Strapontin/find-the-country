import { useId, useState, type FormEvent } from 'react';
import type { Lang } from '../lib/countries';
import { decodeShareCode, freshShareCode, normalizeShareCode } from '../lib/shareCode';
import { t } from '../i18n';

// Every code handed out while the page is open: none is ever given twice.
const givenCodes = new Set<string>();

export function shareLink(code: string): string {
  return `${location.origin}${location.pathname}?game=${code}`;
}

interface Props {
  lang: Lang;
  touch: boolean;
  /** Country of the current free game. */
  target: string;
  /** Start a free game on a friend's country. */
  onJoin: (target: string, code: string) => void;
  /** Opened from a link whose code is invalid. */
  badLink: boolean;
}

type Status = 'idle' | 'copied' | 'shared' | 'manual';

export default function FriendsPanel({ lang, touch, target, onJoin, badLink }: Props) {
  const s = t(lang);
  const id = useId();
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [input, setInput] = useState('');
  const [error, setError] = useState(badLink);

  async function share() {
    const next = freshShareCode(target, givenCodes);
    const url = shareLink(next);
    setCode(next);
    setStatus('idle');
    if (touch && navigator.share) {
      try {
        await navigator.share({ text: s.shareMessage(next), url });
        setStatus('shared');
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return; // closed the share sheet: the code stays visible
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {
      setStatus('manual');
    }
  }

  function join(e: FormEvent) {
    e.preventDefault();
    const country = decodeShareCode(input);
    const normalized = normalizeShareCode(input);
    if (!country || !normalized) {
      setError(true);
      return;
    }
    setError(false);
    setInput('');
    onJoin(country, normalized);
  }

  return (
    <section className="friends" aria-label={s.friends}>
      <div className="friends-block">
        <p className="friends-title">{s.challengeTitle}</p>
        <p className="friends-note">{s.challengeNote}</p>
        <div className="friends-row">
          <button type="button" className="btn primary" onClick={share}>
            {s.copyLink(touch)}
          </button>
          <span className="friends-status" role="status">
            {status === 'copied' && s.linkCopied}
            {status === 'shared' && s.linkShared}
          </span>
        </div>
        {code && (
          <p className="friends-code">
            {s.codeLabel} <strong>{code}</strong>
          </p>
        )}
        {status === 'manual' && code && (
          <input
            className="friends-link"
            readOnly
            value={shareLink(code)}
            aria-label={s.copyManually}
            onFocus={(e) => e.currentTarget.select()}
          />
        )}
      </div>

      <form className="friends-block" onSubmit={join} noValidate>
        <label className="friends-title" htmlFor={`${id}-code`}>
          {s.haveCode}
        </label>
        <div className="friends-row">
          <input
            id={`${id}-code`}
            className="friends-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            placeholder="XXXX-XXXX"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={12}
            enterKeyHint="go"
            aria-invalid={error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          <button type="submit" className="btn">
            {s.playCode}
          </button>
        </div>
        {error && (
          <p className="friends-error" id={`${id}-error`} role="alert">
            {badLink && !input ? s.badLink : s.badCode}
          </p>
        )}
      </form>
    </section>
  );
}
