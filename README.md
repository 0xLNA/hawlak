# حولك — Hawlak

Hawlak is a decision/discovery product that transforms fragmented place experiences into structured insights to help people choose where to go. The Arabic RTL MVP starts with **وش ودك اليوم؟** and turns an intent into ranked places, a match score, reasons, and supporting examples.

This extends the existing Next.js app and retains its green/sand identity, search, map discovery, score explanation, visitor highlights, positive themes, warnings, saving, and directions. The original iframe with screen-positioned markers is now a coordinate-based Leaflet map.

## Run locally

Use Node.js 22 LTS and npm. No private keys, paid APIs, database, or environment variables are required.

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
npm run start
```

There was no lint script in the original repository. The production build includes Next.js type validation. Next.js remains on major version 15 (lockfile: 15.5.24), with React 19, Tailwind 4, existing custom CSS, and Lucide icons. Leaflet is the only added runtime dependency. A PostCSS 8.5.23 override resolves the transitive audit findings without a Next.js major upgrade.

## Current MVP Features

- Instant categories: قهوة، أكل، حلا، فعالية، تمشية; optional quiet, study/work, friends, family, budget, and late-opening preferences. No questionnaire.
- Ranked results and map markers update together. Search supports Arabic normalization and available English names; empty states reset filters.
- Leaflet pan, zoom, fit-results, and user-requested geolocation. Distances appear only after location permission and are straight-line kilometers, never driving estimates. Location remains in browser memory.
- Adaptive markers: zoom below 13 uses compact dots and nearby groups; zoom 13–14 uses scores; zoom 15+ adds names where labels fit. Close overlapping labels fall back to scores. Groups zoom into their members. Touch targets stay at least 44 pixels; no continuous marker scaling or clustering package.
- Place details show match reasons, matched and unsupported preferences, score calculation, suitability, atmosphere, popular mentions, positives, and warnings.
- A keyboard-accessible native source dialog supports Escape, focus containment, and focus restoration. Counts equal the actual local evidence entries.
- Place-specific saves persist in localStorage, with a saved-places filter and a session-only fallback when browser storage is unavailable.
- Directions use actual coordinates in Google Maps. Recorded OSM opening hours appear when present; unknown live availability, external ratings, review counts, and prices are omitted.
- Desktop uses adjacent results/details and map areas. Mobile keeps the map above an attached scrollable detail panel, so its controls and attribution are not covered by the panel.
- All place metadata, ranking, and insights load locally; if external tiles fail, markers, results, details, saves, and filtering continue to work. The basemap itself needs network access.

## Recommendation Logic

`lib/recommend.ts` is a pure deterministic module shared by the frontend and `POST /api/recommend`.

1. The chosen category determines eligible places (`all` keeps every category).
2. Unique selected preferences are matched against the demo insight profile.
3. Score = **5 + 4.2 × (matched preferences / selected preferences)**, rounded to one decimal. With no preferences selected, all places receive the neutral base of 5.0 and the UI asks for preferences.
4. Equal scores use stable place IDs as a tie-breaker. Input order does not affect ranking.

For example, a cafe with both `quiet` and `work` scores **9.2** for that request; one matching only one of those scores **7.1**. Preferences affect ranking rather than eliminating all partial matches. No external rating, distance, evidence volume, or invented confidence influences the score. These are **demo match scores**, not measures of real business quality. The repository and recommendation interfaces can later be backed by a database or another engine.

## Data Sources

### Real open metadata

`data/riyadh-osm.json` contains **19 places** retrieved from **OpenStreetMap via Overpass on 2026-09-09**: six cafes, four restaurants, three dessert/confectionery shops, four parks, and two museums (the activity category).

- Names, available alternate names, coordinates, available street addresses, cuisine, and opening-hours strings come from OSM tags. Arabic names are preferred where present; missing Arabic names retain the source name.
- Hawlak locally maps OSM amenity/shop/leisure/tourism tags into five intent categories. No invented Arabic translations or fabricated external ratings are added.
- Node coordinates are original positions. For park polygons, coordinates are OSM bounding-box centers and may not be entrances; check the route before traveling.
- The snapshot records the exact query, OSM database timestamp, retrieval date, license, and per-place source links. It is a small illustrative sample, not a complete or freshness-guaranteed Riyadh directory.

Data is © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the **Open Database License (ODbL)**. Retain attribution and ODbL obligations when redistributing the dataset or a derived database. Visible attribution appears both on the map and in the results footer; individual source links appear in details and the source dialog.

The public basemap uses `https://tile.openstreetmap.org/{z}/{x}/{y}.png` under the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Browser caching and Referer behavior are preserved. There is no tile prefetch, bulk download, proxy, or offline-map feature. Review capacity and provider suitability before a larger rollout; public tiles have no availability guarantee.

