import { closeness, closenessColor } from '../lib/closeness';
import type { Lang } from '../lib/countries';
import { formatKm, t } from '../i18n';

const GRADIENT_KM = [15000, 8000, 4000, 2000, 1000, 500, 250, 150];
const TICKS_KM = [5000, 1000, 250];

export default function Legend({ lang }: { lang: Lang }) {
  const s = t(lang);
  const gradient = GRADIENT_KM.map((km) => `${closenessColor(km)} ${(closeness(km) * 100).toFixed(1)}%`).join(', ');
  return (
    <div className="legend" aria-hidden="true">
      <span>{s.far}</span>
      <div className="legend-bar" style={{ backgroundImage: `linear-gradient(90deg, ${gradient})` }}>
        {TICKS_KM.map((km) => (
          <span key={km} className="legend-tick" style={{ left: `${closeness(km) * 100}%` }}>
            {formatKm(lang, km)}
          </span>
        ))}
      </div>
      <span>{s.close}</span>
    </div>
  );
}
