// Builds the game's static data from Natural Earth + world-countries.
//
//   npm run data
//
// Outputs (committed, so the app build never needs the network):
//   src/data/countries.json   playable countries: names (en/fr), aliases, capital, camera view
//   src/data/world.geo.json   simplified polygons for every land area, keyed by `code`
//
// Natural Earth is public domain. world-countries (mledoze) is ODbL.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import mapshaper from 'mapshaper';
import { geoArea, geoCentroid } from 'd3-geo';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, '.cache', 'natural-earth');
const NE_BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const NE_FILES = ['ne_50m_admin_0_countries.geojson', 'ne_10m_populated_places.geojson'];

// 193 UN members + these observers / partially recognised states.
const EXTRA_COUNTRIES = ['VA', 'PS', 'XK', 'TW'];

// Natural Earth codes that differ from ISO alpha-3.
const NE_CODES = { KOS: 'XK', PSX: 'PS', SDS: 'SS' };
// Natural Earth polygons merged into a playable country in this game.
const POLYGON_MERGES = { SOL: 'SO', CYN: 'CY' };

// Capital name differences between world-countries and Natural Earth.
const CAPITAL_ALIASES = {
  'Andorra la Vella': ['Andorra'],
  Astana: ['Nur-Sultan'],
  'South Tarawa': ['Tarawa'],
  'Ulan Bator': ['Ulaanbaatar'],
  Ngerulmud: ['Melekeok'],
  'City of San Marino': ['San Marino'],
  "Sana'a": ['Sanaa'],
  'Washington D.C.': ['Washington, D.C.', 'Washington'],
};

// Capitals Natural Earth lacks, or whose display name needs fixing.
const CAPITAL_OVERRIDES = {
  NR: { en: 'Yaren', fr: 'Yaren', lat: -0.5477, lng: 166.9209 },
  KZ: { en: 'Astana', fr: 'Astana' },
  PW: { en: 'Ngerulmud', fr: 'Ngerulmud', lat: 7.5006, lng: 134.6242 },
  KI: { en: 'South Tarawa', fr: 'Tarawa-Sud' },
  US: { en: 'Washington, D.C.', fr: 'Washington' },
};

// French common names that read better than world-countries' (theirs stay as aliases).
const FRENCH_NAMES = {
  CD: 'République démocratique du Congo',
  CG: 'République du Congo',
  CV: 'Cap-Vert',
  PW: 'Palaos',
  SA: 'Arabie saoudite',
  SZ: 'Eswatini',
};

// Extra search terms players are likely to type.
const EXTRA_ALIASES = {
  US: ['USA', 'US', 'America', 'Amérique'],
  GB: ['UK', 'Britain', 'Great Britain', 'England', 'Angleterre', 'Grande-Bretagne'],
  AE: ['UAE', 'EAU', 'Emirates'],
  CD: ['DRC', 'RDC', 'Congo-Kinshasa', 'Zaire', 'Zaïre'],
  CG: ['Congo-Brazzaville'],
  CZ: ['Czech Republic', 'République tchèque'],
  CI: ['Ivory Coast'],
  MM: ['Burma', 'Birmanie'],
  SZ: ['Swaziland'],
  MK: ['Macedonia', 'Macédoine'],
  NL: ['Holland', 'Hollande'],
  TR: ['Turkey', 'Turquie', 'Türkiye'],
  CV: ['Cape Verde', 'Cap-Vert'],
  TL: ['East Timor', 'Timor oriental'],
  VA: ['Vatican', 'Holy See', 'Saint-Siège'],
  KR: ['Korea', 'Corée'],
  KP: ['North Korea', 'Corée du Nord'],
};