### Locally curated demo insights

`data/demo-insights.ts` contains fictional category scenarios assigned to the sample places: vibe, bestFor, popularItems, positives, complaints, preference tags, summaries, and three evidence examples per place. They are **not actual reviews of these businesses**. Their association with real places demonstrates the interface only.

All insights, evidence, and returned recommendations carry an `isDemo` flag. The UI clearly labels them, including the evidence count. “Reviews” and “Social” describe example source formats; nothing has been fetched from those platforms. No fake source URLs, review dates, ratings, or visitor counts are displayed. “مفتوح متأخر” is explicitly a demo preference and is separate from available OSM opening-hours metadata.

### Manual sample refresh

```bash
npm run data:seed
```

This is a manual maintenance command, never an install/build/page-load dependency. It makes one bounded, capped request, allowlists metadata fields, limits each category, and validates the complete response before replacing the snapshot. If Overpass is busy or any category is absent, the existing file remains intact. Retry later; do not add polling. Review the diff and source links before deploying refreshed data. The script also supports `node scripts/seed-osm.mjs --from-raw` for normalizing a locally saved UTF-8 response to the documented query.

## Data Layer and API

- `lib/types.ts`: Place, PlaceInsights, Evidence, IntentProfile, Recommendation, and shared result types.
- `lib/places.ts`: local repository, joins real metadata with separately marked demo insights.
- `lib/intent.ts`: category/preference labels and request validation.
- `GET /api/places` or `GET /api/places?category=cafe`: place records and insights; invalid category returns 400.
- `GET /api/places/[id]`: one record; unknown ID returns 404.
- `POST /api/recommend`: JSON body `{"category":"cafe","preferences":["quiet","work"]}` returns ranked `{ placeId, score, matchedPreferences, unmatchedPreferences, explanation, scoreBasis, isDemo }` objects.

Supported categories are `all`, `cafe`, `restaurant`, `dessert`, `activity`, and `walk`; preferences are `quiet`, `work`, `friends`, `family`, `budget`, and `late`. Invalid JSON/profiles return 400, unsupported content types 415, and bodies over 4 KiB 413. The server-rendered homepage gets data directly from the same repository and performs immediate matching locally, avoiding unnecessary API round trips.

## Browser Validation

After a production build:

```bash
npx playwright install chromium
npm run test:e2e
```

An existing Chrome installation can be used by setting the optional **test-only** `PLAYWRIGHT_CHANNEL=chrome`. The test runner starts and stops the production server on port 3000. Tests cover 375, 390, 768, 1024, and 1440 pixel widths, RTL overflow, intent matching, details, source-dialog keyboard behavior, map-control access, marker detail changes, persistence, empty states, tile failure, and API validation. Screenshots are written under ignored `test-results/`.

Browser tests intercept map tiles with a local test image to comply with OSM's prohibition on automated tile scans. They validate the map behavior without testing public basemap availability.

## Deployment

Deploy the existing repository to Vercel using its Next.js preset, `npm install`, and `npm run build`, on Node.js 22. No `vercel.json`, paid services, secrets, or runtime data-fetch configuration are needed. API Route Handlers require a normal Next.js deployment, not static export. The checked-in JSON is bundled with the app. Geolocation requires HTTPS (or localhost), and saved places are local to each browser/device.

## Future Scope

Future versions may integrate richer review/social sources and AI processing behind the same data and recommendation interfaces. No social ingestion, share-to-platform integration, processing pipeline, or admin UI is implemented in this MVP.
