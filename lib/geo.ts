/** Great-circle distance, kilometers; never a driving-time estimate. */
export function distanceKm(origin: [number, number], destination: [number, number]): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLat = radians(destination[0] - origin[0]);
  const deltaLon = radians(destination[1] - origin[1]);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(origin[0])) * Math.cos(radians(destination[0])) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