async function ensureNaturalEarth() {
  mkdirSync(cacheDir, { recursive: true });
  for (const file of NE_FILES) {
    const path = join(cacheDir, file);
    if (existsSync(path)) continue;
    console.log(`Downloading ${file}…`);
    const res = await fetch(NE_BASE + file);
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return NE_FILES.map((f) => JSON.parse(readFileSync(join(cacheDir, f), 'utf8')));
}

const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;

function findCapital(country, neAdm0, places) {
  const wanted = country.capital[0];
  const names = [wanted, ...(CAPITAL_ALIASES[wanted] ?? [])].map(norm);
  const inCountry = places.filter(
    (p) => p.ADM0_A3 === neAdm0 || p.ADM0_A3 === country.cca3 || p.ISO_A2 === country.cca2,
  );
  const matches = inCountry.filter((p) =>
    [p.NAME, p.NAME_EN, p.NAMEASCII, p.NAMEALT].filter(Boolean).some((n) => names.includes(norm(n))),
  );
  // Prefer the place Natural Earth flags as the national capital.
  // (Its data has e.g. a second "Niamey" that is really Maradi.)
  const rank = (p) =>
    p.FEATURECLA === 'Admin-0 capital' ? 3 : /Admin-0/.test(p.FEATURECLA) ? 2 : /capital/i.test(p.FEATURECLA) ? 1 : 0;
  matches.sort((a, b) => rank(b) - rank(a));
  const p = matches[0];
  const o = CAPITAL_OVERRIDES[country.cca2] ?? {};
  const en = o.en ?? p?.NAME_EN ?? wanted;
  const fr = o.fr ?? p?.NAME_FR ?? en;
  const lat = o.lat ?? p?.LATITUDE;
  const lng = o.lng ?? p?.LONGITUDE;
  if (lat == null || lng == null) throw new Error(`No coordinates for capital of ${country.cca2} (${wanted})`);
  return { en, fr, lat: round(lat), lng: round(lng) };
}

// mapshaper writes RFC 7946 winding (outer rings counter-clockwise). d3-geo,
// and the globe's polygon triangulation built on it, read that as "the whole
// sphere minus the country", so every ring is reversed to clockwise.
const rewind = (geometry) => ({
  type: geometry.type,
  coordinates:
    geometry.type === 'Polygon'
      ? geometry.coordinates.map((ring) => [...ring].reverse())
      : geometry.coordinates.map((poly) => poly.map((ring) => [...ring].reverse())),
});

const KM2_PER_STERADIAN = 6371.0088 ** 2;

const polygonAreaKm2 = (rings) => geoArea({ type: 'Polygon', coordinates: rings }) * KM2_PER_STERADIAN;

/** Keep islands of 1,000 km² or more, or at least 20% of the mainland, and the capital's island. */
function dropSmallIslands(geometry, capital) {
  if (geometry.type === 'Polygon') return geometry;
  const parts = geometry.coordinates.map((rings) => ({ rings, area: polygonAreaKm2(rings) }));
  const largest = Math.max(...parts.map((p) => p.area));
  const nearest = (rings) =>
    Math.min(...rings[0].map(([lng, lat]) => (lng - capital.lng) ** 2 + (lat - capital.lat) ** 2));
  const capitalPart = capital && parts.reduce((a, b) => (nearest(b.rings) < nearest(a.rings) ? b : a));
  const kept = parts.filter((p) => p === capitalPart || p.area >= 1000 || p.area >= 0.2 * largest).map((p) => p.rings);
  return kept.length === 1 ? { type: 'Polygon', coordinates: kept[0] } : { type: 'MultiPolygon', coordinates: kept };
}

// Where the camera goes to show a country: its largest landmass (so France
// means mainland France, not the middle of the Atlantic), zoomed to fit.
function cameraView(geometry) {
  const { coordinates } = geometry;
  const polygons = geometry.type === 'Polygon' ? [coordinates] : coordinates;
  const parts = polygons.map((p) => {
    const feature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: p }, properties: {} };
    return { feature, area: geoArea(feature) };
  });
  if (parts.some((p) => p.area > 2 * Math.PI)) throw new Error('Unexpected ring winding');
  const main = parts.reduce((a, b) => (b.area > a.area ? b : a));
  const altitude = Math.min(2.2, Math.max(0.35, Math.sqrt(main.area) * 6));
  const [lng, lat] = geoCentroid(main.feature);
  return { lat: round(lat, 2), lng: round(lng, 2), altitude: round(altitude, 2) };
}

async function main() {
  const [admin, populated] = await ensureNaturalEarth();
  const places = populated.features.map((f) => f.properties);
  const wc = require('world-countries/countries.json').filter((c) => c.unMember || EXTRA_COUNTRIES.includes(c.cca2));
  const byCca3 = new Map(wc.map((c) => [c.cca3, c]));

  // Tag every Natural Earth polygon with a game code.
  // Playable: ISO alpha-2. Background (territories, Antarctica…): "_" + NE code.
  const neAdm0ByCode = {};
  for (const f of admin.features) {
    const p = f.properties;
    const merged = POLYGON_MERGES[p.ADM0_A3];
    const own = NE_CODES[p.ADM0_A3] ?? byCca3.get(p.ADM0_A3)?.cca2;
    if (own) neAdm0ByCode[own] = p.ADM0_A3;
    f.properties = { code: merged ?? own ?? `_${p.ADM0_A3}` };
  }

  const missing = wc.filter((c) => !neAdm0ByCode[c.cca2]);
  if (missing.length) throw new Error(`No polygon for: ${missing.map((c) => c.cca2).join(', ')}`);

  // Simplify each island on its own (keep-shapes only protects one ring per
  // feature, so Kiribati would otherwise lose every atoll but one), then merge
  // pieces sharing a code and round coordinates (~100 m).
  const out = await mapshaper.applyCommands(
    '-i in.json -explode -simplify 10% keep-shapes -dissolve2 code -o world.geo.json format=geojson precision=0.001',
    { 'in.json': admin },
  );
  const world = JSON.parse(out['world.geo.json'].toString());

  // Every island is its own mesh on the globe: ~1,600 of them made the first
  // render take seconds. Keep the ones you can see, plus the capital's island.
  const capitals = new Map(wc.map((c) => [c.cca2, findCapital(c, neAdm0ByCode[c.cca2], places)]));
  for (const f of world.features) f.geometry = dropSmallIslands(rewind(f.geometry), capitals.get(f.properties.code));
  const geomByCode = new Map(world.features.map((f) => [f.properties.code, f.geometry]));

  const countries = wc
    .map((c) => {
      const fr = c.translations.fra;
      const name = { en: c.name.common, fr: FRENCH_NAMES[c.cca2] ?? fr.common };
      const aliases = new Set([
        c.name.official,
        fr.official,
        fr.common,
        ...c.altSpellings.filter((a) => a.length > 2),
        ...(EXTRA_ALIASES[c.cca2] ?? []),
      ]);
      aliases.delete(name.en);
      aliases.delete(name.fr);
      return {
        code: c.cca2,
        name,
        aliases: [...aliases],
        capital: capitals.get(c.cca2),
        view: cameraView(geomByCode.get(c.cca2)),
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  const dataDir = join(root, 'src', 'data');
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, 'countries.json'), JSON.stringify(countries, null, 1) + '\n');
  writeFileSync(join(dataDir, 'world.geo.json'), JSON.stringify(world));

  const parts = world.features.reduce(
    (n, f) => n + (f.geometry.type === 'Polygon' ? 1 : f.geometry.coordinates.length),
    0,
  );
  console.log(`${countries.length} playable countries, ${world.features.length} land areas, ${parts} polygons`);
  console.log(`world.geo.json: ${(JSON.stringify(world).length / 1024).toFixed(0)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
