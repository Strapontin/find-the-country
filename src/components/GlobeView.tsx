import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { MeshPhongMaterial } from 'three';
import worldUrl from '../data/world.geo.json?url';
import { getCountry, isPlayable, type Lang } from '../lib/countries';

interface Feature {
  type: 'Feature';
  properties: { code: string };
  geometry: unknown;
}

interface Props {
  lang: Lang;
  /** Fill colour per guessed (or revealed) country code; their capitals get a marker. */
  colors: ReadonlyMap<string, string>;
  selected: string | null;
  revealed: string | null;
  onSelect: (code: string | null) => void;
  /**
   * Country the camera should turn to; a new object triggers a new flight.
   * `zoom` also moves the camera in to frame it, otherwise the distance is kept.
   */
  focus: { code: string; zoom?: boolean } | null;
  label: string;
}

const COLORS = {
  ocean: '#9cc2d3',
  land: '#e6ead7',
  background: '#cfd6c8',
  stroke: '#7d9088',
  side: 'rgba(70, 92, 84, 0.35)',
  selected: '#f2cfe3',
  selectedStroke: '#b5177a',
  atmosphere: '#d8ecf4',
  capital: '#18303b',
};

/** Camera altitude at which the globe fills ~85% of the smaller side of the view. */
function fittingAltitude(width: number, height: number): number {
  const vfov = (50 * Math.PI) / 180; // globe.gl's camera
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (width / height));
  const half = 0.425 * Math.min(vfov, hfov);
  return 1 / Math.sin(half) - 1;
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export default function GlobeView({ lang, colors, selected, revealed, onSelect, focus, label }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(worldUrl)
      .then((r) => r.json())
      .then((geo: { features: Feature[] }) => !cancelled && setFeatures(geo.features));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const globeMaterial = useMemo(() => new MeshPhongMaterial({ color: COLORS.ocean, shininess: 4 }), []);

  const flyTo = useCallback((target: { code: string; zoom?: boolean }, ms: number) => {
    const globe = globeRef.current;
    if (!globe) return;
    const { view } = getCountry(target.code);
    globe.controls().autoRotate = false;
    const pov = target.zoom ? { ...view, altitude: Math.max(view.altitude, 1.1) } : { lat: view.lat, lng: view.lng };
    globe.pointOfView(pov, reducedMotion() ? 0 : ms);
  }, []);

  const focusRef = useRef(focus);
  focusRef.current = focus;

  // Initial camera, slow idle spin until the player touches the globe.
  const onReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const el = containerRef.current;
    const altitude = el ? fittingAltitude(el.clientWidth, el.clientHeight) : 2.2;
    globe.pointOfView({ lat: 30, lng: 10, altitude }, 0);
    const controls = globe.controls();
    controls.autoRotate = !reducedMotion();
    controls.autoRotateSpeed = 0.35;
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
    });
    if (focusRef.current) flyTo(focusRef.current, 0);
  }, [flyTo]);

  useEffect(() => {
    if (focus) flyTo(focus, 1400);
  }, [focus, flyTo]);

  const codeOf = (f: object) => (f as Feature).properties.code;

  const capColor = useCallback(
    (f: object) => {
      const code = codeOf(f);
      const color = colors.get(code);
      if (color) return color;
      if (code === selected) return COLORS.selected;
      return isPlayable(code) ? COLORS.land : COLORS.background;
    },
    [colors, selected],
  );

  const strokeColor = useCallback(
    (f: object) => (codeOf(f) === selected ? COLORS.selectedStroke : COLORS.stroke),
    [selected],
  );

  const altitude = useCallback(
    (f: object) => {
      const code = codeOf(f);
      if (code === selected) return 0.04;
      if (colors.has(code)) return 0.014;
      return 0.006;
    },
    [colors, selected],
  );

  const onPolygonClick = useCallback(
    (f: object) => {
      const code = codeOf(f);
      onSelect(isPlayable(code) ? code : null);
    },
    [onSelect],
  );

  const onPolygonHover = useCallback((f: object | null) => {
    if (containerRef.current) containerRef.current.style.cursor = f && isPlayable(codeOf(f)) ? 'pointer' : '';
  }, []);

  const nameTag = useMemo(() => {
    if (!revealed) return [];
    const c = getCountry(revealed);
    return [{ lat: c.view.lat, lng: c.view.lng, name: c.name[lang] }];
  }, [revealed, lang]);

  const makeTag = useCallback((d: object) => {
    const el = document.createElement('div');
    el.className = 'globe-tag';
    el.textContent = (d as { name: string }).name;
    return el;
  }, []);

  const points = useMemo(
    () =>
      [...colors.keys()].map((code) => {
        const { lat, lng } = getCountry(code).capital;
        return { lat, lng };
      }),
    [colors],
  );

  return (
    <div ref={containerRef} className="globe" role="img" aria-label={label}>
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          onGlobeReady={onReady}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={globeMaterial}
          showGraticules
          showAtmosphere
          atmosphereColor={COLORS.atmosphere}
          atmosphereAltitude={0.12}
          polygonsData={features}
          polygonCapColor={capColor}
          polygonSideColor={() => COLORS.side}
          polygonStrokeColor={strokeColor}
          polygonAltitude={altitude}
          polygonsTransitionDuration={250}
          polygonLabel={() => ''}
          onPolygonClick={onPolygonClick}
          onPolygonHover={onPolygonHover}
          onGlobeClick={() => onSelect(null)}
          pointsData={points}
          pointColor={() => COLORS.capital}
          pointAltitude={0.02}
          pointRadius={0.3}
          pointsMerge={false}
          pointsTransitionDuration={0}
          htmlElementsData={nameTag}
          htmlElement={makeTag}
          htmlAltitude={0.05}
        />
      )}
    </div>
  );
}
