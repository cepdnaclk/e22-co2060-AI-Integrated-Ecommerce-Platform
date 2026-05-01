import { haversineDistanceKm } from "./distance";

export function isInsideRadiusZone(point, zone) {
  if (!zone?.center || !Number.isFinite(Number(zone.radiusKm))) return false;
  const distanceKm = haversineDistanceKm(point, zone.center);
  return distanceKm <= Number(zone.radiusKm);
}

export function isInsidePolygonZone(point, polygon = []) {
  const x = Number(point?.lng);
  const y = Number(point?.lat);
  if (!Number.isFinite(x) || !Number.isFinite(y) || polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = Number(polygon[i].lng);
    const yi = Number(polygon[i].lat);
    const xj = Number(polygon[j].lng);
    const yj = Number(polygon[j].lat);

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function isLocationServed(point, zoneConfig = {}) {
  if (zoneConfig.type === "polygon") {
    return isInsidePolygonZone(point, zoneConfig.coordinates || []);
  }

  if (zoneConfig.type === "radius") {
    return isInsideRadiusZone(point, {
      center: zoneConfig.center,
      radiusKm: zoneConfig.radiusKm,
    });
  }

  return false;
}

