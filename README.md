# Find the Country

A geography guessing game on a 3D globe. Guess a country: the game tells you how far its capital is from the mystery country's capital, as the crow flies, and colours it from pale sand (far) to deep red (close).

**Play:** https://strapontin.github.io/find-the-country/

- **Daily puzzle:** the same country for everyone each day, with a shareable result and a streak.
- **Free play:** a new random country each game.
- **French and English**, for the interface and the country names. Search ignores accents and accepts common alternatives ("UK", "RDC", "Holland"…).
- **Globe:** tap a country to highlight it, tap it again to see its name. Guesses are made in the text field only.

197 countries are playable: the 193 UN members plus Vatican City, Palestine, Kosovo and Taiwan.

## Stack

Static site, no backend.

- [Vite](https://vite.dev) + React + TypeScript
- [react-globe.gl](https://github.com/vasturiano/react-globe.gl) (three.js) for the globe
- [Vitest](https://vitest.dev) for the distance, data and game-logic tests
- GitHub Actions deploys `main` to GitHub Pages (`.github/workflows/deploy.yml`)

Distances use the haversine formula on a spherical Earth (mean radius 6,371 km), which is within about 0.5% of the true ellipsoidal distance.

## Development

```sh
npm install
npm run dev       # http://localhost:5173/find-the-country/
npm test
npm run build     # type-check + production build in dist/
```

### Data

`src/data/countries.json` and `src/data/world.geo.json` are generated and committed, so building the app needs no network access. To regenerate them:

```sh
npm run data
```

`scripts/build-data.mjs` downloads Natural Earth, matches countries, picks capitals, simplifies the borders and drops islands too small to see. Capital choices and name fixes live in the override tables at the top of that script. Where a country has several capitals, the game uses one: Pretoria (South Africa), Sucre (Bolivia), Lobamba (Eswatini), Porto-Novo (Benin).

The build leaves out parts of globe.gl this game never uses (hexagon layers, heatmaps, the WebGPU renderer) through aliases in `vite.config.ts`, which cuts the download roughly in half.

## Credits

- Borders and capital coordinates: [Natural Earth](https://www.naturalearthdata.com/) (public domain)
- Country names and alternative spellings: [mledoze/countries](https://github.com/mledoze/countries) ([ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/))
- Typeface: [B612](https://github.com/polarsys/b612), designed for Airbus cockpit displays (SIL Open Font License)
