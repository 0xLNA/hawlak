import snapshot from "../data/riyadh-osm.json";
import type { Category, Place, PlaceRecord } from "./types";

// A future insight repository can attach aggregated, evidence-linked output here.
// No fictional insight profiles are joined to real businesses.
const places: PlaceRecord[] = snapshot.places.map(metadata => ({ ...metadata as Place, insights: null }));

export function getPlaces(category?: Category | "all"): PlaceRecord[] {
  return places.filter(place => !category || category === "all" || place.category === category);
}
export function getPlace(id: string): PlaceRecord | undefined { return places.find(place => place.id === id); }