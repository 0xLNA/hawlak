export type MarkerDetail = "compact" | "pin" | "full";
export function markerDetail(zoom: number): MarkerDetail {
  return zoom < 13 ? "compact" : zoom < 15 ? "pin" : "full";
}

/** DOM nodes (not HTML interpolation) keep place names safe for map labels. */
export function createMarkerButton({ name, primary, selected, detail, showLabel, count = 1 }: {
  name: string; primary: boolean; selected: boolean; detail: MarkerDetail; showLabel: boolean; count?: number;
}): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  const pin = primary || selected;
  button.className = `map-marker marker-${pin ? "primary" : "other"} marker-${detail} ${selected ? "selected" : ""} ${showLabel ? "marker-labeled" : ""} ${count > 1 ? "marker-cluster" : ""}`;
  button.setAttribute("aria-label", count > 1 ? `تكبير مجموعة من ${count} أماكن` : name);
  button.setAttribute("aria-pressed", String(selected));
  const symbol = document.createElement("span");
  symbol.className = "map-symbol";
  symbol.setAttribute("aria-hidden", "true");
  const shape = document.createElement("span");
  shape.className = pin ? "pin-shape" : "circle-shape";
  symbol.appendChild(shape);
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
