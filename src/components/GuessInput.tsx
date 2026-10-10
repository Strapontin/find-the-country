import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Lang } from '../lib/countries';
import { searchCountries } from '../lib/search';
import { t } from '../i18n';

interface Props {
  lang: Lang;
  guessed: ReadonlySet<string>;
  onGuess: (code: string) => void;
}

export default function GuessInput({ lang, guessed, onGuess }: Props) {
  const s = t(lang);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const results = useMemo(() => searchCountries(query, lang, guessed), [query, lang, guessed]);
  const showList = open && query.trim().length > 0;

  function submit(code: string) {
    onGuess(code);
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = results[active] ?? results[0];
      if (pick) submit(pick.country.code);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="guess-input">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        aria-label={s.placeholder}
        placeholder={s.placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="go"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul className="suggestions" id={listId} role="listbox">
          {results.length === 0 && <li className="suggestions-empty">{s.noMatch(query.trim())}</li>}
          {results.map((r, i) => (
            <li
              key={r.country.code}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : undefined}
              // mousedown, not click: fires before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault();
                submit(r.country.code);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span>{r.country.name[lang]}</span>
              {r.matchedAlias && <span className="alias">{r.matchedAlias}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
