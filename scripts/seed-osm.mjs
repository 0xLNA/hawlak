import { readFile, writeFile } from "node:fs/promises";

// Manual maintenance only; never runs during install, build, or a browser request.
const endpoint = "https://overpass-api.de/api/interpreter";
const query = '[out:json][timeout:15];(node[amenity~"cafe|restaurant"][name](24.68,46.68,24.70,46.70);node[shop~"pastry|confectionery"][name](24.63,46.65,24.73,46.75);way[leisure=park][name](24.63,46.65,24.73,46.75);nwr[tourism=museum][name](24.63,46.65,24.73,46.75););out center 50;';
let raw;
if (process.argv[2] === "--from-raw") raw = JSON.parse(await readFile(new URL("../data/riyadh-osm.raw.json", import.meta.url), "utf8"));
else {
  const response = await fetch(endpoint, { method: "POST", headers: { "User-Agent": "Hawlak-MVP-Seed/1.0 (+https://hawlak.vercel.app)", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Overpass returned ${response.status}; existing snapshot preserved. Try again later.`);
  raw = await response.json();
}
if (raw.remark || !Array.isArray(raw.elements)) throw new Error("Incomplete Overpass result; snapshot preserved.");
const retrievedAt = new Date().toISOString().slice(0, 10);
const categoryFor = tags => tags.amenity === "cafe" ? "cafe" : tags.amenity === "restaurant" ? "restaurant" : ["pastry", "confectionery"].includes(tags.shop) ? "dessert" : tags.leisure === "park" ? "walk" : tags.tourism === "museum" ? "activity" : null;
const seen = new Set();
const categoryCounts = {};
const categoryLimits = { cafe: 6, restaurant: 4, dessert: 4, walk: 4, activity: 4 };
const places = raw.elements.flatMap(element => {
  const tags = element.tags ?? {};
  const category = categoryFor(tags);
  const id = `osm-${element.type}-${element.id}`;
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (!category || !tags.name || seen.has(id) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
  if ((categoryCounts[category] ?? 0) >= categoryLimits[category]) return [];
  if (latitude < 24.63 || latitude > 24.73 || longitude < 46.65 || longitude > 46.75) throw new Error("Coordinates outside the intended Riyadh sample.");
  seen.add(id);
  categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
  // Only metadata needed by the product. No phone/email/contact tags or fabricated ratings.
  return [{ id, name: tags["name:ar"] || tags.name, ...(tags["name:en"] || (tags["name:ar"] && tags.name) ? { nameEn: tags["name:en"] || tags.name } : {}), category, latitude, longitude,
    ...(tags["addr:street"] ? { address: [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean).join("، ") } : {}),
    ...(tags.cuisine ? { cuisine: tags.cuisine } : {}), ...(tags.opening_hours ? { openingHours: tags.opening_hours } : {}),
    metadataSource: { type: "openstreetmap", url: `https://www.openstreetmap.org/${element.type}/${element.id}`, retrievedAt },
  }];
});
for (const category of ["cafe", "restaurant", "dessert", "walk", "activity"]) if (!places.some(place => place.category === category)) throw new Error(`No ${category} sample; existing snapshot preserved.`);
const snapshot = { source: "OpenStreetMap contributors", license: "ODbL-1.0", licenseUrl: "https://www.openstreetmap.org/copyright", endpoint, query, retrievedAt, osmBaseTimestamp: raw.osm3s?.timestamp_osm_base, places };
await writeFile(new URL("../data/riyadh-osm.json", import.meta.url), JSON.stringify(snapshot, null, 2) + "\n");
console.log(`Stored ${places.length} OSM places with provenance. No insights or ratings imported.`);
