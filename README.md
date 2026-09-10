# حولك — Hawlak

Arabic RTL place discovery using Next.js 15, React 19, Tailwind 4, Leaflet and real OpenStreetMap metadata. The existing quiz, map, sidebar, mobile layout, personal saves and directions remain in place.

## Local setup

```sh
npm install
npm run dev
```

The real experience pipeline needs these environment variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — server only; never use a `NEXT_PUBLIC_` prefix
- `ANTHROPIC_API_KEY` — server only

Keep the existing `experiences` and `extracted_insights` tables. Run **`supabase/place_signals.sql` manually in the Supabase SQL editor** to add recommendation signals. This repository change does not execute SQL or deploy anything.

## Real experiences and place details

Experiences contain 10–500 characters. The server validates the raw length and persists the original text before Claude extraction. A failed extraction retains the review and returns success for the save. Only completed `user_review` sources feed the aggregated insights; demo and unprocessed sources are excluded.

Place details show a deterministic Arabic summary, evidence disclosure, positives and negatives, and concise supporting mentions. Evidence counts use distinct source IDs; IDs are not rendered. The shared formatter merges equivalent labels without adding their evidence counts twice. Positives appear on the right on desktop and first in the stacked mobile layout.

Submitting an experience closes the dialog, fetches the selected place's insights again and updates the shared place state. Summary, evidence, preferences and recommendation order update without reloading the page. No additional Claude call generates the summary.

The production UI imports no demo insights and shows no invented ratings, reviews, counts or scores. The metadata repository starts with null insights. Client discovery and the recommendation API then load real persisted insights and stars. If those services are unavailable, metadata remains usable; the details panel offers a retry for unavailable insights.

## Deterministic request matching

`lib/recommend.ts` is shared by the client and recommendation API:

```text
C = 1 when the selected category matches (or category is all), otherwise 0
P = distinct supported requested preferences / distinct requested preferences
    (P = 0 when no preferences were requested)
E = min(1, processed real experience count / 10)
S = min(1, log10(starCount + 1) / log10(11))
rankingScore = 40*C + 40*P + 15*E + 5*S
score = round(rankingScore * 10) / 10
```

Numeric scores are withheld below three supported processed experiences, showing `بيانات أولية`. Scores mean `مناسب لطلبك`, not a business rating. Unknown preferences never count as matches. Category matches remain the first group, preserving the original map grouping; within each group, the score orders places, with stable place IDs resolving ties. Stars contribute at most five points. Claude only extracts structured observations.

## Star persistence

- `POST /api/places/[id]/star` validates the metadata ID, inserts one `star` into `public.place_signals`, and returns the exact updated count.
- `GET /api/places/[id]/star` validates the ID and returns `{ placeId, starCount }`.
- Both use the server Supabase helper. RLS is enabled; only the service role receives access through the supplied SQL.
- If an insert succeeds but counting fails, POST still returns 201 with `starCount: null`; the UI never invents an updated count or retries the insert automatically.
- `hawlak-starred-<placeId>` in localStorage preserves the browser's recommendation after refresh. A pending reservation, an in-flight guard, storage events and Web Locks where available limit repeated clicks and tabs. Storage must be available before submission.
- A network failure with an uncertain outcome retains the pending reservation to avoid a duplicate insert. This may leave that browser unable to retry an unconfirmed recommendation.
- This is MVP browser-level prevention: clearing storage, using another browser, or directly calling the API bypasses it. There is no authentication or server identity deduplication.
- Bookmark/Save remains separate and personal.

## API

- `GET /api/places[?category=cafe]`: metadata with real insights and star counts.
- `GET /api/places/[id]`: base metadata record.
- `GET /api/places/[id]/insights`: aggregated real experiences.
- `GET` / `POST /api/places/[id]/star`: recommendation count / submission.
- `POST /api/experiences`: `{ placeId, rawText }`.
- `POST /api/recommend`: `{ category, preferences }`, using the same deterministic scorer as the UI.

## Checks

```sh
npm test
npm run build
npm run test:e2e
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. Browser tests can use installed Chrome with `PLAYWRIGHT_CHANNEL=chrome`. They intercept map tiles and use isolated experience/star fixtures, with screenshots under ignored `test-results/`. Persistence tests exercise the actual route handlers and Supabase client against an isolated HTTP stub; they do not mutate the live database. End-to-end Supabase persistence requires applying the SQL and testing against the configured project.

## Place metadata

`data/riyadh-osm.json` stores 19 real places retrieved from OpenStreetMap through Overpass on 2026-09-09. Names, coordinates, available addresses, cuisines and recorded opening hours come from OSM; polygon centers may not be entrances. This is a small saved sample of Riyadh, not a complete directory.

Data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), under ODbL. Attribution remains visible on the map, results and place details. Public map tiles use `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; there is no prefetch or bulk tile download.

`npm run data:seed` is a manual metadata refresh command, not a build or page-load dependency. Review the resulting snapshot before publishing it.
