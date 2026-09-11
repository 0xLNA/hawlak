import type { Category } from "./types";

// Small category illustrations share the same colors as the result cards.
const categoryPaths: Record<Category, string> = {
  cafe: "M4 8h12v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm12 1h2a3 3 0 0 1 0 6h-2M7 3v2m4-2v2M3 22h15",
  restaurant: "M5 3v7m3-7v7m3-7v7M5 7h6M8 10v11M19 3c-4 3-4 9 0 9V3Zm0 9v9",
  dessert: "m7 12 5 10 5-10H7Zm-1-1a4 4 0 0 1 2-7 4 4 0 0 1 8 0 4 4 0 0 1 2 7H6Z",
  activity: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  walk: "m12 2-6 8h3l-5 7h16l-5-7h3l-6-8Zm0 15v5",
};

export type MarkerDetail = "compact" | "pin" | "full";
export function markerDetail(zoom: number): MarkerDetail {
  return zoom < 13 ? "compact" : zoom < 15 ? "pin" : "full";
}

/** DOM nodes (not HTML interpolation) keep place names safe for map labels. */
export function createMarkerButton({ name, category, primary, selected, detail, showLabel, count = 1 }: {
  name: string; category: Category; primary: boolean; selected: boolean; detail: MarkerDetail; showLabel: boolean; count?: number;
}): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  const pin = primary || selected;
  button.className = `map-marker marker-${pin ? "primary" : "other"} marker-${detail} ${selected ? "selected" : ""} ${showLabel ? "marker-labeled" : ""} ${count > 1 ? "marker-cluster" : ""}`;
  button.setAttribute("aria-label", count > 1 ? `تكبير مجموعة من ${count} أماكن` : name);
  button.setAttribute("aria-pressed", String(selected));
  button.dataset.category = category;
  const symbol = document.createElement("span");
  symbol.className = "map-symbol";
  symbol.setAttribute("aria-hidden", "true");
  const shape = document.createElement("span");
  shape.className = pin ? "pin-shape" : "circle-shape";
  symbol.appendChild(shape);
  if (pin && count === 1) {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("class", "marker-category-icon");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "1.8");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", categoryPaths[category]);
    icon.appendChild(path);
    symbol.appendChild(icon);
  }
  if (count > 1) {
    const number = document.createElement("b");
    number.className = "cluster-count";
    number.textContent = String(count);
    symbol.appendChild(number);
  }
  button.appendChild(symbol);
  if (showLabel) {
    const label = document.createElement("span");
    label.className = "marker-name";
    label.textContent = name;
    label.dir = "auto";
    button.appendChild(label);
  }
  return button;
}
/** Greedy screen-distance groups for a small local dataset; no clustering dependency. */
export function clusterPoints<T extends { x: number; y: number }>(points: T[], radius = 64): T[][] {
  const groups: T[][] = [];
  for (const point of points) {
    const group = groups.find(items => Math.hypot(items[0].x - point.x, items[0].y - point.y) < radius);
    if (group) group.push(point); else groups.push([point]);
  }
  return groups;
}
